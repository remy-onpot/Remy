# 🔄 Database Migration Instructions

## ⚠️ Important: Don't Re-run schema.sql!

Since you've already run `schema.sql`, running it again will cause errors like:
- `ERROR: relation "exam_sessions" already exists`
- `ERROR: constraint already exists`

## ✅ Run This Instead

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy Migration File
Copy the entire contents of:
```
app/supabase/migration_security_enhanced.sql
```

### Step 3: Execute
1. Paste into the SQL Editor
2. Click **Run** (or press Ctrl/Cmd + Enter)

### Step 4: Verify
Check that the migration completed successfully:

```sql
-- Should show user_agent and security_flags columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exam_sessions' 
AND column_name IN ('user_agent', 'security_flags');

-- Should return 2 rows
```

## 🎯 What This Migration Does

### Safe Operations (No Errors)
- ✅ `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` - Only adds if missing
- ✅ `CREATE INDEX IF NOT EXISTS` - Only creates if missing  
- ✅ `CREATE OR REPLACE FUNCTION` - Updates existing functions
- ✅ `DROP CONSTRAINT IF EXISTS` - Safe constraint updates

### Changes Applied
1. **New Columns**
   - `exam_sessions.user_agent` - Stores browser signature
   - `exam_sessions.security_flags` - JSONB array for violations
   - `security_logs.metadata` - Structured event data

2. **Updated Constraints**
   - `exam_sessions.status` - Now includes 'terminated'

3. **New Indexes** (Performance)
   - `idx_sessions_user_agent` - Fast UA lookups
   - `idx_sessions_security_flags` - GIN index for JSONB
   - `idx_sessions_index_status` - Duplicate detection

4. **Database Functions**
   - `log_security_event()` - Structured logging
   - `add_security_flag()` - Add flags to sessions
   - `increment_strikes_on_violation()` - Auto-increment
   - `auto_flag_on_strikes()` - Auto-flag at 3 strikes

5. **Triggers**
   - Auto-increment strikes on violations
   - Auto-flag sessions at 3+ strikes

6. **Security View**
   - `session_security_summary` - Analytics dashboard

## 🔍 Troubleshooting

### If You Get "Column Already Exists"
This is OK! The `IF NOT EXISTS` clause handles this gracefully.
The migration will skip that column and continue.

### If You Get "Constraint Does Not Exist"  
This is also OK! The `IF EXISTS` clause handles this.

### If Everything Fails
The migration is idempotent - you can run it multiple times safely.

## ✅ Expected Output
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
CREATE TRIGGER
CREATE TRIGGER
CREATE VIEW
Query returned successfully
```

## 🚀 After Migration

Deploy your updated code:
```bash
cd /workspaces/Remy/app
npm run build
# Deploy to Vercel/hosting
```

Test the new features:
1. Start an exam session
2. Wait 10 seconds (heartbeat)
3. Should see user_agent being validated
4. Check security_logs table for entries

---

**Need Help?** The migration is designed to be run multiple times safely.
If unsure, run it in a development/staging environment first.
