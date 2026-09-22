import express from 'express';
import { SurvivalController } from '@/controllers/survivalController';
import { authenticateToken, optionalAuth, requireParticipant } from '@/utils/auth';

const router = express.Router();
const survivalController = new SurvivalController();

// Routes that need user identity (for leaderboard) but are still open
router.get('/scenarios', survivalController.getActiveScenarios.bind(survivalController));
router.post('/start', optionalAuth, survivalController.startScenario.bind(survivalController));
router.post('/sessions/:sessionId/action', optionalAuth, survivalController.submitAction.bind(survivalController));
// Session state fetch must be open so name-only players can restore after refresh
router.get('/sessions/:sessionId', optionalAuth, survivalController.getSessionState.bind(survivalController));
router.get('/sessions', optionalAuth, survivalController.getUserSessions.bind(survivalController));

// Protected routes require participant authentication
router.use(authenticateToken);
router.use(requireParticipant);

export default router;