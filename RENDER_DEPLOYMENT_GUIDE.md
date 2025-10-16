# Render Deployment Guide for Parish Management System

This guide will help you deploy your Laravel Parish Management System to Render.com.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **OpenAI API Key**: For the chatbot functionality

## Step 1: Prepare Your Repository

### 1.1 Push Your Code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2 Verify Required Files
Make sure these files are in your repository root:
- `render.yaml` - Render configuration
- `Dockerfile` - Docker configuration (optional)
- `deploy.sh` - Deployment script
- `.env.production` - Production environment template

## Step 2: Create Database on Render

1. **Log into Render Dashboard**
2. **Create New Database**:
   - Click "New +" → "PostgreSQL"
   - Name: `parish-db`
   - Plan: Choose "Starter" (free tier)
   - Region: Choose closest to your users
   - Click "Create Database"

3. **Note Database Credentials**:
   - Host, Port, Database name, Username, Password
   - These will be automatically used by the web service

## Step 3: Deploy Web Service

### 3.1 Create Web Service
1. **Click "New +" → "Web Service"**
2. **Connect Repository**:
   - Connect your GitHub account
   - Select your repository
   - Choose the branch (usually `main`)

### 3.2 Configure Service Settings
- **Name**: `parish-management-system` (or your preferred name)
- **Environment**: `PHP`
- **Region**: Same as your database
- **Branch**: `main`
- **Root Directory**: Leave empty (root of repository)

### 3.3 Build & Deploy Settings
- **Build Command**:
```bash
chmod +x deploy.sh && ./deploy.sh
```

- **Start Command**:
```bash
php artisan serve --host=0.0.0.0 --port=$PORT
```

### 3.4 Environment Variables
Add these environment variables in the Render dashboard:

#### Required Variables:
```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-service-name.onrender.com
LOG_CHANNEL=stderr
DB_CONNECTION=pgsql
```

#### Database Variables (Auto-populated):
```
DB_HOST=<from database>
DB_PORT=<from database>
DB_DATABASE=<from database>
DB_USERNAME=<from database>
DB_PASSWORD=<from database>
```

#### Optional Variables:
```
OPENAI_API_KEY=your_openai_api_key_here
MAIL_MAILER=smtp
MAIL_HOST=your_smtp_host
MAIL_PORT=587
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="Parish Management System"
```

### 3.5 Advanced Settings
- **Auto-Deploy**: Enable to deploy on every push
- **Health Check Path**: `/` (optional)

## Step 4: Deploy

1. **Click "Create Web Service"**
2. **Wait for Build**: This may take 5-10 minutes
3. **Check Logs**: Monitor the build process in the logs tab

## Step 5: Post-Deployment Setup

### 5.1 Generate Application Key
After deployment, run this command in the Render shell:
```bash
php artisan key:generate --force
```

### 5.2 Run Database Migrations
```bash
php artisan migrate --force
```

### 5.3 Create Storage Link
```bash
php artisan storage:link
```

### 5.4 Seed Database (Optional)
```bash
php artisan db:seed
```

## Step 6: Configure Custom Domain (Optional)

1. **In Render Dashboard**:
   - Go to your web service
   - Click "Settings" → "Custom Domains"
   - Add your domain
   - Follow DNS configuration instructions

2. **Update Environment Variables**:
   - Change `APP_URL` to your custom domain

## Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check build logs for specific errors
   - Ensure all dependencies are in `composer.json` and `package.json`
   - Verify Node.js version compatibility

2. **Database Connection Issues**:
   - Verify database credentials
   - Check if database is running
   - Ensure PostgreSQL is selected as database type

3. **Asset Loading Issues**:
   - Run `npm run build` locally to test
   - Check if Vite build completed successfully
   - Verify public/build directory exists

4. **Permission Issues**:
   - Ensure storage and bootstrap/cache directories are writable
   - Check file permissions in logs

### Debug Commands:
```bash
# Check Laravel configuration
php artisan config:show

# Check database connection
php artisan tinker
>>> DB::connection()->getPdo();

# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## Performance Optimization

### 1. Enable Caching
The deployment script already includes:
- Config caching
- Route caching
- View caching

### 2. Database Optimization
- Use database indexes for frequently queried columns
- Consider using Redis for session storage in production

### 3. Asset Optimization
- Images are automatically optimized by Vite
- Consider using a CDN for static assets

## Monitoring

### 1. Render Dashboard
- Monitor service health
- Check resource usage
- View logs and metrics

### 2. Application Logs
- Laravel logs are sent to stderr (visible in Render logs)
- Set up log monitoring for production

## Security Considerations

1. **Environment Variables**:
   - Never commit `.env` files
   - Use Render's environment variable system
   - Rotate API keys regularly

2. **Database Security**:
   - Use strong passwords
   - Enable SSL connections
   - Regular backups

3. **Application Security**:
   - Keep dependencies updated
   - Use HTTPS in production
   - Implement proper authentication

## Cost Management

### Free Tier Limits:
- **Web Service**: 750 hours/month
- **Database**: 1GB storage
- **Bandwidth**: 100GB/month

### Upgrade Considerations:
- Monitor usage in Render dashboard
- Consider paid plans for production workloads
- Optimize resource usage

## Support

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Laravel Documentation**: [laravel.com/docs](https://laravel.com/docs)
- **Community Support**: Laravel Discord, Stack Overflow

---

## Quick Reference

### Essential Commands:
```bash
# Deploy
git push origin main

# Check logs
# Use Render dashboard logs tab

# Run commands
# Use Render shell or SSH
```

### Important URLs:
- **Render Dashboard**: [dashboard.render.com](https://dashboard.render.com)
- **Service URL**: `https://your-service-name.onrender.com`
- **Database URL**: Available in database settings

### File Structure:
```
├── render.yaml          # Render configuration
├── Dockerfile           # Docker configuration
├── deploy.sh           # Deployment script
├── .env.production     # Production environment template
├── composer.json       # PHP dependencies
├── package.json        # Node dependencies
└── public/             # Web root
```
