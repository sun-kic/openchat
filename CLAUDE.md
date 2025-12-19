# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
npm install           # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Supabase
```bash
npx supabase login                                    # Login to Supabase CLI
npx supabase link --project-ref <project-ref>        # Link local project to cloud
npx supabase db push                                 # Push migrations to cloud database
npx supabase gen types typescript --linked > types/database.generated.ts  # Generate TypeScript types from schema
```

### Environment Setup
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16 (App Router) with React Server Components
- **Language**: TypeScript
- **Backend**: Next.js Server Actions (server-side mutations)
- **Database**: PostgreSQL via Supabase
- **Real-time**: Supabase Realtime (WebSocket-based subscriptions)
- **Auth**: Supabase Auth with cookie-based sessions
- **State**: Zustand for client state, React Query for server state
- **Styling**: TailwindCSS v4

### Application Purpose
OpenChat is a structured group discussion platform for diagnosing student understanding of programming concepts through turn-based, role-based discussions. Teachers create activities with questions, students are auto-grouped, and participate in mandatory rounds with validation rules (minimum length, required keywords, peer replies, etc.).

### Key Architectural Patterns

#### 1. Supabase Client Separation
- **Server Components/Actions**: Use `lib/supabase/server.ts` (SSR client with cookie management)
- **Client Components**: Use `lib/supabase/client.ts` (browser client)
- **Middleware**: Uses `lib/supabase/middleware.ts` for session refresh
- **NEVER** import the wrong client for the environment (server vs client)

#### 2. Data Flow Pattern
```
User Action → Server Action (lib/actions/*.ts)
           → Supabase Query/Mutation (with RLS enforcement)
           → revalidatePath() to update cache
           → Return { success, data } or { error }
```

Real-time updates flow separately:
```
Database Change → Supabase Realtime → useRealtime* Hook → Component State Update
```

#### 3. Authentication & Authorization
- Auth state managed via Supabase Auth (cookie-based sessions)
- Middleware (`middleware.ts`) refreshes sessions on every request
- RLS (Row Level Security) policies enforce data access at database level
- Server Actions check `getCurrentProfile()` for authorization
- Two user roles: `teacher` and `student` (plus `ta` for future)

#### 4. Database Schema Key Relationships
```
courses → course_members (enrollment)
       → activities → activity_questions → questions (question bank)
                   → groups → group_members (auto-assigned students)
                           → rounds (turn-based phases)
                                  → messages (student discussions)
                   → submissions (individual + final group choices)
```

**Critical**:
- `messages` have JSONB `meta` field with validation results (keyword_hits, has_causality, has_example, etc.)
- `rounds` have JSONB `rules` field (min_len, required_elements, keywords, must_reply_to_peer)
- RLS policies ensure students only see their own group's messages

#### 5. Real-time Architecture
- Real-time subscriptions via custom hooks: `useRealtimeMessages`, `useRealtimePresence`
- Subscriptions use channel naming: `group:{groupId}:round:{roundId}`
- Listen to `postgres_changes` events (INSERT, UPDATE, DELETE)
- Always fetch full related data (profiles, etc.) when receiving realtime payloads

#### 6. Message Validation System
Server-side validation in `lib/actions/messages.ts`:
- `validateMessageContent()` checks:
  - Minimum length (from round rules)
  - Keyword presence (from question concept_tags)
  - Causality patterns (if/then, because, therefore, etc.)
  - Example patterns (for example, such as, etc.)
  - Boundary/edge case patterns
- Validation results stored in `message.meta` JSONB field
- Used for teacher analytics and student feedback

#### 7. Type System
- Database types: `types/database.ts` (hand-maintained schema)
- Generated types: `types/database.generated.ts` (from Supabase CLI)
- Convenience types: `types/index.ts` (Row, Insert, Update, extended types)
- Always use typed Supabase client: `createClient<Database>()`

### Route Structure
```
/                           # Landing page
/login, /signup            # Authentication
/teacher                   # Teacher dashboard
  /courses/[id]            # Course detail, question bank
  /courses/[id]/activities/new  # Activity creation wizard
  /activities/[id]         # Activity monitoring (real-time)
/student                   # Student dashboard
  /courses/[id]            # Course activities list
  /activities/[id]         # Discussion room (real-time chat)
```

### Component Organization
- `components/teacher/*` - Teacher-specific UI (monitoring, controls, analytics)
- `components/student/*` - Student-specific UI (discussion room, submissions)
- `components/shared/*` - Shared UI components (if any)

### Server Actions Patterns
All server actions in `lib/actions/*.ts`:
1. Import server-side Supabase client: `import { createClient } from '@/lib/supabase/server'`
2. Check authentication: `await getCurrentProfile()`
3. Verify authorization (role check, membership check)
4. Perform database operations with RLS enforcement
5. Call `revalidatePath()` to invalidate Next.js cache
6. Return `{ success: true, data }` or `{ error: string }`

### Critical Development Notes

#### When Adding New Features:
1. **Database changes**: Create a new migration in `supabase/migrations/` (format: `YYYYMMDDHHMMSS_description.sql`)
2. **Type updates**: Run `npx supabase gen types typescript` to regenerate types
3. **RLS policies**: Always add RLS policies for new tables (see existing migrations for patterns)
4. **Real-time**: Enable realtime on tables via `alter publication supabase_realtime add table <table_name>;`

#### Security Considerations:
- Never bypass RLS in server actions (don't use service role key unless absolutely necessary)
- Always validate user input in server actions before database operations
- Use parameterized queries (Supabase client handles this automatically)
- Verify group membership before allowing message submissions
- Verify group leader status before accepting final choice submissions

#### Common Gotchas:
- `middleware.ts` runs on every request - keep it lightweight
- Server Actions must be marked with `'use server'` directive
- Client hooks must be marked with `'use client'` directive
- Realtime subscriptions need cleanup: return `() => supabase.removeChannel(channel)`
- When querying with joins, use Supabase PostgREST syntax: `.select('*, profile!foreign_key(id, name)')`
- Always handle both `data` and `error` from Supabase queries

### Testing Strategy
(Not yet implemented - Phase 4)
- Unit tests for validation logic (`validateMessageContent`, etc.)
- Integration tests for server actions
- E2E tests for critical flows (activity creation, discussion rounds)
