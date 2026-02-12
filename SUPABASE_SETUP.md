# 🔧 Supabase Configuration Guide

Complete guide for setting up Supabase for the Midsem Exam Platform.

## 1. Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: Midsem Exam Platform (or your preference)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier works for testing, Pro for production with many students

4. Wait 2-3 minutes for project to be created

## 2. Run SQL Schema

### Option A: SQL Editor (Recommended)

1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Open the file `/app/supabase/schema.sql` from this project
4. Copy the **entire contents** and paste into the SQL Editor
5. Click "Run" or press `Ctrl/Cmd + Enter`
6. You should see: "Success. No rows returned"

### Option B: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## 3. Verify Schema

After running the schema, verify tables were created:

1. Go to "Database" → "Tables" in sidebar
2. You should see these tables:
   - ✅ quizzes
   - ✅ questions
   - ✅ options
   - ✅ roster
   - ✅ exam_sessions
   - ✅ answers
   - ✅ security_logs

3. Click on any table to see its structure

## 4. Get API Credentials

1. Go to "Settings" → "API" in sidebar
2. You'll see:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```
Copy this as your `NEXT_PUBLIC_SUPABASE_URL`

### Project API Keys

**anon public** key:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
```
Copy this as your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**service_role** key:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
```
⚠️ Copy this as your `SUPABASE_SERVICE_ROLE_KEY`
**IMPORTANT**: This key bypasses all security rules. Never expose it in client-side code!

## 5. Configure Environment Variables

### For Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### For Production (Vercel)

Add the same three environment variables in your Vercel project settings:
- Settings → Environment Variables → Add New

## 6. Enable Realtime

Realtime is needed for live monitoring dashboard.

1. Go to "Database" → "Replication" in sidebar
2. Find tables: `exam_sessions` and `security_logs`
3. Toggle "Enable Realtime" for both tables
4. Click "Save"

## 7. Configure Authentication

### Create Lecturer Accounts

Since students don't need accounts (they use index numbers), only create accounts for lecturers.

#### Method 1: Supabase Dashboard

1. Go to "Authentication" → "Users" in sidebar
2. Click "Add User" → "Create new user"
3. Fill in:
   - **Email**: lecturer@university.edu
   - **Password**: Set a strong password (or auto-generate)
   - **Email Confirm**: Toggle OFF if you don't want email verification
4. Click "Create User"
5. The lecturer can now login at `/login`

#### Method 2: SQL Query

```sql
-- Insert a user (replace with actual values)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'lecturer@university.edu',
  crypt('yourpassword', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

#### Method 3: Supabase CLI

```bash
supabase auth users create lecturer@university.edu --password yourpassword
```

### Configure Email Settings (Optional)

If you want email verification/password reset:

1. Go to "Authentication" → "Email Templates"
2. Customize:
   - Confirm Signup
   - Reset Password
   - Magic Link

3. Go to "Authentication" → "Providers"
4. Enable "Email" provider
5. Configure SMTP settings (or use Supabase's built-in)

## 8. Test Database Connection

### Test Query

Run this in SQL Editor to test:

```sql
-- Should return empty array (no quizzes yet)
SELECT * FROM quizzes;

-- Should show RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`

### Test with App

1. Start your Next.js app:
   ```bash
   cd app
   npm run dev
   ```

2. Try to login at `http://localhost:3000/login`
3. If successful, you're connected!

## 9. Monitor Usage

### Database Usage

1. Go to "Database" → "Database" in sidebar
2. Check:
   - Database Size
   - Active Connections
   - Database Health

### API Usage

1. Go to "Settings" → "Usage"
2. Monitor:
   - Database Space
   - Bandwidth
   - API Requests

Free tier limits:
- 500 MB database
- 1 GB bandwidth
- 50,000 monthly API requests

## 10. Security Best Practices

### Row Level Security (RLS)

✅ **Already configured in schema.sql**

Verify RLS is working:

```sql
-- As anonymous user (student), should only see live quizzes
SELECT * FROM quizzes WHERE status = 'live';

-- As authenticated lecturer, should only see own quizzes
SELECT * FROM quizzes WHERE lecturer_id = auth.uid();
```

### API Key Security

- ✅ `anon` key: Safe to expose (used in client-side code)
- ❌ `service_role` key: NEVER expose (server-side only)

### Database Backups

**Free Tier**: No automatic backups
**Pro Tier**: Daily automatic backups + Point-in-time recovery

To manually backup:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or export from dashboard
# Database → Backups → Export
```

## 11. Performance Optimization

### Indexes

Already included in schema.sql:
- `idx_quizzes_lecturer` - Fast lecturer queries
- `idx_sessions_quiz` - Fast session lookups
- `idx_sessions_status` - Fast status filtering

### Connection Pooling

For production:
1. Go to "Settings" → "Database"
2. Enable "Connection Pooling"
3. Use the pooler URL for serverless functions

## 12. Troubleshooting

### "relation does not exist" Error

**Problem**: Tables not created
**Solution**: Re-run the schema.sql file

### "permission denied for table" Error

**Problem**: RLS blocking query
**Solution**: Check if user is authenticated or policy is correct

### "JWT expired" Error

**Problem**: Auth token expired
**Solution**: User needs to login again

### Slow Queries

**Problem**: Missing indexes or too much data
**Solution**: 
1. Check "Database" → "Query Performance"
2. Add indexes if needed
3. Optimize queries

### Connection Limit Reached

**Problem**: Too many concurrent connections
**Solution**:
1. Enable connection pooling
2. Properly close connections in code
3. Upgrade Supabase plan

## 13. Useful SQL Queries

### View All Tables

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Count Records

```sql
SELECT 
  'quizzes' as table_name, COUNT(*) as count FROM quizzes
UNION ALL
SELECT 
  'exam_sessions' as table_name, COUNT(*) as count FROM exam_sessions
UNION ALL
SELECT 
  'security_logs' as table_name, COUNT(*) as count FROM security_logs;
```

### View Active Sessions

```sql
SELECT 
  es.*,
  q.title,
  q.code,
  r.student_name
FROM exam_sessions es
JOIN quizzes q ON q.id = es.quiz_id
LEFT JOIN roster r ON r.quiz_id = es.quiz_id AND r.index_number = es.index_number
WHERE es.status = 'in_progress'
ORDER BY es.started_at DESC;
```

### View Security Incidents

```sql
SELECT 
  q.title,
  es.index_number,
  r.student_name,
  sl.event_type,
  sl.occurred_at,
  es.strikes
FROM security_logs sl
JOIN exam_sessions es ON es.id = sl.session_id
JOIN quizzes q ON q.id = es.quiz_id
LEFT JOIN roster r ON r.quiz_id = es.quiz_id AND r.index_number = es.index_number
ORDER BY sl.occurred_at DESC
LIMIT 50;
```

## 14. Migration to New Updates

If we release database updates:

1. Download the migration file from repository
2. Open SQL Editor
3. Run the migration SQL
4. Verify changes applied

Example for student RLS policies:

```bash
# Run the migration update
supabase db push --file migration_update.sql
```

---

## 🎉 Setup Complete!

Your Supabase database is now configured and ready for production use.

**Next Steps:**
1. Test lecturer login
2. Create a test quiz
3. Add test students to roster
4. Run a dry-run exam
5. Review [DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment

**Need Help?**
- Supabase Docs: [https://supabase.com/docs](https://supabase.com/docs)
- Supabase Discord: [https://discord.supabase.com](https://discord.supabase.com)
