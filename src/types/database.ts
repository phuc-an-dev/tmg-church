export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      application_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          church_id: string;
          created_at: string;
          id: string;
          payload: Json;
          scope_id: string;
          scope_type: string;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          church_id: string;
          created_at?: string;
          id?: string;
          payload?: Json;
          scope_id: string;
          scope_type: string;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          church_id?: string;
          created_at?: string;
          id?: string;
          payload?: Json;
          scope_id?: string;
          scope_type?: string;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_audit_log_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "church";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_audit_log_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["church_id"];
          },
        ];
      };
      attendance_record: {
        Row: {
          id: string;
          recorded_at: string;
          session_participant_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recorded_at?: string;
          session_participant_id: string;
          status: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recorded_at?: string;
          session_participant_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_record_session_participant_id_fkey";
            columns: ["session_participant_id"];
            isOneToOne: true;
            referencedRelation: "session_participant";
            referencedColumns: ["id"];
          },
        ];
      };
      care_flag: {
        Row: {
          created_at: string;
          flag_type: string;
          id: string;
          member_profile_id: string;
          ministry_term_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          flag_type: string;
          id?: string;
          member_profile_id: string;
          ministry_term_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          flag_type?: string;
          id?: string;
          member_profile_id?: string;
          ministry_term_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "care_flag_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "care_flag_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "care_flag_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["ministry_term_id"];
          },
          {
            foreignKeyName: "care_flag_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "ministry_term";
            referencedColumns: ["id"];
          },
        ];
      };
      care_note: {
        Row: {
          care_flag_id: string;
          created_at: string;
          id: string;
          note: string;
          updated_at: string;
        };
        Insert: {
          care_flag_id: string;
          created_at?: string;
          id?: string;
          note: string;
          updated_at?: string;
        };
        Update: {
          care_flag_id?: string;
          created_at?: string;
          id?: string;
          note?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "care_note_care_flag_id_fkey";
            columns: ["care_flag_id"];
            isOneToOne: false;
            referencedRelation: "care_flag";
            referencedColumns: ["id"];
          },
        ];
      };
      church: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      department_service_role: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          term_department_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          term_department_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          term_department_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "department_service_role_term_department_id_fkey";
            columns: ["term_department_id"];
            isOneToOne: false;
            referencedRelation: "term_department";
            referencedColumns: ["id"];
          },
        ];
      };
      frequent_icon: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leaders: {
        Row: {
          created_at: string;
          email: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      member_profile: {
        Row: {
          archived_at: string | null;
          birth_year: number | null;
          church_id: string;
          created_at: string;
          email: string | null;
          full_name: string;
          gender: string | null;
          id: string;
          phone: string | null;
          slug: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          archived_at?: string | null;
          birth_year?: number | null;
          church_id: string;
          created_at?: string;
          email?: string | null;
          full_name: string;
          gender?: string | null;
          id?: string;
          phone?: string | null;
          slug: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          archived_at?: string | null;
          birth_year?: number | null;
          church_id?: string;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          gender?: string | null;
          id?: string;
          phone?: string | null;
          slug?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "member_profile_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "church";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_profile_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["church_id"];
          },
        ];
      };
      member_access_invitation: {
        Row: {
          church_id: string;
          consumed_at: string | null;
          created_at: string;
          created_by: string;
          email: string;
          expires_at: string;
          id: string;
          member_profile_id: string;
          revoked_at: string | null;
          token_hash: string;
        };
        Insert: {
          church_id: string;
          consumed_at?: string | null;
          created_at?: string;
          created_by: string;
          email: string;
          expires_at: string;
          id?: string;
          member_profile_id: string;
          revoked_at?: string | null;
          token_hash: string;
        };
        Update: {
          church_id?: string;
          consumed_at?: string | null;
          created_at?: string;
          created_by?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          member_profile_id?: string;
          revoked_at?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_access_invitation_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "church";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_access_invitation_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile";
            referencedColumns: ["id"];
          },
        ];
      };
      member_segment: {
        Row: {
          accent_color: string;
          church_id: string;
          condition_rules: Json;
          created_at: string;
          icon_key: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          church_id: string;
          condition_rules?: Json;
          created_at?: string;
          icon_key?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          church_id?: string;
          condition_rules?: Json;
          created_at?: string;
          icon_key?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_segment_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "church";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_segment_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["church_id"];
          },
        ];
      };
      member_segment_membership: {
        Row: {
          created_at: string;
          id: string;
          member_profile_id: string;
          member_segment_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_profile_id: string;
          member_segment_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_profile_id?: string;
          member_segment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_segment_membership_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_segment_membership_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_segment_membership_member_segment_id_fkey";
            columns: ["member_segment_id"];
            isOneToOne: false;
            referencedRelation: "member_segment";
            referencedColumns: ["id"];
          },
        ];
      };
      ministry: {
        Row: {
          accent_color: string;
          church_id: string;
          created_at: string;
          icon_key: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          church_id: string;
          created_at?: string;
          icon_key?: string;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          church_id?: string;
          created_at?: string;
          icon_key?: string;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ministry_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "church";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["church_id"];
          },
        ];
      };
      ministry_assignment: {
        Row: {
          created_at: string;
          id: string;
          ministry_membership_id: string;
          term_department_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ministry_membership_id: string;
          term_department_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ministry_membership_id?: string;
          term_department_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ministry_assignment_ministry_membership_id_fkey";
            columns: ["ministry_membership_id"];
            isOneToOne: false;
            referencedRelation: "ministry_membership";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_assignment_term_department_id_fkey";
            columns: ["term_department_id"];
            isOneToOne: false;
            referencedRelation: "term_department";
            referencedColumns: ["id"];
          },
        ];
      };
      ministry_membership: {
        Row: {
          created_at: string;
          id: string;
          member_profile_id: string;
          ministry_term_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_profile_id: string;
          ministry_term_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_profile_id?: string;
          ministry_term_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ministry_membership_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_membership_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_membership_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["ministry_term_id"];
          },
          {
            foreignKeyName: "ministry_membership_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "ministry_term";
            referencedColumns: ["id"];
          },
        ];
      };
      ministry_session: {
        Row: {
          church_id: string;
          created_at: string;
          id: string;
          ministry_term_id: string;
          session_date: string;
          session_recurrence_rule_id: string | null;
          slug: string;
          term_department_id: string | null;
          term_group_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          church_id: string;
          created_at?: string;
          id?: string;
          ministry_term_id: string;
          session_date: string;
          session_recurrence_rule_id?: string | null;
          slug: string;
          term_department_id?: string | null;
          term_group_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          church_id?: string;
          created_at?: string;
          id?: string;
          ministry_term_id?: string;
          session_date?: string;
          session_recurrence_rule_id?: string | null;
          slug?: string;
          term_department_id?: string | null;
          term_group_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ministry_session_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "church";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_session_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["church_id"];
          },
          {
            foreignKeyName: "ministry_session_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["ministry_term_id"];
          },
          {
            foreignKeyName: "ministry_session_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "ministry_term";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_session_session_recurrence_rule_id_fkey";
            columns: ["session_recurrence_rule_id"];
            isOneToOne: false;
            referencedRelation: "session_recurrence_rule";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_session_term_department_id_fkey";
            columns: ["term_department_id"];
            isOneToOne: false;
            referencedRelation: "term_department";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ministry_session_term_group_id_fkey";
            columns: ["term_group_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["term_group_id"];
          },
          {
            foreignKeyName: "ministry_session_term_group_id_fkey";
            columns: ["term_group_id"];
            isOneToOne: false;
            referencedRelation: "term_group";
            referencedColumns: ["id"];
          },
        ];
      };
      ministry_term: {
        Row: {
          created_at: string;
          end_date: string | null;
          id: string;
          lifecycle: string;
          ministry_id: string;
          name: string;
          slug: string;
          start_date: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date?: string | null;
          id?: string;
          lifecycle?: string;
          ministry_id: string;
          name: string;
          slug: string;
          start_date?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string | null;
          id?: string;
          lifecycle?: string;
          ministry_id?: string;
          name?: string;
          slug?: string;
          start_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ministry_term_ministry_id_fkey";
            columns: ["ministry_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["ministry_id"];
          },
          {
            foreignKeyName: "ministry_term_ministry_id_fkey";
            columns: ["ministry_id"];
            isOneToOne: false;
            referencedRelation: "ministry";
            referencedColumns: ["id"];
          },
        ];
      };
      service_assignment: {
        Row: {
          created_at: string;
          department_service_role_id: string;
          id: string;
          ministry_membership_id: string;
          ministry_session_id: string;
        };
        Insert: {
          created_at?: string;
          department_service_role_id: string;
          id?: string;
          ministry_membership_id: string;
          ministry_session_id: string;
        };
        Update: {
          created_at?: string;
          department_service_role_id?: string;
          id?: string;
          ministry_membership_id?: string;
          ministry_session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_assignment_department_service_role_id_fkey";
            columns: ["department_service_role_id"];
            isOneToOne: false;
            referencedRelation: "department_service_role";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_assignment_ministry_membership_id_fkey";
            columns: ["ministry_membership_id"];
            isOneToOne: false;
            referencedRelation: "ministry_membership";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_assignment_ministry_session_id_fkey";
            columns: ["ministry_session_id"];
            isOneToOne: false;
            referencedRelation: "ministry_session";
            referencedColumns: ["id"];
          },
        ];
      };
      session_assignment: {
        Row: {
          created_at: string;
          id: string;
          ministry_membership_id: string;
          ministry_session_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ministry_membership_id: string;
          ministry_session_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ministry_membership_id?: string;
          ministry_session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_assignment_ministry_membership_id_fkey";
            columns: ["ministry_membership_id"];
            isOneToOne: false;
            referencedRelation: "ministry_membership";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_assignment_ministry_session_id_fkey";
            columns: ["ministry_session_id"];
            isOneToOne: false;
            referencedRelation: "ministry_session";
            referencedColumns: ["id"];
          },
        ];
      };
      session_participant: {
        Row: {
          created_at: string;
          id: string;
          member_profile_id: string;
          ministry_session_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_profile_id: string;
          ministry_session_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_profile_id?: string;
          ministry_session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_participant_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_participant_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_participant_ministry_session_id_fkey";
            columns: ["ministry_session_id"];
            isOneToOne: false;
            referencedRelation: "ministry_session";
            referencedColumns: ["id"];
          },
        ];
      };
      session_recurrence_rule: {
        Row: {
          created_at: string;
          id: string;
          ministry_term_id: string;
          rule: string;
          term_department_id: string | null;
          term_group_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ministry_term_id: string;
          rule: string;
          term_department_id?: string | null;
          term_group_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ministry_term_id?: string;
          rule?: string;
          term_department_id?: string | null;
          term_group_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_recurrence_rule_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["ministry_term_id"];
          },
          {
            foreignKeyName: "session_recurrence_rule_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "ministry_term";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_recurrence_rule_term_department_id_fkey";
            columns: ["term_department_id"];
            isOneToOne: false;
            referencedRelation: "term_department";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_recurrence_rule_term_group_id_fkey";
            columns: ["term_group_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["term_group_id"];
          },
          {
            foreignKeyName: "session_recurrence_rule_term_group_id_fkey";
            columns: ["term_group_id"];
            isOneToOne: false;
            referencedRelation: "term_group";
            referencedColumns: ["id"];
          },
        ];
      };
      system_role_assignment: {
        Row: {
          church_id: string;
          created_at: string;
          id: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          church_id: string;
          created_at?: string;
          id?: string;
          role: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          church_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "system_role_assignment_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "church";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "system_role_assignment_church_id_fkey";
            columns: ["church_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["church_id"];
          },
        ];
      };
      term_department: {
        Row: {
          accent_color: string;
          created_at: string;
          department_code: string;
          icon_key: string;
          id: string;
          ministry_term_id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          created_at?: string;
          department_code: string;
          icon_key?: string;
          id?: string;
          ministry_term_id: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          created_at?: string;
          department_code?: string;
          icon_key?: string;
          id?: string;
          ministry_term_id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "term_department_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["ministry_term_id"];
          },
          {
            foreignKeyName: "term_department_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "ministry_term";
            referencedColumns: ["id"];
          },
        ];
      };
      term_group: {
        Row: {
          accent_color: string;
          created_at: string;
          icon_key: string;
          id: string;
          ministry_term_id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          created_at?: string;
          icon_key?: string;
          id?: string;
          ministry_term_id: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          created_at?: string;
          icon_key?: string;
          id?: string;
          ministry_term_id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "term_group_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["ministry_term_id"];
          },
          {
            foreignKeyName: "term_group_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "ministry_term";
            referencedColumns: ["id"];
          },
        ];
      };
      term_group_membership: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          joined_at: string;
          ministry_membership_id: string;
          role: string;
          status: string;
          term_group_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          joined_at?: string;
          ministry_membership_id: string;
          role?: string;
          status?: string;
          term_group_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          joined_at?: string;
          ministry_membership_id?: string;
          role?: string;
          status?: string;
          term_group_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "term_group_membership_ministry_membership_id_fkey";
            columns: ["ministry_membership_id"];
            isOneToOne: false;
            referencedRelation: "ministry_membership";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "term_group_membership_term_group_id_fkey";
            columns: ["term_group_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["term_group_id"];
          },
          {
            foreignKeyName: "term_group_membership_term_group_id_fkey";
            columns: ["term_group_id"];
            isOneToOne: false;
            referencedRelation: "term_group";
            referencedColumns: ["id"];
          },
        ];
      };
      term_role_assignment: {
        Row: {
          created_at: string;
          id: string;
          member_profile_id: string;
          ministry_term_id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          member_profile_id: string;
          ministry_term_id: string;
          role: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          member_profile_id?: string;
          ministry_term_id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "term_role_assignment_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "term_role_assignment_member_profile_id_fkey";
            columns: ["member_profile_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "term_role_assignment_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "member_profile_public";
            referencedColumns: ["ministry_term_id"];
          },
          {
            foreignKeyName: "term_role_assignment_ministry_term_id_fkey";
            columns: ["ministry_term_id"];
            isOneToOne: false;
            referencedRelation: "ministry_term";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      member_access_invitation_status: {
        Row: {
          church_id: string | null;
          consumed_at: string | null;
          created_at: string | null;
          created_by: string | null;
          email: string | null;
          expires_at: string | null;
          id: string | null;
          member_profile_id: string | null;
          revoked_at: string | null;
        };
        Relationships: [];
      };
      member_profile_public: {
        Row: {
          birth_year: number | null;
          church_id: string | null;
          church_name: string | null;
          church_slug: string | null;
          department_ids: string[] | null;
          department_names: string[] | null;
          full_name: string | null;
          id: string | null;
          ministry_id: string | null;
          ministry_name: string | null;
          ministry_slug: string | null;
          ministry_term_id: string | null;
          ministry_term_name: string | null;
          ministry_term_slug: string | null;
          term_group_id: string | null;
          term_group_name: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      assign_group_member: {
        Args: { target_group_id: string; target_membership_id: string };
        Returns: string;
      };
      audit_payload_is_safe: { Args: { p_payload: Json }; Returns: boolean };
      batch_save_service_assignments: {
        Args: {
          target_membership_ids: string[];
          target_role_id: string;
          target_session_id: string;
        };
        Returns: number;
      };
      create_initial_church: {
        Args: { church_name: string; church_slug: string };
        Returns: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "church";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      enroll_member_with_assignments: {
        Args: {
          enrollment_department_ids: string[];
          enrollment_group_id: string;
          enrollment_member_id: string;
          enrollment_term_id: string;
        };
        Returns: string;
      };
      has_capability: {
        Args: {
          p_capability: string;
          p_scope_id: string;
          p_scope_type: string;
        };
        Returns: boolean;
      };
      set_system_admin: {
        Args: { p_church_id: string; p_enabled: boolean; p_user_id: string };
        Returns: boolean;
      };
      assign_term_role: {
        Args: {
          p_member_profile_id: string;
          p_role: string;
          p_term_id: string;
        };
        Returns: boolean;
      };
      remove_term_role: {
        Args: { p_role: string; p_term_id: string };
        Returns: boolean;
      };
      create_member_access_invitation: {
        Args: { p_church_id: string; p_member_profile_id: string };
        Returns: Json;
      };
      revoke_member_access_invitation: {
        Args: { p_church_id: string; p_invitation_id: string };
        Returns: boolean;
      };
      preview_member_access_invitation: {
        Args: { p_token: string };
        Returns: Json;
      };
      consume_member_access_invitation: {
        Args: { p_email: string; p_token: string };
        Returns: string;
      };
      is_system_admin: { Args: never; Returns: boolean };
      is_system_admin_for_church: {
        Args: { p_church_id: string };
        Returns: boolean;
      };
      is_leader: { Args: never; Returns: boolean };
      log_application_audit_event: {
        Args: {
          p_action: string;
          p_actor_id: string;
          p_church_id: string;
          p_payload?: Json;
          p_scope_id: string;
          p_scope_type: string;
          p_target_id?: string;
          p_target_type: string;
        };
        Returns: string;
      };
      member_matches_segment_rules: {
        Args: {
          candidate: Database["public"]["Tables"]["member_profile"]["Row"];
          rules: Json;
        };
        Returns: boolean;
      };
      preview_segment_members_by_rules: {
        Args: { target_conditions: Json; target_segment_id: string };
        Returns: number;
      };
      remove_group_member: {
        Args: { target_record_id: string };
        Returns: undefined;
      };
      remove_ministry_membership_with_assignments: {
        Args: { removal_membership_id: string };
        Returns: undefined;
      };
      remove_service_assignment: {
        Args: { target_assignment_id: string };
        Returns: undefined;
      };
      save_bulk_session_attendance: {
        Args: {
          target_member_ids: string[];
          target_session_id: string;
          target_status: string;
        };
        Returns: undefined;
      };
      save_segment_rules_and_add_members: {
        Args: { target_conditions: Json; target_segment_id: string };
        Returns: number;
      };
      save_service_assignment: {
        Args: {
          target_membership_id: string;
          target_role_id: string;
          target_session_id: string;
        };
        Returns: string;
      };
      save_session_attendance: {
        Args: {
          target_member_id: string;
          target_session_id: string;
          target_status: string;
        };
        Returns: undefined;
      };
      set_member_segments: {
        Args: { target_member_id: string; target_segment_ids: string[] };
        Returns: undefined;
      };
      set_ministry_assignments: {
        Args: {
          assignment_department_ids: string[];
          assignment_membership_id: string;
        };
        Returns: undefined;
      };
      update_group_member_role: {
        Args: { target_record_id: string; target_role: string };
        Returns: undefined;
      };
      update_group_member_status: {
        Args: { target_record_id: string; target_status: string };
        Returns: undefined;
      };
      valid_member_segment_conditions: {
        Args: { rules: Json };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
