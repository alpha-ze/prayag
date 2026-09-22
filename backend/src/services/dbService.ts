import { supabase } from '@/database/supabase';

// ─── Promptle ────────────────────────────────────────────────────────────────

export async function savePromptelSession(session: any): Promise<void> {
  try {
    const { error } = await supabase.from('promptle_sessions').insert([session]).select().single();
    if (error) console.error('❌ dbService.savePromptelSession:', error);
  } catch (err) {
    console.error('❌ dbService.savePromptelSession exception:', err);
  }
}

export async function updatePromptelSession(sessionId: string, updates: any): Promise<void> {
  try {
    const { error } = await supabase
      .from('promptle_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .execute();
    if (error) console.error('❌ dbService.updatePromptelSession:', error);
  } catch (err) {
    console.error('❌ dbService.updatePromptelSession exception:', err);
  }
}

export async function savePromptelGuess(guess: any): Promise<void> {
  try {
    const { error } = await supabase.from('promptle_guesses').insert([guess]).select().single();
    if (error) console.error('❌ dbService.savePromptelGuess:', error);
  } catch (err) {
    console.error('❌ dbService.savePromptelGuess exception:', err);
  }
}

// ─── Survival ────────────────────────────────────────────────────────────────

export async function saveSurvivalSession(session: any): Promise<void> {
  try {
    const { error } = await supabase.from('survival_sessions').insert([session]).select().single();
    if (error) console.error('❌ dbService.saveSurvivalSession:', error);
  } catch (err) {
    console.error('❌ dbService.saveSurvivalSession exception:', err);
  }
}

export async function updateSurvivalSession(sessionId: string, updates: any): Promise<void> {
  try {
    const { error } = await supabase
      .from('survival_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .execute();
    if (error) console.error('❌ dbService.updateSurvivalSession:', error);
  } catch (err) {
    console.error('❌ dbService.updateSurvivalSession exception:', err);
  }
}

export async function saveSurvivalEvent(event: any): Promise<void> {
  try {
    const { error } = await supabase.from('survival_events').insert([event]).select().single();
    if (error) console.error('❌ dbService.saveSurvivalEvent:', error);
  } catch (err) {
    console.error('❌ dbService.saveSurvivalEvent exception:', err);
  }
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function upsertLeaderboardEntry(
  userId: string,
  username: string,
  type: 'promptle' | 'survival',
  score: number,
  status: string,
  timeTaken?: number
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .eq('user_id', userId)
      .execute();

    const existingEntry = Array.isArray(existing) ? existing[0] : null;
    const roundScores: Record<string, number> = existingEntry?.round_scores ?? {};
    roundScores[type] = Math.max(roundScores[type] ?? 0, score);
    const totalScore = Object.values(roundScores).reduce((sum, v) => sum + v, 0);

    // Keep the fastest (lowest) timeTaken for promptle qualifying
    const existingTime: number | null = existingEntry?.time_taken ?? null;
    const newTimeTaken = timeTaken !== undefined
      ? existingTime === null ? timeTaken : Math.min(existingTime, timeTaken)
      : existingTime;

    const row = {
      user_id: userId,
      username: username,
      total_score: totalScore,
      round_scores: roundScores,
      status: status || 'active',
      last_activity: new Date().toISOString(),
      time_taken: newTimeTaken,
    };

    if (existingEntry) {
      const { error } = await supabase
        .from('leaderboard_entries')
        .update(row)
        .eq('user_id', userId)
        .select()
        .execute();
      if (error) console.error('❌ dbService.upsertLeaderboardEntry update:', error);
    } else {
      const { error } = await supabase
        .from('leaderboard_entries')
        .insert([row])
        .select()
        .single();
      if (error) console.error('❌ dbService.upsertLeaderboardEntry insert:', error);
    }
  } catch (err) {
    console.error('❌ dbService.upsertLeaderboardEntry exception:', err);
  }
}

/** Get all leaderboard entries ordered by total_score descending, with real usernames */
export async function getLeaderboardEntries(): Promise<any[]> {
  try {
    // Fetch leaderboard entries
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .order('total_score', { ascending: false })
      .execute();

    if (error) {
      console.error('❌ dbService.getLeaderboardEntries:', error);
      return [];
    }

    const entries = Array.isArray(data) ? data : [];

    if (entries.length === 0) return [];

    // Fetch real usernames from users table
    const { data: users } = await supabase
      .from('users')
      .select('id, username, email')
      .execute();

    const userMap = new Map<string, string>();
    if (Array.isArray(users)) {
      users.forEach((u: any) => userMap.set(u.id, u.username || u.email));
    }

    // Merge username into each entry
    return entries.map((e: any) => ({
      ...e,
      username: e.username || userMap.get(e.user_id) || 'Player',
    }));
  } catch (err) {
    console.error('❌ dbService.getLeaderboardEntries exception:', err);
    return [];
  }
}

export async function removePlayerFromLeaderboard(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('leaderboard_entries')
      .delete()
      .eq('user_id', userId)
      .execute();
    if (error) console.error('❌ dbService.removePlayerFromLeaderboard:', error);
  } catch (err) {
    console.error('❌ dbService.removePlayerFromLeaderboard exception:', err);
  }
}
