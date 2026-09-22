// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'participant' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Game types
export interface Challenge {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string;
  maxGuesses: number;
  timeLimit: number;
}

export interface PromptelSession {
  id: string;
  userId: string;
  challengeId: string;
  roundId?: string;
  status: 'active' | 'completed' | 'failed';
  discoveredKeywords: string[];
  remainingGuesses: number;
  score: number;
  hintUsed: boolean;
  startTime: string;
  endTime?: string;
  timeRemaining: number;
}

export interface PromptelGuess {
  id: string;
  sessionId: string;
  guess: string;
  isCorrect: boolean;
  isSoClose: boolean;
  matchedKeyword?: string;
  timestamp: string;
  scoreChange: number;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  environment: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string;
  maxTurns: number;
  timeLimit?: number;
  objectives: ScenarioObjective[];
}

export interface ScenarioObjective {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  points: number;
  isCompleted?: boolean;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  condition?: number;
  properties?: Record<string, any>;
}

export interface SurvivalSession {
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
  timeRemaining?: number;
  objectives: ScenarioObjective[];
  completedObjectives: string[];
  discoveredInformation: string[];
  startTime: string;
  endTime?: string;
}

export interface SurvivalEvent {
  id: string;
  sessionId: string;
  turn: number;
  playerAction: string;
  aiResponse: {
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
  };
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalScore: number;
  status: 'active' | 'completed' | 'eliminated';
  lastActivity: string;
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

// UI Component types
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Game UI types
export interface GameTimerProps {
  timeRemaining: number;
  totalTime: number;
  onTimeUp?: () => void;
}

export interface HealthBarProps {
  current: number;
  max: number;
  animated?: boolean;
}

export interface ScoreDisplayProps {
  score: number;
  animated?: boolean;
  showChange?: number;
}

export interface InventoryDisplayProps {
  items: InventoryItem[];
  compact?: boolean;
}

// Socket event types
export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  
  // Game events
  round_started: (data: any) => void;
  round_ended: (data: any) => void;
  promptle_guess_result: (data: PromptelGuess) => void;
  survival_state_updated: (data: SurvivalSession) => void;
  leaderboard_updated: (data: LeaderboardEntry[]) => void;
  
  // Player events
  player_damaged: (data: { userId: string; damage: number; health: number }) => void;
  player_eliminated: (data: { userId: string; reason: string }) => void;
}