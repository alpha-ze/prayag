-- This file will be automatically run when the PostgreSQL container starts
-- It ensures the database is properly initialized

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist (for docker initialization)
SELECT 'CREATE DATABASE promptx'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'promptx');