# Midsem - Secure Online Examination Platform

A professional-grade online examination system with advanced anti-cheating features, real-time monitoring, and offline-first architecture.

## Features

### Security Layer (Anti-Cheating)

1. **Focus Monitor** - Detects tab switching, window blur, and mouse leaving the viewport
2. **Time Warp Detective** - Detects when the app is suspended on mobile devices
3. **Black Box Recorder** - Records all activity locally when offline
4. **Fullscreen Enforcement** - Locks the exam in fullscreen mode
5. **Heartbeat Protocol** - Server-side validation of client connection
6. **Live Monitoring** - Real-time dashboard for invigilators

### Core Features

- **Quiz Management** - Create, edit, and manage exams
- **Question Editor** - Support for MCQ, Short Answer, and True/False questions
- **Roster Management** - CSV upload and manual student registration
- **Real-time Monitoring** - Track student activity and focus status
- **Auto-submit** - Automatic submission when time expires or strikes exceed limit
- **Offline Support** - Continue exam even without internet connection
- **Analytics** - Detailed exam statistics and question analysis

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Realtime**: Supabase Realtime
- **Storage**: IndexedDB (for offline support)

## Setup Instructions

### 1. Clone and Install

```bash
cd my-app
npm install
```

### 2. Configure Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Run the SQL schema in `supabase/schema.sql` in the SQL Editor
3. Copy your project credentials

### 3. Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### For Lecturers

1. **Login** - Access the lecturer dashboard
2. **Create Quiz** - Set up questions, duration, and security settings
3. **Manage Roster** - Add students individually or via CSV upload
4. **Start Exam** - Change quiz status to "live"
5. **Monitor** - Watch real-time student activity
6. **Analytics** - Review results after exam ends

### For Students

1. **Enter Exam** - Input quiz code and index number
2. **Take Exam** - Answer questions with fullscreen enforcement
3. **Auto-save** - Answers saved locally and synced when online
4. **Submit** - Manual or auto-submit when time expires

## Security Configuration

### Strictness Levels

- **Low**: 5 strikes allowed, 30s grace period
- **Medium**: 3 strikes allowed, 15s grace period
- **High**: 3 strikes allowed, 10s grace period

### Security Events Tracked

- Tab switching
- Window blur/focus loss
- Mouse leaving viewport
- Fullscreen exit
- Network disconnection
- App suspension (mobile)

## CSV Format for Roster Upload

```csv
index_number,student_name
20240001,John Doe
20240002,Jane Smith
20240003,Bob Johnson
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## License

MIT License - Built for educational institutions worldwide.
