import express from 'express';
import { authenticateToken, requireAdmin } from '@/utils/auth';
import { roundState, broadcastRoundEvent, broadcastLeaderboardUpdate } from '@/sockets/index';
import { aiQueue } from '@/utils/aiQueue';

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalParticipants: 0,
      activeParticipants: 0,
      completedRounds: 0,
      activeRounds: roundState.status === 'active' ? 1 : 0,
      roundStatus: roundState.status,
      roundType: roundState.type,
      aiQueue: aiQueue.getStatus(),
    },
  });
});

router.get('/round-status', (req, res) => {
  res.json({
    success: true,
    data: roundState,
  });
});

router.post('/round', (req, res) => {
  const { action, type } = req.body;

  switch (action) {
    case 'start':
      roundState.status = 'active';
      roundState.type = type || 'promptle';
      roundState.startedAt = new Date();
      broadcastRoundEvent('round_started', { type: roundState.type, startedAt: roundState.startedAt });
      break;
    case 'pause':
      if (roundState.status === 'active') {
        roundState.status = 'paused';
        broadcastRoundEvent('round_paused', { type: roundState.type });
      } else if (roundState.status === 'paused') {
        roundState.status = 'active';
        broadcastRoundEvent('round_resumed', { type: roundState.type });
      }
      break;
    case 'end':
      roundState.status = 'inactive';
      roundState.startedAt = null;
      broadcastRoundEvent('round_ended', { reason: 'admin_ended' });
      break;
    case 'reset':
      roundState.status = 'inactive';
      roundState.type = null;
      roundState.startedAt = null;
      broadcastLeaderboardUpdate([]);
      break;
    default:
      return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  res.json({ success: true, data: roundState, message: `Round ${action} successful` });
});

router.get('/participants', (req, res) => {
  res.json({ success: true, data: { participants: [] } });
});

router.post('/challenges', (req, res) => {
  res.json({ success: true, data: { challenge: { id: 'new-challenge-id' } } });
});

router.post('/scenarios', (req, res) => {
  res.json({ success: true, data: { scenario: { id: 'new-scenario-id' } } });
});

export default router;