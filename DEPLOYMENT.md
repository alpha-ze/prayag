# PROMPT X Deployment Guide

This guide covers deploying PROMPT X to production environments.

## Prerequisites

- Docker and Docker Compose
- Domain name with SSL certificate
- PostgreSQL database (managed service recommended)
- OpenAI API access with GPT-4 and DALL-E
- Server with at least 2GB RAM and 20GB storage

## Quick Production Deployment

### 1. Server Setup

```bash
# Clone the repository
git clone <your-repo> prompt-x
cd prompt-x

# Copy production environment template
cp .env.production.example .env.production
```

### 2. Configure Environment

Edit `.env.production` with your production values:

```env
# Database - Use managed PostgreSQL service
DATABASE_URL=postgresql://user:pass@host:5432/promptx_prod

# Security - Generate secure secrets
JWT_SECRET=$(openssl rand -hex 32)

# AI Services - Add your API keys
AI_API_KEY=your_openai_key
IMAGE_GENERATION_API_KEY=your_dalle_key

# Domain configuration
FRONTEND_API_URL=https://yourdomain.com/api
FRONTEND_WS_URL=wss://yourdomain.com
```

### 3. SSL Setup

Place your SSL certificates in `./nginx/ssl/`:
- `certificate.crt`
- `private.key`

### 4. Deploy with Docker

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Seed initial data
docker-compose -f docker-compose.prod.yml exec backend npm run db:seed
```

## Cloud Platform Deployments

### AWS Deployment

#### Using AWS ECS with RDS

1. **Database Setup:**
   ```bash
   # Create RDS PostgreSQL instance
   aws rds create-db-instance \
     --db-instance-identifier promptx-prod \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username promptx \
     --master-user-password <secure-password> \
     --allocated-storage 20
   ```

2. **ECS Service:**
   ```bash
   # Build and push images to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
   
   docker build -t promptx-backend ./backend
   docker tag promptx-backend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/promptx-backend:latest
   docker push <account>.dkr.ecr.us-east-1.amazonaws.com/promptx-backend:latest
   
   docker build -t promptx-frontend ./frontend
   docker tag promptx-frontend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/promptx-frontend:latest
   docker push <account>.dkr.ecr.us-east-1.amazonaws.com/promptx-frontend:latest
   ```

3. **Deploy with ECS:**
   - Create ECS cluster
   - Define task definitions for frontend and backend
   - Create services with Application Load Balancer
   - Configure auto-scaling

### DigitalOcean Deployment

#### Using App Platform

1. **Create App:**
   ```yaml
   name: prompt-x
   services:
   - name: backend
     source_dir: /backend
     github:
       repo: your-username/prompt-x
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: DATABASE_URL
       value: ${DATABASE.DATABASE_URL}
     - key: JWT_SECRET
       value: your_jwt_secret
     - key: AI_API_KEY
       value: your_openai_key
     
   - name: frontend
     source_dir: /frontend
     github:
       repo: your-username/prompt-x
       branch: main
     build_command: npm run build
     run_command: npm run preview
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     
   databases:
   - name: database
     engine: PG
     version: "13"
   ```

### Heroku Deployment

1. **Prepare for Heroku:**
   ```bash
   # Create Procfile
   echo "web: npm start" > Procfile
   
   # Create heroku.yml for Docker deployment
   cat > heroku.yml << EOF
   build:
     docker:
       web: backend/Dockerfile
   EOF
   ```

2. **Deploy:**
   ```bash
   heroku create prompt-x-app
   heroku addons:create heroku-postgresql:hobby-dev
   heroku config:set JWT_SECRET=$(openssl rand -hex 32)
   heroku config:set AI_API_KEY=your_openai_key
   heroku config:set IMAGE_GENERATION_API_KEY=your_dalle_key
   
   git push heroku main
   heroku run npm run db:migrate
   heroku run npm run db:seed
   ```

## Environment-Specific Configurations

### Production Optimizations

1. **Database Optimization:**
   ```sql
   -- Optimize PostgreSQL for production
   ALTER SYSTEM SET shared_buffers = '256MB';
   ALTER SYSTEM SET effective_cache_size = '1GB';
   ALTER SYSTEM SET random_page_cost = 1.1;
   SELECT pg_reload_conf();
   ```

2. **Redis Caching:**
   ```javascript
   // Add to backend for session storage
   import redis from 'redis';
   const client = redis.createClient(process.env.REDIS_URL);
   ```

3. **CDN Setup:**
   ```nginx
   # Serve static assets from CDN
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
       try_files $uri @cdn;
   }
   
   location @cdn {
       proxy_pass https://cdn.yourdomain.com;
   }
   ```

### Security Hardening

1. **Nginx Security:**
   ```nginx
   # Add to nginx.conf
   server_tokens off;
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-XSS-Protection "1; mode=block" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header Strict-Transport-Security "max-age=63072000" always;
   ```

2. **Rate Limiting:**
   ```nginx
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
   ```

3. **Database Security:**
   ```sql
   -- Create restricted database user
   CREATE USER promptx_app WITH PASSWORD 'secure_password';
   GRANT CONNECT ON DATABASE promptx TO promptx_app;
   GRANT USAGE ON SCHEMA public TO promptx_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO promptx_app;
   ```

## Monitoring and Maintenance

### Health Checks

1. **Application Health:**
   ```bash
   # Check API health
   curl https://yourdomain.com/health
   
   # Check database connection
   curl https://yourdomain.com/api/health/db
   ```

2. **Performance Monitoring:**
   ```javascript
   // Add to backend
   import { performance } from 'perf_hooks';
   
   app.use((req, res, next) => {
     const start = performance.now();
     res.on('finish', () => {
       const duration = performance.now() - start;
       console.log(`${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
     });
     next();
   });
   ```

### Backup Strategy

1. **Database Backups:**
   ```bash
   # Daily backup script
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   pg_dump $DATABASE_URL > backup_$DATE.sql
   
   # Upload to S3
   aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
   ```

2. **File Backups:**
   ```bash
   # Backup user uploads and logs
   tar -czf app_backup_$DATE.tar.gz ./uploads ./logs
   aws s3 cp app_backup_$DATE.tar.gz s3://your-backup-bucket/
   ```

### Scaling Considerations

1. **Horizontal Scaling:**
   - Use load balancer for multiple backend instances
   - Implement Redis for session sharing
   - Use CDN for static assets

2. **Database Scaling:**
   - Read replicas for query optimization
   - Connection pooling
   - Query optimization

3. **Caching Strategy:**
   - Redis for session data
   - Application-level caching for game data
   - CDN for static assets

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   ```bash
   # Check connection
   docker-compose logs backend | grep -i database
   
   # Verify credentials
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. **AI API Failures:**
   ```bash
   # Check API quotas and limits
   curl -H "Authorization: Bearer $AI_API_KEY" \
     https://api.openai.com/v1/models
   ```

3. **Memory Issues:**
   ```bash
   # Monitor container memory usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   mem_limit: 1g
   ```

### Performance Optimization

1. **Database Queries:**
   ```sql
   -- Analyze slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

2. **Application Metrics:**
   ```javascript
   // Add metrics collection
   import prometheus from 'prom-client';
   const httpRequestDuration = new prometheus.Histogram({
     name: 'http_request_duration_ms',
     help: 'Duration of HTTP requests in ms',
     labelNames: ['method', 'route']
   });
   ```

For additional support and advanced deployment scenarios, refer to the main documentation or create an issue in the repository.