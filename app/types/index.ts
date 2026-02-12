export type QuizStatus = 'draft' | 'live' | 'ended' | 'archived';

// UPDATED: Added 'long_answer' (Theory) and 'comprehension'
export type QuestionType = 'mcq' | 'short_answer' | 'boolean' | 'long_answer' | 'comprehension';

export type SessionStatus = 'in_progress' | 'submitted' | 'flagged' | 'terminated';
export type SecurityEventType = 'tab_switch' | 'focus_lost' | 'network_disconnect' | 'fullscreen_exit' | 'mouse_leave' | 'time_warp' | 'user_agent_mismatch' | 'devtools_detected' | 'copy_attempt' | 'paste_attempt' | 'context_menu'   

export interface Quiz {
  id: string;
  lecturer_id: string;
  title: string;
  code: string;
  settings: QuizSettings;
  status: QuizStatus;
  created_at: string;
}

export interface QuizSettings {
  duration: number; // in minutes
  strictness: 'low' | 'medium' | 'high';
  shuffle: boolean;
  allow_review: boolean;
  auto_submit: boolean;
  passing_score?: number;
  show_correct_answers: boolean; // Show answer key in results (default: true)
  results_after_quiz_end_only: boolean; // Only show results when quiz status = 'ended' (default: true)
}

export interface Question {
  id: string;
  quiz_id: string;
  type: QuestionType;
  content: string;
  media_url?: string;
  points: number;
  position: number;
  
  // NEW: For Comprehension Passages
  // If this is set, show this text in a card above the question
  context?: string | null; 
  
  // NEW: For Theory/Subjective grading
  // The AI can extract the "answer key" text for the lecturer to see
  sample_answer?: string | null;

  // Options are optional (Theory/Comprehension don't have choices)
  options?: Option[];
}

export interface Option {
  id: string;
  question_id: string;
  content: string;
  is_correct: boolean;
}

export interface RosterEntry {
  quiz_id: string;
  index_number: string;
  student_name: string;
}

export interface ExamSession {
  id: string;
  quiz_id: string;
  index_number: string;
  device_fingerprint: string;
  user_agent?: string;
  started_at: string;
  completed_at?: string;
  score?: number;
  status: SessionStatus;
  last_heartbeat?: string;
  focus_status?: string;
  battery_level?: number;
  is_fullscreen?: boolean;
  strikes?: number;
  security_flags?: any[];
  quiz?: Quiz;
}

export interface Answer {
  session_id: string;
  question_id: string;
  selected_option_id?: string;
  text_response?: string;
  question?: Question;
}

export interface SecurityLog {
  id: string;
  session_id: string;
  event_type: SecurityEventType;
  duration_seconds?: number;
  metadata?: Record<string, any>;
  occurred_at: string;
}

export interface HeartbeatPayload {
  session_token: string;
  timestamp: number;
  focus_status: 'focused' | 'blurred' | 'hidden';
  battery_level?: number;
  is_fullscreen: boolean;
}

export interface SecurityState {
  strikes: number;
  warnings: number;
  last_focus_change: number;
  is_focused: boolean;
  is_fullscreen: boolean;
  offline_periods: OfflinePeriod[];
}

export interface OfflinePeriod {
  start: number;
  end: number;
  events: LocalSecurityEvent[];
}

export interface LocalSecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  duration?: number;
  sessionId: string;
}

export interface StudentEntry {
  code: string;
  index_number: string;
}

export type StudentMonitorStatus = 
  | 'not_joined'    // In roster but hasn't started exam
  | 'active'        // In exam, recent heartbeat, focused
  | 'away'          // In exam, recent heartbeat, not focused
  | 'offline'       // In exam, stale heartbeat (>60s)
  | 'flagged'       // Has violations or marked as suspicious
  | 'submitted';     // Completed exam

export interface LiveMonitorStudent {
  index_number: string;
  student_name: string;
  status: StudentMonitorStatus;
  
  // Session data (null if not joined)
  session_id: string | null;
  joined_at: string | null;
  last_heartbeat: string | null;
  completed_at: string | null;
  
  // Security metrics
  strikes: number;
  violations_count: number; // Total security events logged
  
  // Computed fields
  heartbeat_age_seconds: number | null; // How old the last heartbeat is
  is_focus_lost: boolean;
}

export interface QuizAnalytics {
  total_students: number;
  completed_count: number;
  in_progress_count: number;
  flagged_count: number;
  average_score: number;
  question_analysis: QuestionAnalysis[];
  security_incidents: SecurityIncident[];
}

export interface QuestionAnalysis {
  question_id: string;
  question_content: string;
  correct_count: number;
  incorrect_count: number;
  correct_percentage: number;
}

export interface SecurityIncident {
  timestamp: string;
  index_number: string;
  event_type: SecurityEventType;
  duration_seconds?: number;
}