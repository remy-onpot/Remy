export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          is_graded: boolean | null
          lecturer_score: number | null
          question_id: string
          selected_option_id: string | null
          session_id: string
          text_response: string | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          is_graded?: boolean | null
          lecturer_score?: number | null
          question_id: string
          selected_option_id?: string | null
          session_id: string
          text_response?: string | null
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          is_graded?: boolean | null
          lecturer_score?: number | null
          question_id?: string
          selected_option_id?: string | null
          session_id?: string
          text_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_security_summary"
            referencedColumns: ["session_id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          battery_level: number | null
          completed_at: string | null
          device_fingerprint: string | null
          focus_status: string | null
          id: string
          index_number: string
          is_fullscreen: boolean | null
          last_heartbeat: string | null
          quiz_id: string | null
          score: number | null
          security_flags: Json | null
          started_at: string | null
          status: string | null
          strikes: number | null
          user_agent: string | null
        }
        Insert: {
          battery_level?: number | null
          completed_at?: string | null
          device_fingerprint?: string | null
          focus_status?: string | null
          id?: string
          index_number: string
          is_fullscreen?: boolean | null
          last_heartbeat?: string | null
          quiz_id?: string | null
          score?: number | null
          security_flags?: Json | null
          started_at?: string | null
          status?: string | null
          strikes?: number | null
          user_agent?: string | null
        }
        Update: {
          battery_level?: number | null
          completed_at?: string | null
          device_fingerprint?: string | null
          focus_status?: string | null
          id?: string
          index_number?: string
          is_fullscreen?: boolean | null
          last_heartbeat?: string | null
          quiz_id?: string | null
          score?: number | null
          security_flags?: Json | null
          started_at?: string | null
          status?: string | null
          strikes?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_results_summary"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "exam_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          content: string
          id: string
          is_correct: boolean | null
          question_id: string | null
        }
        Insert: {
          content: string
          id?: string
          is_correct?: boolean | null
          question_id?: string | null
        }
        Update: {
          content?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          content: string
          context: string | null
          id: string
          media_url: string | null
          points: number | null
          position: number
          quiz_id: string | null
          sample_answer: string | null
          type: string
        }
        Insert: {
          content: string
          context?: string | null
          id?: string
          media_url?: string | null
          points?: number | null
          position: number
          quiz_id?: string | null
          sample_answer?: string | null
          type: string
        }
        Update: {
          content?: string
          context?: string | null
          id?: string
          media_url?: string | null
          points?: number | null
          position?: number
          quiz_id?: string | null
          sample_answer?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_results_summary"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          lecturer_id: string | null
          settings: Json
          status: string | null
          title: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          lecturer_id?: string | null
          settings?: Json
          status?: string | null
          title: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          lecturer_id?: string | null
          settings?: Json
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      roster: {
        Row: {
          index_number: string
          quiz_id: string
          student_name: string
        }
        Insert: {
          index_number: string
          quiz_id: string
          student_name: string
        }
        Update: {
          index_number?: string
          quiz_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_results_summary"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "roster_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_roster_students: {
        Row: {
          id: string
          index_number: string
          saved_roster_id: string | null
          student_name: string
        }
        Insert: {
          id?: string
          index_number: string
          saved_roster_id?: string | null
          student_name: string
        }
        Update: {
          id?: string
          index_number?: string
          saved_roster_id?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_roster_students_saved_roster_id_fkey"
            columns: ["saved_roster_id"]
            isOneToOne: false
            referencedRelation: "saved_rosters"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_rosters: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          lecturer_id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          lecturer_id: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          lecturer_id?: string
          name?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          duration_seconds: number | null
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string | null
          session_id: string | null
        }
        Insert: {
          duration_seconds?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          session_id?: string | null
        }
        Update: {
          duration_seconds?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "active_exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_security_summary"
            referencedColumns: ["session_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          lecturer_id: string | null
          reference: string
          status: string | null
          tier: string
          tokens_granted: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          lecturer_id?: string | null
          reference: string
          status?: string | null
          tier: string
          tokens_granted: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          lecturer_id?: string | null
          reference?: string
          status?: string | null
          tier?: string
          tokens_granted?: number
        }
        Relationships: []
      }
      wallets: {
        Row: {
          advanced_tokens: number | null
          basic_tokens: number | null
          lecturer_id: string
          power_tokens: number | null
          updated_at: string | null
        }
        Insert: {
          advanced_tokens?: number | null
          basic_tokens?: number | null
          lecturer_id: string
          power_tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          advanced_tokens?: number | null
          basic_tokens?: number | null
          lecturer_id?: string
          power_tokens?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_exam_sessions: {
        Row: {
          focus_status: string | null
          id: string | null
          index_number: string | null
          last_heartbeat: string | null
          quiz_code: string | null
          quiz_id: string | null
          quiz_title: string | null
          seconds_since_heartbeat: number | null
          started_at: string | null
          status: string | null
          strikes: number | null
          student_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_results_summary"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "exam_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results_summary: {
        Row: {
          average_score: number | null
          code: string | null
          completed_sessions: number | null
          flagged_sessions: number | null
          highest_score: number | null
          lowest_score: number | null
          quiz_id: string | null
          title: string | null
          total_sessions: number | null
        }
        Relationships: []
      }
      security_incidents_report: {
        Row: {
          duration_seconds: number | null
          event_type: string | null
          index_number: string | null
          occurred_at: string | null
          quiz_code: string | null
          quiz_title: string | null
          strikes: number | null
          student_name: string | null
        }
        Relationships: []
      }
      session_security_summary: {
        Row: {
          device_fingerprint: string | null
          flag_count: number | null
          focus_losses: number | null
          index_number: string | null
          last_heartbeat: string | null
          quiz_id: string | null
          session_id: string | null
          started_at: string | null
          status: string | null
          strikes: number | null
          tab_switches: number | null
          total_violations: number | null
          ua_violations: number | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_results_summary"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "exam_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_security_flag: {
        Args: { p_details?: string; p_flag_type: string; p_session_id: string }
        Returns: undefined
      }
      get_question_analytics: {
        Args: { quiz_id_param: string }
        Returns: {
          correct_answers: number
          incorrect_answers: number
          question_content: string
          question_id: string
          success_rate: number
          total_attempts: number
        }[]
      }
      get_quiz_statistics: {
        Args: { quiz_id_param: string }
        Returns: {
          average_score: number
          completed_count: number
          completion_rate: number
          flagged_count: number
          in_progress_count: number
          total_students: number
        }[]
      }
      log_security_event: {
        Args: { p_event_type: string; p_metadata?: Json; p_session_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
