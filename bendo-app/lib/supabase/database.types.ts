export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          clerk_user_id: string;
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          clerk_user_id: string;
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          clerk_user_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          clerk_user_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          task_id: string | null;
          title: string;
        };
        Insert: {
          body?: string;
          clerk_user_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          task_id?: string | null;
          title: string;
        };
        Update: {
          body?: string;
          clerk_user_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          task_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_activities: {
        Row: {
          action: string;
          actor_clerk_user_id: string;
          clerk_user_id: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json | null;
          result: string;
        };
        Insert: {
          action: string;
          actor_clerk_user_id: string;
          clerk_user_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
          result: string;
        };
        Update: {
          action?: string;
          actor_clerk_user_id?: string;
          clerk_user_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
          result?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          category_id: string | null;
          clerk_user_id: string;
          completed_at: string | null;
          content: string;
          content_normalized: string;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          priority: string;
          scheduled_at: string;
          scheduled_date: string;
          status: string;
          thumbnail_alt: string | null;
          thumbnail_src: string | null;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          clerk_user_id: string;
          completed_at?: string | null;
          content: string;
          content_normalized?: never;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          priority: string;
          scheduled_at: string;
          scheduled_date: string;
          status?: string;
          thumbnail_alt?: string | null;
          thumbnail_src?: string | null;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          clerk_user_id?: string;
          completed_at?: string | null;
          content?: string;
          content_normalized?: never;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          priority?: string;
          scheduled_at?: string;
          scheduled_date?: string;
          status?: string;
          thumbnail_alt?: string | null;
          thumbnail_src?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_category_with_activity: {
        Args: {
          p_actor_clerk_user_id: string;
          p_clerk_user_id: string;
          p_name: string;
        };
        Returns: Database["public"]["Tables"]["categories"]["Row"];
      };
      create_task_with_activity: {
        Args: {
          p_actor_clerk_user_id: string;
          p_category_id?: string | null;
          p_clerk_user_id: string;
          p_content: string;
          p_description: string;
          p_priority: string;
          p_scheduled_at: string;
          p_scheduled_date: string;
          p_thumbnail_alt?: string | null;
          p_thumbnail_src?: string | null;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      delete_category_with_activity: {
        Args: {
          p_actor_clerk_user_id: string;
          p_category_id: string;
          p_clerk_user_id: string;
        };
        Returns: string | null;
      };
      delete_task_with_activity: {
        Args: {
          p_actor_clerk_user_id: string;
          p_clerk_user_id: string;
          p_task_id: string;
        };
        Returns: string | null;
      };
      insert_success_activity: {
        Args: {
          p_action: string;
          p_actor_clerk_user_id: string;
          p_clerk_user_id: string;
          p_entity_id: string;
          p_entity_type: string;
        };
        Returns: undefined;
      };
      update_category_with_activity: {
        Args: {
          p_actor_clerk_user_id: string;
          p_category_id: string;
          p_clerk_user_id: string;
          p_name: string;
        };
        Returns: Database["public"]["Tables"]["categories"]["Row"] | null;
      };
      update_task_with_activity: {
        Args: {
          p_actor_clerk_user_id: string;
          p_clerk_user_id: string;
          p_patch: Json;
          p_task_id: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"] | null;
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

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;
