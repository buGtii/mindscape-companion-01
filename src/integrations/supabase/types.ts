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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_symptom_analyses: {
        Row: {
          created_at: string
          id: string
          input_text: string
          suggestions: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_text: string
          suggestions?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_text?: string
          suggestions?: Json
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_booked: boolean
          psychologist_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_booked?: boolean
          psychologist_id: string
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_booked?: boolean
          psychologist_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          patient_note: string | null
          psychologist_id: string
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          patient_note?: string | null
          psychologist_id: string
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          patient_note?: string | null
          psychologist_id?: string
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "psychologist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          disorder_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disorder_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disorder_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_assessments: {
        Row: {
          checked_criteria: Json
          client_id: string | null
          created_at: string
          disorder_id: string | null
          id: string
          notes: string | null
          patient_label: string
          psychologist_id: string
          risk_level: string
          treatment_plan: string | null
          updated_at: string
        }
        Insert: {
          checked_criteria?: Json
          client_id?: string | null
          created_at?: string
          disorder_id?: string | null
          id?: string
          notes?: string | null
          patient_label: string
          psychologist_id: string
          risk_level?: string
          treatment_plan?: string | null
          updated_at?: string
        }
        Update: {
          checked_criteria?: Json
          client_id?: string | null
          created_at?: string
          disorder_id?: string | null
          id?: string
          notes?: string | null
          patient_label?: string
          psychologist_id?: string
          risk_level?: string
          treatment_plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_assessments_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      disorder_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      disorder_criteria: {
        Row: {
          description: string
          disorder_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          description: string
          disorder_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          description?: string
          disorder_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "disorder_criteria_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      disorder_relations: {
        Row: {
          created_at: string
          from_disorder_id: string
          id: string
          notes: string | null
          relation_type: string
          to_disorder_id: string
        }
        Insert: {
          created_at?: string
          from_disorder_id: string
          id?: string
          notes?: string | null
          relation_type?: string
          to_disorder_id: string
        }
        Update: {
          created_at?: string
          from_disorder_id?: string
          id?: string
          notes?: string | null
          relation_type?: string
          to_disorder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disorder_relations_from_disorder_id_fkey"
            columns: ["from_disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disorder_relations_to_disorder_id_fkey"
            columns: ["to_disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      disorders: {
        Row: {
          category_id: string | null
          common_symptoms: string[]
          created_at: string
          dsm_code: string | null
          id: string
          is_premium: boolean
          name: string
          overview: string | null
          prevalence: string | null
          slug: string
          source_citation: string | null
          source_page: number | null
          summary: string
          synonyms: string[]
        }
        Insert: {
          category_id?: string | null
          common_symptoms?: string[]
          created_at?: string
          dsm_code?: string | null
          id?: string
          is_premium?: boolean
          name: string
          overview?: string | null
          prevalence?: string | null
          slug: string
          source_citation?: string | null
          source_page?: number | null
          summary: string
          synonyms?: string[]
        }
        Update: {
          category_id?: string | null
          common_symptoms?: string[]
          created_at?: string
          dsm_code?: string | null
          id?: string
          is_premium?: boolean
          name?: string
          overview?: string | null
          prevalence?: string | null
          slug?: string
          source_citation?: string | null
          source_page?: number | null
          summary?: string
          synonyms?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "disorders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "disorder_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          disorder_id: string
          ease: number
          id: string
          reviewed_at: string
          user_id: string
        }
        Insert: {
          disorder_id: string
          ease?: number
          id?: string
          reviewed_at?: string
          user_id: string
        }
        Update: {
          disorder_id?: string
          ease?: number
          id?: string
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      psychologist_profiles: {
        Row: {
          bio: string | null
          created_at: string
          currency: string
          experience_years: number
          fee_cents: number
          id: string
          languages: string[]
          qualification: string
          specializations: string[]
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          bio?: string | null
          created_at?: string
          currency?: string
          experience_years?: number
          fee_cents?: number
          id?: string
          languages?: string[]
          qualification: string
          specializations?: string[]
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          bio?: string | null
          created_at?: string
          currency?: string
          experience_years?: number
          fee_cents?: number
          id?: string
          languages?: string[]
          qualification?: string
          specializations?: string[]
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          disorder_id: string | null
          id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          disorder_id?: string | null
          id?: string
          score: number
          total: number
          user_id: string
        }
        Update: {
          created_at?: string
          disorder_id?: string | null
          id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_approval_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          criteria: Json
          display_name: string | null
          id: string
          license_number: string | null
          organization: string | null
          professional_title: string | null
          reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          criteria?: Json
          display_name?: string | null
          id?: string
          license_number?: string | null
          organization?: string | null
          professional_title?: string | null
          reason?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          criteria?: Json
          display_name?: string | null
          id?: string
          license_number?: string | null
          organization?: string | null
          professional_title?: string | null
          reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "psychologist" | "researcher" | "patient" | "admin"
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
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
    Enums: {
      app_role: ["student", "psychologist", "researcher", "patient", "admin"],
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
    },
  },
} as const
