import express from 'express';
import { PromptelController } from '@/controllers/promptleController';
import { authenticateToken, optionalAuth, requireParticipant } from '@/utils/auth';

const router = express.Router();
const promptleController = new PromptelController();

// Routes that need the user identity (for leaderboard) but are still open
router.get('/challenges', promptleController.getActiveChallenges.bind(promptleController));
router.post('/start', optionalAuth, promptleController.startChallenge.bind(promptleController));
router.post('/sessions/:sessionId/guess', optionalAuth, promptleController.submitGuess.bind(promptleController));
router.post('/sessions/:sessionId/hint', optionalAuth, promptleController.useHint.bind(promptleController));
// Session state fetch is open so name-only players can restore after refresh
router.get('/sessions/:sessionId', optionalAuth, promptleController.getSessionState.bind(promptleController));
router.get('/sessions', optionalAuth, promptleController.getUserSessions.bind(promptleController));

// Protected routes require participant authentication
router.use(authenticateToken);
router.use(requireParticipant);

export default router;