# OpenChat - PHP Concept Discussion Platform

A structured group discussion platform for diagnosing student understanding of programming concepts through turn-based, role-based discussions.

## 🎯 Project Overview

This platform enables teachers to:
- Monitor online group discussions with structured turn-based chat
- Assess each student's mastery of basic programming concepts
- Replace free-text conclusions with final four-choice selections
- Solve the "students speak too little to judge" problem through mandatory rounds

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js Server Actions, Supabase
- **Database**: PostgreSQL (Supabase)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth
- **State Management**: Zustand, React Query

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

## 🚀 Getting Started

### 1. Clone and Install

```bash
cd openchat
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Run Database Migrations

In your Supabase SQL Editor, run the migrations in order:

1. `supabase/migrations/20250101000001_initial_schema.sql`
2. `supabase/migrations/20250101000002_rls_policies.sql`
3. `supabase/migrations/20250101000003_helper_functions.sql`

Or use Supabase CLI:

```bash
npx supabase db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
openchat/
├── app/
│   ├── teacher/          # Teacher dashboard and controls
│   ├── student/          # Student group discussion interface
│   ├── auth/             # Authentication pages
│   └── api/              # API routes
├── components/
│   ├── teacher/          # Teacher-specific components
│   ├── student/          # Student-specific components
│   └── shared/           # Shared UI components
├── lib/
│   ├── supabase/         # Supabase client configuration
│   ├── actions/          # Server Actions
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── types/                # TypeScript type definitions
├── supabase/
│   └── migrations/       # Database migration files
└── public/               # Static assets
```

## 🎮 Core Features

### For Teachers

- **Course Management**: Create courses and manage students
- **Activity Creation**: Select questions, configure rules, auto-group students
- **Real-time Monitoring**: Track group progress, message flow, completion status
- **Analytics Dashboard**: View statistics, identify struggling students
- **Playback & Annotation**: Review discussions, add tags and notes
- **Export**: Download data for research analysis

### For Students

- **Turn-based Discussion**: Structured rounds with mandatory participation
- **Diagnostic Elements**: System validates keyword usage, causality, examples
- **Peer Review**: Required responses to classmates
- **Final Selection**: Group leader submits final choice (A/B/C/D)
- **Real-time Sync**: See messages as they arrive

## 🔒 Security

- Row Level Security (RLS) policies ensure students can only see their own group's messages
- Teachers can view all groups in their courses
- Server-side validation prevents cheating and rule bypassing
- Invitation code system for course enrollment

## 📊 Database Schema

### Core Tables

- `profiles` - User information and roles
- `courses` - Course/class information
- `activities` - Discussion activities (multiple questions)
- `questions` - Question bank with 4-choice options
- `groups` - Auto-generated student groups
- `rounds` - Turn-based discussion rounds
- `messages` - Student discussion messages
- `submissions` - Individual choices and final group answers
- `teacher_notes` - Teacher annotations and tags

See `types/database.ts` for full schema.

## 🛠️ Development Roadmap

### Phase 0: Project Setup ✅
- [x] Initialize Next.js project
- [x] Configure Supabase
- [x] Create database schema
- [x] Implement RLS policies
- [x] Define TypeScript types

### Phase 1: Foundation (Next)
- [ ] Authentication flow
- [ ] Course management
- [ ] Question bank CRUD

### Phase 2: Core Features
- [ ] Activity creation wizard
- [ ] Auto-grouping algorithm
- [ ] Turn-based chat UI
- [ ] Round validation logic

### Phase 3: Real-time & Monitoring
- [ ] Supabase Realtime integration
- [ ] Teacher monitoring dashboard
- [ ] Analytics and statistics

### Phase 4: Polish & Launch
- [ ] Playback and annotation
- [ ] Export functionality
- [ ] Testing and optimization

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.

## 📧 Support

For issues and questions, please open a GitHub issue.
