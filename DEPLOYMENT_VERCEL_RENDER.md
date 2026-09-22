# PROMPT X - Vercel + Render Deployment Guide

Deploy your PROMPT X AI Competition Platform to Vercel (frontend) and Render (backend) for production use.

## 🎯 Deployment Architecture

- **Frontend**: Vercel (React app with static hosting)
- **Backend**: Render (Node.js API with WebSocket support)
- **Database**: Render PostgreSQL (managed database)

## 📋 Prerequisites

1. **Accounts Required:**
   - Vercel account (free tier available)
   - Render account (free tier available)
   - OpenAI API account with GPT-4 and DALL-E access

2. **Local Setup:**
   - Git repository (GitHub, GitLab, or Bitbucket)
   - Vercel CLI: `npm install -g vercel`

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Repository

1. **Push to Git:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel + Render deployment"
   git push origin main
   ```

### Step 2: Deploy Backend to Render

1. **Connect Repository:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Select your repository and branch

2. **Configure Web Service:**
   ```
   Name: prompt-x-backend
   Runtime: Node
   Build Command: cd backend && npm install && npm run build
   Start Command: cd backend && npm start
   ```

3. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   JWT_SECRET=[Generate a secure random string]
   AI_API_KEY=[Your OpenAI API key]
   IMAGE_GENERATION_API_KEY=[Your DALL-E API key]
   ```

4. **Create PostgreSQL Database:**
   - In Render Dashboard: "New +" → "PostgreSQL"
   - Name: `promptx-database`
   - Plan: Free or paid based on your needs
   - Copy the **Internal Database URL**

5. **Add Database URL:**
   - Add environment variable: `DATABASE_URL=[Internal Database URL]`

6. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://prompt-x-backend-xxx.onrender.com`

### Step 3: Deploy Frontend to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy Frontend:**
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variables:**
   ```bash
   # Replace with your actual Render backend URL
   vercel env add VITE_API_URL
   # Enter: https://your-backend-app.onrender.com

   vercel env add VITE_WS_URL  
   # Enter: wss://your-backend-app.onrender.com
   ```

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

#### Option B: Using Vercel Dashboard

1. **Connect Repository:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Project:**
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```

3. **Add Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-app.onrender.com
   VITE_WS_URL=wss://your-backend-app.onrender.com
   ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for build completion

### Step 4: Configure Domain & SSL

1. **Custom Domain (Optional):**
   - In Vercel: Settings → Domains → Add domain
   - In Render: Settings → Custom Domains → Add domain

2. **SSL is automatic** on both platforms

## 🔧 Configuration Files Created

The following files have been added to your project:

- `vercel.json` - Vercel deployment configuration
- `render.yaml` - Render service configuration
- `frontend/vercel.json` - Frontend-specific Vercel config
- `deploy-vercel.cmd` - Windows deployment script
- `deploy-vercel.sh` - Linux/Mac deployment script

## 🌍 URLs After Deployment

After successful deployment, you'll have:

- **Frontend**: `https://your-project.vercel.app`
- **Backend API**: `https://your-backend.onrender.com`
- **Admin Dashboard**: `https://your-project.vercel.app/admin`

## 🔑 Default Credentials

- **Admin**: admin@promptx.com / admin123
- **Participant**: player@example.com / participant123

## ⚙️ Environment Variables Reference

### Render Backend Variables:
```env
NODE_ENV=production
PORT=10000
DATABASE_URL=[Render PostgreSQL Internal URL]
JWT_SECRET=[Random 64-character string]
AI_API_KEY=[OpenAI API Key]
IMAGE_GENERATION_API_KEY=[DALL-E API Key]
```

### Vercel Frontend Variables:
```env
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

## 📊 Performance & Scaling

### Render Free Tier Limitations:
- **Sleep after 15 minutes** of inactivity
- **750 hours/month** of runtime
- **Cold starts** (2-3 seconds delay)

### Recommended Upgrades for Production:
- **Render Starter Plan**: $7/month (no sleep, faster performance)
- **Vercel Pro**: $20/month (better performance, analytics)

## 🔍 Testing Your Deployment

1. **Health Check:**
   ```bash
   curl https://your-backend.onrender.com/health
   ```

2. **Frontend Access:**
   - Open your Vercel URL in browser
   - Try logging in with default credentials
   - Test both game modes

3. **WebSocket Connection:**
   - Check browser console for WebSocket errors
   - Test real-time features (leaderboard updates)

## 🐛 Troubleshooting

### Common Issues:

1. **Backend Sleep (Free Tier):**
   - First request after inactivity takes 30+ seconds
   - Consider upgrading to paid plan for production use

2. **CORS Errors:**
   - Ensure backend URL is correctly set in frontend environment variables
   - Check browser console for specific errors

3. **Database Connection:**
   - Verify `DATABASE_URL` is the **Internal** database URL from Render
   - Check Render logs for connection errors

4. **Build Failures:**
   - Check Render/Vercel build logs
   - Ensure all dependencies are in package.json

### Useful Commands:

```bash
# View Render logs
render logs -s your-service-name

# Redeploy Vercel
vercel --prod

# Check deployment status
vercel ls
render services
```

## 🎉 Next Steps

After deployment:

1. **Test thoroughly** with multiple users
2. **Add your OpenAI API keys** to environment variables
3. **Configure custom domains** if needed
4. **Monitor performance** and upgrade plans as needed
5. **Set up monitoring** and alerts for production use

## 💰 Cost Estimation

### Free Tier (Development/Testing):
- **Vercel**: Free (100GB bandwidth/month)
- **Render**: Free (750 hours/month, sleeps after inactivity)
- **Total**: $0/month

### Production Ready:
- **Vercel Pro**: $20/month
- **Render Starter**: $7/month  
- **Render PostgreSQL**: $7/month
- **Total**: ~$35/month

Your PROMPT X platform is now ready for production deployment! 🚀