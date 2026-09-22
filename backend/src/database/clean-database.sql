-- Complete database cleanup script
-- This will remove all tables and data

-- Drop all tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS leaderboard_entries CASCADE;
DROP TABLE IF EXISTS survival_events CASCADE;
DROP TABLE IF EXISTS survival_sessions CASCADE;
DROP TABLE IF EXISTS promptle_guesses CASCADE;
DROP TABLE IF EXISTS promptle_sessions CASCADE;
DROP TABLE IF EXISTS challenge_keywords CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS rounds CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any remaining functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verify all tables are gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- This query should return empty if everything is cleaned up