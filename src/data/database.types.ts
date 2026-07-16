// Tipos gerados a partir do schema Supabase (fonte da verdade: migrations).
// NÃO editar à mão. Regerar após migrations com:
//   supabase gen types typescript --project-id <id>   (ou via MCP Supabase)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checklist_items: {
        Row: {
          id: string
          label: string
          obrigatorio: boolean
          ordem: number
          version_id: string
        }
        Insert: {
          id?: string
          label: string
          obrigatorio?: boolean
          ordem?: number
          version_id: string
        }
        Update: {
          id?: string
          label?: string
          obrigatorio?: boolean
          ordem?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_versions: {
        Row: {
          criada_em: string
          id: string
          template_id: string
          versao: number
        }
        Insert: {
          criada_em?: string
          id?: string
          template_id: string
          versao: number
        }
        Update: {
          criada_em?: string
          id?: string
          template_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          stage_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          stage_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          stage_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      eixos_tematicos: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      episode_checklist_checks: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          id: string
          instance_id: string
          item_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          instance_id: string
          item_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          instance_id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_checklist_checks_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "episode_checklist_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_checklist_checks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_checklist_instances: {
        Row: {
          created_at: string
          episodio_id: string
          id: string
          stage_id: string
          version_id: string
        }
        Insert: {
          created_at?: string
          episodio_id: string
          id?: string
          stage_id: string
          version_id: string
        }
        Update: {
          created_at?: string
          episodio_id?: string
          id?: string
          stage_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_checklist_instances_episodio_id_fkey"
            columns: ["episodio_id"]
            isOneToOne: false
            referencedRelation: "episodios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_checklist_instances_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_checklist_instances_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      episodio_pessoas: {
        Row: {
          created_at: string
          episodio_id: string
          ordem: number
          papel: string
          pessoa_id: string
        }
        Insert: {
          created_at?: string
          episodio_id: string
          ordem?: number
          papel: string
          pessoa_id: string
        }
        Update: {
          created_at?: string
          episodio_id?: string
          ordem?: number
          papel?: string
          pessoa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodio_pessoas_episodio_id_fkey"
            columns: ["episodio_id"]
            isOneToOne: false
            referencedRelation: "episodios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodio_pessoas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      episodios: {
        Row: {
          campos_extras: Json
          created_at: string
          data_gravacao: string | null
          data_lancamento: string | null
          duracao_seg: number | null
          eixo_id: string | null
          host_id: string | null
          id: string
          links: Json
          notas: string | null
          numero: number | null
          search_tsv: unknown
          stage_id: string | null
          tema: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          campos_extras?: Json
          created_at?: string
          data_gravacao?: string | null
          data_lancamento?: string | null
          duracao_seg?: number | null
          eixo_id?: string | null
          host_id?: string | null
          id?: string
          links?: Json
          notas?: string | null
          numero?: number | null
          search_tsv?: unknown
          stage_id?: string | null
          tema?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          campos_extras?: Json
          created_at?: string
          data_gravacao?: string | null
          data_lancamento?: string | null
          duracao_seg?: number | null
          eixo_id?: string | null
          host_id?: string | null
          id?: string
          links?: Json
          notas?: string | null
          numero?: number | null
          search_tsv?: unknown
          stage_id?: string | null
          tema?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodios_eixo_id_fkey"
            columns: ["eixo_id"]
            isOneToOne: false
            referencedRelation: "eixos_tematicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodios_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodios_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      import_presets: {
        Row: {
          ativo: boolean
          chave_dedup: Json
          created_at: string
          id: string
          mapa_colunas: Json
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave_dedup?: Json
          created_at?: string
          id?: string
          mapa_colunas?: Json
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave_dedup?: Json
          created_at?: string
          id?: string
          mapa_colunas?: Json
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          anonimizada: boolean
          campos_extras: Json
          cargo_atual: string | null
          comarca_lotacao: string | null
          created_at: string
          email: string | null
          genero: Database["public"]["Enums"]["genero_pessoa"]
          id: string
          instagram: string | null
          nome: string
          notas: string | null
          origem: string
          search_tsv: unknown
          tags: string[]
          telefone: string | null
          tratamento: string | null
          updated_at: string
        }
        Insert: {
          anonimizada?: boolean
          campos_extras?: Json
          cargo_atual?: string | null
          comarca_lotacao?: string | null
          created_at?: string
          email?: string | null
          genero?: Database["public"]["Enums"]["genero_pessoa"]
          id?: string
          instagram?: string | null
          nome: string
          notas?: string | null
          origem?: string
          search_tsv?: unknown
          tags?: string[]
          telefone?: string | null
          tratamento?: string | null
          updated_at?: string
        }
        Update: {
          anonimizada?: boolean
          campos_extras?: Json
          cargo_atual?: string | null
          comarca_lotacao?: string | null
          created_at?: string
          email?: string | null
          genero?: Database["public"]["Enums"]["genero_pessoa"]
          id?: string
          instagram?: string | null
          nome?: string
          notas?: string | null
          origem?: string
          search_tsv?: unknown
          tags?: string[]
          telefone?: string | null
          tratamento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          exige_checklist_completo: boolean
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          exige_checklist_completo?: boolean
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          exige_checklist_completo?: boolean
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      stage_history: {
        Row: {
          entrou_em: string
          episodio_id: string
          id: string
          saiu_em: string | null
          stage_id: string
        }
        Insert: {
          entrou_em?: string
          episodio_id: string
          id?: string
          saiu_em?: string | null
          stage_id: string
        }
        Update: {
          entrou_em?: string
          episodio_id?: string
          id?: string
          saiu_em?: string | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_episodio_id_fkey"
            columns: ["episodio_id"]
            isOneToOne: false
            referencedRelation: "episodios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_history_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_standard_policies: { Args: { tbl: unknown }; Returns: undefined }
      move_episode_to_stage: {
        Args: { p_episode: string; p_stage: string }
        Returns: undefined
      }
      pessoa_tsv: {
        Args: {
          cargo: string
          comarca: string
          nome: string
          notas: string
          tags: string[]
        }
        Returns: unknown
      }
      pt_tsv: { Args: { txt: string }; Returns: unknown }
    }
    Enums: {
      genero_pessoa: "feminino" | "masculino" | "outro" | "nao_informado"
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
      genero_pessoa: ["feminino", "masculino", "outro", "nao_informado"],
    },
  },
} as const
