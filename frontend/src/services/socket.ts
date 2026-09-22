import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@/types';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.token = token;
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

    this.socket = io(WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to PROMPT X server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  // Game room management
  joinGame(gameType: 'promptle' | 'survival', sessionId: string): void {
    if (this.socket) {
      this.socket.emit('join_game', { gameType, sessionId });
    }
  }

  leaveGame(gameType: 'promptle' | 'survival', sessionId: string): void {
    if (this.socket) {
      this.socket.emit('leave_game', { gameType, sessionId });
    }
  }

  // Event listeners
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Send game actions
  sendGameAction(type: string, payload: any): void {
    if (this.socket) {
      this.socket.emit('game_action', { type, payload });
    }
  }

  // Admin functions
  sendAdminAction(type: string, payload: any): void {
    if (this.socket) {
      this.socket.emit('admin_action', { type, payload });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();