# PROMPT X - Supabase Setup Guide

This guide will help you set up Supabase for PROMPT X, both for local development and production deployment.

## 🚀 Quick Start

### Step 1: Create a Supabase Account and Project

1. **Go to Supabase:**
   - Visit [https://supabase.com](https://supabase.com)
   - Click "Start your project"
   - Sign up with GitHub, Google, or email

2. **Create a New Project:**
   - Click "New Project"
   - Choose your organization (or create one)
   - Project Name: `prompt-x` (or any name you prefer)
   - Database Password: Generate a secure password (save it!)
   - Region: Choose closest to your users
   - Click "Create new project"

3. **Wait for Setup:**
   - Takes 1-2 minutes to provision your database
   - You'll see a dashboard when ready

### Step 2: Get Your Supabase Credentials

1. **In your Supabase dashboard:**
   - Go to Settings → API
   - Copy the following:

```env
# Project URL
SUPABASE_URL=https://your-project-id.supabase.co

# Anon (public) key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URL (Settings → Database → Connection string → URI)
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres
```

### Step 3: Configure Your Environment

1. **Update your `.env` file:**
```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-id.supabase.co:5432/postgres

# Authentication
JWT_SECRET=prompt-x-super-secure-jwt-secret-change-in-production

# AI Services (REQUIRED!)
AI_API_KEY=your-openai-api-key-here
AI_MODEL=gpt-4
IMAGE_GENERATION_API_KEY=your-dalle-api-key-here

# Server
NODE_ENV=development
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Step 4: Set Up the Database

1. **Install dependencies (if not done already):**
```bash
cd backend
npm install
```

2. **Run database migrations:**
```bash
npm run db:migrate
```

3. **Seed the database with sample data:**
```bash
npm run db:seed
```

### Step 5: Test Your Setup

1. **Start the backend:**
```bash
npm run dev
```

2. **Test the connection:**
   - Open: http://localhost:3001/health
   - Open: http://localhost:3001/api/health/db
   - Both should return "OK" status

3. **Start the frontend:**
```bash
cd ../frontend
npm run dev
```

4. **Test the application:**
   - Open: http://localhost:3000
   - Login with: admin@promptx.com / admin123

## 🔧 Detailed Configuration

### Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your project's API URL | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Public API key for client connections | `eyJhbGciOiJIUzI1...` |
| `SUPABASE_DATABASE_URL` | Direct PostgreSQL connection string | `postgresql://postgres:pass@db.abc123.supabase.co:5432/postgres` |

### Finding Your Supabase Credentials

#### Project URL and Keys:
1. Go to your Supabase dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **URL** and **anon public** key

#### Database Connection String:
1. Go to **Settings** → **Database**
2. Scroll down to **Connection string**
3. Select **URI** tab
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your actual database password

### Database Schema

The migration script will create these tables:
- `users` - User accounts (admin/participant)
- `promptle_challenges` - Image guessing game challenges  
- `survival_scenarios` - Text-based survival game scenarios
- `game_sessions` - Active game sessions
- `game_actions` - Game action history
- `leaderboard_entries` - Scoring and rankings

### Sample Data

The seed script creates:
- **1 Admin user**: admin@promptx.com / admin123
- **11 Test participants**: player@example.com, player1@test.com, etc. (password: participant123)
- **5 Promptle challenges** (Easy to Expert difficulty)
- **5 Survival scenarios** (Various themes and difficulties)

## 🎮 Testing Your Setup

### 1. Database Health Check

```bash
curl http://localhost:3001/api/health/db
```

Expected response:
```json
{
  "status": "OK",
  "database": "supabase", 
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. User Authentication Test

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@promptx.com", "password": "admin123"}'
```

### 3. Game Content Test

```bash
curl http://localhost:3001/api/promptle/challenges
```

Should return array of challenges.

## 🚀 Deployment Configuration

### For Render Deployment:

Add these environment variables in Render dashboard:

```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project-id.supabase.co:5432/postgres

# Or use DATABASE_URL instead of SUPABASE_DATABASE_URL
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project-id.supabase.co:5432/postgres

# Production settings
NODE_ENV=production
JWT_SECRET=[Generate a secure random string]
AI_API_KEY=[Your OpenAI API key]  
IMAGE_GENERATION_API_KEY=[Your DALL-E API key]
```

### For Vercel Frontend:

```env
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

## 🔒 Security Best Practices

### 1. Database Security

Supabase provides:
- ✅ SSL/TLS encryption by default
- ✅ Connection pooling
- ✅ Automatic backups
- ✅ Row Level Security (RLS) - optional

### 2. API Keys

- **Anon Key**: Safe to use in frontend (has limited permissions)
- **Service Role Key**: Never expose in frontend (full database access)
- **Database Password**: Only use in backend connection strings

### 3. Production Recommendations

1. **Enable Row Level Security:**
   ```sql
   -- In Supabase SQL Editor
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
   -- Add policies as needed
   ```

2. **Rotate Keys Regularly:**
   - Go to Settings → API
   - Click "Generate new anon key" if compromised

3. **Monitor Usage:**
   - Check Supabase dashboard for usage metrics
   - Set up billing alerts

## 🐛 Troubleshooting

### Common Issues:

#### 1. Connection Failed
```bash
Error: Cannot connect to Supabase database
```
**Solutions:**
- Verify `SUPABASE_DATABASE_URL` is correct
- Check database password is correct
- Ensure your IP is not blocked (Supabase has no IP restrictions by default)

#### 2. Missing Environment Variables
```bash
Error: Missing Supabase environment variables
```
**Solutions:**
- Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Check for typos in variable names
- Restart your development server after changes

#### 3. Migration Errors
```bash
Error: relation "users" already exists
```
**Solutions:**
- This is usually safe to ignore - tables already exist
- To reset completely, go to Supabase → Database → reset database

#### 4. Seed Data Issues
```bash
Error: duplicate key value violates unique constraint
```
**Solutions:**
- Seed script clears existing data first
- Check if you have custom data that conflicts
- Run migrations before seeding

### Getting Help:

1. **Supabase Documentation**: https://supabase.com/docs
2. **Supabase Discord**: https://discord.supabase.com
3. **Check Supabase Dashboard**: Look for error logs and metrics

## 📊 Supabase Dashboard Features

### What You Can Monitor:
- **Database**: Table browser, SQL editor, migrations
- **Authentication**: User management, auth settings  
- **Storage**: File uploads (not used in PROMPT X currently)
- **Edge Functions**: Serverless functions (not used currently)
- **Logs**: Real-time error and query logs
- **Settings**: API keys, billing, team management

### Useful SQL Queries:

```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- View recent game sessions
SELECT * FROM game_sessions 
ORDER BY started_at DESC 
LIMIT 10;

-- Check leaderboard
SELECT u.name, l.score, l.game_type 
FROM leaderboard_entries l 
JOIN users u ON l.user_id = u.id 
ORDER BY l.score DESC;
```

## 🎉 You're Ready!

Once you see these confirmations:
- ✅ Database connection successful
- ✅ Tables created (migrations completed)  
- ✅ Sample data loaded (seeding completed)
- ✅ Server running on localhost:3001
- ✅ Frontend connecting to backend
- ✅ Login working with test accounts

Your PROMPT X application is ready for local development and testing!

## 📚 Next Steps

1. **Add your OpenAI API keys** to enable AI features
2. **Test both game modes** (Promptle and Survival)
3. **Customize challenges and scenarios** via Supabase dashboard
4. **Deploy to production** when ready using the deployment guides

For deployment to Vercel + Render, see `DEPLOYMENT_VERCEL_RENDER.md`.