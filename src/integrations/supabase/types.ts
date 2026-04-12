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
      activity_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: string | null
          entity_id: string
          entity_type: string
          id: string
          owner_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          entity_id: string
          entity_type: string
          id?: string
          owner_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          owner_id?: string
        }
        Relationships: []
      }
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
          is_vat_registered: boolean
          logo: string | null
          name: string
          owner_id: string
          phone: string | null
          pricing_mode: string
          tax_number: string | null
          updated_at: string
          vat_rate: number
        }
        Insert: {
          address: string
          city: string
          country: string
          created_at?: string
          email: string
          id?: string
          is_vat_registered?: boolean
          logo?: string | null
          name: string
          owner_id: string
          phone?: string | null
          pricing_mode?: string
          tax_number?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          email?: string
          id?: string
          is_vat_registered?: boolean
          logo?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          pricing_mode?: string
          tax_number?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      company_credit_note_counters: {
        Row: {
          company_id: string
          last_number: number
        }
        Insert: {
          company_id: string
          last_number?: number
        }
        Update: {
          company_id?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_credit_note_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invoice_counters: {
        Row: {
          company_id: string
          last_number: number
        }
        Insert: {
          company_id: string
          last_number?: number
        }
        Update: {
          company_id?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_invoice_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_quote_counters: {
        Row: {
          company_id: string
          last_number: number
        }
        Insert: {
          company_id: string
          last_number?: number
        }
        Update: {
          company_id?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_quote_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_name: string
          company_id: string | null
          created_at: string
          credit_note_number: string
          currency: string
          deleted_at: string | null
          due_date: string
          id: string
          invoice_id: string | null
          items: Json
          notes: string | null
          owner_id: string
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
          credit_note_number?: string
          currency?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          invoice_id?: string | null
          items?: Json
          notes?: string | null
          owner_id: string
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
          credit_note_number?: string
          currency?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          invoice_id?: string | null
          items?: Json
          notes?: string | null
          owner_id?: string
          status?: string
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          billed_invoice_id: string | null
          category: string
          company_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          date: string
          description: string
          id: string
          is_billable: boolean
          is_billed: boolean
          notes: string | null
          owner_id: string
          reference: string | null
          updated_at: string
          vendor: string
        }
        Insert: {
          amount?: number
          billed_invoice_id?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          date?: string
          description?: string
          id?: string
          is_billable?: boolean
          is_billed?: boolean
          notes?: string | null
          owner_id: string
          reference?: string | null
          updated_at?: string
          vendor?: string
        }
        Update: {
          amount?: number
          billed_invoice_id?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          date?: string
          description?: string
          id?: string
          is_billable?: boolean
          is_billed?: boolean
          notes?: string | null
          owner_id?: string
          reference?: string | null
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_billed_invoice_id_fkey"
            columns: ["billed_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      global_settings: {
        Row: {
          banking_details: string | null
          created_at: string
          id: string
          is_vat_registered: boolean
          owner_id: string
          terms_conditions: string | null
          updated_at: string
          vat_rate: number
        }
        Insert: {
          banking_details?: string | null
          created_at?: string
          id?: string
          is_vat_registered?: boolean
          owner_id: string
          terms_conditions?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          banking_details?: string | null
          created_at?: string
          id?: string
          is_vat_registered?: boolean
          owner_id?: string
          terms_conditions?: string | null
          updated_at?: string
          vat_rate?: number
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
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          owner_id: string
          payment_date: string
          reference: string | null
          stripe_session_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          owner_id: string
          payment_date?: string
          reference?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          owner_id?: string
          payment_date?: string
          reference?: string | null
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
          is_super_admin: boolean
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_blocked?: boolean
          is_super_admin?: boolean
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_blocked?: boolean
          is_super_admin?: boolean
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_name: string
          company_id: string | null
          created_at: string
          currency: string
          id: string
          items: Json
          notes: string | null
          owner_id: string
          quote_number: string
          status: string
          tax_rate: number
          updated_at: string
          valid_until: string
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_name: string
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          items?: Json
          notes?: string | null
          owner_id: string
          quote_number?: string
          status?: string
          tax_rate?: number
          updated_at?: string
          valid_until?: string
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          company_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          items?: Json
          notes?: string | null
          owner_id?: string
          quote_number?: string
          status?: string
          tax_rate?: number
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          items: Json
          last_generated_at: string | null
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
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          items?: Json
          last_generated_at?: string | null
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
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          items?: Json
          last_generated_at?: string | null
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
      reminder_log: {
        Row: {
          days_overdue: number
          id: string
          invoice_id: string
          owner_id: string
          sent_at: string
        }
        Insert: {
          days_overdue?: number
          id?: string
          invoice_id: string
          owner_id: string
          sent_at?: string
        }
        Update: {
          days_overdue?: number
          id?: string
          invoice_id?: string
          owner_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          created_at: string
          days_after_due: number[]
          email_template: string | null
          enabled: boolean
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_after_due?: number[]
          email_template?: string | null
          enabled?: boolean
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_after_due?: number[]
          email_template?: string | null
          enabled?: boolean
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          name: string
          owner_id: string
          rate: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          rate?: number
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          rate?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          email: string
          expires_at: string | null
          id: string
          invited_at: string
          owner_id: string
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_at?: string
          owner_id: string
          role?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_at?: string
          owner_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          company_id: string
          created_at: string
          id: string
          overridden_by: string
          permission_key: string
          user_id: string
          value: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          overridden_by: string
          permission_key: string
          user_id: string
          value: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          overridden_by?: string
          permission_key?: string
          user_id?: string
          value?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_company_id_fkey"
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
      vat_ledger_entries: {
        Row: {
          company_id: string
          created_at: string
          customer_name: string
          entry_type: string
          id: string
          invoice_date: string
          invoice_id: string | null
          invoice_number: string
          owner_id: string
          status: string
          tax_rate: number
          tax_rate_name: string
          taxable_amount: number
          vat_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_name: string
          entry_type?: string
          id?: string
          invoice_date: string
          invoice_id?: string | null
          invoice_number: string
          owner_id: string
          status?: string
          tax_rate?: number
          tax_rate_name?: string
          taxable_amount?: number
          vat_amount?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_name?: string
          entry_type?: string
          id?: string
          invoice_date?: string
          invoice_id?: string | null
          invoice_number?: string
          owner_id?: string
          status?: string
          tax_rate?: number
          tax_rate_name?: string
          taxable_amount?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "vat_ledger_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vat_ledger_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: string
      }
      has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_company_role: {
        Args: { _company_id: string; _min_role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_superuser_email: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      soft_delete_invoice: { Args: { p_invoice_id: string }; Returns: Json }
      unblock_user: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "staff" | "viewer"
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
      app_role: ["admin", "user", "staff", "viewer"],
    },
  },
} as const
