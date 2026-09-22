import { create } from 'zustand';
import { PromptelSession, SurvivalSession, Challenge, Scenario } from '@/types';
import { promptleAPI, survivalAPI } from '@/services/api';

// ── localStorage keys ─────────────────────────────────────────────────────────
const LS_PROMPTLE  = 'px_active_promptle_session';
const LS_SURVIVAL  = 'px_active_survival_session';

function savePrompteSessionId(sessionId: string, challengeId: string) {
  localStorage.setItem(LS_PROMPTLE, JSON.stringify({ sessionId, challengeId }));
}

function saveSurvivalSessionId(sessionId: string, scenarioId: string) {
  localStorage.setItem(LS_SURVIVAL, JSON.stringify({ sessionId, scenarioId }));
}

export function clearPromptelSession() {
  localStorage.removeItem(LS_PROMPTLE);
}

export function clearSurvivalSession() {
  localStorage.removeItem(LS_SURVIVAL);
}

export function getSavedPromptelSession(): { sessionId: string; challengeId: string } | null {
  try {
    const raw = localStorage.getItem(LS_PROMPTLE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getSavedSurvivalSession(): { sessionId: string; scenarioId: string } | null {
  try {
    const raw = localStorage.getItem(LS_SURVIVAL);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Store interface ───────────────────────────────────────────────────────────
interface GameStore {
  // Promptle state
  currentPromptelSession: PromptelSession | null;
  promptelChallenges: Challenge[];
  promptelGuesses: any[];

  // Survival state
  currentSurvivalSession: SurvivalSession | null;
  survivalScenarios: Scenario[];
  survivalHistory: any[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Promptle actions
  startPromptelChallenge: (challengeId: string, roundId?: string) => Promise<void>;
  restorePromptelSession: (sessionId: string) => Promise<boolean>;
  submitPromptelGuess: (guess: string) => Promise<{ isCorrect: boolean; isSoClose: boolean; isGameComplete: boolean; extractedToken?: string }>;
  usePromptelHint: () => Promise<{ hint: string; hintsRemaining: number }>;
  loadPromptelChallenges: () => Promise<void>;
  resetPromptelSession: () => void;

  // Survival actions
  startSurvivalScenario: (scenarioId: string, roundId?: string) => Promise<void>;
  restoreSurvivalSession: (sessionId: string) => Promise<boolean>;
  submitSurvivalAction: (action: string) => Promise<{ isGameOver: boolean; gameOverReason?: string }>;
  loadSurvivalScenarios: () => Promise<void>;
  resetSurvivalSession: () => void;

  // Utility actions
  clearError: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ── Initial state ───────────────────────────────────────────────────────────
  currentPromptelSession: null,
  promptelChallenges: [],
  promptelGuesses: [],
  currentSurvivalSession: null,
  survivalScenarios: [],
  survivalHistory: [],
  isLoading: false,
  error: null,

  // ── Promptle ────────────────────────────────────────────────────────────────
  startPromptelChallenge: async (challengeId, roundId) => {
    set({ isLoading: true, error: null });
    try {
      const session = await promptleAPI.startChallenge(challengeId, roundId);
      savePrompteSessionId(session.id, challengeId);
      set({ currentPromptelSession: session, promptelGuesses: [], isLoading: false });
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Failed to start challenge';
      set({ error: msg, isLoading: false });
      throw error;
    }
  },

  // Restore an existing promptle session from the backend.
  // Returns true if the session was found and still active, false otherwise.
  restorePromptelSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await promptleAPI.getSessionState(sessionId);
      if (!data?.session) { clearPromptelSession(); set({ isLoading: false }); return false; }

      const session: PromptelSession = data.session;
      // Only restore if still in-progress
      if (session.status !== 'active') {
        clearPromptelSession();
        set({ isLoading: false });
        return false;
      }

      // Rebuild guess list from session data if available
      const guesses: any[] = data.guesses ?? [];
      set({ currentPromptelSession: session, promptelGuesses: guesses, isLoading: false });
      return true;
    } catch {
      clearPromptelSession();
      set({ isLoading: false });
      return false;
    }
  },

  submitPromptelGuess: async (guess) => {
    const { currentPromptelSession } = get();
    if (!currentPromptelSession) throw new Error('No active promptle session');
    set({ isLoading: true, error: null });
    try {
      const result = await promptleAPI.submitGuess(currentPromptelSession.id, guess);
      const updatedSession = { ...currentPromptelSession, ...result.session };
      set((state) => ({
        currentPromptelSession: updatedSession,
        promptelGuesses: [...state.promptelGuesses, result.guess],
        isLoading: false,
      }));
      return {
        isCorrect: result.guess.isCorrect,
        isSoClose: result.guess.isSoClose,
        isGameComplete: result.isGameComplete,
        extractedToken: result.guess.extractedToken,
      };
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit guess', isLoading: false });
      throw error;
    }
  },

  usePromptelHint: async () => {
    const { currentPromptelSession } = get();
    if (!currentPromptelSession) throw new Error('No active promptle session');
    set({ isLoading: true, error: null });
    try {
      const result = await promptleAPI.useHint(currentPromptelSession.id);
      set({ currentPromptelSession: result.session, isLoading: false });
      return { hint: result.hint, hintsRemaining: result.hintsRemaining };
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to use hint', isLoading: false });
      throw error;
    }
  },

  loadPromptelChallenges: async () => {
    set({ isLoading: true, error: null });
    try {
      const challenges = await promptleAPI.getActiveChallenges();
      set({ promptelChallenges: challenges, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load challenges', isLoading: false });
    }
  },

  resetPromptelSession: () => {
    set({ currentPromptelSession: null, promptelGuesses: [] });
  },

  // ── Survival ────────────────────────────────────────────────────────────────
  startSurvivalScenario: async (scenarioId, roundId) => {
    set({ isLoading: true, error: null });
    try {
      const session = await survivalAPI.startScenario(scenarioId, roundId);
      saveSurvivalSessionId(session.id, scenarioId);
      set({ currentSurvivalSession: session, survivalHistory: [], isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start scenario', isLoading: false });
      throw error;
    }
  },

  // Restore an existing survival session from the backend.
  // Returns true if the session was found and still active, false otherwise.
  restoreSurvivalSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await survivalAPI.getSessionState(sessionId);
      if (!data?.session) { clearSurvivalSession(); set({ isLoading: false }); return false; }

      const session: SurvivalSession = data.session;
      if (session.status !== 'active') {
        clearSurvivalSession();
        set({ isLoading: false });
        return false;
      }

      // Restore history events if the backend returned them
      const history: any[] = data.history ?? [];
      set({ currentSurvivalSession: session, survivalHistory: history, isLoading: false });
      return true;
    } catch {
      clearSurvivalSession();
      set({ isLoading: false });
      return false;
    }
  },

  submitSurvivalAction: async (action) => {
    const { currentSurvivalSession } = get();
    if (!currentSurvivalSession) throw new Error('No active survival session');
    set({ isLoading: true, error: null });
    try {
      const result = await survivalAPI.submitAction(currentSurvivalSession.id, action);
      const updatedSession = { ...currentSurvivalSession, ...result.session };
      set((state) => ({
        currentSurvivalSession: updatedSession,
        survivalHistory: result.event ? [...state.survivalHistory, result.event] : state.survivalHistory,
        isLoading: false,
      }));
      // Return the full result including new fields (survived, speedBonus, etc.)
      return result as any;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to submit action', isLoading: false });
      throw error;
    }
  },

  loadSurvivalScenarios: async () => {
    set({ isLoading: true, error: null });
    try {
      const scenarios = await survivalAPI.getActiveScenarios();
      set({ survivalScenarios: scenarios, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load scenarios', isLoading: false });
    }
  },

  resetSurvivalSession: () => {
    set({ currentSurvivalSession: null, survivalHistory: [] });
  },

  clearError: () => set({ error: null }),
}));
