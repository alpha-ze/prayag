import express from 'express';
import { optionalAuth, AuthRequest } from '@/utils/auth';
import { ApiResponse, LeaderboardEntry } from '@/types';
import { sessionStore } from '@/utils/sessionStore';
import {
  getLeaderboardEntries,
  removePlayerFromLeaderboard,
} from '@/services/dbService';

const router = express.Router();

router.use(optionalAuth);

// GET / — public leaderboard
// Always merges Supabase data with the in-memory sessionStore so
// name-only players whose scores haven't been persisted yet still appear.
router.get('/', async (req, res) => {
  try {
    // ── 1. Fetch from Supabase ──────────────────────────────────────────────
    let dbEntries: any[] = [];
    try {
      dbEntries = await getLeaderboardEntries();
    } catch (dbErr) {
      console.error('❌ Supabase leaderboard query failed:', dbErr);
    }

    // Build a map from the DB rows: userId → entry
    const mergedMap = new Map<string, LeaderboardEntry>();

    for (const entry of dbEntries) {
      const userId: string = entry.user_id;
      const username: string =
        entry.username && entry.username !== 'anonymous' && entry.username !== 'Player'
          ? entry.username
          : userId;
      mergedMap.set(userId, {
        rank: 0,
        userId,
        username,
        totalScore: entry.total_score ?? 0,
        roundScores: entry.round_scores ?? {},
        status: entry.status ?? 'active',
        lastActivity: entry.last_activity ? new Date(entry.last_activity) : new Date(),
        roundDetails: entry.round_details ?? {},
      });
    }

    // ── 2. Merge in-memory sessionStore ────────────────────────────────────
    // This covers name-only players whose score update hasn't been persisted.
    const sessions = sessionStore.getAll();
    for (const session of sessions) {
      const userId: string = session.data?.userId ?? session.data?.user_id ?? '';
      if (!userId || userId === 'anonymous-user') continue;

      const username: string =
        session.data?.username && session.data.username !== 'anonymous'
          ? session.data.username
          : 'Player';
      const score: number = session.data?.score ?? 0;
      const type = session.type as 'promptle' | 'survival';

      const existing = mergedMap.get(userId);
      if (existing) {
        // Only update if the in-memory score is higher (DB may already have it)
        const currentTypeScore = (existing.roundScores as any)?.[type] ?? 0;
        if (score > currentTypeScore) {
          (existing.roundScores as any)[type] = score;
          existing.totalScore = Object.values(existing.roundScores as any).reduce(
            (s: number, v: any) => s + (Number(v) || 0), 0
          ) as number;
        }
      } else if (score > 0) {
        mergedMap.set(userId, {
          rank: 0,
          userId,
          username,
          totalScore: score,
          roundScores: { [type]: score },
          status: session.data?.status ?? 'active',
          lastActivity: new Date(),
          roundDetails: {},
        });
      }
    }

    // ── 3. Sort and assign ranks ────────────────────────────────────────────
    const leaderboard: LeaderboardEntry[] = Array.from(mergedMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return res.json({
      success: true,
      data: leaderboard,
      message: 'Leaderboard retrieved',
    } as ApiResponse<LeaderboardEntry[]>);

  } catch (error) {
    console.error('❌ Leaderboard route error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Failed to retrieve leaderboard',
    });
  }
});

// DELETE /player/:playerId — admin only
router.delete('/player/:playerId', async (req: AuthRequest, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { playerId } = req.params;

    // Remove from Supabase via dbService
    await removePlayerFromLeaderboard(playerId);

    // Also remove any matching sessions from sessionStore
    const allSessions = sessionStore.getAll();
    for (const s of allSessions) {
      if (s.data?.userId === playerId) {
        sessionStore.delete(s.id);
      }
    }

    const response: ApiResponse<{ removed: boolean }> = {
      success: true,
      data: { removed: true },
      message: `Leaderboard entry removed for player ${playerId}`,
    };

    return res.json(response);
  } catch (error) {
    console.error('❌ Remove player error:', error);
    return res
      .status(500)
      .json({ success: false, data: null, error: 'Failed to remove player' });
  }
});

// DELETE /clear — admin only
router.delete('/clear', async (req: AuthRequest, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Get all leaderboard entries from Supabase and remove each one
    let supabaseCleared = false;
    try {
      const entries = await getLeaderboardEntries();
      await Promise.all(entries.map((e: any) => removePlayerFromLeaderboard(e.user_id)));
      supabaseCleared = true;
      console.log(`✅ Cleared ${entries.length} entries from Supabase leaderboard`);
    } catch (dbErr) {
      console.error('❌ Failed to clear Supabase leaderboard:', dbErr);
    }

    // Clear sessionStore
    sessionStore.clear();

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message: supabaseCleared
          ? 'All leaderboard entries cleared from Supabase and in-memory store'
          : 'In-memory store cleared; Supabase clear failed (check logs)',
      },
      message: 'Leaderboard reset successfully',
    };

    return res.json(response);
  } catch (error) {
    console.error('❌ Clear leaderboard error:', error);
    return res
      .status(500)
      .json({ success: false, data: null, error: 'Failed to clear leaderboard' });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a leaderboard from the current sessionStore contents.
 * Groups sessions by userId and accumulates scores per game type.
 */
function buildLeaderboardFromSessionStore(): LeaderboardEntry[] {
  const sessions = sessionStore.getAll();

  // Aggregate scores per user
  const userMap = new Map<
    string,
    {
      userId: string;
      username: string;
      promptleScore: number;
      survivalScore: number;
      lastActivity: Date;
    }
  >();

  for (const session of sessions) {
    const userId: string = session.data?.userId ?? session.data?.user_id ?? 'unknown';
    const username: string = session.data?.username && session.data.username !== 'anonymous'
      ? session.data.username
      : session.data?.email?.split('@')[0] || 'Player';
    const score: number = session.data?.score ?? 0;
    const type = session.type;

    const existing = userMap.get(userId);
    if (existing) {
      if (type === 'promptle') {
        existing.promptleScore = Math.max(existing.promptleScore, score);
      } else if (type === 'survival') {
        existing.survivalScore = Math.max(existing.survivalScore, score);
      }
      if (session.updatedAt > existing.lastActivity) {
        existing.lastActivity = session.updatedAt;
      }
    } else {
      userMap.set(userId, {
        userId,
        username,
        promptleScore: type === 'promptle' ? score : 0,
        survivalScore: type === 'survival' ? score : 0,
        lastActivity: session.updatedAt,
      });
    }
  }

  // Convert to LeaderboardEntry array, sorted by total score descending
  const entries = Array.from(userMap.values())
    .map((u) => ({
      userId: u.userId,
      username: u.username,
      totalScore: u.promptleScore + u.survivalScore,
      roundScores: {
        ...(u.promptleScore > 0 ? { promptle: u.promptleScore } : {}),
        ...(u.survivalScore > 0 ? { survival: u.survivalScore } : {}),
      },
      status: 'active' as const,
      lastActivity: u.lastActivity,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((e, i) => ({ ...e, rank: i + 1, roundDetails: {} }));

  return entries;
}

export default router;
