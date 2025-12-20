export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'teacher' | 'student' | 'ta' | 'admin'
          display_name: string
          student_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'teacher' | 'student' | 'ta' | 'admin'
          display_name: string
          student_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'teacher' | 'student' | 'ta' | 'admin'
          display_name?: string
          student_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          teacher_id: string
          title: string
          description: string | null
          invitation_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          title: string
          description?: string | null
          invitation_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          title?: string
          description?: string | null
          invitation_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      course_members: {
        Row: {
          course_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          course_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          course_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          status: 'draft' | 'running' | 'ended'
          current_question_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          status?: 'draft' | 'running' | 'ended'
          current_question_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'running' | 'ended'
          current_question_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          course_id: string | null
          title: string
          prompt: string
          context: string | null
          concept_tags: string[]
          choices: QuestionChoices
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id?: string | null
          title: string
          prompt: string
          context?: string | null
          concept_tags?: string[]
          choices: QuestionChoices
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string | null
          title?: string
          prompt?: string
          context?: string | null
          concept_tags?: string[]
          choices?: QuestionChoices
          created_at?: string
          updated_at?: string
        }
      }
      activity_questions: {
        Row: {
          activity_id: string
          question_id: string
          order_index: number
        }
        Insert: {
          activity_id: string
          question_id: string
          order_index: number
        }
        Update: {
          activity_id?: string
          question_id?: string
          order_index?: number
        }
      }
      groups: {
        Row: {
          id: string
          activity_id: string
          name: string
          leader_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          name: string
          leader_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          name?: string
          leader_user_id?: string | null
          created_at?: string
        }
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role_in_group: 'explainer' | 'example' | 'challenger' | 'summarizer' | null
          seat_no: number
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role_in_group?: 'explainer' | 'example' | 'challenger' | 'summarizer' | null
          seat_no: number
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role_in_group?: 'explainer' | 'example' | 'challenger' | 'summarizer' | null
          seat_no?: number
          joined_at?: string
        }
      }
      rounds: {
        Row: {
          id: string
          activity_id: string
          question_id: string
          round_no: number
          status: 'open' | 'closed'
          rules: RoundRules
          start_at: string
          end_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          question_id: string
          round_no: number
          status?: 'open' | 'closed'
          rules?: RoundRules
          start_at?: string
          end_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          question_id?: string
          round_no?: number
          status?: 'open' | 'closed'
          rules?: RoundRules
          start_at?: string
          end_at?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          activity_id: string
          question_id: string
          group_id: string
          round_id: string
          user_id: string
          content: string
          meta: MessageMeta
          reply_to_message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          question_id: string
          group_id: string
          round_id: string
          user_id: string
          content: string
          meta?: MessageMeta
          reply_to_message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          question_id?: string
          group_id?: string
          round_id?: string
          user_id?: string
          content?: string
          meta?: MessageMeta
          reply_to_message_id?: string | null
          created_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          activity_id: string
          question_id: string
          group_id: string
          user_id: string
          type: 'individual_choice' | 'final_choice'
          choice: 'A' | 'B' | 'C' | 'D'
          rationale: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          question_id: string
          group_id: string
          user_id: string
          type: 'individual_choice' | 'final_choice'
          choice: 'A' | 'B' | 'C' | 'D'
          rationale?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          question_id?: string
          group_id?: string
          user_id?: string
          type?: 'individual_choice' | 'final_choice'
          choice?: 'A' | 'B' | 'C' | 'D'
          rationale?: string | null
          created_at?: string
        }
      }
      teacher_notes: {
        Row: {
          id: string
          activity_id: string
          question_id: string
          group_id: string | null
          user_id: string
          teacher_id: string
          tag: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          question_id: string
          group_id?: string | null
          user_id: string
          teacher_id: string
          tag: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          question_id?: string
          group_id?: string | null
          user_id?: string
          teacher_id?: string
          tag?: string
          note?: string | null
          created_at?: string
        }
      }
      analytics_snapshot: {
        Row: {
          id: string
          activity_id: string
          question_id: string | null
          group_id: string | null
          user_id: string | null
          metrics: AnalyticsMetrics
          created_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          question_id?: string | null
          group_id?: string | null
          user_id?: string | null
          metrics?: AnalyticsMetrics
          created_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          question_id?: string | null
          group_id?: string | null
          user_id?: string | null
          metrics?: AnalyticsMetrics
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Custom types for JSONB fields
export interface QuestionChoices {
  A: { text: string; correct: boolean }
  B: { text: string; correct: boolean }
  C: { text: string; correct: boolean }
  D: { text: string; correct: boolean }
}

export interface RoundRules {
  min_len?: number
  required_elements?: string[]
  keywords?: string[]
  must_reply_to_peer?: boolean
}

export interface MessageMeta {
  len?: number
  keyword_hits?: string[]
  has_example?: boolean
  has_if_then?: boolean
  has_boundary?: boolean
  has_causality?: boolean
}

export interface AnalyticsMetrics {
  message_count?: number
  keyword_hits?: number
  peer_review_count?: number
  avg_message_length?: number
  completion_rate?: number
  [key: string]: any
}
