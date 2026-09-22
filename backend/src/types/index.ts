export interface User {
  id: string;
  email: string;
  username: string;
  role: 'participant' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Round {
  id: string;
  name: string;
  type: 'promptle' | 'survival';
  status: 'pending' | 'active' | 'paused' | 'completed';
  startTime?: Date;
  endTime?: Date;
  maxParticipants: number;
  settings: RoundSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoundSettings {
  timeLimit?: number; // in seconds
  maxChallenges?: number;
  scoringMultiplier?: number;
}

// ROUND 1 - PROMPTLE TYPES
export interface Challenge {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  generationPrompt: string;
  keywords: ChallengeKeyword[];
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string;
  maxGuesses: number;
  timeLimit: number; // in seconds
  scoring: ChallengeScoring;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeKeyword {
  id: string;
  challengeId: string;
  keyword: string;
  aliases: string[];
  isRequired: boolean;
  points: number;
}

export interface ChallengeScoring {
  baseScore: number;
  correctBonus: number;
  completionBonus: number;
  timeBonus: number;
  wrongPenalty: number;
  hintPenalty: number;
}

export interface PromptelGameSession {
  id: string;
  userId: string;
  challengeId: string;
  roundId?: string;
  status: 'active' | 'completed' | 'failed';
  discoveredKeywords: string[];
  guesses: PromptelGuess[];
  remainingGuesses: number;
  score: number;
  hintUsed: boolean;
  startTime: Date;
  endTime?: Date;
  timeRemaining: number;
}

export interface PromptelGuess {
  id: string;
  sessionId: string;
  guess: string;
  isCorrect: boolean;
  isSoClose: boolean;
  matchedKeyword?: string;
  timestamp: Date;
  scoreChange: number;
}

// ROUND 2 - SURVIVAL TYPES
export interface Scenario {
  id: string;
  title: string;
  description: string;
  environment: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string;
  startingLocation: string;
  startingHealth: number;
  maxHealth: number;
  startingInventory: InventoryItem[];
  objectives: ScenarioObjective[];
  maxTurns: number;
  timeLimit?: number; // in seconds
  scoring: SurvivalScoring;
  rules: ScenarioRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioObjective {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  points: number;
  isCompleted?: boolean;
}

export interface ScenarioRule {
  id: string;
  type: string;
  description: string;
  parameters: Record<string, any>;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  condition?: number; // 0-100
  properties?: Record<string, any>;
}

export interface SurvivalScoring {
  baseScore: number;
  successBonus: number;
  partialSuccessBonus: number;
  failurePenalty: number;
  objectiveBonus: number;
  survivalBonus: number;
  timeBonus: number;
}

export interface SurvivalGameSession {
  id: string;
  userId: string;
  scenarioId: string;
  roundId?: string;
  status: 'active' | 'survived' | 'dead' | 'timeout' | 'turn_limit' | 'eliminated';
  currentLocation: string;
  health: number;
  maxHealth: number;
  inventory: InventoryItem[];
  score: number;
  turn: number;
  maxTurns: number;
  remainingPrompts: number;
  timeRemaining: number;
  objectives: ScenarioObjective[];
  completedObjectives: string[];
  discoveredInformation: string[];
  history: SurvivalEvent[];
  startTime: Date;
  endTime?: Date;
}

export interface SurvivalEvent {
  id: string;
  sessionId: string;
  turn: number;
  playerAction: string;
  aiResponse: SurvivalAIResponse;
  gameStateChanges: Record<string, any>;
  timestamp: Date;
}

export interface SurvivalAIResponse {
  outcome: 'success' | 'partial_success' | 'failure' | 'critical_success' | 'critical_failure';
  damage: number;
  scoreChange: number;
  reason: string;
  stateChanges: Record<string, any>;
  resourceChanges: Array<{
    resource: string;
    change: number;
  }>;
  objectiveProgress: Record<string, number>;
  nextEvent: string;
  continueGame: boolean;
}

// LEADERBOARD TYPES
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalScore: number;
  roundScores: Record<string, number>;
  status: 'active' | 'completed' | 'eliminated';
  lastActivity: Date;
  roundDetails?: {
    promptle?: {
      challengesCompleted: number;
      totalGuesses: number;
      hintsUsed: number;
    };
    survival?: {
      scenariosCompleted: number;
      totalActions: number;
      health: number;
      status: string;
    };
  };
}

// API TYPES
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// SOCKET TYPES
export interface SocketEvents {
  // Round events
  round_started: Round;
  round_paused: Round;
  round_resumed: Round;
  round_ended: Round;
  
  // Promptle events
  promptle_started: PromptelGameSession;
  promptle_guess_result: PromptelGuess;
  promptle_completed: PromptelGameSession;
  
  // Survival events
  survival_started: SurvivalGameSession;
  survival_state_updated: SurvivalGameSession;
  player_damaged: { userId: string; damage: number; health: number };
  player_survived: { userId: string; score: number };
  player_eliminated: { userId: string; reason: string };
  
  // Leaderboard events
  leaderboard_updated: LeaderboardEntry[];
}

// ADMIN TYPES
export interface AdminStats {
  totalParticipants: number;
  activeParticipants: number;
  completedRounds: number;
  activeRounds: number;
  totalChallenges: number;
  totalScenarios: number;
}

export interface ParticipantActivity {
  userId: string;
  username: string;
  currentRound?: string;
  currentChallenge?: string;
  currentScenario?: string;
  status: string;
  score: number;
  lastAction: Date;
}