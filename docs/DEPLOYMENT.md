# 🚀 Deployment Guide - Vibelrn Manager

Complete deployment instructions for production environments.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Production Build](#local-production-build)
3. [Cloud Deployment Options](#cloud-deployment-options)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Redis Setup](#redis-setup)
7. [Process Management](#process-management)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests passing (see `TESTING_GUIDE.md`)
- [ ] Environment variables configured
- [ ] Database migrations created and tested
- [ ] Redis connection tested
- [ ] Gemini API key obtained and tested
- [ ] Security review completed
- [ ] Error handling verified
- [ ] Logging configured
- [ ] Backup strategy defined

---

## 🏗️ Local Production Build

### Step 1: Build TypeScript
```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### Step 2: Test Production Build
```bash
# Start API server
NODE_ENV=production npm start

# In another terminal, start workers
NODE_ENV=production npm run workers:build
```

### Step 3: Verify
```bash
curl http://localhost:3000/health
```

---

## ☁️ Cloud Deployment Options

### Option A: Heroku 🚀 (Easiest)

#### 1. Install Heroku CLI
```bash
brew install heroku/brew/heroku  # macOS
```

#### 2. Create Heroku App
```bash
heroku create vibelrn-manager
```

#### 3. Add Buildpacks
```bash
heroku buildpacks:set heroku/nodejs
```

#### 4. Provision Add-ons
```bash
# PostgreSQL
heroku addons:create heroku-postgresql:essential-0

# Redis
heroku addons:create heroku-redis:mini
```

#### 5. Configure Environment Variables
```bash
heroku config:set GEMINI_API_KEY=your_key_here
heroku config:set NODE_ENV=production
heroku config:set PORT=3000
```

#### 6. Create Procfile
```bash
echo "web: npm start" > Procfile
echo "worker: npm run workers:build" >> Procfile
```

#### 7. Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### 8. Run Migrations
```bash
heroku run npx prisma migrate deploy
heroku run npm run seed
```

#### 9. Scale Workers
```bash
heroku ps:scale web=1 worker=1
```

#### 10. Open App
```bash
heroku open
```

---

### Option B: Railway 🚆 (Modern Alternative)

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. Login and Initialize
```bash
railway login
railway init
```

#### 3. Add Services
- PostgreSQL: `railway add postgresql`
- Redis: `railway add redis`

#### 4. Deploy
```bash
railway up
```

#### 5. Configure Environment
```bash
railway variables set GEMINI_API_KEY=your_key_here
```

#### 6. Run Migrations
```bash
railway run npx prisma migrate deploy
railway run npm run seed
```

---

### Option C: DigitalOcean App Platform 🌊

#### 1. Create Account
Visit: https://www.digitalocean.com/

#### 2. Create New App
- Connect GitHub repository
- Select repository: `Vibelrn-Manager`

#### 3. Configure Services

**API Service:**
```yaml
name: vibelrn-api
environment_slug: node-js
build_command: npm run build
run_command: npm start
http_port: 3000
instance_size: basic-xxs
```

**Worker Service:**
```yaml
name: vibelrn-workers
environment_slug: node-js
build_command: npm run build
run_command: npm run workers:build
instance_size: basic-xxs
```

#### 4. Add Databases
- PostgreSQL (Dev Database - $7/month)
- Redis (Managed Redis - $15/month)

#### 5. Environment Variables
Add in App Platform dashboard:
- `GEMINI_API_KEY`
- `NODE_ENV=production`

#### 6. Deploy
Click "Create Resources" - automatic deployment starts

---

### Option D: AWS EC2 (Manual Setup)

#### 1. Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance Type: t2.micro (free tier)
- Security Group: Open ports 22, 80, 443, 3000

#### 2. SSH into Instance
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### 3. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 4. Setup PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE vibelrn_db;
CREATE USER vibelrn_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE vibelrn_db TO vibelrn_user;
\q
```

#### 5. Configure Redis
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

#### 6. Deploy Application
```bash
# Clone repository
git clone https://github.com/yourusername/Vibelrn-Manager.git
cd Vibelrn-Manager

# Install dependencies
npm install

# Create .env file
nano .env
# (Paste environment variables)

# Build application
npm run build

# Run migrations
npx prisma migrate deploy
npm run seed
```

#### 7. Start with PM2
```bash
# Start API
pm2 start dist/index.js --name vibelrn-api

# Start Workers
pm2 start dist/workers.js --name vibelrn-workers

# Save PM2 configuration
pm2 save
pm2 startup
```

#### 8. Configure Nginx (Optional)
```bash
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/vibelrn
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/vibelrn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
# Or for MySQL:
# DATABASE_URL="mysql://user:pass@host:3306/dbname"

# Redis
REDIS_HOST="localhost"          # Or cloud Redis host
REDIS_PORT="6379"
REDIS_PASSWORD=""               # Set if using cloud Redis

# Gemini API
GEMINI_API_KEY="your_key_here"  # Get from https://ai.google.dev/

# Server
PORT="3000"
NODE_ENV="production"
```

### Optional Variables

```bash
# Logging
LOG_LEVEL="info"                # debug, info, warn, error

# Rate Limiting
MAX_REQUESTS_PER_MINUTE="100"

# BullMQ
BULLMQ_CONCURRENCY="5"          # Max concurrent jobs
```

---

## 🗄️ Database Setup

### PostgreSQL (Recommended)

#### Local Setup
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Start service
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# Create database
createdb vibelrn_db
```

#### Cloud Options

**1. Heroku Postgres**
- Free: 10,000 rows, 20 connections
- Essential: $5/month, 10M rows, 20 connections
- Setup: `heroku addons:create heroku-postgresql`

**2. Supabase (Free tier)**
- 500MB storage, unlimited API requests
- Sign up: https://supabase.com/
- Copy connection string from dashboard

**3. Railway**
- $5/month for 1GB storage
- Easy integration with Railway deployments

**4. AWS RDS**
- t2.micro free tier eligible
- Production-ready with automated backups

### MySQL Alternative

```bash
# Install MySQL
brew install mysql  # macOS
sudo apt install mysql-server  # Ubuntu

# Start service
brew services start mysql  # macOS
sudo systemctl start mysql  # Ubuntu

# Create database
mysql -u root -p
CREATE DATABASE vibelrn_db;
```

Update `schema.prisma`:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### Run Migrations
```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy

# Seed data
npm run seed
```

---

## 🔴 Redis Setup

### Local Setup
```bash
# Install Redis
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Start service
brew services start redis  # macOS
sudo systemctl start redis  # Ubuntu

# Test connection
redis-cli ping  # Should return PONG
```

### Cloud Options

**1. Upstash (Free tier)**
- 10,000 commands/day
- Sign up: https://upstash.com/
- Get connection string from dashboard
- Update `.env`:
```bash
REDIS_URL="rediss://default:password@hostname:port"
```

**2. Redis Cloud**
- 30MB free tier
- Sign up: https://redis.com/
- Create database and copy credentials

**3. Heroku Redis**
```bash
heroku addons:create heroku-redis:mini
# Automatically sets REDIS_URL
```

**4. Railway Redis**
```bash
railway add redis
# Automatically configured
```

---

## ⚙️ Process Management

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start processes
pm2 start dist/index.js --name vibelrn-api
pm2 start dist/workers.js --name vibelrn-workers

# Monitor
pm2 status
pm2 logs vibelrn-api
pm2 logs vibelrn-workers

# Restart
pm2 restart all

# Stop
pm2 stop all

# Startup on boot
pm2 startup
pm2 save
```

### Using systemd (Linux)

Create service files:

**API Service:**
```bash
sudo nano /etc/systemd/system/vibelrn-api.service
```

```ini
[Unit]
Description=Vibelrn API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/Vibelrn-Manager
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Worker Service:**
```bash
sudo nano /etc/systemd/system/vibelrn-workers.service
```

```ini
[Unit]
Description=Vibelrn Workers
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/Vibelrn-Manager
ExecStart=/usr/bin/node dist/workers.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable vibelrn-api vibelrn-workers
sudo systemctl start vibelrn-api vibelrn-workers
sudo systemctl status vibelrn-api vibelrn-workers
```

---

## 📊 Monitoring & Logging

### Application Logs

**PM2 Logs:**
```bash
pm2 logs
pm2 logs vibelrn-api --lines 100
```

**systemd Logs:**
```bash
journalctl -u vibelrn-api -f
journalctl -u vibelrn-workers -f
```

### Database Monitoring

**Check Connection:**
```bash
npx prisma studio  # Opens GUI
```

**Query Access Logs:**
```sql
SELECT COUNT(*) FROM "AccessLog";
SELECT * FROM "AccessLog" ORDER BY id DESC LIMIT 10;
```

### Queue Monitoring

**Redis CLI:**
```bash
redis-cli

> KEYS bull:*
> LLEN bull:llmQueue:waiting
> LLEN bull:llmQueue:active
> LLEN bull:logQueue:waiting
```

### Health Checks

**Setup monitoring service:**
- UptimeRobot (free): https://uptimerobot.com/
- Pingdom: https://www.pingdom.com/
- Datadog: https://www.datadoghq.com/

**Monitor endpoint:**
```
GET https://your-domain.com/health
```

---

## 🐛 Troubleshooting

### Issue: Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Issue: Database connection failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: Redis connection failed
```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli ping
```

### Issue: Migrations failing
```bash
# Reset database (⚠️ deletes all data!)
npx prisma migrate reset

# Or manually fix
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate deploy
```

### Issue: High memory usage
```bash
# Check process memory
pm2 status

# Restart workers
pm2 restart vibelrn-workers

# Check Node.js memory
node --max-old-space-size=512 dist/index.js
```

---

## 🔒 Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` to Git
   - Use secrets management (AWS Secrets Manager, etc.)

2. **Database:**
   - Use strong passwords
   - Enable SSL connections
   - Regular backups

3. **API Security:**
   - Add rate limiting (express-rate-limit)
   - Add helmet.js for HTTP headers
   - Validate all inputs
   - Use CORS properly

4. **Redis:**
   - Set password: `requirepass your_password`
   - Bind to localhost only in production
   - Use TLS for cloud connections

5. **Updates:**
   - Regular security updates: `npm audit fix`
   - Monitor dependencies: GitHub Dependabot

---

## 📈 Scaling Strategies

### Horizontal Scaling
- Run multiple API instances behind load balancer
- Nginx/HAProxy for load balancing
- Stateless API design allows easy scaling

### Worker Scaling
```bash
# Scale workers with PM2
pm2 scale vibelrn-workers 3  # Run 3 worker instances
```

### Database Optimization
- Add indexes on frequently queried columns
- Use connection pooling
- Consider read replicas for heavy loads

### Redis Optimization
- Use Redis Cluster for high availability
- Enable persistence (RDB + AOF)
- Monitor memory usage

---

## 🎉 Deployment Complete!

Your Vibelrn Manager is now live. Next steps:

1. ✅ Test all endpoints (see `TESTING_GUIDE.md`)
2. ✅ Setup monitoring and alerts
3. ✅ Configure automated backups
4. ✅ Document API for frontend team
5. ✅ Setup CI/CD pipeline (GitHub Actions)

**Congratulations! 🚀**

---

## 📞 Support Resources

- **Documentation:** README.md, QUICK_REFERENCE.md
- **Testing:** TESTING_GUIDE.md
- **Architecture:** ARCHITECTURE_DIAGRAMS.md
- **Issues:** GitHub Issues
- **Prisma Docs:** https://www.prisma.io/docs
- **BullMQ Docs:** https://docs.bullmq.io/
- **Express Docs:** https://expressjs.com/
