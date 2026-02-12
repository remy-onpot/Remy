# 🚀 Midsem Exam Platform - Production Deployment Guide

## Prerequisites

Before deploying to production, ensure you have:

- ✅ A Supabase account and project ([supabase.com](https://supabase.com))
- ✅ Node.js 18+ installed
- ✅ Vercel account (recommended) or any Next.js hosting provider

## Step 1: Set Up Supabase

### 1.1 Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization, name your project, set a database password
4. Wait for the project to be provisioned (~2 minutes)

### 1.2 Run the SQL Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Open `/app/supabase/schema.sql` from this project
3. Copy and paste the entire contents into the SQL Editor
4. Click "Run" to execute the schema
5. Verify tables were created under Database > Tables

### 1.3 Get Your API Keys

1. In Supabase dashboard, go to Settings > API
2. Copy these values:
   - Project URL
   - `anon` `public` key
   - `service_role` key (keep this secret!)

## Step 2: Configure Environment Variables

### 2.1 Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 2.2 Production (Vercel)

When deploying to Vercel, add these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **Important**: The `SUPABASE_SERVICE_ROLE_KEY` should NEVER be exposed to the client!

## Step 3: Create Your First Lecturer Account

Since this is a production app, you need to create lecturer accounts through Supabase Auth:

### Method 1: Supabase Dashboard

1. Go to Authentication > Users in Supabase dashboard
2. Click "Add User" > "Create new user"
3. Enter email and password for the lecturer
4. User can now log in at `/login`

### Method 2: Supabase CLI (Bulk Import)

```bash
supabase auth users create lecturer@university.edu --password yourpassword
```

### Method 3: Enable Email Signup (Optional)

If you want lecturers to self-register:

1. Go to Authentication > Providers in Supabase
2. Enable Email provider with email confirmation
3. Create a signup page (currently not included)

## Step 4: Deploy to Vercel

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to app directory
cd app

# Deploy
vercel --prod
```

### Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Connect your GitHub repository
4. Set Root Directory to `app`
5. Add environment variables
6. Click "Deploy"

### Alternative: Deploy to Other Platforms

This is a standard Next.js app and can be deployed to:
- **Netlify**: Build command: `npm run build`, Publish directory: `.next`
- **Railway**: Supports Next.js out of the box
- **AWS Amplify**: Configure with Next.js SSR
- **Self-hosted**: Use `npm run build && npm start`

## Step 5: Post-Deployment Checklist

### Security

- [ ] Verify RLS policies are enabled on all tables
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is not exposed in client code
- [ ] Test that students can only access their own exam sessions
- [ ] Test that lecturers can only access their own quizzes

### Functionality Testing

- [ ] Create a test quiz as a lecturer
- [ ] Add students to the roster
- [ ] Start the exam (set status to "live")
- [ ] Test student exam entry with valid code and index number
- [ ] Verify heartbeat and security monitoring works
- [ ] Test offline mode (disconnect internet during exam)
- [ ] Submit exam and verify score calculation
- [ ] Check live monitoring dashboard

### Performance

- [ ] Enable Supabase connection pooling (Database > Settings)
- [ ] Configure appropriate table indexes (already included in schema)
- [ ] Set up Vercel Analytics (optional)
- [ ] Configure proper caching headers

### Monitoring

- [ ] Set up Supabase alerts for high error rates
- [ ] Configure Vercel deployment notifications
- [ ] Monitor serverless function execution times

## Step 6: Maintaining the Application

### Database Backups

Supabase automatically backs up your database:
- **Daily backups** on Pro plan
- **Point-in-time recovery** available

You can also manually export:
```bash
# Using Supabase CLI
supabase db dump -f backup.sql
```

### Updating the Schema

When making schema changes:

1. Test in a separate Supabase project first
2. Create a migration SQL file
3. Run in production SQL Editor during low-traffic time
4. Verify no breaking changes to RLS policies

### Monitoring Student Activity

- Live sessions: `/dashboard/quiz/[id]/monitor`
- Security logs are stored in `security_logs` table
- Export results using dashboard analytics

## Common Issues & Solutions

### Issue: Students Can't Access Exam

**Solution**: 
1. Verify quiz status is "live"
2. Check student is in the roster
3. Verify RLS policies with: `SELECT * FROM quizzes WHERE status='live'` in SQL Editor

### Issue: Heartbeat Failing

**Solution**:
1. Check API route is accessible at `/api/heartbeat`
2. Verify CORS settings in Vercel
3. Check network tab for 401/403 errors

### Issue: Offline Mode Not Working

**Solution**:
1. Verify IndexedDB is supported in browser
2. Check browser console for quota errors
3. Test service worker registration

### Issue: RLS Policy Blocking Queries

**Solution**:
1. Check Supabase logs under Logs & Query Performance
2. Test queries with RLS disabled temporarily (in dev only)
3. Verify user authentication token is being sent

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Rotate service role key** if accidentally exposed
3. **Use HTTPS always** - Enforced by Vercel by default
4. **Rate limit API routes** - Consider Vercel Edge Middleware
5. **Validate all user input** - Client and server side
6. **Keep dependencies updated** - Run `npm audit` regularly

## Useful Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server locally
npm start

# Check for security vulnerabilities
npm audit

# Update all dependencies
npm update

# Generate Supabase TypeScript types
npx supabase gen types typescript --project-id your-project-ref > types/database.ts
```

## Support & Resources

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

## Production URLs

After deployment, your app will be available at:
- **Production**: `https://your-app.vercel.app`
- **Lecturer Dashboard**: `https://your-app.vercel.app/login`
- **Student Exam Entry**: `https://your-app.vercel.app/exam`

---

🎉 **Congratulations!** Your exam platform is now production-ready!
