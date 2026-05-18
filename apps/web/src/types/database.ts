export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          granted_at: string
          granted_by: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_demo_collections: {
        Row: {
          created_at: string
          id: string
          item_count: number
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_count?: number
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_count?: number
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_demo_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string
          description: string | null
          finalized_at: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_pdf_url: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_due: number
          amount_paid: number
          created_at?: string
          currency: string
          description?: string | null
          finalized_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          description?: string | null
          finalized_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          billing_period: string
          created_at: string
          description: string | null
          display_name: string
          display_order: number
          features: Json
          id: string
          is_public: boolean
          price_cents: number
          product_id: string
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
          stripe_product_id: string | null
          trial_period_days: number
          updated_at: string
          usage_limits: Json
        }
        Insert: {
          billing_period: string
          created_at?: string
          description?: string | null
          display_name: string
          display_order?: number
          features?: Json
          id: string
          is_public?: boolean
          price_cents?: number
          product_id: string
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_product_id?: string | null
          trial_period_days?: number
          updated_at?: string
          usage_limits?: Json
        }
        Update: {
          billing_period?: string
          created_at?: string
          description?: string | null
          display_name?: string
          display_order?: number
          features?: Json
          id?: string
          is_public?: boolean
          price_cents?: number
          product_id?: string
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_product_id?: string | null
          trial_period_days?: number
          updated_at?: string
          usage_limits?: Json
        }
        Relationships: [
          {
            foreignKeyName: "billing_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_products: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pending_target_plan_id: string | null
          plan_id: string
          product_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pending_target_plan_id?: string | null
          plan_id: string
          product_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pending_target_plan_id?: string | null
          plan_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_pending_target_plan_id_fkey"
            columns: ["pending_target_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_system_flags: {
        Row: {
          key: string
          value: boolean
        }
        Insert: {
          key: string
          value?: boolean
        }
        Update: {
          key?: string
          value?: boolean
        }
        Relationships: []
      }
      billing_usage_aggregates: {
        Row: {
          count: number
          event_type: string
          period_end: string
          period_start: string
          product_id: string
          user_id: string
        }
        Insert: {
          count?: number
          event_type: string
          period_end: string
          period_start: string
          product_id: string
          user_id: string
        }
        Update: {
          count?: number
          event_type?: string
          period_end?: string
          period_start?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_aggregates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          metadata: Json
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
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
      waitlist_entries: {
        Row: {
          active_invite_id: string | null
          approved_at: string | null
          converted_at: string | null
          converted_user_id: string | null
          email: string
          id: string
          metadata: Json
          rejected_at: string | null
          status: string
          submitted_at: string
        }
        Insert: {
          active_invite_id?: string | null
          approved_at?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          email: string
          id?: string
          metadata?: Json
          rejected_at?: string | null
          status?: string
          submitted_at?: string
        }
        Update: {
          active_invite_id?: string | null
          approved_at?: string | null
          converted_at?: string | null
          converted_user_id?: string | null
          email?: string
          id?: string
          metadata?: Json
          rejected_at?: string | null
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_active_invite_fkey"
            columns: ["active_invite_id"]
            isOneToOne: false
            referencedRelation: "waitlist_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_invites: {
        Row: {
          created_at: string
          created_by: string | null
          entry_id: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_id: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_id?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_invites_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_rate_limits: {
        Row: {
          bucket_key: string
          count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      waitlist_settings: {
        Row: {
          copy: Json
          default_plan_id: string
          id: number
          identity_match_mode: string
          invite_ttl_days: number
          metadata_schema: Json
          signup_mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          copy?: Json
          default_plan_id?: string
          id?: number
          identity_match_mode?: string
          invite_ttl_days?: number
          metadata_schema?: Json
          signup_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          copy?: Json
          default_plan_id?: string
          id?: number
          identity_match_mode?: string
          invite_ttl_days?: number
          metadata_schema?: Json
          signup_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _admin_insert_audit: {
        Args: {
          p_action: string
          p_actor: string
          p_details?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      _waitlist_create_invite: {
        Args: { p_actor: string; p_entry_id: string }
        Returns: {
          invite_id: string
          raw_token: string
        }[]
      }
      _waitlist_hash_token: { Args: { p_token: string }; Returns: string }
      _waitlist_settings_row: {
        Args: never
        Returns: {
          copy: Json
          default_plan_id: string
          id: number
          identity_match_mode: string
          invite_ttl_days: number
          metadata_schema: Json
          signup_mode: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "waitlist_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_approve_waitlist_entry: { Args: { p_id: string }; Returns: Json }
      admin_get_user: {
        Args: { p_product_id?: string; p_user_id: string }
        Returns: Json
      }
      admin_get_waitlist_entry: { Args: { p_id: string }; Returns: Json }
      admin_get_waitlist_settings: { Args: never; Returns: Json }
      admin_invite_waitlist_email: {
        Args: { p_email: string; p_metadata?: Json }
        Returns: Json
      }
      admin_is_admin: { Args: never; Returns: boolean }
      admin_list_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_product_id?: string
          p_search?: string
          p_sort?: string
          p_sort_dir?: string
        }
        Returns: Json
      }
      admin_list_waitlist_entries: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_record_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
      admin_reject_waitlist_entry: { Args: { p_id: string }; Returns: Json }
      admin_resend_waitlist_invite: { Args: { p_id: string }; Returns: Json }
      admin_update_waitlist_settings: {
        Args: {
          p_copy?: Json
          p_default_plan_id?: string
          p_identity_match_mode?: string
          p_invite_ttl_days?: number
          p_metadata_schema?: Json
          p_signup_mode?: string
        }
        Returns: Json
      }
      billing_demo_add_collection: {
        Args: { p_product_id: string }
        Returns: string
      }
      billing_demo_add_item: {
        Args: { p_collection_id: string; p_product_id: string }
        Returns: number
      }
      billing_demo_delete_collection: {
        Args: { p_collection_id: string; p_product_id: string }
        Returns: undefined
      }
      billing_demo_get_collections: {
        Args: { p_product_id: string }
        Returns: {
          id: string
          item_count: number
        }[]
      }
      billing_demo_mode_enabled: { Args: never; Returns: boolean }
      billing_demo_reset_usage: {
        Args: { p_event_type: string; p_product_id: string }
        Returns: undefined
      }
      billing_demo_simulate_upgrade: {
        Args: { p_plan_id: string; p_product_id: string }
        Returns: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pending_target_plan_id: string | null
          plan_id: string
          product_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "billing_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      billing_ensure_subscription_plan: {
        Args: { p_plan_id: string; p_product_id: string }
        Returns: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pending_target_plan_id: string | null
          plan_id: string
          product_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "billing_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      billing_get_remaining_usage: {
        Args: { p_event_type: string; p_product_id: string }
        Returns: Json
      }
      billing_has_exceeded_limit: {
        Args: { p_event_type: string; p_product_id: string }
        Returns: boolean
      }
      billing_record_usage_event: {
        Args: {
          p_event_type: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_product_id: string
          p_quantity?: number
        }
        Returns: undefined
      }
      billing_usage_period: {
        Args: {
          p_sub: Database["public"]["Tables"]["billing_subscriptions"]["Row"]
        }
        Returns: {
          period_end: string
          period_start: string
        }[]
      }
      ensure_billing_subscription: {
        Args: { p_product_id: string }
        Returns: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pending_target_plan_id: string | null
          plan_id: string
          product_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "billing_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_username: { Args: never; Returns: string }
      is_valid_email: { Args: { email: string }; Returns: boolean }
      waitlist_capture: {
        Args: { p_client_ip?: string; p_email: string; p_metadata?: Json }
        Returns: Json
      }
      waitlist_consume_invite: {
        Args: { p_token: string; p_user_email?: string; p_user_id: string }
        Returns: Json
      }
      waitlist_get_public_settings: { Args: never; Returns: Json }
      waitlist_validate_invite: { Args: { p_token: string }; Returns: Json }
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

