export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: number
          title: string
          description: string
          category: string
          event_date: string
          start_time: string
          end_time: string | null
          location: string | null
          capacity: number
          price: number
          half_price: number // integer: vagas meia-entrada disponíveis
          image_url: string | null
          status: string
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          title: string
          description: string
          category: string
          event_date: string
          start_time: string
          end_time?: string | null
          location?: string | null
          capacity?: number
          price?: number
          half_price?: number // integer: vagas meia-entrada
          image_url?: string | null
          status?: string
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: []
      }
      inscriptions: {
        Row: {
          id: number
          event_id: number
          user_id: string | null
          order_number: string | null
          nome: string
          email: string
          cpf: string
          telefone: string
          nome_empresa: string | null
          cargo: string | null
          cep: string | null
          rua: string | null
          numero: string | null
          bairro: string | null
          cidade: string | null
          estado: string | null
          complemento: string | null
          quantity: number
          total_amount: number
          net_amount: number
          is_half_price: boolean
          payment_status: string
          payment_id: string | null
          payment_url: string | null
          asaas_customer_id: string | null
          coupon_id: number | null
          qr_code: string | null
          purchase_group: string | null
          accepted_terms: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          event_id: number
          user_id?: string | null
          order_number?: string | null
          nome: string
          email: string
          cpf: string
          telefone: string
          nome_empresa?: string | null
          cargo?: string | null
          cep?: string | null
          rua?: string | null
          numero?: string | null
          bairro?: string | null
          cidade?: string | null
          estado?: string | null
          complemento?: string | null
          quantity?: number
          total_amount?: number
          net_amount?: number
          is_half_price?: boolean
          payment_status?: string
          payment_id?: string | null
          payment_url?: string | null
          asaas_customer_id?: string | null
          coupon_id?: number | null
          qr_code?: string | null
          purchase_group?: string | null
          accepted_terms?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['inscriptions']['Insert']>
        Relationships: []
      }
      tickets: {
        Row: {
          id: string
          event_id: number
          inscription_id: number
          participant_name: string
          status: string
          checked_in_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: number
          inscription_id: number
          participant_name: string
          status?: string
          checked_in_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
        Relationships: []
      }
      coupons: {
        Row: {
          id: number
          code: string
          discount_type: string
          discount_value: number
          max_uses: number | null
          current_uses: number
          valid_from: string | null
          valid_until: string | null
          active: boolean
          event_id: number | null
          created_at: string
        }
        Insert: {
          id?: never
          code: string
          discount_type: string
          discount_value: number
          max_uses?: number | null
          current_uses?: number
          valid_from?: string | null
          valid_until?: string | null
          active?: boolean
          event_id?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
        Relationships: []
      }
      roles: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
        Relationships: []
      }
      users_roles: {
        Row: {
          id: number
          user_id: string
          role_id: number
        }
        Insert: {
          id?: never
          user_id: string
          role_id: number
        }
        Update: Partial<Database['public']['Tables']['users_roles']['Insert']>
        Relationships: []
      }
      payment_logs: {
        Row: {
          id: number
          inscription_id: number | null
          payment_id: string | null
          status: string
          raw_data: any
          created_at: string
        }
        Insert: {
          id?: never
          inscription_id?: number | null
          payment_id?: string | null
          status: string
          raw_data?: any
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payment_logs']['Insert']>
        Relationships: []
      }
      webhook_events: {
        Row: {
          id: number
          event_type: string
          payment_id: string | null
          raw_body: any
          processed: boolean
          created_at: string
        }
        Insert: {
          id?: never
          event_type: string
          payment_id?: string | null
          raw_body?: any
          processed?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['webhook_events']['Insert']>
        Relationships: []
      }
      exhibitors: {
        Row: {
          id: number
          company_name: string
          cnpj: string | null
          responsible_name: string
          responsible_role: string | null
          email: string
          phone: string
          segment: string
          description: string | null
          stand_size: string
          logo_url: string | null
          status: string
          admin_notes: string | null
          stand_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: never
          company_name: string
          cnpj?: string | null
          responsible_name: string
          responsible_role?: string | null
          email: string
          phone: string
          segment: string
          description?: string | null
          stand_size?: string
          logo_url?: string | null
          status?: string
          admin_notes?: string | null
          stand_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['exhibitors']['Insert']>
        Relationships: []
      }
      partners: {
        Row: {
          id: string
          user_id: string
          organization_name: string
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_name: string
          logo_url?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['partners']['Insert']>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_event_owner: {
        Args: { user_id: string; event_id: number }
        Returns: boolean
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

// Convenience types
export type Event = Database['public']['Tables']['events']['Row']
export type Inscription = Database['public']['Tables']['inscriptions']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type Coupon = Database['public']['Tables']['coupons']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Exhibitor = Database['public']['Tables']['exhibitors']['Row']
export type Partner = Database['public']['Tables']['partners']['Row']
