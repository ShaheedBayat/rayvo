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
      branding_themes: {
        Row: {
          accent_color: string
          address_padding: number
          bottom_margin: number
          company_header_details: string | null
          created_at: string
          currency_conversion_display: string
          document_titles: Json
          font_family: string
          font_size: number
          footer_logo: string | null
          footer_message: string | null
          hide_discount: boolean
          id: string
          is_default: boolean
          logo: string | null
          logo_alignment: string
          measure_unit: string
          name: string
          owner_id: string
          page_size: string
          payment_service: string
          primary_color: string
          show_bank_details: boolean
          show_column_headings: boolean
          show_contact_account_number: boolean
          show_item_code: boolean
          show_logo: boolean
          show_qr_code: boolean
          show_registered_address: boolean
          show_tax_column: boolean
          show_tax_number: boolean
          show_unit_price_quantity: boolean
          tax_display: string
          tax_subtotal_display: string
          terms_invoices: string | null
          terms_quotes: string | null
          top_margin: number
          updated_at: string
          watermark: string | null
        }
        Insert: {
          accent_color?: string
          address_padding?: number
          bottom_margin?: number
          company_header_details?: string | null
          created_at?: string
          currency_conversion_display?: string
          document_titles?: Json
          font_family?: string
          font_size?: number
          footer_logo?: string | null
          footer_message?: string | null
          hide_discount?: boolean
          id?: string
          is_default?: boolean
          logo?: string | null
          logo_alignment?: string
          measure_unit?: string
          name?: string
          owner_id: string
          page_size?: string
          payment_service?: string
          primary_color?: string
          show_bank_details?: boolean
          show_column_headings?: boolean
          show_contact_account_number?: boolean
          show_item_code?: boolean
          show_logo?: boolean
          show_qr_code?: boolean
          show_registered_address?: boolean
          show_tax_column?: boolean
          show_tax_number?: boolean
          show_unit_price_quantity?: boolean
          tax_display?: string
          tax_subtotal_display?: string
          terms_invoices?: string | null
          terms_quotes?: string | null
          top_margin?: number
          updated_at?: string
          watermark?: string | null
        }
        Update: {
          accent_color?: string
          address_padding?: number
          bottom_margin?: number
          company_header_details?: string | null
          created_at?: string
          currency_conversion_display?: string
          document_titles?: Json
          font_family?: string
          font_size?: number
          footer_logo?: string | null
          footer_message?: string | null
          hide_discount?: boolean
          id?: string
          is_default?: boolean
          logo?: string | null
          logo_alignment?: string
          measure_unit?: string
          name?: string
          owner_id?: string
          page_size?: string
          payment_service?: string
          primary_color?: string
          show_bank_details?: boolean
          show_column_headings?: boolean
          show_contact_account_number?: boolean
          show_item_code?: boolean
          show_logo?: boolean
          show_qr_code?: boolean
          show_registered_address?: boolean
          show_tax_column?: boolean
          show_tax_number?: boolean
          show_unit_price_quantity?: boolean
          tax_display?: string
          tax_subtotal_display?: string
          terms_invoices?: string | null
          terms_quotes?: string | null
          top_margin?: number
          updated_at?: string
          watermark?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string
          email: string
          id: string
          logo: string | null
          name: string
          owner_id: string
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          country: string
          created_at?: string
          email: string
          id?: string
          logo?: string | null
          name: string
          owner_id: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          logo?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_contacts: {
        Row: {
          created_at: string | null
          customer_id: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string
          owner_id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          owner_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          owner_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_number: string | null
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          billing_province: string | null
          billing_street: string | null
          billing_suburb: string | null
          block_on_credit_limit: boolean | null
          city: string | null
          country: string | null
          created_at: string
          credit_limit: number | null
          currency: string | null
          default_discount: number | null
          default_due_days: number | null
          default_line_amounts: string | null
          default_tax_rate: number | null
          delivery_city: string | null
          delivery_country: string | null
          delivery_postal_code: string | null
          delivery_province: string | null
          delivery_same_as_billing: boolean | null
          delivery_street: string | null
          delivery_suburb: string | null
          email: string | null
          id: string
          id_number: string | null
          industry: string | null
          name: string
          notes: string | null
          owner_id: string
          payment_reference: string | null
          phone: string | null
          registration_number: string | null
          sales_tax_override: string | null
          status: string | null
          tags: string[] | null
          tax_exempt: boolean | null
          tax_id_number: string | null
          type: string
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_province?: string | null
          billing_street?: string | null
          billing_suburb?: string | null
          block_on_credit_limit?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string | null
          default_discount?: number | null
          default_due_days?: number | null
          default_line_amounts?: string | null
          default_tax_rate?: number | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_postal_code?: string | null
          delivery_province?: string | null
          delivery_same_as_billing?: boolean | null
          delivery_street?: string | null
          delivery_suburb?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          industry?: string | null
          name: string
          notes?: string | null
          owner_id: string
          payment_reference?: string | null
          phone?: string | null
          registration_number?: string | null
          sales_tax_override?: string | null
          status?: string | null
          tags?: string[] | null
          tax_exempt?: boolean | null
          tax_id_number?: string | null
          type?: string
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_province?: string | null
          billing_street?: string | null
          billing_suburb?: string | null
          block_on_credit_limit?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string | null
          default_discount?: number | null
          default_due_days?: number | null
          default_line_amounts?: string | null
          default_tax_rate?: number | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_postal_code?: string | null
          delivery_province?: string | null
          delivery_same_as_billing?: boolean | null
          delivery_street?: string | null
          delivery_suburb?: string | null
          email?: string | null
          id?: string
          id_number?: string | null
          industry?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          payment_reference?: string | null
          phone?: string | null
          registration_number?: string | null
          sales_tax_override?: string | null
          status?: string | null
          tags?: string[] | null
          tax_exempt?: boolean | null
          tax_id_number?: string | null
          type?: string
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      deletion_log: {
        Row: {
          deleted_at: string
          id: string
          invoice_id: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          invoice_id: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          invoice_id?: string
          user_id?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          banking_details: string | null
          created_at: string
          id: string
          owner_id: string
          terms_conditions: string | null
          updated_at: string
        }
        Insert: {
          banking_details?: string | null
          created_at?: string
          id?: string
          owner_id: string
          terms_conditions?: string | null
          updated_at?: string
        }
        Update: {
          banking_details?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          terms_conditions?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_templates: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          items: Json
          name: string
          notes: string | null
          owner_id: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          notes?: string | null
          owner_id: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          notes?: string | null
          owner_id?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_name: string
          company_id: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          due_date: string
          id: string
          invoice_number: string
          items: Json
          notes: string | null
          owner_id: string
          share_token: string | null
          status: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_name: string
          company_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          invoice_number: string
          items?: Json
          notes?: string | null
          owner_id: string
          share_token?: string | null
          status?: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          company_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          items?: Json
          notes?: string | null
          owner_id?: string
          share_token?: string | null
          status?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          code: string
          company_id: string | null
          created_at: string
          id: string
          is_tracked: boolean
          name: string
          owner_id: string
          purchase_description: string
          purchase_enabled: boolean
          purchase_price: number
          purchase_tax_rate: number
          sell_description: string
          sell_enabled: boolean
          sell_price: number
          sell_tax_rate: number
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_tracked?: boolean
          name?: string
          owner_id: string
          purchase_description?: string
          purchase_enabled?: boolean
          purchase_price?: number
          purchase_tax_rate?: number
          sell_description?: string
          sell_enabled?: boolean
          sell_price?: number
          sell_tax_rate?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_tracked?: boolean
          name?: string
          owner_id?: string
          purchase_description?: string
          purchase_enabled?: boolean
          purchase_price?: number
          purchase_tax_rate?: number
          sell_description?: string
          sell_enabled?: boolean
          sell_price?: number
          sell_tax_rate?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          blocked_reason: string | null
          created_at: string
          display_name: string | null
          id: string
          is_blocked: boolean
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_blocked?: boolean
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_blocked?: boolean
          user_id?: string
        }
        Relationships: []
      }
      recurring_invoices: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_name: string
          company_id: string | null
          created_at: string
          currency: string
          day_of_month: number | null
          frequency: string
          id: string
          is_active: boolean
          items: Json
          next_run_date: string
          notes: string | null
          owner_id: string
          tax_rate: number
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_name: string
          company_id?: string | null
          created_at?: string
          currency?: string
          day_of_month?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          items?: Json
          next_run_date: string
          notes?: string | null
          owner_id: string
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          company_id?: string | null
          created_at?: string
          currency?: string
          day_of_month?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          items?: Json
          next_run_date?: string
          notes?: string | null
          owner_id?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      soft_delete_invoice: { Args: { p_invoice_id: string }; Returns: Json }
      unblock_user: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
