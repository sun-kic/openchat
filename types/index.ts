import { Database, Json } from './database.generated'

export type { Json }

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type CourseMember = Database['public']['Tables']['course_members']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type ActivityQuestion = Database['public']['Tables']['activity_questions']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Round = Database['public']['Tables']['rounds']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Submission = Database['public']['Tables']['submissions']['Row']
export type TeacherNote = Database['public']['Tables']['teacher_notes']['Row']
export type AnalyticsSnapshot = Database['public']['Tables']['analytics_snapshot']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type CourseInsert = Database['public']['Tables']['courses']['Insert']
export type CourseMemberInsert = Database['public']['Tables']['course_members']['Insert']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']
export type QuestionInsert = Database['public']['Tables']['questions']['Insert']
export type ActivityQuestionInsert = Database['public']['Tables']['activity_questions']['Insert']
export type GroupInsert = Database['public']['Tables']['groups']['Insert']
export type GroupMemberInsert = Database['public']['Tables']['group_members']['Insert']
export type RoundInsert = Database['public']['Tables']['rounds']['Insert']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type SubmissionInsert = Database['public']['Tables']['submissions']['Insert']
export type TeacherNoteInsert = Database['public']['Tables']['teacher_notes']['Insert']
export type AnalyticsSnapshotInsert = Database['public']['Tables']['analytics_snapshot']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type CourseUpdate = Database['public']['Tables']['courses']['Update']
export type ActivityUpdate = Database['public']['Tables']['activities']['Update']
export type QuestionUpdate = Database['public']['Tables']['questions']['Update']
export type GroupUpdate = Database['public']['Tables']['groups']['Update']
export type RoundUpdate = Database['public']['Tables']['rounds']['Update']

// Extended types with relations
export type MessageWithAuthor = Message & {
  author: Profile
  reply_to?: Message
}

export type GroupWithMembers = Group & {
  members: (GroupMember & { profile: Profile })[]
}

export type ActivityWithDetails = Activity & {
  course: Course
  questions: (ActivityQuestion & { question: Question })[]
  groups: GroupWithMembers[]
}

export type SubmissionWithDetails = Submission & {
  user: Profile
  group: Group
}

// Enums
export type UserRole = 'teacher' | 'student' | 'ta' | 'admin'
export type ActivityStatus = 'draft' | 'running' | 'ended'
export type RoundStatus = 'open' | 'closed'
export type GroupRole = 'explainer' | 'example' | 'challenger' | 'summarizer'
export type SubmissionType = 'individual_choice' | 'final_choice'
export type Choice = 'A' | 'B' | 'C' | 'D'

// Session types
export type SessionType = 'permanent' | 'temporary'

// Unified user identity interface for hybrid authentication
export type UserIdentity = {
  id: string
  role: UserRole
  display_name: string
  student_number: string | null
  session_type: SessionType
  activity_id?: string  // Only for temporary students
  group_id?: string     // Only for temporary students
}

// Re-export JSONB types
export type { QuestionChoices, RoundRules, MessageMeta, AnalyticsMetrics } from './database'
