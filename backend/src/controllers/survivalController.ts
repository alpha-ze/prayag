import { Request, Response } from 'express';
import { survivalStartSchema } from '@/utils/validation';
import { AuthRequest } from '@/utils/auth';
import { AIService } from '@/services/aiService';
import { sessionStore } from '@/utils/sessionStore';
import {
  saveSurvivalSession,
  updateSurvivalSession,
  saveSurvivalEvent,
  upsertLeaderboardEntry,
  getLeaderboardEntries,
} from '@/services/dbService';
import { broadcastLeaderboardUpdate } from '@/sockets/index';

const aiService = new AIService();

// ─── Broadcast helper ─────────────────────────────────────────────────────────
// After any score change push a fresh leaderboard to all connected clients.
async function refreshAndBroadcastLeaderboard(
  userId: string,
  username: string,
  type: 'promptle' | 'survival',
  score: number,
  status: string,
  timeTaken?: number
): Promise<void> {
  try {
    await upsertLeaderboardEntry(userId, username, type, score, status, timeTaken);
    const entries = await getLeaderboardEntries();
    const leaderboard = entries.map((entry: any, index: number) => ({
      rank: index + 1,
      userId: entry.user_id,
      username: entry.username || entry.user_id,
      totalScore: entry.total_score ?? 0,
      roundScores: entry.round_scores ?? {},
      status: entry.status ?? 'active',
      lastActivity: entry.last_activity ? new Date(entry.last_activity) : new Date(),
      roundDetails: entry.round_details ?? {},
      timeTaken: entry.time_taken ?? null,
    }));
    broadcastLeaderboardUpdate(leaderboard);
  } catch (err) {
    console.error('❌ refreshAndBroadcastLeaderboard error:', err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getMockAIResponse(action: string) {
  const a = action.toLowerCase();
  const outcomes = ['success', 'success', 'critical_success', 'partial_success', 'failure'] as const;
  const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

  let reason = '';
  let nextEvent = '';
  let scoreChange = outcome === 'critical_success' ? 75 : outcome === 'success' ? 50 : outcome === 'partial_success' ? 25 : 0;
  const damage = outcome === 'failure' ? 1 : 0;

  if (a.includes('compass') || a.includes('navigate') || a.includes('direction')) {
    reason = outcome === 'critical_success' || outcome === 'success'
      ? `You pull out your compass and take a careful reading. The needle points steadily northeast — toward what appears to be higher ground with possible vegetation. You adjust your route and begin hiking with renewed purpose, making solid progress across the dunes.`
      : `You check your compass but the sun's heat is causing you to second-guess your reading. You head northeast but the terrain gets rougher, costing you precious energy and time.`;
    nextEvent = outcome === 'failure'
      ? 'The rocky terrain has slowed you down considerably. Your water is nearly gone.'
      : 'The terrain opens up ahead. You can see what might be vegetation in the distance — a possible water source.';
  } else if (a.includes('water') || a.includes('dig')) {
    reason = outcome === 'success' || outcome === 'critical_success'
      ? `You notice dry riverbeds and dig carefully in the lowest point. After about 20 minutes, damp soil appears — and moments later, a small pool of muddy but drinkable water seeps in. You filter it through your shirt and drink gratefully.`
      : `You dig where the soil looks slightly darker, hoping for underground water. After exhausting effort in the blazing heat, the hole remains dry. The digging has cost you more sweat than you can afford.`;
    nextEvent = outcome === 'failure'
      ? 'Dehydration is accelerating. You need water within the next hour or your health will deteriorate further.'
      : 'The water gives you renewed strength. You can now focus on finding the path to civilization.';
  } else if (a.includes('shelter') || a.includes('shade') || a.includes('rest')) {
    reason = outcome === 'success' || outcome === 'critical_success'
      ? `You find a natural rock overhang that blocks the sun perfectly. Crawling into the shade, you feel immediate relief. You rest for 20 minutes, allowing your body temperature to drop and your muscles to recover. Smart move.`
      : `The only shade you find is inadequate — a scraggly bush that barely blocks the midday sun. You rest anyway but gain little benefit.`;
    nextEvent = 'The afternoon heat is intense. Moving now would drain your energy fast. But standing still means slower progress toward safety.';
  } else if (a.includes('signal') || a.includes('fire') || a.includes('smoke')) {
    reason = outcome === 'success' || outcome === 'critical_success'
      ? `You gather dry brush and use your knife to strike sparks against a rock. After several attempts, a small fire catches. Thick smoke rises into the clear sky — a signal visible for miles. You hear a distant sound that might be a vehicle engine.`
      : `You attempt to start a fire but the brush is too dry and the wind keeps extinguishing your sparks. The effort has used up precious energy.`;
    nextEvent = outcome === 'failure'
      ? 'You wasted time and energy. The sun is getting lower and temperatures will soon drop dangerously.'
      : 'Something in the distance seems to be responding to your signal. Keep watching.';
  } else if (a.includes('climb') || a.includes('high') || a.includes('survey')) {
    reason = outcome === 'success' || outcome === 'critical_success'
      ? `You climb to the top of a rocky ridge, ignoring the burning heat. From up here, you can see for 20 miles. A green line to the northeast suggests a riverbed or oasis. A faint dust trail to the west could be a road. You now know exactly where to go.`
      : `You scramble up the hill but lose your footing halfway, scraping your hands on the rocks. From the limited height you reach, you can barely see more than from the ground.`;
    nextEvent = 'You have a clear picture of your surroundings now. The oasis to the northeast is your best bet — about 3 miles away.';
  } else {
    reason = outcome === 'critical_success'
      ? `Your action turns out to be exactly the right call. With sharp instincts and good judgment, you execute your plan flawlessly and make major progress toward safety.`
      : outcome === 'success'
      ? `You execute your plan carefully. It works as expected — not spectacular but effective. You move one step closer to your goal.`
      : outcome === 'partial_success'
      ? `Your action produces mixed results. You gain some ground but encounter a new obstacle that you'll need to deal with next.`
      : `Your plan backfires. The harsh environment punishes the mistake and you take damage as a result.`;
    nextEvent = outcome === 'failure'
      ? 'Things are getting worse. You need to make smarter decisions or this desert will claim you.'
      : 'Progress made. Keep moving — you\'re not safe yet.';
  }

  return {
    outcome,
    damage,
    scoreChange,
    reason,
    stateChanges: {},
    resourceChanges: [],
    objectiveProgress: {},
    nextEvent,
    continueGame: outcome !== 'critical_success',
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class SurvivalController {
  async startScenario(req: AuthRequest, res: Response) {
    try {
      const user = req.user || {
        id: 'anonymous-user',
        email: 'anonymous@example.com',
        username: 'anonymous',
        role: 'participant' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { scenarioId } = survivalStartSchema.parse(req.body);
      const { roundId } = req.body;

      const sessionId = generateUUID();
      // Always start at scenario index 0 (Desert) regardless of scenarioId passed
      const scenario = ROUND2_SCENARIOS[0];

      const sessionData: any = {
        id: sessionId,
        userId: user.id,
        username: user.username,
        scenarioId: scenario.id,
        roundId: roundId || undefined,
        status: 'active',
        currentLocation: scenario.environment,
        // Each heart = one scenario. scenarioIndex tracks which one we're on.
        scenarioIndex: 0,
        scenariosCleared: 0,
        scenarioStartTime: new Date().toISOString(),
        attemptsRemaining: ROUND2_SCENARIOS.length,   // 5 lives = 5 scenarios
        maxAttempts: ROUND2_SCENARIOS.length,
        health: ROUND2_SCENARIOS.length,
        maxHealth: ROUND2_SCENARIOS.length,
        score: 0,
        turn: 1,
        history: [],
        scenario,
        startTime: new Date(),
        endTime: undefined,
      };

      sessionStore.set(sessionId, 'survival', sessionData);

      // Only persist to Supabase if scenario_id is a valid UUID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scenario.id);
      if (user.id !== 'anonymous-user' && isValidUUID) {
        saveSurvivalSession({
          id: sessionId,
          user_id: user.id,
          scenario_id: scenario.id,
          round_id: roundId || null,
          status: 'active',
          current_location: scenario.environment,
          health: ROUND2_SCENARIOS.length,
          max_health: ROUND2_SCENARIOS.length,
          inventory: [],
          score: 0,
          turn: 1,
          max_turns: ROUND2_SCENARIOS.length,
          remaining_prompts: ROUND2_SCENARIOS.length,
          time_remaining: 600,
          objectives: [],
          completed_objectives: [],
          discovered_information: [],
          start_time: new Date().toISOString(),
        }).catch(console.error);
      }

      console.log('✅ Round 2 session created:', sessionId, '— starting at', scenario.title);
      res.json({ success: true, data: { session: sessionData }, message: 'Round 2 started' });
    } catch (error) {
      console.error('❌ Start scenario error:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to start scenario' });
    }
  }

  async submitAction(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.sessionId;
      const { action } = req.body;

      if (!action) {
        return res.status(400).json({ success: false, data: null, error: 'Action is required' });
      }

      const stored = sessionStore.get(sessionId);
      if (!stored || stored.type !== 'survival') {
        return res.status(404).json({ success: false, data: null, error: 'Session not found' });
      }

      const session = stored.data;
      if (session.status !== 'active') {
        return res.status(400).json({ success: false, data: null, error: 'Session is no longer active' });
      }

      const scenarioIndex: number = session.scenarioIndex ?? 0;
      const currentScenario = ROUND2_SCENARIOS[scenarioIndex];

      if (!currentScenario) {
        return res.status(400).json({ success: false, data: null, error: 'No more scenarios' });
      }

      console.log(`⚔️ Round2 action — scenario ${scenarioIndex + 1}/5 "${currentScenario.title}" | action: "${action}"`);

      // ── AI evaluation ─────────────────────────────────────────────────────
      let aiResponse: any;
      try {
        const fakeScenario = {
          id: currentScenario.id,
          title: currentScenario.title,
          description: currentScenario.description,
          environment: currentScenario.environment,
          difficulty: 'hard',
          category: 'Survival',
          startingLocation: currentScenario.environment,
          startingHealth: 5,
          maxHealth: 5,
          startingInventory: [],
          objectives: [{ id: 'survive', title: currentScenario.winCondition, isRequired: true }],
          maxTurns: 1,
          timeLimit: 120,
          scoring: {},
          rules: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const fakeSession = {
          id: session.id,
          userId: session.userId,
          scenarioId: currentScenario.id,
          status: 'active',
          currentLocation: currentScenario.environment,
          health: session.attemptsRemaining ?? 5,
          maxHealth: 5,
          inventory: [],
          score: session.score ?? 0,
          turn: 1,
          maxTurns: 1,
          remainingPrompts: 1,
          timeRemaining: 120,
          objectives: [],
          completedObjectives: [],
          discoveredInformation: [],
          history: [],
          startTime: session.startTime,
          endTime: undefined,
          // pass scenario context for the prompt
          attemptsRemaining: session.attemptsRemaining ?? 5,
        };

        aiResponse = await aiService.evaluateSurvivalAction(
          fakeSession as any,
          fakeScenario as any,
          action,
          [] // fresh history each scenario
        );
      } catch (aiErr) {
        console.error('❌ AI failed, using deterministic fallback:', aiErr);
        // Deterministic fallback: random die/survive with 50/50
        const survived = Math.random() > 0.5;
        aiResponse = {
          outcome: survived ? 'critical_success' : 'critical_failure',
          damage: survived ? 0 : 1,
          scoreChange: survived ? 50 : 0,
          reason: survived
            ? `Against all odds, your decisive action in ${currentScenario.deathContext} paid off. You found the way out just in time.`
            : `${currentScenario.deathContext} claimed you. Your action wasn't enough.`,
          stateChanges: {},
          resourceChanges: [],
          objectiveProgress: {},
          nextEvent: survived ? 'You made it out!' : 'Game over for this scenario.',
          continueGame: !survived,
        };
      }

      // ── Binary outcome: SURVIVED or DIED ──────────────────────────────────
      const survived =
        aiResponse.outcome === 'critical_success' ||
        aiResponse.outcome === 'success';
      const died = !survived; // any non-success = death in this mode

      const now = new Date();
      const scenarioStartTime = session.scenarioStartTime
        ? new Date(session.scenarioStartTime)
        : now;
      const secondsUsed = Math.max(1, Math.floor((now.getTime() - scenarioStartTime.getTime()) / 1000));
      const MAX_SECONDS = 120;
      // Speed bonus: 200 pts if instant, 0 pts if used all 120 s
      const speedBonus = Math.max(0, Math.floor(200 * (1 - secondsUsed / MAX_SECONDS)));

      const historyEntry = {
        id: generateUUID(),
        sessionId,
        scenarioIndex,
        scenarioTitle: currentScenario.title,
        playerAction: action,
        aiResponse,
        survived,
        secondsUsed,
        speedBonus,
        timestamp: now.toISOString(),
      };

      let newScenarioIndex = scenarioIndex;
      let newScenariosCleared = session.scenariosCleared ?? 0;
      let newAttemptsRemaining = session.attemptsRemaining ?? ROUND2_SCENARIOS.length;
      let newScore = session.score ?? 0;
      let newStatus = 'active';
      let gameOver = false;
      let newScenario = currentScenario;

      if (survived) {
        // ── Player cleared this scenario ──────────────────────────────────
        newScenariosCleared += 1;
        // Score: 400 base + speed bonus
        newScore += 400 + speedBonus;
        newScenarioIndex += 1;

        if (newScenarioIndex >= ROUND2_SCENARIOS.length) {
          // Cleared ALL 5 scenarios — perfect run!
          newStatus = 'survived';
          gameOver = true;
          console.log(`🏆 Player cleared ALL scenarios! Total score: ${newScore}`);
        } else {
          // Advance to next scenario
          newScenario = ROUND2_SCENARIOS[newScenarioIndex];
          console.log(`✅ Scenario ${scenarioIndex + 1} cleared → advancing to ${newScenario.title}`);
        }
      } else {
        // ── Player died on this scenario ──────────────────────────────────
        newAttemptsRemaining -= 1;
        // Still advance to next scenario (lose a life, keep going)
        newScenarioIndex += 1;

        if (newAttemptsRemaining <= 0 || newScenarioIndex >= ROUND2_SCENARIOS.length) {
          newStatus = 'dead';
          gameOver = true;
          console.log(`💀 Player died on scenario ${scenarioIndex + 1}, no more scenarios.`);
        } else {
          newScenario = ROUND2_SCENARIOS[newScenarioIndex];
          console.log(`💀 Died on "${currentScenario.title}" → next scenario: "${newScenario.title}"`);
        }
      }

      const updatedSession = {
        ...session,
        scenarioIndex: newScenarioIndex,
        scenariosCleared: newScenariosCleared,
        attemptsRemaining: newAttemptsRemaining,
        health: newAttemptsRemaining,
        score: newScore,
        scenario: gameOver ? session.scenario : newScenario,
        scenarioStartTime: gameOver ? session.scenarioStartTime : now.toISOString(),
        status: newStatus,
        endTime: gameOver ? now : undefined,
        history: [...(session.history ?? []), historyEntry],
        turn: (session.turn ?? 1) + 1,
      };

      sessionStore.update(sessionId, updatedSession);

      // Leaderboard broadcast (fire-and-forget)
      const actingUserId = req.user?.id || session.userId;
      const actingUsername = req.user?.username || session.username;
      if (actingUserId && actingUserId !== 'anonymous-user') {
        const timeTaken = Math.floor((now.getTime() - new Date(session.startTime).getTime()) / 1000);
        refreshAndBroadcastLeaderboard(actingUserId, actingUsername, 'survival', newScore, newStatus, timeTaken).catch(console.error);
      }

      res.json({
        success: true,
        data: {
          event: historyEntry,
          session: updatedSession,
          survived,
          died,
          scenarioCleared: survived,
          nextScenario: gameOver ? null : newScenario,
          isGameOver: gameOver,
          gameOverReason: gameOver ? newStatus : undefined,
          scenariosCleared: newScenariosCleared,
          speedBonus,
        },
        message: survived
          ? `✅ Survived "${currentScenario.title}"!`
          : `💀 Died in ${currentScenario.deathContext}`,
      });
    } catch (error) {
      console.error('❌ Action error:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to process action' });
    }
  }

  async takeAction(req: AuthRequest, res: Response) {
    return this.submitAction(req, res);
  }

  async getSessionState(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const stored = sessionStore.get(sessionId);
      if (!stored) {
        return res.status(404).json({ success: false, data: null, error: 'Session not found' });
      }
      const session = stored.data;
      // Return history separately so the frontend can restore the adventure log
      res.json({
        success: true,
        data: {
          session,
          history: session.history ?? [],
        },
        message: 'Session retrieved',
      });
    } catch (error) {
      res.status(500).json({ success: false, data: null, error: 'Failed to get session' });
    }
  }

  async getActiveScenarios(req: Request, res: Response) {
    try {
      res.json({ success: true, data: { scenarios: getStaticScenarios() }, message: 'Scenarios retrieved' });
    } catch (error) {
      res.status(500).json({ success: false, data: null, error: 'Failed to get scenarios' });
    }
  }

  async getUserSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id || 'anonymous-user';
      const all = sessionStore.getAll();
      const sessions = all
        .filter((s) => s.type === 'survival' && s.data.userId === userId)
        .map((s) => s.data);
      res.json({ success: true, data: { sessions }, message: 'Sessions retrieved' });
    } catch (error) {
      res.status(500).json({ success: false, data: null, error: 'Failed to get sessions' });
    }
  }
}

// ─── 5 survival scenarios (one per heart/life) ───────────────────────────────
export const ROUND2_SCENARIOS = [
  {
    id: 'sc-1-desert',
    index: 0,
    title: 'Desert Heat',
    emoji: '🏜️',
    environment: 'Scorching desert, midday sun, temperature 55°C',
    description: 'You wake up alone in a vast desert. No water. No shelter. The sun is directly overhead and you are already dehydrating. One smart move saves you — one wrong move buries you.',
    deathContext: 'the merciless desert',
    winCondition: 'Find water OR reach shade before total dehydration',
  },
  {
    id: 'sc-2-jungle',
    index: 1,
    title: 'Jungle Predator',
    emoji: '🌿',
    environment: 'Dense rainforest at dusk, apex predators active',
    description: 'You are deep in a jungle. A large predator is circling nearby. You can hear it in the undergrowth. One decisive action gets you to safety — hesitation or panic gets you killed.',
    deathContext: 'the jungle',
    winCondition: 'Escape the predator OR reach the river',
  },
  {
    id: 'sc-3-arctic',
    index: 2,
    title: 'Arctic Blizzard',
    emoji: '🧊',
    environment: 'Arctic tundra, -30°C blizzard, zero visibility',
    description: 'You are caught in a whiteout blizzard on the Arctic tundra. Frostbite sets in within minutes. Your shelter collapsed. One action keeps you alive — one wrong call and hypothermia takes you.',
    deathContext: 'the frozen tundra',
    winCondition: 'Build emergency shelter OR find the supply cache',
  },
  {
    id: 'sc-4-cave',
    index: 3,
    title: 'Cave Collapse',
    emoji: '🕳️',
    environment: 'Underground cave system, rapidly flooding',
    description: 'A cave you sheltered in is flooding fast. The entrance you came through is already submerged. Water is rising at knee level every 30 seconds. One correct path gets you out alive.',
    deathContext: 'the flooded cave',
    winCondition: 'Find the exit tunnel OR reach an air pocket high enough to survive',
  },
  {
    id: 'sc-5-city',
    index: 4,
    title: 'Burning Building',
    emoji: '🔥',
    environment: 'Collapsing skyscraper, floor 12, fire below and above',
    description: 'You are trapped on the 12th floor of a burning skyscraper. Stairs are blocked by fire. The floor is getting hotter. Smoke is filling the room. One smart exit strategy saves you.',
    deathContext: 'the burning building',
    winCondition: 'Reach the roof for helicopter rescue OR find the fireproof stairwell',
  },
];

// Legacy wrapper for getActiveScenarios route
function getStaticScenarios() {
  return ROUND2_SCENARIOS.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    environment: s.environment,
    difficulty: 'medium',
    category: 'Survival',
    maxTurns: 1,          // each scenario = exactly 1 action
    timeLimit: 120,       // 2 minutes per scenario
    objectives: [{ id: 'survive', title: s.winCondition, description: s.winCondition, isRequired: true, points: 400 }],
    isActive: true,
  }));
}
