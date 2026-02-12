# 🚀 Production Launch Checklist

Use this checklist before launching your exam platform to production.

## Pre-Deployment

### Database Setup
- [ ] Supabase project created and configured
- [ ] SQL schema (`supabase/schema.sql`) executed successfully
- [ ] All tables created (quizzes, questions, options, roster, exam_sessions, answers, security_logs)
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] RLS policies tested for both lecturers and students
- [ ] Indexes created for performance
- [ ] Realtime subscriptions enabled for exam_sessions and security_logs

### Environment Configuration
- [ ] `.env.local` created from `.env.example`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set correctly (and kept secret)
- [ ] Environment variables added to deployment platform (Vercel/etc)
- [ ] `.env.local` is in `.gitignore` (never commit secrets)

### Authentication
- [ ] At least one lecturer account created via Supabase dashboard
- [ ] Email confirmation configured (if using email auth)
- [ ] Login flow tested successfully
- [ ] Logout works correctly
- [ ] Unauthorized access properly blocked

### Testing - Lecturer Features
- [ ] Can log in successfully
- [ ] Can create a new quiz
- [ ] Can add questions (MCQ, short answer, boolean)
- [ ] Can add students to roster (manual)
- [ ] Can upload roster via CSV
- [ ] Can start exam (change status to "live")
- [ ] Can access live monitoring dashboard
- [ ] Can see real-time student activity
- [ ] Can force submit a student exam
- [ ] Can end exam
- [ ] Can view completed exam results

### Testing - Student Features
- [ ] Can access exam entry page
- [ ] Cannot enter with invalid quiz code
- [ ] Cannot enter if not in roster
- [ ] Cannot enter if quiz is not live
- [ ] Cannot enter if already completed exam
- [ ] Can resume existing in-progress session
- [ ] Security monitoring triggers warnings
- [ ] Fullscreen enforcement works
- [ ] Heartbeat updates in real-time
- [ ] Answers auto-save as they're selected
- [ ] Can submit exam successfully
- [ ] Score calculated correctly

### Testing - Security Features
- [ ] Tab switching detected and logged
- [ ] Window blur triggers warning
- [ ] Fullscreen exit triggers warning and re-entry
- [ ] Strike system works (3 strikes = auto-submit on medium)
- [ ] Time expiry causes auto-submit
- [ ] Security logs saved to database
- [ ] Lecturer can view security incidents

### Testing - Offline Mode
- [ ] Answers saved to IndexedDB when offline
- [ ] Exam continues when connection lost
- [ ] Answers sync when connection restored
- [ ] Security events tracked during offline period
- [ ] No data loss when going offline

### Testing - Edge Cases
- [ ] What happens if student refreshes page? (Should resume session)
- [ ] What happens if student closes browser? (Can resume if in progress)
- [ ] What happens if time runs out? (Auto-submit)
- [ ] What happens if student gets 3+ strikes? (Auto-submit and flagged)
- [ ] Can student access different student's exam? (No - prevent in code)
- [ ] Can lecturer access other lecturer's quizzes? (No - RLS prevents)

## Deployment

### Build
- [ ] `npm run build` runs without errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings/errors
- [ ] All dependencies installed correctly
- [ ] Production build optimized

### Hosting Platform (Vercel)
- [ ] Project connected to GitHub
- [ ] Root directory set to `app`
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`
- [ ] Environment variables configured
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled (automatic with Vercel)

### First Deployment
- [ ] Deployment successful
- [ ] No runtime errors in logs
- [ ] Can access login page
- [ ] Can access exam entry page
- [ ] API routes responding correctly
- [ ] Database queries working

## Post-Deployment

### Smoke Tests (Production)
- [ ] Lecturer login works
- [ ] Create test quiz
- [ ] Add test student to roster
- [ ] Start exam
- [ ] Student can enter exam
- [ ] Security monitoring active
- [ ] Can submit exam
- [ ] Results display correctly
- [ ] Delete test data

### Performance
- [ ] Page load times acceptable (<3s)
- [ ] API routes respond quickly (<500ms)
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Images optimized (if any)
- [ ] Fonts optimized

### Security Audit
- [ ] Service role key not exposed in client code
- [ ] RLS policies prevent unauthorized access
- [ ] API routes validate inputs
- [ ] CORS configured properly
- [ ] Rate limiting considered (optional but recommended)
- [ ] SQL injection not possible (using Supabase client)
- [ ] XSS attacks prevented (React escapes by default)

### Monitoring Setup
- [ ] Supabase logs configured
- [ ] Error tracking enabled (optional - Sentry)
- [ ] Uptime monitoring (optional - UptimeRobot)
- [ ] Database backups enabled (automatic with Supabase)
- [ ] Alerts configured for critical errors

### Documentation
- [ ] README.md up to date
- [ ] DEPLOYMENT.md reviewed
- [ ] Environment variables documented
- [ ] Known issues documented
- [ ] User guides created for lecturers
- [ ] User guides created for students

### Training & Support
- [ ] Lecturers trained on platform usage
- [ ] Test exam conducted with real students
- [ ] Support channels established
- [ ] FAQ document created
- [ ] Contact information provided

## Launch Day

### Before Exam
- [ ] Verify all quizzes configured correctly
- [ ] Verify all students in rosters
- [ ] Test exam entry with sample student
- [ ] Monitoring dashboard open and ready
- [ ] Backup plan if issues occur

### During Exam
- [ ] Monitor student activity in real-time
- [ ] Watch for unusual security incidents
- [ ] Be ready to force submit if needed
- [ ] Monitor Supabase logs for errors
- [ ] Have communication channel with students

### After Exam
- [ ] Verify all students submitted
- [ ] Check for flagged sessions
- [ ] Review security logs
- [ ] Export results for records
- [ ] Gather feedback from lecturers and students

## Maintenance

### Regular Tasks
- [ ] Review security logs weekly
- [ ] Monitor database usage
- [ ] Check for failed jobs/errors
- [ ] Update dependencies monthly
- [ ] Backup critical data
- [ ] Review and rotate API keys annually

### Scaling Considerations
- [ ] Monitor concurrent user count
- [ ] Supabase plan sufficient for load
- [ ] Vercel plan sufficient for traffic
- [ ] Database indexes optimized
- [ ] Consider CDN for static assets

## Rollback Plan

If critical issues occur:
1. Have previous deployment URL ready
2. Can revert via Vercel dashboard
3. Have database backup accessible
4. Communication plan to notify users
5. Document what went wrong

---

## Quick Status Check

Mark your current status:

- [ ] 🔴 Not Started - Just starting the deployment process
- [ ] 🟡 In Progress - Working through the checklist
- [ ] 🟢 Complete - All items checked, ready for production
- [ ] ✅ Launched - Successfully running in production

---

**Remember**: It's better to delay launch and ensure quality than to rush and have issues during a live exam!
