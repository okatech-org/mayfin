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
      documents: {
        Row: {
          annee_exercice: number | null
          chemin_fichier: string
          dossier_id: string
          id: string
          mime_type: string
          nom_fichier: string
          taille_octets: number
          type_document: string
          uploaded_at: string
        }
        Insert: {
          annee_exercice?: number | null
          chemin_fichier: string
          dossier_id: string
          id?: string
          mime_type: string
          nom_fichier: string
          taille_octets: number
          type_document: string
          uploaded_at?: string
        }
        Update: {
          annee_exercice?: number | null
          chemin_fichier?: string
          dossier_id?: string
          id?: string
          mime_type?: string
          nom_fichier?: string
          taille_octets?: number
          type_document?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      donnees_financieres: {
        Row: {
          actif_circulant: number | null
          annee_exercice: number
          capacite_autofinancement: number | null
          capitaux_propres: number | null
          chiffre_affaires: number | null
          creances_clients: number | null
          created_at: string
          dettes_financieres: number | null
          dettes_fournisseurs: number | null
          dossier_id: string
          ebitda: number | null
          id: string
          passif_circulant: number | null
          resultat_net: number | null
          stocks: number | null
          total_actif: number | null
          total_passif: number | null
          tresorerie: number | null
        }
        Insert: {
          actif_circulant?: number | null
          annee_exercice: number
          capacite_autofinancement?: number | null
          capitaux_propres?: number | null
          chiffre_affaires?: number | null
          creances_clients?: number | null
          created_at?: string
          dettes_financieres?: number | null
          dettes_fournisseurs?: number | null
          dossier_id: string
          ebitda?: number | null
          id?: string
          passif_circulant?: number | null
          resultat_net?: number | null
          stocks?: number | null
          total_actif?: number | null
          total_passif?: number | null
          tresorerie?: number | null
        }
        Update: {
          actif_circulant?: number | null
          annee_exercice?: number
          capacite_autofinancement?: number | null
          capitaux_propres?: number | null
          chiffre_affaires?: number | null
          creances_clients?: number | null
          created_at?: string
          dettes_financieres?: number | null
          dettes_fournisseurs?: number | null
          dossier_id?: string
          ebitda?: number | null
          id?: string
          passif_circulant?: number | null
          resultat_net?: number | null
          stocks?: number | null
          total_actif?: number | null
          total_passif?: number | null
          tresorerie?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donnees_financieres_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          adresse_siege: string | null
          code_naf: string | null
          created_at: string
          date_creation: string | null
          date_jugement: string | null
          deleted_at: string | null
          description_bien: string | null
          dirigeant_adresse: string | null
          dirigeant_civilite: string | null
          dirigeant_date_naissance: string | null
          dirigeant_email: string | null
          dirigeant_experience: number | null
          dirigeant_fiche_ficp: boolean | null
          dirigeant_nom: string
          dirigeant_prenom: string
          dirigeant_telephone: string | null
          duree_mois: number | null
          en_procedure: boolean
          forme_juridique: string | null
          id: string
          montant_demande: number
          nature_bien: string | null
          nb_salaries: number | null
          objet_financement: string | null
          raison_sociale: string
          recommandation: string | null
          score_global: number | null
          secteur_activite: string | null
          siren: string
          siret: string | null
          status: string
          tribunal: string | null
          type_financement: string
          type_procedure: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse_siege?: string | null
          code_naf?: string | null
          created_at?: string
          date_creation?: string | null
          date_jugement?: string | null
          deleted_at?: string | null
          description_bien?: string | null
          dirigeant_adresse?: string | null
          dirigeant_civilite?: string | null
          dirigeant_date_naissance?: string | null
          dirigeant_email?: string | null
          dirigeant_experience?: number | null
          dirigeant_fiche_ficp?: boolean | null
          dirigeant_nom: string
          dirigeant_prenom: string
          dirigeant_telephone?: string | null
          duree_mois?: number | null
          en_procedure?: boolean
          forme_juridique?: string | null
          id?: string
          montant_demande: number
          nature_bien?: string | null
          nb_salaries?: number | null
          objet_financement?: string | null
          raison_sociale: string
          recommandation?: string | null
          score_global?: number | null
          secteur_activite?: string | null
          siren: string
          siret?: string | null
          status?: string
          tribunal?: string | null
          type_financement: string
          type_procedure?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse_siege?: string | null
          code_naf?: string | null
          created_at?: string
          date_creation?: string | null
          date_jugement?: string | null
          deleted_at?: string | null
          description_bien?: string | null
          dirigeant_adresse?: string | null
          dirigeant_civilite?: string | null
          dirigeant_date_naissance?: string | null
          dirigeant_email?: string | null
          dirigeant_experience?: number | null
          dirigeant_fiche_ficp?: boolean | null
          dirigeant_nom?: string
          dirigeant_prenom?: string
          dirigeant_telephone?: string | null
          duree_mois?: number | null
          en_procedure?: boolean
          forme_juridique?: string | null
          id?: string
          montant_demande?: number
          nature_bien?: string | null
          nb_salaries?: number | null
          objet_financement?: string | null
          raison_sociale?: string
          recommandation?: string | null
          score_global?: number | null
          secteur_activite?: string | null
          siren?: string
          siret?: string | null
          status?: string
          tribunal?: string | null
          type_financement?: string
          type_procedure?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scoring_history: {
        Row: {
          calculated_at: string
          calculated_by: string | null
          details_json: Json
          dossier_id: string
          id: string
          score_global: number
          statut: string
        }
        Insert: {
          calculated_at?: string
          calculated_by?: string | null
          details_json: Json
          dossier_id: string
          id?: string
          score_global: number
          statut: string
        }
        Update: {
          calculated_at?: string
          calculated_by?: string | null
          details_json?: Json
          dossier_id?: string
          id?: string
          score_global?: number
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
