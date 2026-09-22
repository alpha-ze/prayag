// Simple in-memory session store for development
interface GameSession {
  id: string;
  type: 'promptle' | 'survival';
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

class SessionStore {
  private sessions: Map<string, GameSession> = new Map();

  set(sessionId: string, type: 'promptle' | 'survival', data: any): void {
    const existing = this.sessions.get(sessionId);
    this.sessions.set(sessionId, {
      id: sessionId,
      type,
      data,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    });
  }

  get(sessionId: string): GameSession | null {
    return this.sessions.get(sessionId) || null;
  }

  update(sessionId: string, updates: Partial<any>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.data = { ...session.data, ...updates };
      session.updatedAt = new Date();
    }
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  clear(): void {
    this.sessions.clear();
  }

  getAll(): GameSession[] {
    return Array.from(this.sessions.values());
  }
}

export const sessionStore = new SessionStore();