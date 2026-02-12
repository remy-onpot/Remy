export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      quizzes: {
        Row: {
          id: string
          lecturer_id: string
          title: string
          code: string
          settings: Json
          status: 'draft' | 'live' | 'ended' | 'archived'
          created_at: string
        }
        Insert: {
          id?: string
          lecturer_id: string
          title: string
          code: string
          settings: Json
          status?: 'draft' | 'live' | 'ended' | 'archived'
          created_at?: string
        }
        Update: {
          id?: string
          lecturer_id?: string
          title?: string
          code?: string
          settings?: Json
          status?: 'draft' | 'live' | 'ended' | 'archived'
          created_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          id: string
          quiz_id: string
          type: 'mcq' | 'short_answer' | 'boolean'
          content: string
          media_url: string | null
          points: number
          position: number
        }
        Insert: {
          id?: string
          quiz_id: string
          type: 'mcq' | 'short_answer' | 'boolean'
          content: string
          media_url?: string | null
          points?: number
          position: number
        }
        Update: {
          id?: string
          quiz_id?: string
          type?: 'mcq' | 'short_answer' | 'boolean'
          content?: string
          media_url?: string | null
          points?: number
          position?: number
        }
        Relationships: []
      }
      options: {
        Row: {
          id: string
          question_id: string
          content: string
          is_correct: boolean
        }
        Insert: {
          id?: string
          question_id: string
          content: string
          is_correct?: boolean
        }
        Update: {
          id?: string
          question_id?: string
          content?: string
          is_correct?: boolean
        }
        Relationships: []
      }
      roster: {
        Row: {
          quiz_id: string
          index_number: string
          student_name: string
        }
        Insert: {
          quiz_id: string
          index_number: string
          student_name: string
        }
        Update: {
          quiz_id?: string
          index_number?: string
          student_name?: string
        }
        Relationships: []
      }
      exam_sessions: {
        Row: {
          id: string
          quiz_id: string
          index_number: string
          device_fingerprint: string
          user_agent: string | null
          started_at: string
          completed_at: string | null
          score: number | null
          status: 'in_progress' | 'submitted' | 'flagged' | 'terminated'
          last_heartbeat: string | null
          focus_status: string | null
          battery_level: number | null
          is_fullscreen: boolean | null
          strikes: number
          security_flags: any[] | null
        }
        Insert: {
          id?: string
          quiz_id: string
          index_number: string
          device_fingerprint: string
          user_agent?: string | null
          started_at?: string
          completed_at?: string | null
          score?: number | null
          status?: 'in_progress' | 'submitted' | 'flagged' | 'terminated'
          last_heartbeat?: string | null
          focus_status?: string | null
          battery_level?: number | null
          is_fullscreen?: boolean | null
          strikes?: number
          security_flags?: any[] | null
        }
        Update: {
          id?: string
          quiz_id?: string
          index_number?: string
          device_fingerprint?: string
          user_agent?: string | null
          started_at?: string
          completed_at?: string | null
          score?: number | null
          status?: 'in_progress' | 'submitted' | 'flagged' | 'terminated'
          last_heartbeat?: string | null
          focus_status?: string | null
          battery_level?: number | null
          is_fullscreen?: boolean | null
          strikes?: number
          security_flags?: any[] | null
        }
        Relationships: []
      }
      answers: {
        Row: {
          session_id: string
          question_id: string
          selected_option_id: string | null
          text_response: string | null
        }
        Insert: {
          session_id: string
          question_id: string
          selected_option_id?: string | null
          text_response?: string | null
        }
        Update: {
          session_id?: string
          question_id?: string
          selected_option_id?: string | null
          text_response?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          id: string
          session_id: string
          event_type: string
          duration_seconds: number | null
          metadata: Record<string, any> | null
          occurred_at: string
        }
        Insert: {
          id?: string
          session_id: string
          event_type: string
          duration_seconds?: number | null
          metadata?: Record<string, any> | null
          occurred_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          event_type?: string
          duration_seconds?: number | null
          metadata?: Record<string, any> | null
          occurred_at?: string
        }
        Relationships: []
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
