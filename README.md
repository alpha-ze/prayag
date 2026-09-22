# PROMPT X - AI Competition Platform

A complete web application for running AI-based competitive gaming events with two rounds:
- **Round 1 - PROMPTLE**: AI-generated image keyword guessing game
- **Round 2 - PROMPT X SURVIVE**: Interactive survival scenarios using natural language

## 🎯 Features

### Participant Experience
- Individual gameplay for 30-50 participants
- Round 1: Guess hidden keywords from AI-generated images
- Round 2: Survive scenarios using natural language actions
- Real-time leaderboard and scoring
- Personal game history and results

### Admin Dashboard
- Secure admin authentication
- Live participant monitoring
- Round management (start/pause/resume/end)
- Challenge and scenario creation
- Real-time leaderboard monitoring
- Results export and analytics

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**Windows:**
```cmd
setup.cmd
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

1. **Prerequisites:**
   - Node.js 18+ and npm
   - Docker and Docker Compose
   - Git

2. **Clone and Setup:**
   ```bash
   git clone <repository>
   cd prompt-x
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Install Dependencies:**
   ```bash
   npm run setup
   ```

4. **Start Database:**
   ```bash
   docker-compose up -d postgres
   ```

5. **Initialize Database:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. **Start Application:**
   ```bash
   npm run dev
   ```

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Admin Panel**: http://localhost:3000/admin

## 🔑 Default Credentials

- **Admin**: admin@promptx.com / admin123
- **Participant**: player@example.com / participant123

## 🛠 Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **AI Integration**: OpenAI API (GPT-4 + DALL-E)
- **Containerization**: Docker + Docker Compose

## 🎮 Game Modes

### Round 1 - PROMPTLE
- **Concept**: AI generates an image, players guess hidden keywords
- **Features**: 
  - 5+ difficulty levels (Easy to Expert)
  - Multiple categories (Space, Nature, Technology, etc.)
  - Hint system with scoring penalties
  - Time limits and guess limits
  - "So Close" semantic matching
  - Real-time scoring

### Round 2 - PROMPT X SURVIVE
- **Concept**: Survive fictional scenarios using natural language actions
- **Features**:
  - 5+ unique scenarios (Zombie Campus, Space Station, etc.)
  - AI-powered action evaluation
  - Health, inventory, and objective management
  - Turn-based gameplay with time limits
  - Dynamic storytelling and consequences

## 🔧 Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://promptx:promptx_dev@localhost:5432/promptx

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here

# AI Services (Required for gameplay)
AI_API_KEY=your-openai-api-key-here
AI_MODEL=gpt-4
IMAGE_GENERATION_API_KEY=your-dalle-api-key-here
```

### Optional Configuration

```env
# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Email (for notifications)
SMTP_HOST=smtp.example.com
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_BUCKET_NAME=promptx-assets
```

## 🏗 Architecture

```
Frontend (React/TS) → Backend API (Express/TS) → AI Services → Database (PostgreSQL)
                                ↓
                        Socket.IO (Real-time)
```

### Security Features

- Server-side authority for all game state
- Hidden answers never sent to frontend
- Input validation and rate limiting
- Session isolation between players
- Admin role-based access control

## 📦 Docker Deployment

### Development
```bash
docker-compose up
```

### Production
```bash
cp .env.production.example .env.production
# Edit .env.production with production values
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

Run the comprehensive test suite:

**Windows:**
```cmd
test-app.cmd
```

**Linux/Mac:**
```bash
chmod +x test-app.sh
./test-app.sh
```

Tests include:
- System requirements
- Database connectivity
- Code compilation
- API endpoints
- Docker builds
- Game functionality

## 📊 API Documentation

### Authentication
- `POST /api/auth/register` - Register participant
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Round 1 - Promptle
- `POST /api/promptle/start` - Start challenge
- `POST /api/promptle/sessions/:id/guess` - Submit guess
- `POST /api/promptle/sessions/:id/hint` - Get hint
- `GET /api/promptle/sessions/:id` - Get current state

### Round 2 - Survival
- `POST /api/survival/start` - Start scenario
- `POST /api/survival/sessions/:id/action` - Submit action
- `GET /api/survival/sessions/:id` - Get current state

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard
- `GET /api/leaderboard/user/:id` - Get user rank

## 🎯 Game Design

### Promptle Scoring System
```javascript
finalScore = baseScore + 
           (correctGuesses * correctBonus) + 
           (completionBonus) + 
           (timeBonus) - 
           (wrongGuesses * wrongPenalty) - 
           (hintUsed ? hintPenalty : 0)
```

### Survival Scoring System  
```javascript
finalScore = baseScore + 
           (successfulActions * successBonus) + 
           (objectivesCompleted * objectiveBonus) + 
           (survived ? survivalBonus : 0) + 
           (timeBonus)
```

## 🔒 Security Measures

- **Input Validation**: Zod schema validation for all inputs
- **Rate Limiting**: API rate limiting with different tiers
- **Authentication**: JWT with secure session management  
- **Authorization**: Role-based access control
- **Data Protection**: Server-side game state authority
- **SQL Injection**: Parameterized queries
- **XSS Protection**: Content Security Policy headers

## 🚀 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- AWS ECS deployment
- DigitalOcean App Platform
- Heroku deployment
- Custom VPS setup
- SSL configuration
- Performance optimization
- Monitoring setup

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check PostgreSQL status
   docker-compose logs postgres
   
   # Verify connection
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. **AI API Failures**
   ```bash
   # Test API key
   curl -H "Authorization: Bearer $AI_API_KEY" \
     https://api.openai.com/v1/models
   ```

3. **Build Errors**
   ```bash
   # Clear node modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Clear Docker cache
   docker system prune -a
   ```

### Performance Issues

- Monitor with `docker stats`
- Check database slow queries
- Use Redis for caching
- Enable CDN for static assets

## 📈 Monitoring

### Health Checks
- `/health` - Application health
- `/api/health/db` - Database connectivity  
- `/api/health/ai` - AI service status

### Metrics Collection
- Request duration tracking
- Error rate monitoring
- User activity analytics
- Game completion rates

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Run tests (`npm run test`)
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Create an issue on GitHub
- **Discord**: Join our community server
- **Email**: support@promptx.com

---

**Made with ⚡ for the future of AI gaming**