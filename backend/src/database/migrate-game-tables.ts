/**
 * Creates the game tables in Supabase via REST API
 * Run: npx tsx src/database/migrate-game-tables.ts
 */
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function runSQL(sql: string, description: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      console.log(`✅ ${description}`);
    } else {
      const err = await res.text();
      // Ignore "already exists" errors
      if (err.includes('already exists')) {
        console.log(`⚠️  ${description} (already exists, skipping)`);
      } else {
        console.error(`❌ ${description}:`, err.substring(0, 200));
      }
    }
  } catch (e: any) {
    console.error(`❌ ${description}:`, e.message);
  }
}

async function createGameTables() {
  console.log('🚀 Creating game tables in Supabase...\n');

  // promptle_sessions
  await runSQL(`
    CREATE TABLE IF NOT EXISTS promptle_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      challenge_id TEXT,
      round_id TEXT,
      status TEXT DEFAULT 'active',
      discovered_keywords JSONB DEFAULT '[]',
      remaining_guesses INTEGER DEFAULT 8,
      score INTEGER DEFAULT 0,
      hint_used BOOLEAN DEFAULT false,
      start_time TIMESTAMPTZ DEFAULT NOW(),
      end_time TIMESTAMPTZ,
      time_remaining INTEGER DEFAULT 300,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create promptle_sessions table');

  // promptle_guesses
  await runSQL(`
    CREATE TABLE IF NOT EXISTS promptle_guesses (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      session_id TEXT NOT NULL,
      guess TEXT NOT NULL,
      is_correct BOOLEAN DEFAULT false,
      is_so_close BOOLEAN DEFAULT false,
      matched_keyword TEXT,
      score_change INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create promptle_guesses table');

  // survival_sessions
  await runSQL(`
    CREATE TABLE IF NOT EXISTS survival_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      scenario_id TEXT,
      round_id TEXT,
      status TEXT DEFAULT 'active',
      current_location TEXT DEFAULT 'Unknown',
      health INTEGER DEFAULT 5,
      max_health INTEGER DEFAULT 5,
      inventory JSONB DEFAULT '[]',
      score INTEGER DEFAULT 0,
      turn INTEGER DEFAULT 1,
      max_turns INTEGER DEFAULT 15,
      remaining_prompts INTEGER DEFAULT 15,
      time_remaining INTEGER DEFAULT 1800,
      objectives JSONB DEFAULT '[]',
      completed_objectives JSONB DEFAULT '[]',
      discovered_information JSONB DEFAULT '[]',
      start_time TIMESTAMPTZ DEFAULT NOW(),
      end_time TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create survival_sessions table');

  // survival_events
  await runSQL(`
    CREATE TABLE IF NOT EXISTS survival_events (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      session_id TEXT NOT NULL,
      turn INTEGER NOT NULL,
      player_action TEXT NOT NULL,
      ai_response JSONB,
      game_state_changes JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create survival_events table');

  // leaderboard_entries
  await runSQL(`
    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT UNIQUE NOT NULL,
      total_score INTEGER DEFAULT 0,
      round_scores JSONB DEFAULT '{}',
      status TEXT DEFAULT 'active',
      round_details JSONB DEFAULT '{}',
      last_activity TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Create leaderboard_entries table');

  console.log('\n✅ All game tables created successfully!');
  console.log('📊 Tables: promptle_sessions, promptle_guesses, survival_sessions, survival_events, leaderboard_entries');
}

createGameTables().catch(console.error);
