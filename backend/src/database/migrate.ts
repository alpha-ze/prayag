import { getSupabasePool, testSupabaseConnection } from './supabase';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const runMigrations = async () => {
  console.log('🔄 Running Supabase database migrations...');
  
  // Test connection first
  const isConnected = await testSupabaseConnection();
  if (!isConnected) {
    throw new Error('Cannot connect to Supabase database');
  }

  const pool = getSupabasePool();
  
  // Read and execute the schema
  const schema = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'participant',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Promptle challenges table
    CREATE TABLE IF NOT EXISTS promptle_challenges (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      difficulty VARCHAR(50) NOT NULL DEFAULT 'medium',
      category VARCHAR(100) NOT NULL DEFAULT 'general',
      image_url TEXT NOT NULL,
      keywords JSONB NOT NULL,
      aliases JSONB,
      hints JSONB,
      time_limit INTEGER DEFAULT 300,
      max_guesses INTEGER DEFAULT 10,
      base_score INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Survival scenarios table
    CREATE TABLE IF NOT EXISTS survival_scenarios (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      difficulty VARCHAR(50) NOT NULL DEFAULT 'medium',
      category VARCHAR(100) NOT NULL DEFAULT 'general',
      initial_situation TEXT NOT NULL,
      objectives JSONB NOT NULL,
      max_turns INTEGER DEFAULT 10,
      time_per_turn INTEGER DEFAULT 120,
      initial_health INTEGER DEFAULT 100,
      initial_inventory JSONB,
      base_score INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Game sessions table
    CREATE TABLE IF NOT EXISTS game_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_type VARCHAR(50) NOT NULL,
      challenge_id UUID REFERENCES promptle_challenges(id),
      scenario_id UUID REFERENCES survival_scenarios(id),
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      score INTEGER DEFAULT 0,
      current_data JSONB,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP WITH TIME ZONE
    );

    -- Game actions table (for audit and replay)
    CREATE TABLE IF NOT EXISTS game_actions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      action_type VARCHAR(100) NOT NULL,
      action_data JSONB,
      result_data JSONB,
      points_awarded INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Leaderboard entries
    CREATE TABLE IF NOT EXISTS leaderboard_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_type VARCHAR(50) NOT NULL,
      score INTEGER NOT NULL,
      rank_position INTEGER,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_type ON game_sessions(game_type);
    CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_game_actions_session ON game_actions(session_id);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_type_score ON leaderboard_entries(game_type, score DESC);
    CREATE INDEX IF NOT EXISTS idx_promptle_active ON promptle_challenges(is_active);
    CREATE INDEX IF NOT EXISTS idx_survival_active ON survival_scenarios(is_active);

    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Add updated_at triggers
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await pool.query(schema);
    console.log('✅ Supabase database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export default runMigrations;