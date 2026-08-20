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
}

export type CoupleGoal = {
  id: string
  couple_id: string
  created_by: string
  outcome: string
  success_criteria: string | null
  realistic_plan: string | null
  why: string | null
  deadline: string | null
  status: 'active' | 'completed'
  created_at: string
  completed_at: string | null
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
  created_at: string
  updated_at: string
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
        }
        Update: {
          score?: number
          note?: string | null
          activities?: string[]
          prompt_id?: string | null
          prompt_text?: string | null
          prompt_answer?: string | null
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
          status?: 'active' | 'completed'
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          outcome?: string
          success_criteria?: string | null
          realistic_plan?: string | null
          why?: string | null
          deadline?: string | null
          status?: 'active' | 'completed'
          completed_at?: string | null
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
        Update: {
          answers?: Json
        }
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
          created_at?: string
          updated_at?: string
        }
        Update: {
          summary?: string
          source?: 'ai' | 'fallback'
          model?: string | null
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
      current_couple_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      delete_own_account: {
        Args: Record<PropertyKey, never>
        Returns: { ok: boolean }
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