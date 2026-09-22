import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ── Round state ────────────────────────────────────────────────────────────────
export const roundState = {
  status: 'inactive' as 'inactive' | 'active' | 'paused',
  type: null as 'promptle' | 'survival' | null,
  startedAt: null as Date | null,
};

// ── Broadcast helpers (set after setupSocketHandlers is called) ───────────────
let _io: SocketIOServer | null = null;

export function broadcastLeaderboardUpdate(leaderboard: any[]) {
  if (_io) {
    _io.emit('leaderboard_updated', leaderboard);
    console.log('📡 Broadcasted leaderboard update to all clients');
  }
}

export function broadcastRoundEvent(event: string, data: any) {
  if (_io) {
    _io.emit(event, data);
    console.log(`📡 Broadcasted ${event}:`, data);
  }
}

interface AuthenticatedSocket {
  id: string;
  user: User;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data?: any) => void) => void;
}

export function setupSocketHandlers(io: SocketIOServer) {
  _io = io;
  // Authentication middleware - made optional for development
  io.use((socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        // Allow connection without auth in development
        socket.user = {
          id: 'anonymous',
          email: 'anonymous@example.com',
          username: 'anonymous',
          role: 'participant',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return next();
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      socket.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username || decoded.email.split('@')[0],
        role: decoded.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      next();
    } catch (error) {
      // Allow connection even if token is invalid in development
      socket.user = {
        id: 'anonymous',
        email: 'anonymous@example.com', 
        username: 'anonymous',
        role: 'participant',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user.username} connected`);

    // Join user to their personal room
    socket.join(`user:${socket.user.id}`);

    // Join appropriate role-based rooms
    if (socket.user.role === 'admin') {
      socket.join('admins');
    } else {
      socket.join('participants');
    }

    // Handle joining game rooms
    socket.on('join_game', (data: { gameType: 'promptle' | 'survival'; sessionId: string }) => {
      const roomName = `${data.gameType}:${data.sessionId}`;
      socket.join(roomName);
      console.log(`User ${socket.user.username} joined ${roomName}`);
    });

    // Handle leaving game rooms
    socket.on('leave_game', (data: { gameType: 'promptle' | 'survival'; sessionId: string }) => {
      const roomName = `${data.gameType}:${data.sessionId}`;
      socket.leave(roomName);
      console.log(`User ${socket.user.username} left ${roomName}`);
    });

    // Handle real-time game events
    socket.on('game_action', (data: { type: string; payload: any }) => {
      // Broadcast game actions to relevant rooms
      // This would be integrated with the game engines
      console.log(`Game action from ${socket.user.username}:`, data);
    });

    // Handle admin events (if admin)
    if (socket.user.role === 'admin') {
      socket.on('admin_action', (data: { type: string; payload: any }) => {
        console.log(`Admin action from ${socket.user.username}:`, data);
        
        // Broadcast to all participants or specific groups
        switch (data.type) {
          case 'round_start':
            io.to('participants').emit('round_started', data.payload);
            break;
          case 'round_end':
            io.to('participants').emit('round_ended', data.payload);
            break;
          case 'round_pause':
            io.to('participants').emit('round_paused', data.payload);
            break;
          case 'round_resume':
            io.to('participants').emit('round_resumed', data.payload);
            break;
          default:
            console.log('Unknown admin action type:', data.type);
        }
      });

      // Round control from admin panel
      socket.on('round_control', (data: { action: 'start' | 'pause' | 'end' | 'reset'; type?: 'promptle' | 'survival' }) => {
        console.log(`Round control from ${socket.user.username}:`, data);

        switch (data.action) {
          case 'start':
            roundState.status = 'active';
            roundState.type = data.type || 'promptle';
            roundState.startedAt = new Date();
            io.emit('round_started', { type: roundState.type, startedAt: roundState.startedAt });
            break;
          case 'pause':
            if (roundState.status === 'active') {
              roundState.status = 'paused';
              io.emit('round_paused', { type: roundState.type });
            } else if (roundState.status === 'paused') {
              roundState.status = 'active';
              io.emit('round_resumed', { type: roundState.type });
            }
            break;
          case 'end':
            roundState.status = 'inactive';
            roundState.type = null;
            roundState.startedAt = null;
            io.emit('round_ended', { reason: 'admin_ended' });
            break;
          case 'reset':
            roundState.status = 'inactive';
            roundState.type = null;
            roundState.startedAt = null;
            io.emit('leaderboard_updated', []);
            break;
        }
      });
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.username} disconnected`);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to PROMPT X',
      user: socket.user,
    });
  });

  // Utility functions for broadcasting events from game engines
  const gameEventHandlers = {
    // Promptle events
    promptleGuessResult: (userId: string, sessionId: string, guessResult: any) => {
      io.to(`user:${userId}`).emit('promptle_guess_result', guessResult);
      io.to(`promptle:${sessionId}`).emit('promptle_guess_result', guessResult);
    },

    promptleCompleted: (userId: string, sessionId: string, session: any) => {
      io.to(`user:${userId}`).emit('promptle_completed', session);
      io.to(`promptle:${sessionId}`).emit('promptle_completed', session);
    },

    // Survival events
    survivalStateUpdated: (userId: string, sessionId: string, session: any) => {
      io.to(`user:${userId}`).emit('survival_state_updated', session);
      io.to(`survival:${sessionId}`).emit('survival_state_updated', session);
    },

    playerDamaged: (userId: string, damage: number, health: number) => {
      const eventData = { userId, damage, health };
      io.to(`user:${userId}`).emit('player_damaged', eventData);
      io.to('participants').emit('player_damaged', eventData);
    },

    playerEliminated: (userId: string, reason: string) => {
      const eventData = { userId, reason };
      io.to(`user:${userId}`).emit('player_eliminated', eventData);
      io.to('participants').emit('player_eliminated', eventData);
    },

    playerSurvived: (userId: string, score: number) => {
      const eventData = { userId, score };
      io.to(`user:${userId}`).emit('player_survived', eventData);
      io.to('participants').emit('player_survived', eventData);
    },

    // Leaderboard events
    leaderboardUpdated: (leaderboard: any[]) => {
      io.to('participants').emit('leaderboard_updated', leaderboard);
      io.to('admins').emit('leaderboard_updated', leaderboard);
    },

    // Admin monitoring events
    participantActivity: (participantData: any) => {
      io.to('admins').emit('participant_activity', participantData);
    },
  };

  // Export handlers for use in game engines
  (io as any).gameEvents = gameEventHandlers;

  return io;
}