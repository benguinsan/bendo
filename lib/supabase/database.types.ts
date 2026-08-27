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
      [_ in never]: never;
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
