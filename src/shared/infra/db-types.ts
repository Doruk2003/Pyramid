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
      accounts: {
        Row: {
          account_owner: string | null
          account_type: string | null
          address: Json | null
          authorized_gsm: string | null
          authorized_person: string | null
          bank_name: string | null
          city: string | null
          code: string | null
          company_id: string | null
          country: string | null
          created_at: string | null
          credit_limit: number | null
          dealer_discount1: number | null
          dealer_discount2: number | null
          dealer_discount3: number | null
          deleted_at: string | null
          description: string | null
          district: string | null
          email: string | null
          iban: string | null
          id: string
          is_active: boolean | null
          is_dealer: boolean | null
          name: string
          parent_id: string | null
          phone: string | null
          tax_number: string | null
          tax_office: string | null
          updated_at: string | null
        }
        Insert: {
          account_owner?: string | null
          account_type?: string | null
          address?: Json | null
          authorized_gsm?: string | null
          authorized_person?: string | null
          bank_name?: string | null
          city?: string | null
          code?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          dealer_discount1?: number | null
          dealer_discount2?: number | null
          dealer_discount3?: number | null
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_dealer?: boolean | null
          name: string
          parent_id?: string | null
          phone?: string | null
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string | null
        }
        Update: {
          account_owner?: string | null
          account_type?: string | null
          address?: Json | null
          authorized_gsm?: string | null
          authorized_person?: string | null
          bank_name?: string | null
          city?: string | null
          code?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          dealer_discount1?: number | null
          dealer_discount2?: number | null
          dealer_discount3?: number | null
          deleted_at?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_dealer?: boolean | null
          name?: string
          parent_id?: string | null
          phone?: string | null
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_consolidated_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: Json | null
          created_at: string | null
          email: string | null
          id: string
          invoice_serial: string | null
          invoice_starting_number: number | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          tax_number: string | null
          tax_office: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          invoice_serial?: string | null
          invoice_starting_number?: number | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          invoice_serial?: string | null
          invoice_starting_number?: number | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          currency_id: string
          effective_date: string
          id: string
          notes: string | null
          rate: number
          valid_date: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency_id: string
          effective_date?: string
          id?: string
          notes?: string | null
          rate: number
          valid_date?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_id?: string
          effective_date?: string
          id?: string
          notes?: string | null
          rate?: number
          valid_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string | null
          description: string | null
          discount_rate1: number | null
          discount_rate2: number | null
          discount_rate3: number | null
          id: string
          invoice_id: string | null
          line_total: number
          original_currency: string | null
          original_price: number | null
          product_id: string | null
          quantity: number
          source_line_id: string | null
          unit_price: number
          vat_rate: number | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_rate1?: number | null
          discount_rate2?: number | null
          discount_rate3?: number | null
          id?: string
          invoice_id?: string | null
          line_total: number
          original_currency?: string | null
          original_price?: number | null
          product_id?: string | null
          quantity: number
          source_line_id?: string | null
          unit_price: number
          vat_rate?: number | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_rate1?: number | null
          discount_rate2?: number | null
          discount_rate3?: number | null
          id?: string
          invoice_id?: string | null
          line_total?: number
          original_currency?: string | null
          original_price?: number | null
          product_id?: string | null
          quantity?: number
          source_line_id?: string | null
          unit_price?: number
          vat_rate?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_id: string | null
          company_id: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          discount_amount: number | null
          discount_rate: number | null
          document_category: string | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          invoice_number: string
          invoice_type: string | null
          issue_date: string
          notes: string | null
          paid_amount: number | null
          payment_type: string | null
          project_id: string | null
          source_ids: string[] | null
          source_type: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          vat_total: number | null
          warehouse_id: string | null
        }
        Insert: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          discount_rate?: number | null
          document_category?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_number: string
          invoice_type?: string | null
          issue_date?: string
          notes?: string | null
          paid_amount?: number | null
          payment_type?: string | null
          project_id?: string | null
          source_ids?: string[] | null
          source_type?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          vat_total?: number | null
          warehouse_id?: string | null
        }
        Update: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          discount_rate?: number | null
          document_category?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_number?: string
          invoice_type?: string | null
          issue_date?: string
          notes?: string | null
          paid_amount?: number | null
          payment_type?: string | null
          project_id?: string | null
          source_ids?: string[] | null
          source_type?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          vat_total?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_consolidated_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          created_at: string | null
          description: string | null
          discount_rate: number | null
          discount_rate1: number | null
          discount_rate2: number | null
          discount_rate3: number | null
          id: string
          invoiced_quantity: number | null
          line_total: number
          order_id: string
          product_id: string | null
          quantity: number
          shipped_quantity: number | null
          sort_order: number | null
          source_line_id: string | null
          unit_price: number
          vat_rate: number | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_rate?: number | null
          discount_rate1?: number | null
          discount_rate2?: number | null
          discount_rate3?: number | null
          id?: string
          invoiced_quantity?: number | null
          line_total: number
          order_id: string
          product_id?: string | null
          quantity: number
          shipped_quantity?: number | null
          sort_order?: number | null
          source_line_id?: string | null
          unit_price: number
          vat_rate?: number | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_rate?: number | null
          discount_rate1?: number | null
          discount_rate2?: number | null
          discount_rate3?: number | null
          id?: string
          invoiced_quantity?: number | null
          line_total?: number
          order_id?: string
          product_id?: string | null
          quantity?: number
          shipped_quantity?: number | null
          sort_order?: number | null
          source_line_id?: string | null
          unit_price?: number
          vat_rate?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          account_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          issue_date: string
          notes: string | null
          order_number: string
          project_id: string | null
          quote_id: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          type: string | null
          updated_at: string | null
          vat_total: number | null
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          issue_date?: string
          notes?: string | null
          order_number: string
          project_id?: string | null
          quote_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          type?: string | null
          updated_at?: string | null
          vat_total?: number | null
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          issue_date?: string
          notes?: string | null
          order_number?: string
          project_id?: string | null
          quote_id?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          type?: string | null
          updated_at?: string | null
          vat_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_consolidated_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string | null
          amount: number
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string | null
          payment_date: string
          payment_method: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_date?: string
          payment_method?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_date?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_consolidated_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          barcode: string | null
          brand_id: string | null
          category_discount: number | null
          category_id: string | null
          code: string | null
          company_id: string | null
          created_at: string | null
          currency_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          image: string | null
          images: string[] | null
          initial_stock: number | null
          inventoryStatus: string | null
          max_stock: number | null
          min_stock: number | null
          name: string | null
          price: number | null
          price_unit: string
          rating: number | null
          status: string | null
          tax_rate: number
          type_id: string | null
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_discount?: number | null
          category_id?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          currency_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          images?: string[] | null
          initial_stock?: number | null
          inventoryStatus?: string | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string | null
          price?: number | null
          price_unit?: string
          rating?: number | null
          status?: string | null
          tax_rate?: number
          type_id?: string | null
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_discount?: number | null
          category_id?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          currency_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          images?: string[] | null
          initial_stock?: number | null
          inventoryStatus?: string | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string | null
          price?: number | null
          price_unit?: string
          rating?: number | null
          status?: string | null
          tax_rate?: number
          type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_fk"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_currency_fk"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_type_fk"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "types"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_equipment: number
          budget_general: number
          budget_labor: number
          budget_material: number
          client_id: string | null
          code: string
          company_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget_equipment?: number
          budget_general?: number
          budget_labor?: number
          budget_material?: number
          client_id?: string | null
          code: string
          company_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget_equipment?: number
          budget_general?: number
          budget_labor?: number
          budget_material?: number
          client_id?: string | null
          code?: string
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "account_consolidated_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          created_at: string | null
          description: string | null
          discount_rate: number | null
          discount_rate1: number | null
          discount_rate2: number | null
          discount_rate3: number | null
          id: string
          line_total: number
          ordered_quantity: number | null
          product_id: string | null
          quantity: number
          quote_id: string
          sort_order: number | null
          unit_price: number
          vat_rate: number | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_rate?: number | null
          discount_rate1?: number | null
          discount_rate2?: number | null
          discount_rate3?: number | null
          id?: string
          line_total: number
          ordered_quantity?: number | null
          product_id?: string | null
          quantity: number
          quote_id: string
          sort_order?: number | null
          unit_price: number
          vat_rate?: number | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_rate?: number | null
          discount_rate1?: number | null
          discount_rate2?: number | null
          discount_rate3?: number | null
          id?: string
          line_total?: number
          ordered_quantity?: number | null
          product_id?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          unit_price?: number
          vat_rate?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          account_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          exchange_rate: number | null
          id: string
          issue_date: string
          notes: string | null
          project_id: string | null
          quote_number: string
          status: string | null
          subtotal: number | null
          total: number | null
          type: string | null
          updated_at: string | null
          valid_until: string | null
          vat_total: number | null
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          exchange_rate?: number | null
          id?: string
          issue_date?: string
          notes?: string | null
          project_id?: string | null
          quote_number: string
          status?: string | null
          subtotal?: number | null
          total?: number | null
          type?: string | null
          updated_at?: string | null
          valid_until?: string | null
          vat_total?: number | null
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          exchange_rate?: number | null
          id?: string
          issue_date?: string
          notes?: string | null
          project_id?: string | null
          quote_number?: string
          status?: string | null
          subtotal?: number | null
          total?: number | null
          type?: string | null
          updated_at?: string | null
          valid_until?: string | null
          vat_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_consolidated_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string | null
          note: string | null
          product_id: string | null
          project_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string | null
          note?: string | null
          product_id?: string | null
          project_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string | null
          note?: string | null
          product_id?: string | null
          project_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_cost_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string | null
          color: string | null
          company_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_all_day: boolean | null
          priority: string | null
          start_date: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_all_day?: boolean | null
          priority?: string | null
          start_date: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_all_day?: boolean | null
          priority?: string | null
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      types: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_consolidated_balances: {
        Row: {
          account_id: string | null
          account_name: string | null
          consolidated_total: number | null
          credit_limit: number | null
        }
        Relationships: []
      }
      project_cost_summary: {
        Row: {
          actual_cost: number | null
          actual_revenue: number | null
          budget_equipment: number | null
          budget_general: number | null
          budget_labor: number | null
          budget_material: number | null
          client_id: string | null
          code: string | null
          company_id: string | null
          created_at: string | null
          end_date: string | null
          id: string | null
          is_active: boolean | null
          location: string | null
          name: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          total_budget: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "account_consolidated_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          balance: number | null
          company_id: string | null
          product_id: string | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_user_for_company: {
        Args: {
          p_company_id: string
          p_email: string
          p_full_name: string
          p_password: string
          p_role: string
        }
        Returns: string
      }
      get_auth_user_company_id: { Args: never; Returns: string }
      get_auth_user_role: { Args: never; Returns: string }
      get_exchange_rate: {
        Args: { p_currency_code: string; p_date?: string }
        Returns: number
      }
      get_next_invoice_number: { Args: never; Returns: string }
      get_next_order_number: { Args: never; Returns: string }
      get_next_quote_number: { Args: never; Returns: string }
    }
    Enums: {
      project_status: "planning" | "active" | "completed" | "suspended"
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
      project_status: ["planning", "active", "completed", "suspended"],
    },
  },
} as const

// Compatibility types for local application code mapping
type CleanNull<T> = {
  [K in keyof T]: Exclude<T[K], null>;
};

export type DbProduct = CleanNull<Tables<"products">>;
export type DbAccount = CleanNull<Tables<"accounts">>;
export type DbInvoice = CleanNull<Tables<"invoices">> & {
  invoice_lines?: DbInvoiceLine[];
};
export type DbInvoiceLine = CleanNull<Tables<"invoice_lines">>;
export type DbWarehouse = CleanNull<Tables<"warehouses">>;
export type DbStockMovement = CleanNull<Tables<"stock_movements">>;
export type DbUser = CleanNull<Tables<"users">>;
export type DbExchangeRate = CleanNull<Tables<"exchange_rates">> & {
  currencies?: CleanNull<{
    code: string;
    name: string;
  }> | null;
};
export type DbQuote = CleanNull<Tables<"quotes">> & {
  quote_lines?: DbQuoteLine[];
};
export type DbQuoteLine = CleanNull<Tables<"quote_lines">>;
export type DbOrder = CleanNull<Tables<"orders">> & {
  order_lines?: DbOrderLine[];
};
export type DbOrderLine = CleanNull<Tables<"order_lines">>;
export type DbProject = CleanNull<Tables<"projects">> & {
  accounts?: CleanNull<{ name: string }> | null;
};
export type DbTask = CleanNull<Tables<"tasks">>;
export type DbAuditLog = CleanNull<Tables<"audit_logs">>;



