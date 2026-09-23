import { Request, Response } from 'express';
import { promptleStartSchema } from '@/utils/validation';
import { AuthRequest } from '@/utils/auth';
import { AIService } from '@/services/aiService';
import { sessionStore } from '@/utils/sessionStore';
import {
  savePromptelSession,
  updatePromptelSession,
  savePromptelGuess,
  upsertLeaderboardEntry,
  getLeaderboardEntries,
} from '@/services/dbService';
import { broadcastLeaderboardUpdate } from '@/sockets/index';

const aiService = new AIService();

// Upsert + broadcast in one shot
async function refreshAndBroadcastLeaderboard(
  userId: string,
  username: string,
  type: 'promptle' | 'survival',
  score: number,
  status: string,
  timeTaken?: number
): Promise<void> {
  try {
    await upsertLeaderboardEntry(userId, username, type, score, status, timeTaken);
    const entries = await getLeaderboardEntries();
    const leaderboard = entries.map((entry: any, index: number) => ({
      rank: index + 1,
      userId: entry.user_id,
      username: entry.username || entry.user_id,
      totalScore: entry.total_score ?? 0,
      roundScores: entry.round_scores ?? {},
      status: entry.status ?? 'active',
      lastActivity: entry.last_activity ? new Date(entry.last_activity) : new Date(),
      roundDetails: entry.round_details ?? {},
      timeTaken: entry.time_taken ?? null,
    }));
    broadcastLeaderboardUpdate(leaderboard);
  } catch (err) {
    console.error('❌ refreshAndBroadcastLeaderboard error:', err);
  }
}

// Helper to generate a proper UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── Per-challenge hints (clues, never the answer words) ─────────────────────
const CHALLENGE_HINTS: Record<string, string[]> = {
  '00000000-0000-0000-0000-000000000001': [
    '💡 Think about what you see when you look up on a clear night far from any city',
    '💡 One of these things carries astronauts beyond Earth\'s atmosphere',
    '💡 Consider the massive spinning systems of billions of suns stretching across the universe',
  ],
  '00000000-0000-0000-0000-000000000002': [
    '💡 Think about the vast body of salt water that covers most of our planet',
    '💡 Consider the colourful living structures built by tiny organisms on the sea floor',
    '💡 Think about the most feared predator lurking in deep water',
  ],
  '00000000-0000-0000-0000-000000000003': [
    '💡 Think about a large medieval stone structure with towers where royalty lived',
    '💡 Consider a portable light source carried by hand, often with a flame inside glass',
    '💡 Think about what a bolt of electricity from the sky during a storm is called',
  ],
};
const CHALLENGE_KEYWORDS: Record<string, Array<{ keyword: string; aliases: string[]; is_required: boolean; points: number }>> = {
  '00000000-0000-0000-0000-000000000001': [
    { keyword: 'space',   aliases: ['cosmos', 'outer space'], is_required: true,  points: 100 },
    { keyword: 'star',    aliases: ['stars', 'starlight'],    is_required: true,  points: 100 },
    { keyword: 'galaxy',  aliases: ['milky way'],             is_required: true,  points: 100 },
    { keyword: 'planet',  aliases: ['planets'],               is_required: false, points: 100 },
    { keyword: 'rocket',  aliases: ['spacecraft', 'shuttle'], is_required: false, points: 100 },
  ],
  '00000000-0000-0000-0000-000000000002': [
    { keyword: 'ocean',   aliases: ['sea', 'deep sea'],       is_required: true,  points: 100 },
    { keyword: 'fish',    aliases: ['marine', 'aquatic'],     is_required: true,  points: 100 },
    { keyword: 'coral',   aliases: ['reef', 'coral reef'],    is_required: true,  points: 100 },
    { keyword: 'wave',    aliases: ['waves', 'surf'],         is_required: false, points: 100 },
    { keyword: 'shark',   aliases: ['whale', 'dolphin'],      is_required: false, points: 100 },
  ],
  '00000000-0000-0000-0000-000000000003': [
    { keyword: 'castle',  aliases: ['fortress', 'palace'],    is_required: true,  points: 100 },
    { keyword: 'lantern', aliases: ['lamp', 'light'],         is_required: true,  points: 100 },
    { keyword: 'forest',  aliases: ['trees', 'woods'],        is_required: true,  points: 100 },
    { keyword: 'clock',   aliases: ['time', 'watch'],         is_required: false, points: 100 },
    { keyword: 'storm',   aliases: ['lightning', 'thunder'],  is_required: false, points: 100 },
  ],
};

const FALLBACK_KEYWORDS = CHALLENGE_KEYWORDS['00000000-0000-0000-0000-000000000001'];

export class PromptelController {
  async startChallenge(req: AuthRequest, res: Response) {
    try {
      const user = req.user || {
        id: 'anonymous-user',
        email: 'anonymous@example.com',
        username: 'anonymous',
        role: 'participant' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { challengeId } = promptleStartSchema.parse(req.body);
      const { roundId } = req.body;

      const sessionId = generateUUID();

      const sessionData: any = {
        id: sessionId,
        userId: user.id,
        username: user.username,
        challengeId,
        roundId: roundId || undefined,
        status: 'active',
        discoveredKeywords: [],
        guesses: [],
        remainingGuesses: 8,
        score: 0,
        hintUsed: false,
        startTime: new Date(),
        endTime: undefined,
        timeRemaining: 300,
        keywords: CHALLENGE_KEYWORDS[challengeId] ?? FALLBACK_KEYWORDS,
      };

      // Store in sessionStore as primary state
      sessionStore.set(sessionId, 'promptle', sessionData);

      // Persist to Supabase only for real users (fire-and-forget)
      if (user.id !== 'anonymous-user') {
        savePromptelSession({
          id: sessionId,
          user_id: user.id,
          challenge_id: challengeId,
          round_id: roundId || null,
          status: 'active',
          discovered_keywords: [],
          remaining_guesses: 8,
          score: 0,
          hint_used: false,
          start_time: new Date().toISOString(),
          time_remaining: 300,
        }).catch(console.error);
      }

      console.log('✅ Promptle session created:', sessionId);

      res.json({ success: true, data: { session: sessionData }, message: 'Challenge started' });
    } catch (error) {
      console.error('❌ Start challenge error:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to start challenge' });
    }
  }

  async submitGuess(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.sessionId;
      const { guess } = req.body;

      if (!guess) {
        return res.status(400).json({ success: false, data: null, error: 'Guess is required' });
      }

      console.log('🎯 Promptle guess - session:', sessionId, 'guess:', guess);

      const stored = sessionStore.get(sessionId);
      if (!stored || stored.type !== 'promptle') {
        return res.status(404).json({ success: false, data: null, error: 'Session not found' });
      }

      const session = stored.data;

      if (session.status !== 'active') {
        return res.status(400).json({ success: false, data: null, error: 'Session is no longer active' });
      }

      const lowerGuess = guess.toLowerCase().trim();
      const keywords: any[] = session.keywords ?? FALLBACK_KEYWORDS;

      let isCorrect = false;
      let matchedKeyword: string | null = null;
      let scoreChange = -10;
      let extractedToken = lowerGuess; // what we actually matched against

      // ── Sentence-mode matching ────────────────────────────────────────────
      // Players may type a full sentence. We scan every 1-word and 2-word
      // token from the sentence against all keywords (exact + alias).
      // First hit wins — the sentence still costs one guess.
      const words = lowerGuess.split(/\s+/).filter(Boolean);
      const tokens: string[] = [...words];
      // also try consecutive pairs: "coral reef", "outer space", etc.
      for (let i = 0; i < words.length - 1; i++) {
        tokens.push(`${words[i]} ${words[i + 1]}`);
      }

      outer:
      for (const token of tokens) {
        for (const kw of keywords) {
          const kwLower = kw.keyword.toLowerCase();
          // exact token match
          if (kwLower === token) {
            isCorrect = true;
            matchedKeyword = kw.keyword;
            scoreChange = kw.points ?? 100;
            extractedToken = token;
            break outer;
          }
          // alias match
          if (Array.isArray(kw.aliases)) {
            for (const alias of kw.aliases) {
              if (alias.toLowerCase() === token) {
                isCorrect = true;
                matchedKeyword = kw.keyword;
                scoreChange = kw.points ?? 100;
                extractedToken = token;
                break outer;
              }
            }
          }
        }
      }

      // ── AI similarity check on each token if no exact hit ─────────────────
      let isSoClose = false;
      if (!isCorrect) {
        const keywordStrings = keywords.map((k: any) => k.keyword);
        for (const token of tokens) {
          try {
            const result = await aiService.checkSimilarity(token, keywordStrings);
            if (result.isSoClose) {
              isSoClose = true;
              extractedToken = token;
              scoreChange = 10;
              break;
            }
          } catch {/* ignore individual failures */}
        }
      }

      // Update discovered keywords
      const discovered = [...(session.discoveredKeywords ?? [])];
      if (isCorrect && matchedKeyword && !discovered.includes(matchedKeyword)) {
        discovered.push(matchedKeyword);
      }

      const newRemainingGuesses = Math.max(0, (session.remainingGuesses ?? 8) - 1);
      const newScore = (session.score ?? 0) + scoreChange;
      const totalKeywords = keywords.length;
      const isGameComplete = discovered.length >= totalKeywords || newRemainingGuesses <= 0;
      const newStatus = isGameComplete
        ? discovered.length >= totalKeywords ? 'completed' : 'failed'
        : 'active';

      // Update sessionStore — also append guess to session.guesses for restore
      const timeTaken = Math.max(0, 300 - (session.timeRemaining ?? 300));
      sessionStore.update(sessionId, {
        discoveredKeywords: discovered,
        remainingGuesses: newRemainingGuesses,
        score: newScore,
        status: newStatus,
        timeTaken,
        endTime: isGameComplete ? new Date() : undefined,
        guesses: [...(session.guesses ?? []), {
          guess: lowerGuess,
          extractedToken,
          isCorrect,
          isSoClose,
          matchedKeyword,
          scoreChange,
          timestamp: new Date().toISOString(),
        }],
      });

      const newGuess = {
        id: generateUUID(),
        sessionId,
        guess: lowerGuess,
        extractedToken,
        isCorrect,
        isSoClose,
        matchedKeyword,
        scoreChange,
        timestamp: new Date().toISOString(),
      };

      // Persist to Supabase only for real users (fire-and-forget)
      const actingUserId = req.user?.id || session.userId;
      const actingUsername = req.user?.username || session.username;

      if (actingUserId && actingUserId !== 'anonymous-user') {
        savePromptelGuess({
          session_id: sessionId,
          guess: lowerGuess,
          is_correct: isCorrect,
          is_so_close: isSoClose,
          matched_keyword: matchedKeyword,
          score_change: scoreChange,
        }).catch(console.error);

        updatePromptelSession(sessionId, {
          discovered_keywords: discovered,
          remaining_guesses: newRemainingGuesses,
          score: newScore,
          status: newStatus,
          end_time: isGameComplete ? new Date().toISOString() : null,
        }).catch(console.error);

        // Pass timeTaken so the leaderboard can sort qualifiers by speed
        const timeTaken = Math.max(0, 300 - (session.timeRemaining ?? 300));
        refreshAndBroadcastLeaderboard(actingUserId, actingUsername, 'promptle', newScore, newStatus, timeTaken).catch(console.error);
      }

      const updatedSession = {
        ...session,
        discoveredKeywords: discovered,
        remainingGuesses: newRemainingGuesses,
        score: newScore,
        status: newStatus,
      };

      res.json({
        success: true,
        data: { guess: newGuess, session: updatedSession, isGameComplete },
        message: isCorrect
          ? isGameComplete ? '🎉 Challenge Complete!' : 'Correct!'
          : isSoClose ? 'So close!' : 'Try again',
      });
    } catch (error) {
      console.error('❌ Guess error:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to process guess' });
    }
  }

  async useHint(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.sessionId;
      const stored = sessionStore.get(sessionId);

      if (!stored || stored.type !== 'promptle') {
        return res.status(404).json({ success: false, data: null, error: 'Session not found' });
      }

      const session = stored.data;

      // Allow up to 3 hints per session, each costs 25 pts
      const hintsUsed: number = session.hintsUsed ?? (session.hintUsed ? 1 : 0);
      const hints = CHALLENGE_HINTS[session.challengeId] ?? CHALLENGE_HINTS['00000000-0000-0000-0000-000000000001'];

      if (hintsUsed >= hints.length) {
        return res.status(400).json({ success: false, data: null, error: 'No more hints available' });
      }

      const hint = hints[hintsUsed];
      const newHintsUsed = hintsUsed + 1;
      const newScore = Math.max(0, (session.score ?? 0) - 25);

      sessionStore.update(sessionId, {
        hintsUsed: newHintsUsed,
        hintUsed: true,   // keep legacy flag in sync
        score: newScore,
      });
      updatePromptelSession(sessionId, { hint_used: true, score: newScore }).catch(console.error);

      res.json({
        success: true,
        data: {
          hint,
          hintsRemaining: hints.length - newHintsUsed,
          session: { ...session, hintsUsed: newHintsUsed, hintUsed: true, score: newScore },
        },
        message: `Hint ${newHintsUsed}/${hints.length} provided (−25 points)`,
      });
    } catch (error) {
      res.status(500).json({ success: false, data: null, error: 'Failed to get hint' });
    }
  }

  async getSessionState(req: AuthRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const stored = sessionStore.get(sessionId);
      if (!stored) {
        return res.status(404).json({ success: false, data: null, error: 'Session not found' });
      }
      const session = stored.data;
      // Return guesses separately so the frontend can restore the guess list
      res.json({
        success: true,
        data: {
          session,
          guesses: session.guesses ?? [],
        },
        message: 'Session retrieved',
      });
    } catch (error) {
      res.status(500).json({ success: false, data: null, error: 'Failed to get session' });
    }
  }

  async getActiveChallenges(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        data: { challenges: getStaticChallenges() },
        message: 'Challenges retrieved',
      });
    } catch (error) {
      res.status(500).json({ success: false, data: null, error: 'Failed to get challenges' });
    }
  }

  async getUserSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id || 'anonymous-user';
      const all = sessionStore.getAll();
      const sessions = all
        .filter(s => s.type === 'promptle' && s.data.userId === userId)
        .map(s => s.data);
      res.json({ success: true, data: { sessions }, message: 'Sessions retrieved' });
    } catch (error) {
      res.status(500).json({ success: false, data: null, error: 'Failed to get sessions' });
    }
  }
}

function getStaticChallenges() {
  return [
    {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Space Explorer',
      description: 'Guess the space-themed keywords hidden in this AI-generated image.',
      imageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=800&fit=crop',
      difficulty: 'medium',
      category: 'Space',
      maxGuesses: 8,
      timeLimit: 300,
      isActive: true,
      keywordCount: 5,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      title: 'Ocean Deep',
      description: 'Discover the ocean-themed keywords hidden in the depths.',
      imageUrl: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&h=800&fit=crop',
      difficulty: 'medium',
      category: 'Nature',
      maxGuesses: 8,
      timeLimit: 300,
      isActive: true,
      keywordCount: 5,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      title: 'Dark Castle',
      description: 'Find the hidden keywords in this mysterious dark fantasy scene.',
      imageUrl: '/images/dark-castle.png',
      difficulty: 'medium',
      category: 'Fantasy',
      maxGuesses: 8,
      timeLimit: 300,
      isActive: true,
      keywordCount: 5,
    },
  ];
}
