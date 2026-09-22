import { getLocalDatabase } from './connection-local';
import fs from 'fs';
import path from 'path';

const createTables = async () => {
  const db = await getLocalDatabase();

  // SQLite schema adapted from PostgreSQL
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'participant',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Promptle challenges table
    CREATE TABLE IF NOT EXISTS promptle_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL DEFAULT 'general',
      image_url TEXT NOT NULL,
      keywords TEXT NOT NULL, -- JSON array as TEXT
      aliases TEXT, -- JSON array as TEXT
      hints TEXT, -- JSON array as TEXT
      time_limit INTEGER DEFAULT 300,
      max_guesses INTEGER DEFAULT 10,
      base_score INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Survival scenarios table
    CREATE TABLE IF NOT EXISTS survival_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL DEFAULT 'general',
      initial_situation TEXT NOT NULL,
      objectives TEXT NOT NULL, -- JSON array as TEXT
      max_turns INTEGER DEFAULT 10,
      time_per_turn INTEGER DEFAULT 120,
      initial_health INTEGER DEFAULT 100,
      initial_inventory TEXT, -- JSON array as TEXT
      base_score INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Game sessions table
    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_type TEXT NOT NULL, -- 'promptle' or 'survival'
      challenge_id INTEGER,
      scenario_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'failed'
      score INTEGER DEFAULT 0,
      current_data TEXT, -- JSON as TEXT
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (challenge_id) REFERENCES promptle_challenges(id),
      FOREIGN KEY (scenario_id) REFERENCES survival_scenarios(id)
    );

    -- Game actions table (for audit and replay)
    CREATE TABLE IF NOT EXISTS game_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      action_data TEXT, -- JSON as TEXT
      result_data TEXT, -- JSON as TEXT
      points_awarded INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id)
    );

    -- Leaderboard entries
    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      rank_position INTEGER,
      metadata TEXT, -- JSON as TEXT
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_type ON game_sessions(game_type);
    CREATE INDEX IF NOT EXISTS idx_game_actions_session ON game_actions(session_id);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_type_score ON leaderboard_entries(game_type, score DESC);
  `;

  // Execute schema
  await db.exec(schema);
  console.log('✅ Local SQLite database tables created successfully');
};

const runMigrations = async () => {
  try {
    console.log('🔄 Running local database migrations...');
    await createTables();
    console.log('✅ Local database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };