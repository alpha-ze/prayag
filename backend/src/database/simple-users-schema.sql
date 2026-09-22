-- Simple users table for testing
-- Enable UUID extension first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing table if it exists
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with all required columns
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('participant', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Insert demo user for testing
INSERT INTO users (email, username, password_hash, role) VALUES 
('player@example.com', 'player', '$2b$10$wQa4Z8R7G3lPxJ5OhJR3/.MJ8h4qX7vP8S0K8VJ0mK9R7X6J2H3D.', 'participant'),
('admin@promptx.com', 'admin', '$2b$10$wQa4Z8R7G3lPxJ5OhJR3/.MJ8h4qX7vP8S0K8VJ0mK9R7X6J2H3D.', 'admin');