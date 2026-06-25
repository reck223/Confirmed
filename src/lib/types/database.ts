export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Relationships: []
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          tagline: string | null
          streak: number
          assessments_submitted: number
          goals_complete: number
          cover_theme: string
          assessment_day: string
          assessment_time: string
          focus_areas: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          tagline?: string | null
          streak?: number
          assessments_submitted?: number
          goals_complete?: number
          cover_theme?: string
          assessment_day?: string
          assessment_time?: string
          focus_areas?: string[]
        }
        Update: {
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          tagline?: string | null
          streak?: number
          assessments_submitted?: number
          goals_complete?: number
          cover_theme?: string
          assessment_day?: string
          assessment_time?: string
          focus_areas?: string[]
        }
      }
      circles: {
        Relationships: []
        Row: {
          id: string
          name: string
          code: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          created_by?: string | null
        }
        Update: {
          name?: string
          code?: string
          created_by?: string | null
        }
      }
      circle_members: {
        Relationships: []
        Row: {
          id: string
          circle_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
        }
        Update: {
          circle_id?: string
          user_id?: string
        }
      }
      goals: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          title: string
          category: string | null
          visibility: 'private' | 'circle' | 'public'
          progress: number
          status: 'active' | 'complete' | 'paused'
          deadline: string | null
          next_action: string | null
          why_it_matters: string | null
          goal_type: 'standard' | 'reading' | 'letter'
          completed_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          category?: string | null
          visibility?: 'private' | 'circle' | 'public'
          progress?: number
          status?: 'active' | 'complete' | 'paused'
          deadline?: string | null
          next_action?: string | null
          why_it_matters?: string | null
          goal_type?: 'standard' | 'reading' | 'letter'
          completed_date?: string | null
        }
        Update: {
          title?: string
          category?: string | null
          visibility?: 'private' | 'circle' | 'public'
          progress?: number
          status?: 'active' | 'complete' | 'paused'
          deadline?: string | null
          next_action?: string | null
          why_it_matters?: string | null
          goal_type?: 'standard' | 'reading' | 'letter'
          completed_date?: string | null
        }
      }
      goal_milestones: {
        Relationships: []
        Row: {
          id: string
          goal_id: string
          text: string
          done: boolean
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          text: string
          done?: boolean
          due_date?: string | null
        }
        Update: {
          text?: string
          done?: boolean
          due_date?: string | null
        }
      }
      assessments: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          week_start: string
          rating: number | null
          wins: string | null
          challenges: string | null
          lessons: string | null
          intentions: string | null
          gratitude: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          rating?: number | null
          wins?: string | null
          challenges?: string | null
          lessons?: string | null
          intentions?: string | null
          gratitude?: string | null
        }
        Update: {
          rating?: number | null
          wins?: string | null
          challenges?: string | null
          lessons?: string | null
          intentions?: string | null
          gratitude?: string | null
        }
      }
      check_ins: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          date: string
          mood: number | null
          win: string | null
          intention: string | null
          reflection: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          mood?: number | null
          win?: string | null
          intention?: string | null
          reflection?: string | null
        }
        Update: {
          mood?: number | null
          win?: string | null
          intention?: string | null
          reflection?: string | null
        }
      }
      posts: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          circle_id: string | null
          type: 'win' | 'lesson' | 'milestone' | 'progress' | 'question'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          circle_id?: string | null
          type: 'win' | 'lesson' | 'milestone' | 'progress' | 'question'
          content: string
        }
        Update: {
          type?: 'win' | 'lesson' | 'milestone' | 'progress' | 'question'
          content?: string
        }
      }
      post_reactions: {
        Relationships: []
        Row: {
          id: string
          post_id: string
          user_id: string
          type: 'fire' | 'strong' | 'relate'
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          type: 'fire' | 'strong' | 'relate'
        }
        Update: {
          type?: 'fire' | 'strong' | 'relate'
        }
      }
      journal_entries: {
        Relationships: []
        Row: {
          id: string
          user_id: string
          type: 'gratitude' | 'cbt' | 'write' | null
          content: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: 'gratitude' | 'cbt' | 'write' | null
          content?: Json
        }
        Update: {
          type?: 'gratitude' | 'cbt' | 'write' | null
          content?: Json
        }
      }
      messages: {
        Relationships: []
        Row: {
          id: string
          conversation_id: string
          sender_id: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id?: string | null
          content: string
        }
        Update: {
          content?: string
        }
      }
    }
  }
}

// Convenience aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Goal = Database['public']['Tables']['goals']['Row']
export type Assessment = Database['public']['Tables']['assessments']['Row']
export type CheckIn = Database['public']['Tables']['check_ins']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
export type Circle = Database['public']['Tables']['circles']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
