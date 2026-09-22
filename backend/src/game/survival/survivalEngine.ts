import { query } from '@/database/connection';
import { AIService } from '@/services/aiService';
import {
  Scenario,
  SurvivalGameSession,
  SurvivalEvent,
  SurvivalAIResponse,
  InventoryItem,
  ScenarioObjective,
  SurvivalScoring
} from '@/types';

export class SurvivalEngine {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  async startScenario(userId: string, scenarioId: string, roundId?: string): Promise<SurvivalGameSession> {
    // Get scenario details
    const scenario = await this.getScenario(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    if (!scenario.isActive) {
      throw new Error('Scenario is not active');
    }

    // Check if user already has an active session for this scenario
    const existingSession = await this.getActiveSession(userId, scenarioId, roundId);
    if (existingSession) {
      return existingSession;
    }

    // Create new game session
    const sessionData = {
      userId,
      scenarioId,
      roundId: roundId || null,
      status: 'active' as const,
      currentLocation: scenario.startingLocation,
      health: scenario.startingHealth,
      maxHealth: scenario.maxHealth,
      inventory: scenario.startingInventory,
      score: scenario.scoring.baseScore || 0,
      turn: 1,
      maxTurns: scenario.maxTurns,
      remainingPrompts: scenario.maxTurns,
      timeRemaining: scenario.timeLimit || null,
      objectives: scenario.objectives,
      completedObjectives: [],
      discoveredInformation: [],
    };

    const result = await query(
      `INSERT INTO survival_sessions 
       (user_id, scenario_id, round_id, status, current_location, health, max_health, 
        inventory, score, turn, max_turns, remaining_prompts, time_remaining, 
        objectives, completed_objectives, discovered_information)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        sessionData.userId,
        sessionData.scenarioId,
        sessionData.roundId,
        sessionData.status,
        sessionData.currentLocation,
        sessionData.health,
        sessionData.maxHealth,
        JSON.stringify(sessionData.inventory),
        sessionData.score,
        sessionData.turn,
        sessionData.maxTurns,
        sessionData.remainingPrompts,
        sessionData.timeRemaining,
        JSON.stringify(sessionData.objectives),
        JSON.stringify(sessionData.completedObjectives),
        JSON.stringify(sessionData.discoveredInformation),
      ]
    );

    return this.formatSession(result.rows[0]);
  }

  async submitAction(sessionId: string, playerAction: string): Promise<{
    event: SurvivalEvent;
    session: SurvivalGameSession;
    isGameOver: boolean;
    gameOverReason?: string;
  }> {
    // Get current session
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    if (session.remainingPrompts <= 0) {
      throw new Error('No actions remaining');
    }

    // Get scenario and history
    const scenario = await this.getScenario(session.scenarioId);
    const history = await this.getSessionHistory(sessionId);

    // Evaluate action with AI
    const aiResponse = await this.aiService.evaluateSurvivalAction(
      session,
      scenario!,
      playerAction,
      history
    );

    // Validate and apply AI response
    const validatedResponse = this.validateAIResponse(aiResponse, session);
    
    // Update game state
    const updatedSession = await this.applyGameStateChanges(session, validatedResponse);
    
    // Create event record
    const event = await this.createEvent(sessionId, session.turn, playerAction, validatedResponse);
    
    // Check win/lose conditions
    const gameStatus = this.checkGameStatus(updatedSession, scenario!);
    
    let isGameOver = false;
    let gameOverReason: string | undefined;

    if (gameStatus.isGameOver) {
      isGameOver = true;
      gameOverReason = gameStatus.reason;
      await this.endSession(sessionId, gameStatus.status, updatedSession.score);
    }

    return {
      event,
      session: updatedSession,
      isGameOver,
      gameOverReason,
    };
  }

  async getSessionState(sessionId: string): Promise<{
    session: SurvivalGameSession;
    scenario: Partial<Scenario>;
    history: SurvivalEvent[];
  }> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const scenario = await this.getScenario(session.scenarioId);
    const history = await this.getSessionHistory(sessionId);

    // Only return safe scenario data
    const safeScenario = {
      id: scenario!.id,
      title: scenario!.title,
      description: scenario!.description,
      environment: scenario!.environment,
      difficulty: scenario!.difficulty,
      category: scenario!.category,
      maxTurns: scenario!.maxTurns,
      timeLimit: scenario!.timeLimit,
      objectives: scenario!.objectives,
      // Don't include: rules, internal mechanics
    };

    return {
      session,
      scenario: safeScenario,
      history,
    };
  }

  private validateAIResponse(aiResponse: SurvivalAIResponse, session: SurvivalGameSession): SurvivalAIResponse {
    // Validate damage bounds
    const damage = Math.max(0, Math.min(5, aiResponse.damage)); // 0-5 damage max
    
    // Validate score change bounds
    const scoreChange = Math.max(-100, Math.min(200, aiResponse.scoreChange));
    
    // Validate resource changes
    const resourceChanges = aiResponse.resourceChanges.map(change => ({
      resource: change.resource,
      change: Math.max(-10, Math.min(10, change.change)) // Limit resource changes
    }));

    // Validate objective progress
    const objectiveProgress: Record<string, number> = {};
    Object.entries(aiResponse.objectiveProgress).forEach(([objId, progress]) => {
      objectiveProgress[objId] = Math.max(0, Math.min(100, progress));
    });

    return {
      ...aiResponse,
      damage,
      scoreChange,
      resourceChanges,
      objectiveProgress,
    };
  }

  private async applyGameStateChanges(
    session: SurvivalGameSession,
    aiResponse: SurvivalAIResponse
  ): Promise<SurvivalGameSession> {
    let updatedSession = { ...session };

    // Apply damage
    updatedSession.health = Math.max(0, session.health - aiResponse.damage);

    // Apply score change
    updatedSession.score = Math.max(0, session.score + aiResponse.scoreChange);

    // Apply location change
    if (aiResponse.stateChanges.location) {
      updatedSession.currentLocation = aiResponse.stateChanges.location;
    }

    // Apply inventory changes
    updatedSession.inventory = this.applyInventoryChanges(session.inventory, aiResponse.resourceChanges);

    // Update objectives
    updatedSession.objectives = this.updateObjectives(session.objectives, aiResponse.objectiveProgress);

    // Update completed objectives
    const newlyCompleted = updatedSession.objectives
      .filter(obj => obj.isCompleted && !session.completedObjectives.includes(obj.id))
      .map(obj => obj.id);
    
    updatedSession.completedObjectives = [...session.completedObjectives, ...newlyCompleted];

    // Increment turn and decrement remaining prompts
    updatedSession.turn = session.turn + 1;
    updatedSession.remainingPrompts = session.remainingPrompts - 1;

    // Update session in database
    await query(
      `UPDATE survival_sessions 
       SET current_location = $1, health = $2, inventory = $3, score = $4, 
           turn = $5, remaining_prompts = $6, objectives = $7, 
           completed_objectives = $8
       WHERE id = $9`,
      [
        updatedSession.currentLocation,
        updatedSession.health,
        JSON.stringify(updatedSession.inventory),
        updatedSession.score,
        updatedSession.turn,
        updatedSession.remainingPrompts,
        JSON.stringify(updatedSession.objectives),
        JSON.stringify(updatedSession.completedObjectives),
        session.id,
      ]
    );

    return updatedSession;
  }

  private applyInventoryChanges(
    inventory: InventoryItem[],
    resourceChanges: Array<{ resource: string; change: number }>
  ): InventoryItem[] {
    const updatedInventory = [...inventory];

    resourceChanges.forEach(change => {
      const existingItem = updatedInventory.find(item => item.name === change.resource);
      
      if (existingItem) {
        existingItem.quantity = Math.max(0, existingItem.quantity + change.change);
        // Remove item if quantity becomes 0
        if (existingItem.quantity === 0) {
          const index = updatedInventory.indexOf(existingItem);
          updatedInventory.splice(index, 1);
        }
      } else if (change.change > 0) {
        // Add new item if change is positive
        updatedInventory.push({
          name: change.resource,
          quantity: change.change,
        });
      }
    });

    return updatedInventory;
  }

  private updateObjectives(
    objectives: ScenarioObjective[],
    objectiveProgress: Record<string, number>
  ): ScenarioObjective[] {
    return objectives.map(obj => {
      const progress = objectiveProgress[obj.id];
      if (progress !== undefined) {
        return {
          ...obj,
          isCompleted: progress >= 100,
        };
      }
      return obj;
    });
  }

  private checkGameStatus(session: SurvivalGameSession, scenario: Scenario): {
    isGameOver: boolean;
    status: string;
    reason: string;
  } {
    // Check death
    if (session.health <= 0) {
      return {
        isGameOver: true,
        status: 'dead',
        reason: 'Health reached zero'
      };
    }

    // Check turn limit
    if (session.remainingPrompts <= 0) {
      const requiredObjectivesCompleted = scenario.objectives
        .filter(obj => obj.isRequired)
        .every(obj => session.completedObjectives.includes(obj.id));

      if (requiredObjectivesCompleted) {
        return {
          isGameOver: true,
          status: 'survived',
          reason: 'Objectives completed within turn limit'
        };
      } else {
        return {
          isGameOver: true,
          status: 'turn_limit',
          reason: 'Turn limit reached without completing objectives'
        };
      }
    }

    // Check if all required objectives completed early
    const requiredObjectivesCompleted = scenario.objectives
      .filter(obj => obj.isRequired)
      .every(obj => session.completedObjectives.includes(obj.id));

    if (requiredObjectivesCompleted) {
      return {
        isGameOver: true,
        status: 'survived',
        reason: 'All required objectives completed'
      };
    }

    return {
      isGameOver: false,
      status: 'active',
      reason: ''
    };
  }

  private async endSession(sessionId: string, status: string, finalScore: number): Promise<void> {
    // Calculate final bonuses
    let bonusScore = 0;
    
    if (status === 'survived') {
      const scenario = await query(
        'SELECT scoring FROM scenarios s JOIN survival_sessions ss ON s.id = ss.scenario_id WHERE ss.id = $1',
        [sessionId]
      );
      
      if (scenario.rows.length > 0) {
        const scoring = scenario.rows[0].scoring;
        bonusScore = scoring.survivalBonus || 0;
      }
    }

    const totalScore = finalScore + bonusScore;

    await query(
      'UPDATE survival_sessions SET status = $1, score = $2, end_time = CURRENT_TIMESTAMP WHERE id = $3',
      [status, totalScore, sessionId]
    );
  }

  private async createEvent(
    sessionId: string,
    turn: number,
    playerAction: string,
    aiResponse: SurvivalAIResponse
  ): Promise<SurvivalEvent> {
    const result = await query(
      `INSERT INTO survival_events 
       (session_id, turn, player_action, ai_response, game_state_changes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        sessionId,
        turn,
        playerAction,
        JSON.stringify(aiResponse),
        JSON.stringify(aiResponse.stateChanges || {}),
      ]
    );

    return this.formatEvent(result.rows[0]);
  }

  // Database helper methods
  private async getScenario(scenarioId: string): Promise<Scenario | null> {
    const result = await query('SELECT * FROM scenarios WHERE id = $1', [scenarioId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      environment: row.environment,
      difficulty: row.difficulty,
      category: row.category,
      startingLocation: row.starting_location,
      startingHealth: row.starting_health,
      maxHealth: row.max_health,
      startingInventory: Array.isArray(row.starting_inventory) ? row.starting_inventory : JSON.parse(row.starting_inventory || '[]'),
      objectives: Array.isArray(row.objectives) ? row.objectives : JSON.parse(row.objectives || '[]'),
      maxTurns: row.max_turns,
      timeLimit: row.time_limit,
      scoring: row.scoring,
      rules: Array.isArray(row.rules) ? row.rules : JSON.parse(row.rules || '[]'),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async getActiveSession(userId: string, scenarioId: string, roundId?: string): Promise<SurvivalGameSession | null> {
    const params = [userId, scenarioId];
    let query_str = 'SELECT * FROM survival_sessions WHERE user_id = $1 AND scenario_id = $2 AND status = \'active\'';
    
    if (roundId) {
      query_str += ' AND round_id = $3';
      params.push(roundId);
    } else {
      query_str += ' AND round_id IS NULL';
    }

    const result = await query(query_str, params);
    return result.rows[0] ? this.formatSession(result.rows[0]) : null;
  }

  private async getSessionById(sessionId: string): Promise<SurvivalGameSession | null> {
    const result = await query('SELECT * FROM survival_sessions WHERE id = $1', [sessionId]);
    return result.rows[0] ? this.formatSession(result.rows[0]) : null;
  }

  private async getSessionHistory(sessionId: string): Promise<SurvivalEvent[]> {
    const result = await query(
      'SELECT * FROM survival_events WHERE session_id = $1 ORDER BY turn',
      [sessionId]
    );
    return result.rows.map(row => this.formatEvent(row));
  }

  private formatSession(row: any): SurvivalGameSession {
    return {
      id: row.id,
      userId: row.user_id,
      scenarioId: row.scenario_id,
      roundId: row.round_id,
      status: row.status,
      currentLocation: row.current_location,
      health: row.health,
      maxHealth: row.max_health,
      inventory: Array.isArray(row.inventory) ? row.inventory : JSON.parse(row.inventory || '[]'),
      score: row.score,
      turn: row.turn,
      maxTurns: row.max_turns,
      remainingPrompts: row.remaining_prompts,
      timeRemaining: row.time_remaining,
      objectives: Array.isArray(row.objectives) ? row.objectives : JSON.parse(row.objectives || '[]'),
      completedObjectives: Array.isArray(row.completed_objectives) ? row.completed_objectives : JSON.parse(row.completed_objectives || '[]'),
      discoveredInformation: Array.isArray(row.discovered_information) ? row.discovered_information : JSON.parse(row.discovered_information || '[]'),
      history: [], // Will be loaded separately if needed
      startTime: row.start_time,
      endTime: row.end_time,
    };
  }

  private formatEvent(row: any): SurvivalEvent {
    return {
      id: row.id,
      sessionId: row.session_id,
      turn: row.turn,
      playerAction: row.player_action,
      aiResponse: typeof row.ai_response === 'string' ? JSON.parse(row.ai_response) : row.ai_response,
      gameStateChanges: typeof row.game_state_changes === 'string' ? JSON.parse(row.game_state_changes) : row.game_state_changes,
      timestamp: row.created_at,
    };
  }
}