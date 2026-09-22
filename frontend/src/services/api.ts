import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User, PromptelSession, SurvivalSession, LeaderboardEntry } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('prompt_x_token');
  console.log('🔑 API Request:', config.method?.toUpperCase(), config.url);
  console.log('🔑 Token available:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config?.method?.toUpperCase(), response.config?.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('prompt_x_token');
      localStorage.removeItem('prompt_x_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  loginByName: async (username: string): Promise<{ user: User; token: string }> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = await api.post('/auth/login-name', { username });
    return response.data.data!;
  },

  loginAdmin: async (pin: string): Promise<{ user: User; token: string }> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = await api.post('/auth/login-admin', { pin });
    return response.data.data!;
  },

  register: async (userData: { email: string; username: string; password: string }): Promise<{ user: User; token: string }> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = await api.post('/auth/register', userData);
    return response.data.data!;
  },

  login: async (credentials: { email: string; password: string }): Promise<{ user: User; token: string }> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = await api.post('/auth/login', credentials);
    return response.data.data!;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getProfile: async (): Promise<User> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await api.get('/auth/profile');
    return response.data.data!.user;
  },

  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await api.put('/auth/profile', updates);
    return response.data.data!.user;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },
};

// Promptle API
export const promptleAPI = {
  startChallenge: async (challengeId: string, roundId?: string): Promise<PromptelSession> => {
    const response: AxiosResponse<ApiResponse<{ session: PromptelSession }>> = await api.post('/promptle/start', { challengeId, roundId });
    return response.data.data!.session;
  },

  submitGuess: async (sessionId: string, guess: string): Promise<{
    guess: any;
    session: PromptelSession;
    isGameComplete: boolean;
  }> => {
    const response: AxiosResponse<ApiResponse<{
      guess: any;
      session: PromptelSession;
      isGameComplete: boolean;
    }>> = await api.post(`/promptle/sessions/${sessionId}/guess`, { guess });
    return response.data.data!;
  },

  useHint: async (sessionId: string): Promise<{
    hint: string;
    hintsRemaining: number;
    session: PromptelSession;
  }> => {
    const response: AxiosResponse<ApiResponse<{
      hint: string;
      hintsRemaining: number;
      session: PromptelSession;
    }>> = await api.post(`/promptle/sessions/${sessionId}/hint`);
    return response.data.data!;
  },

  getSessionState: async (sessionId: string): Promise<{
    session: PromptelSession;
    challenge: any;
    guesses: any[];
  }> => {
    const response: AxiosResponse<ApiResponse<{
      session: PromptelSession;
      challenge: any;
      guesses: any[];
    }>> = await api.get(`/promptle/sessions/${sessionId}`);
    return response.data.data!;
  },

  getActiveChallenges: async (): Promise<any[]> => {
    const response: AxiosResponse<ApiResponse<{ challenges: any[] }>> = await api.get('/promptle/challenges');
    return response.data.data!.challenges;
  },

  getUserSessions: async (roundId?: string): Promise<PromptelSession[]> => {
    const params = roundId ? { roundId } : {};
    const response: AxiosResponse<ApiResponse<{ sessions: PromptelSession[] }>> = await api.get('/promptle/sessions', { params });
    return response.data.data!.sessions;
  },
};

// Survival API
export const survivalAPI = {
  startScenario: async (scenarioId: string, roundId?: string): Promise<SurvivalSession> => {
    const response: AxiosResponse<ApiResponse<{ session: SurvivalSession }>> = await api.post('/survival/start', { scenarioId, roundId });
    return response.data.data!.session;
  },

  submitAction: async (sessionId: string, action: string): Promise<{
    event: any;
    session: SurvivalSession;
    isGameOver: boolean;
    gameOverReason?: string;
  }> => {
    const response: AxiosResponse<ApiResponse<{
      event: any;
      session: SurvivalSession;
      isGameOver: boolean;
      gameOverReason?: string;
    }>> = await api.post(`/survival/sessions/${sessionId}/action`, { action });
    return response.data.data!;
  },

  getSessionState: async (sessionId: string): Promise<{
    session: SurvivalSession;
    scenario: any;
    history: any[];
  }> => {
    const response: AxiosResponse<ApiResponse<{
      session: SurvivalSession;
      scenario: any;
      history: any[];
    }>> = await api.get(`/survival/sessions/${sessionId}`);
    return response.data.data!;
  },

  getActiveScenarios: async (): Promise<any[]> => {
    const response: AxiosResponse<ApiResponse<{ scenarios: any[] }>> = await api.get('/survival/scenarios');
    return response.data.data!.scenarios;
  },

  getUserSessions: async (roundId?: string): Promise<SurvivalSession[]> => {
    const params = roundId ? { roundId } : {};
    const response: AxiosResponse<ApiResponse<{ sessions: SurvivalSession[] }>> = await api.get('/survival/sessions', { params });
    return response.data.data!.sessions;
  },
};

// Leaderboard API
export const leaderboardAPI = {
  getLeaderboard: async (roundId?: string): Promise<LeaderboardEntry[]> => {
    const params = roundId ? { roundId } : {};
    const response: AxiosResponse<ApiResponse<LeaderboardEntry[]>> = await api.get('/leaderboard', { params });
    return response.data.data!;
  },

  removePlayer: async (playerId: string): Promise<void> => {
    await api.delete(`/leaderboard/player/${playerId}`);
  },

  clearLeaderboard: async (): Promise<void> => {
    await api.delete('/leaderboard/clear');
  },
};

// Admin API
export const adminAPI = {
  getStats: async (): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/admin/stats');
    return response.data.data!;
  },

  getRoundStatus: async (): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/admin/round-status');
    return response.data.data!;
  },

  startRound: async (type: 'promptle' | 'survival'): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.post('/admin/round', { action: 'start', type });
    return response.data.data!;
  },

  pauseRound: async (): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.post('/admin/round', { action: 'pause' });
    return response.data.data!;
  },

  endRound: async (): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.post('/admin/round', { action: 'end' });
    return response.data.data!;
  },
};

export default api;