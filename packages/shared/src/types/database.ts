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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          location: string | null
          updated_at: string | null
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      billing_products: {
        Row: {
          id: string
          display_name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          id: string
          product_id: string
          display_name: string
          description: string | null
          price_cents: number
          billing_period: string
          stripe_price_id_monthly: string | null
          stripe_price_id_annual: string | null
          stripe_product_id: string | null
          features: Json
          usage_limits: Json
          trial_period_days: number
          is_public: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          product_id: string
          display_name: string
          description?: string | null
          price_cents?: number
          billing_period: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_annual?: string | null
          stripe_product_id?: string | null
          features?: Json
          usage_limits?: Json
          trial_period_days?: number
          is_public?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          display_name?: string
          description?: string | null
          price_cents?: number
          billing_period?: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_annual?: string | null
          stripe_product_id?: string | null
          features?: Json
          usage_limits?: Json
          trial_period_days?: number
          is_public?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          id: string
          user_id: string
          product_id: string
          plan_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          plan_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_invoices: {
        Row: {
          id: string
          user_id: string
          stripe_invoice_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          amount_due: number
          amount_paid: number
          currency: string
          status: string
          description: string | null
          hosted_invoice_url: string | null
          invoice_pdf_url: string | null
          period_start: string | null
          period_end: string | null
          created_at: string
          finalized_at: string | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_invoice_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          amount_due: number
          amount_paid: number
          currency: string
          status: string
          description?: string | null
          hosted_invoice_url?: string | null
          invoice_pdf_url?: string | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          finalized_at?: string | null
          paid_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          stripe_invoice_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          amount_due?: number
          amount_paid?: number
          currency?: string
          status?: string
          description?: string | null
          hosted_invoice_url?: string | null
          invoice_pdf_url?: string | null
          period_start?: string | null
          period_end?: string | null
          created_at?: string
          finalized_at?: string | null
          paid_at?: string | null
        }
        Relationships: []
      }
      billing_usage_events: {
        Row: {
          id: string
          user_id: string
          product_id: string
          event_type: string
          quantity: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          event_type: string
          quantity?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          event_type?: string
          quantity?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      billing_usage_aggregates: {
        Row: {
          user_id: string
          product_id: string
          event_type: string
          period_start: string
          period_end: string
          count: number
        }
        Insert: {
          user_id: string
          product_id: string
          event_type: string
          period_start: string
          period_end: string
          count?: number
        }
        Update: {
          user_id?: string
          product_id?: string
          event_type?: string
          period_start?: string
          period_end?: string
          count?: number
        }
        Relationships: []
      }
      billing_webhook_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          payload: Json
          processed: boolean
          processed_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stripe_event_id?: string
          event_type?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      billing_system_flags: {
        Row: {
          key: string
          value: boolean
        }
        Insert: {
          key: string
          value: boolean
        }
        Update: {
          key?: string
          value?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_username: { Args: never; Returns: string }
      is_valid_email: { Args: { email: string }; Returns: boolean }
      ensure_billing_subscription: {
        Args: { p_product_id: string }
        Returns: Json
      }
      billing_record_usage_event: {
        Args: {
          p_product_id: string
          p_event_type: string
          p_quantity?: number
          p_metadata?: Json
        }
        Returns: undefined
      }
      billing_get_remaining_usage: {
        Args: { p_product_id: string; p_event_type: string }
        Returns: Json
      }
      billing_has_exceeded_limit: {
        Args: { p_product_id: string; p_event_type: string }
        Returns: boolean
      }
      billing_demo_mode_enabled: { Args: never; Returns: boolean }
      billing_demo_simulate_upgrade: {
        Args: { p_product_id: string; p_plan_id: string }
        Returns: Json
      }
      billing_demo_reset_usage: {
        Args: { p_product_id: string; p_event_type: string }
        Returns: undefined
      }
      billing_demo_get_collections: {
        Args: { p_product_id: string }
        Returns: { id: string; item_count: number }[]
      }
      billing_demo_add_collection: {
        Args: { p_product_id: string }
        Returns: string
      }
      billing_demo_add_item: {
        Args: { p_product_id: string; p_collection_id: string }
        Returns: number
      }
      billing_demo_delete_collection: {
        Args: { p_product_id: string; p_collection_id: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
