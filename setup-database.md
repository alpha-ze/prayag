# Database Setup Instructions

## ✅ **CURRENT STATUS:**
- Backend: ✅ Connected via Supabase REST API
- Frontend: ✅ Loading successfully  
- Database: ❓ Need to verify tables exist

## 🗄️ **SETUP DATABASE TABLES:**

**Please follow these steps in your Supabase dashboard:**

1. **Go to**: https://supabase.com/dashboard/project/mvtqlrpibufzmmysavhr/sql

2. **Copy and paste the entire SQL schema** from `backend/src/database/schema.sql`

3. **Click "RUN"** to create all tables

4. **Verify tables were created** in the Table Editor

## 📋 **DATABASE SCHEMA INCLUDES:**
- `users` - User accounts and authentication
- `rounds` - Competition rounds  
- `challenges` - Promptle image guessing challenges
- `scenarios` - Survival game scenarios
- `promptle_sessions` - Game session tracking
- `survival_sessions` - Survival game sessions
- `leaderboard_entries` - Competition leaderboard
- And many more supporting tables...

## 🎮 **AFTER SETUP:**
Once tables are created, you can:
- ✅ **Test login** with demo credentials
- ✅ **Play Promptle games** (image guessing)
- ✅ **Play Survival scenarios** 
- ✅ **View leaderboards**
- ✅ **Admin panel** (with admin account)

## 🔧 **DEMO CREDENTIALS:**
- **Participant**: player@example.com / participant123
- **Admin**: admin@promptx.com / admin123

---

**After setting up the database, refresh the frontend page and the React errors should be gone, and you'll be able to test login functionality!**