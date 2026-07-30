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
  created_at: string
}

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
          created_at?: string
        }
        Update: {
          score?: number
          note?: string | null
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
      has_own_check_in: {
        Args: { p_couple_id: string; p_date: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
