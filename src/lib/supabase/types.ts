export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string
          role: 'owner' | 'manager' | 'rep'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          email: string
          full_name: string
          role?: 'owner' | 'manager' | 'rep'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string
          role?: 'owner' | 'manager' | 'rep'
          avatar_url?: string | null
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          tenant_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          address: any
          source: string
          status: 'new' | 'qualified' | 'survey_scheduled' | 'survey_completed' | 'design_ready' | 'proposal_sent' | 'won' | 'lost'
          avg_monthly_bill: number | null
          assigned_rep_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          address: any
          source?: string
          status?: 'new' | 'qualified' | 'survey_scheduled' | 'survey_completed' | 'design_ready' | 'proposal_sent' | 'won' | 'lost'
          avg_monthly_bill?: number | null
          assigned_rep_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          address?: any
          source?: string
          status?: 'new' | 'qualified' | 'survey_scheduled' | 'survey_completed' | 'design_ready' | 'proposal_sent' | 'won' | 'lost'
          avg_monthly_bill?: number | null
          assigned_rep_id?: string | null
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string | null
          user_id: string | null
          type: string
          description: string
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id?: string | null
          user_id?: string | null
          type: string
          description: string
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          description?: string
          metadata?: any
        }
      }
      surveys: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          surveyor_id: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_at: string | null
          completed_at: string | null
          roof_photos: string[]
          electrical_panel_photos: string[]
          measurements: any
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          surveyor_id?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_at?: string | null
          completed_at?: string | null
          roof_photos?: string[]
          electrical_panel_photos?: string[]
          measurements?: any
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_at?: string | null
          completed_at?: string | null
          roof_photos?: string[]
          electrical_panel_photos?: string[]
          measurements?: any
          notes?: string | null
          updated_at?: string
        }
      }
      designs: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          integration: 'aurora' | 'opensolar'
          external_design_id: string | null
          system_size_kw: number
          panel_count: number
          annual_production_kwh: number
          layout_image_url: string | null
          shade_report: any
          status: 'requested' | 'received' | 'approved' | 'revision_requested'
          revision_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          integration: 'aurora' | 'opensolar'
          external_design_id?: string | null
          system_size_kw?: number
          panel_count?: number
          annual_production_kwh?: number
          layout_image_url?: string | null
          shade_report?: any
          status?: 'requested' | 'received' | 'approved' | 'revision_requested'
          revision_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_design_id?: string | null
          system_size_kw?: number
          panel_count?: number
          annual_production_kwh?: number
          layout_image_url?: string | null
          shade_report?: any
          status?: 'requested' | 'received' | 'approved' | 'revision_requested'
          revision_notes?: string | null
          updated_at?: string
        }
      }
      proposals: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          design_id: string
          version: number
          status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'
          total_price_cents: number
          financing_options: any
          deposit_percent: number
          token: string | null
          expires_at: string | null
          sent_at: string | null
          viewed_at: string | null
          signed_at: string | null
          signature_data: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          design_id: string
          version?: number
          status?: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'
          total_price_cents: number
          financing_options?: any
          deposit_percent?: number
          token?: string | null
          expires_at?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          signed_at?: string | null
          signature_data?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          version?: number
          status?: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'
          total_price_cents?: number
          financing_options?: any
          deposit_percent?: number
          token?: string | null
          expires_at?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          signed_at?: string | null
          signature_data?: string | null
          updated_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          tenant_id: string
          proposal_id: string
          lead_id: string
          contract_number: string
          status: 'active' | 'installing' | 'completed' | 'cancelled'
          deposit_amount_cents: number
          deposit_paid_at: string | null
          installation_scheduled_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          proposal_id: string
          lead_id: string
          contract_number: string
          status?: 'active' | 'installing' | 'completed' | 'cancelled'
          deposit_amount_cents: number
          deposit_paid_at?: string | null
          installation_scheduled_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: 'active' | 'installing' | 'completed' | 'cancelled'
          deposit_paid_at?: string | null
          installation_scheduled_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      integrations: {
        Row: {
          id: string
          tenant_id: string
          type: 'aurora' | 'opensolar'
          api_key_encrypted: string
          webhook_secret_encrypted: string | null
          config: any
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          type: 'aurora' | 'opensolar'
          api_key_encrypted: string
          webhook_secret_encrypted?: string | null
          config?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          api_key_encrypted?: string
          webhook_secret_encrypted?: string | null
          config?: any
          is_active?: boolean
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      get_dashboard_metrics: {
        Args: { p_tenant_id: string; p_start_date: string | null; p_end_date: string | null }
        Returns: {
          total_leads: number
          qualified_leads: number
          proposals_sent: number
          proposals_signed: number
          total_revenue_cents: number
          avg_cycle_days: number
        }[]
      }
      get_pipeline_data: {
        Args: { p_tenant_id: string }
        Returns: {
          stage: string
          count: number
          value_cents: number
        }[]
      }
      get_rep_performance: {
        Args: { p_tenant_id: string }
        Returns: {
          user_id: string
          full_name: string
          leads_count: number
          proposals_sent: number
          deals_won: number
          revenue_cents: number
          conversion_rate: number
        }[]
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}