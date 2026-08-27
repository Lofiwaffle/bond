export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Profile = {
  id: string
  display_name: string
  couple_id: string | null
  created_at: string
  expo_push_token?: string | null
}

export type NotificationPreference = {
  user_id: string
  daily_enabled: boolean
  daily_time: string
  reveal_enabled: boolean
  timezone: string
  quiet_hours_enabled: boolean
  quiet_hours_start: number
  quiet_hours_end: number
  updated_at: string
}

export type Couple = {
  id: string
  invite_code: string
  created_by: string
  created_at: string
  paired_at: string | null
}

export type DailyCheckIn = {
  id: string
  couple_id: string
  user_id: string
  check_in_date: string
  score: number
  note: string | null
  activities: string[]
  prompt_id: string | null
  prompt_text: string | null
  prompt_answer: string | null
  created_at: string
  revised_at?: string | null
}

export type CoupleGoalStatus =
  | 'proposed'
  | 'active'
  | 'completed'
  | 'declined'
  | 'archived'

export type CoupleGoal = {
  id: string
  couple_id: string
  created_by: string
  outcome: string
  success_criteria: string | null
  realistic_plan: string | null
  why: string | null
  deadline: string | null
  status: CoupleGoalStatus
  created_at: string
  completed_at: string | null
  accepted_by: string | null
  accepted_at: string | null
  declined_by: string | null
  declined_at: string | null
  completion_requested_by: string | null
  completion_requested_at: string | null
  completed_by: string | null
  archived_by: string | null
  archived_at: string | null
}

export type CoupleGoalReview = {
  id: string
  goal_id: string
  couple_id: string
  user_id: string
  note: string
  created_at: string
}

// P0 trio new types
export type BidLog = {
  id: string
  couple_id: string
  user_id: string
  date: string
  turned_toward: boolean
  note?: string
}

export type Appreciation = {
  id: string
  couple_id: string
  from_user_id: string
  to_user_id: string
  category: 'support' | 'humor' | 'effort' | 'presence' | 'other'
  message?: string
  timestamp: string
}

export type HabitCompletion = {
  id: string
  couple_id: string
  user_id: string
  habit_id: 'spark' | 'glow' | 'forge' | 'bond' | 'sync'
  note: string | null
  created_at: string
}

export type Ritual = {
  id: string
  couple_id: string
  name: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  streak: number
  last_completed: string | null
  co_owners: [string, string]
  description?: string
}

export type RepairCard = {
  id: string
  title: string
  prompt: string
  category: 'humor' | 'apology' | 'validation' | 'deescalation' | 'affection'
}

export type WeeklyReview = {
  id: string
  couple_id: string
  user_id: string
  week_start: string
  week_end: string
  answers: Json
  created_at: string
}

export type WeeklyAiSummary = {
  id: string
  couple_id: string
  week_start: string
  week_end: string
  summary: string
  source: 'ai' | 'fallback'
  model: string | null
  original_summary: string | null
  dismissed_at: string | null
  dismissed_by: string | null
  created_at: string
  updated_at: string
}

export type WeeklyAiSummaryPref = {
  user_id: string
  couple_id: string
  week_start: string
  hidden: boolean
  edited_summary: string | null
  updated_at: string
}

export type DailyActionKind = 'appreciate' | 'support' | 'plan'
export type DailyActionStatus = 'proposed' | 'accepted' | 'completed' | 'skipped'

export type DailyAction = {
  id: string
  couple_id: string
  check_in_date: string
  proposed_by: string
  kind: DailyActionKind
  text: string
  status: DailyActionStatus
  responded_by: string | null
  proposed_at: string
  responded_at: string | null
  completed_at: string | null
}

// Supabase row types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          display_name?: string
          couple_id?: string | null
          created_at?: string
        }
        Update: {
          display_name?: string
          expo_push_token?: string | null
        }
        Relationships: []
      }
      couples: {
        Row: Couple
        Insert: {
          id?: string
          invite_code: string
          created_by: string
          created_at?: string
          paired_at?: string | null
        }
        Update: {
          paired_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: NotificationPreference
        Insert: {
          user_id: string
          daily_enabled?: boolean
          daily_time?: string
          reveal_enabled?: boolean
          timezone?: string
          quiet_hours_enabled?: boolean
          quiet_hours_start?: number
          quiet_hours_end?: number
          updated_at?: string
        }
        Update: {
          daily_enabled?: boolean
          daily_time?: string
          reveal_enabled?: boolean
          timezone?: string
          quiet_hours_enabled?: boolean
          quiet_hours_start?: number
          quiet_hours_end?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_check_ins: {
        Row: DailyCheckIn
        Insert: {
          id?: string
          couple_id: string
          user_id: string
          check_in_date: string
          score: number
          note?: string | null
          activities?: string[]
          prompt_id?: string | null
          prompt_text?: string | null
          prompt_answer?: string | null
          created_at?: string
          revised_at?: string | null
        }
        Update: {
          score?: number
          note?: string | null
          activities?: string[]
          prompt_id?: string | null
          prompt_text?: string | null
          prompt_answer?: string | null
          revised_at?: string | null
        }
        Relationships: []
      }
      daily_actions: {
        Row: DailyAction
        Insert: {
          id?: string
          couple_id: string
          check_in_date: string
          proposed_by: string
          kind: DailyActionKind
          text: string
          status?: DailyActionStatus
          responded_by?: string | null
          proposed_at?: string
          responded_at?: string | null
          completed_at?: string | null
        }
        Update: {
          kind?: DailyActionKind
          text?: string
          status?: DailyActionStatus
          responded_by?: string | null
          responded_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      bid_logs: {
        Row: BidLog
        Insert: {
          id?: string
          couple_id: string
          user_id: string
          date: string
          turned_toward: boolean
          note?: string
        }
        Update: {
          turned_toward?: boolean
          note?: string
        }
        Relationships: []
      }
      appreciations: {
        Row: Appreciation
        Insert: {
          id?: string
          couple_id: string
          from_user_id: string
          to_user_id: string
          category: 'support' | 'humor' | 'effort' | 'presence' | 'other'
          message?: string
          timestamp: string
        }
        Update: {
          message?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: HabitCompletion
        Insert: {
          id?: string
          couple_id: string
          user_id: string
          habit_id: 'spark' | 'glow' | 'forge' | 'bond' | 'sync'
          note?: string | null
          created_at?: string
        }
        Update: {
          note?: string | null
        }
        Relationships: []
      }
      partner_signals: {
        Row: {
          id: string
          couple_id: string
          actor_id: string
          event_type: string
          summary: string
          created_at: string
        }
        Insert: {
          id?: string
          couple_id: string
          actor_id: string
          event_type: string
          summary: string
          created_at?: string
        }
        Update: {
          summary?: string
        }
        Relationships: []
      }
      rituals: {
        Row: Ritual
        Insert: {
          id?: string
          couple_id: string
          name: string
          frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
          streak: number
          last_completed?: string | null
          co_owners: [string, string]
          description?: string
        }
        Update: {
          streak?: number
          last_completed?: string | null
          description?: string
        }
        Relationships: []
      }
      repair_cards: {
        Row: RepairCard
        Insert: {
          id?: string
          title: string
          prompt: string
          category: 'humor' | 'apology' | 'validation' | 'deescalation' | 'affection'
        }
        Update: {
          title?: string
          prompt?: string
          category?: string
        }
        Relationships: []
      }
      couple_goals: {
        Row: CoupleGoal
        Insert: {
          id?: string
          couple_id: string
          created_by: string
          outcome: string
          success_criteria?: string | null
          realistic_plan?: string | null
          why?: string | null
          deadline?: string | null
          status?: CoupleGoalStatus
          created_at?: string
          completed_at?: string | null
          accepted_by?: string | null
          accepted_at?: string | null
          declined_by?: string | null
          declined_at?: string | null
          completion_requested_by?: string | null
          completion_requested_at?: string | null
          completed_by?: string | null
          archived_by?: string | null
          archived_at?: string | null
        }
        Update: {
          outcome?: string
          success_criteria?: string | null
          realistic_plan?: string | null
          why?: string | null
          deadline?: string | null
          status?: CoupleGoalStatus
          completed_at?: string | null
          accepted_by?: string | null
          accepted_at?: string | null
          declined_by?: string | null
          declined_at?: string | null
          completion_requested_by?: string | null
          completion_requested_at?: string | null
          completed_by?: string | null
          archived_by?: string | null
          archived_at?: string | null
        }
        Relationships: []
      }
      couple_goal_reviews: {
        Row: CoupleGoalReview
        Insert: {
          id?: string
          goal_id: string
          couple_id: string
          user_id: string
          note: string
          created_at?: string
        }
        Update: {
          note?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: WeeklyReview
        Insert: {
          id?: string
          couple_id: string
          user_id: string
          week_start: string
          week_end: string
          answers?: Json
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      weekly_ai_summaries: {
        Row: WeeklyAiSummary
        Insert: {
          id?: string
          couple_id: string
          week_start: string
          week_end: string
          summary: string
          source?: 'ai' | 'fallback'
          model?: string | null
          original_summary?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          summary?: string
          source?: 'ai' | 'fallback'
          model?: string | null
          original_summary?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      weekly_ai_summary_prefs: {
        Row: WeeklyAiSummaryPref
        Insert: {
          user_id: string
          couple_id: string
          week_start: string
          hidden?: boolean
          edited_summary?: string | null
          updated_at?: string
        }
        Update: {
          hidden?: boolean
          edited_summary?: string | null
          couple_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_couple: {
        Args: Record<PropertyKey, never>
        Returns: Couple
      }
      join_couple: {
        Args: { invite: string }
        Returns: Couple
      }
      peek_invite: {
        Args: { invite: string }
        Returns: string
      }
      current_couple_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      delete_own_account: {
        Args: Record<PropertyKey, never>
        Returns: { ok: boolean }
      }
      leave_couple: {
        Args: Record<PropertyKey, never>
        Returns: { ok: boolean; left: boolean; couple_deleted: boolean }
      }
      has_own_check_in: {
        Args: { p_couple_id: string; p_date: string }
        Returns: boolean
      }
      has_own_weekly_review: {
        Args: { p_couple_id: string; p_week_start: string }
        Returns: boolean
      }
      // P0 trio functions
      upsert_bid_log: {
        Args: { couple_id: string; user_id: string; date: string; turned_toward: boolean; note?: string }
        Returns: BidLog
      }
      upsert_appreciation: {
        Args: {
          couple_id: string
          from_user_id: string
          to_user_id: string
          category: 'support' | 'humor' | 'effort' | 'presence' | 'other'
          message?: string
        }
        Returns: Appreciation
      }
      upsert_ritual: {
        Args: {
          couple_id: string
          name: string
          frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
          description?: string
        }
        Returns: Ritual
      }
      get_ritual: {
        Args: { ritual_id: string; couple_id: string }
        Returns: Ritual | null
      }
      list_repair_cards: {
        Args: Record<PropertyKey, never>
        Returns: RepairCard[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}