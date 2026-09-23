import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';
import promptleRoutes from './routes/promptle';
import survivalRoutes from './routes/survival';
import adminRoutes from './routes/admin';
import leaderboardRoutes from './routes/leaderboard';

// Import socket handlers
import { setupSocketHandlers } from './sockets';
import { getGroqKeyCount } from './utils/aiQueue';

// Import Supabase setup
import { testSupabaseConnection } from './database/supabase';
import { createDemoUsers } from './database/create-demo-users';

dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('🔧 Environment variables loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean);
      if ((origin as string).endsWith('.vercel.app') || allowed.includes(origin as string)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true,
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration - Allow frontend to access backend
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain for previews
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // Much higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development entirely
    return process.env.NODE_ENV !== 'production';
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: 'supabase',
    aiKeys: getGroqKeyCount(),
  });
});

app.get('/api/health/ai', (req, res) => {
  const keyCount = getGroqKeyCount();
  const keys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
    .split(',')
    .map(k => k.trim().replace(/[\r\n\t]/g, ''))
    .filter(k => k.startsWith('gsk_'))
    .map((k, i) => `key${i + 1}: ${k.substring(0, 15)}...${k.slice(-4)}`);
  res.json({
    status: keyCount > 0 ? 'OK' : 'NO_KEYS',
    keyCount,
    keys,
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    source: process.env.GROQ_API_KEYS ? 'GROQ_API_KEYS' : 'GROQ_API_KEY',
  });
});

app.get('/api/health/db', async (req, res) => {
  try {
    const isConnected = await testSupabaseConnection();
    res.json({ 
      status: isConnected ? 'OK' : 'ERROR', 
      database: 'supabase',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'supabase',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/promptle', promptleRoutes);
app.use('/api/survival', survivalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Socket.IO setup
setupSocketHandlers(io);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize and start server
const startServer = async () => {
  console.log('🚀 Starting PROMPT X Server with Supabase REST API...');
  
  // Try to test Supabase REST API connection (but don't fail if it doesn't work)
  console.log('🔍 Testing Supabase REST API connection...');
  const isConnected = await testSupabaseConnection();
  
  // Create demo users if database is connected
  if (isConnected) {
    console.log('👥 Ensuring demo users exist...');
    await createDemoUsers();
  }
  
  // Start server regardless of database connection status
  server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`🗄️  Database health: http://localhost:${PORT}/api/health/db`);
    console.log(`📡 Socket.IO server ready`);
    console.log(`🎮 PROMPT X API ready!`);
    console.log('');
    console.log('📋 Available endpoints:');
    console.log('   Authentication: /api/auth');
    console.log('   Promptle Game:  /api/promptle');  
    console.log('   Survival Game:  /api/survival');
    console.log('   Admin Panel:    /api/admin');
    console.log('   Leaderboard:    /api/leaderboard');
    console.log('');
    console.log('🎯 Frontend available at: http://localhost:3000');
    
    if (isConnected) {
      console.log('✅ Database connected via Supabase REST API and ready');
    } else {
      console.log('');
      console.log('⚠️  DATABASE WARNING:');
      console.log('   Supabase REST API connection failed during startup');
      console.log('   Frontend will still load, but database features may not work');
      console.log('   Please check your Supabase credentials and API access');
      console.log('');
      console.log('📋 TO FIX DATABASE CONNECTION:');
      console.log('   1. Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env');
      console.log('   2. Check if database tables exist in Supabase dashboard');
      console.log('   3. Ensure Supabase project is active and accessible');
      console.log('   4. Run database schema setup if needed');
    }
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

startServer();