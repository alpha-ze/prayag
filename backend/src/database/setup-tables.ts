/**
 * Sets up game tables by testing each one and logging what needs to be done.
 * Run: npx tsx src/database/setup-tables.ts
 */
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function tableExists(tableName: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`, { headers });
  return res.status !== 404;
}

async function checkTables() {
  console.log('🔍 Checking which tables exist in Supabase...\n');

  const tables = [
    'users',
    'promptle_sessions',
    'promptle_guesses',
    'survival_sessions',
    'survival_events',
    'leaderboard_entries',
  ];

  const missing: string[] = [];

  for (const table of tables) {
    const exists = await tableExists(table);
    if (exists) {
      console.log(`✅ ${table} - EXISTS`);
    } else {
      console.log(`❌ ${table} - MISSING`);
      missing.push(table);
    }
  }

  if (missing.length === 0) {
    console.log('\n🎉 All tables exist! Database is ready.');
    return;
  }

  console.log('\n⚠️  Missing tables:', missing.join(', '));
  console.log('\n📋 To create them, run this SQL in your Supabase SQL Editor:');
  console.log('   👉 https://supabase.com/dashboard/project/mvtqlrpibufzmmysavhr/sql\n');
  console.log('=' .repeat(60));
  console.log(generateSQL(missing));
  console.log('='.repeat(60));
}

function generateSQL(missing: string[]): string {
  const sqls: Record<string, string> = {
    promptle_sessions: `
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
);`,

    promptle_guesses: `
CREATE TABLE IF NOT EXISTS promptle_guesses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT NOT NULL,
  guess TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  is_so_close BOOLEAN DEFAULT false,
  matched_keyword TEXT,
  score_change INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,

    survival_sessions: `
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
);`,

    survival_events: `
CREATE TABLE IF NOT EXISTS survival_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT NOT NULL,
  turn INTEGER NOT NULL,
  player_action TEXT NOT NULL,
  ai_response JSONB,
  game_state_changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,

    leaderboard_entries: `
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT UNIQUE NOT NULL,
  username TEXT DEFAULT 'Player',
  total_score INTEGER DEFAULT 0,
  round_scores JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  round_details JSONB DEFAULT '{}',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add username column if it doesn't exist (for existing tables)
ALTER TABLE leaderboard_entries ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Player';`,
  };

  return missing.map(t => sqls[t] || `-- No SQL for ${t}`).join('\n');
}

checkTables().catch(console.error);
