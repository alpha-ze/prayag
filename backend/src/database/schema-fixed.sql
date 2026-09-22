-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('participant', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rounds table
CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('promptle', 'survival')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed')),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    max_participants INTEGER DEFAULT 50,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Challenges table (Round 1 - Promptle)
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    generation_prompt TEXT NOT NULL,
    hint TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    category VARCHAR(100) NOT NULL,
    max_guesses INTEGER DEFAULT 8,
    time_limit INTEGER DEFAULT 300,
    scoring JSONB NOT NULL DEFAULT '{"baseScore": 100, "correctBonus": 100, "completionBonus": 200, "timeBonus": 50, "wrongPenalty": 10, "hintPenalty": 25}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Challenge keywords table
CREATE TABLE challenge_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    is_required BOOLEAN DEFAULT true,
    points INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scenarios table (Round 2 - Survival)
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    environment VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    category VARCHAR(100) NOT NULL,
    starting_location VARCHAR(255) NOT NULL,
    starting_health INTEGER DEFAULT 5,
    max_health INTEGER DEFAULT 5,
    starting_inventory JSONB DEFAULT '[]',
    objectives JSONB DEFAULT '[]',
    max_turns INTEGER DEFAULT 15,
    time_limit INTEGER,
    scoring JSONB NOT NULL DEFAULT '{"baseScore": 100, "successBonus": 50, "partialSuccessBonus": 25, "failurePenalty": 20, "objectiveBonus": 200, "survivalBonus": 300, "timeBonus": 50}',
    rules JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promptle game sessions
CREATE TABLE promptle_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    round_id UUID REFERENCES rounds(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    discovered_keywords TEXT[] DEFAULT '{}',
    remaining_guesses INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    hint_used BOOLEAN DEFAULT false,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    time_remaining INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id, round_id)
);

-- Promptle guesses
CREATE TABLE promptle_guesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES promptle_sessions(id) ON DELETE CASCADE,
    guess VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    is_so_close BOOLEAN DEFAULT false,
    matched_keyword VARCHAR(100),
    score_change INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Survival game sessions
CREATE TABLE survival_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    round_id UUID REFERENCES rounds(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'survived', 'dead', 'timeout', 'turn_limit', 'eliminated')),
    current_location VARCHAR(255) NOT NULL,
    health INTEGER NOT NULL,
    max_health INTEGER NOT NULL,
    inventory JSONB DEFAULT '[]',
    score INTEGER DEFAULT 0,
    turn INTEGER DEFAULT 1,
    max_turns INTEGER NOT NULL,
    remaining_prompts INTEGER NOT NULL,
    time_remaining INTEGER,
    objectives JSONB DEFAULT '[]',
    completed_objectives TEXT[] DEFAULT '{}',
    discovered_information TEXT[] DEFAULT '{}',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, scenario_id, round_id)
);

-- Survival events/history
CREATE TABLE survival_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES survival_sessions(id) ON DELETE CASCADE,
    turn INTEGER NOT NULL,
    player_action TEXT NOT NULL,
    ai_response JSONB NOT NULL,
    game_state_changes JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard entries
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    total_score INTEGER DEFAULT 0,
    round_scores JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'eliminated')),
    round_details JSONB DEFAULT '{}',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, round_id)
);

-- Admin actions log
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_rounds_status ON rounds(status);
CREATE INDEX idx_rounds_type ON rounds(type);

CREATE INDEX idx_challenges_difficulty ON challenges(difficulty);
CREATE INDEX idx_challenges_category ON challenges(category);
CREATE INDEX idx_challenges_is_active ON challenges(is_active);

CREATE INDEX idx_challenge_keywords_challenge_id ON challenge_keywords(challenge_id);

CREATE INDEX idx_scenarios_difficulty ON scenarios(difficulty);
CREATE INDEX idx_scenarios_category ON scenarios(category);
CREATE INDEX idx_scenarios_is_active ON scenarios(is_active);

CREATE INDEX idx_promptle_sessions_user_id ON promptle_sessions(user_id);
CREATE INDEX idx_promptle_sessions_challenge_id ON promptle_sessions(challenge_id);
CREATE INDEX idx_promptle_sessions_status ON promptle_sessions(status);
CREATE INDEX idx_promptle_sessions_round_id ON promptle_sessions(round_id);

CREATE INDEX idx_promptle_guesses_session_id ON promptle_guesses(session_id);

CREATE INDEX idx_survival_sessions_user_id ON survival_sessions(user_id);
CREATE INDEX idx_survival_sessions_scenario_id ON survival_sessions(scenario_id);
CREATE INDEX idx_survival_sessions_status ON survival_sessions(status);
CREATE INDEX idx_survival_sessions_round_id ON survival_sessions(round_id);

CREATE INDEX idx_survival_events_session_id ON survival_events(session_id);

CREATE INDEX idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);
CREATE INDEX idx_leaderboard_entries_round_id ON leaderboard_entries(round_id);
CREATE INDEX idx_leaderboard_entries_total_score ON leaderboard_entries(total_score DESC);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promptle_sessions_updated_at BEFORE UPDATE ON promptle_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_survival_sessions_updated_at BEFORE UPDATE ON survival_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leaderboard_entries_updated_at BEFORE UPDATE ON leaderboard_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert demo users for testing
INSERT INTO users (email, username, password_hash, role) VALUES 
('player@example.com', 'player', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'participant'),
('admin@promptx.com', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');