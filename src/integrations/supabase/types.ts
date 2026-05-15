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
      album_photo_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "album_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "album_photos_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      album_photo_likes: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_photo_likes_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "album_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_photo_likes_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "album_photos_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      album_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_size: number | null
          height: number | null
          id: string
          image_url: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          image_url?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          image_url?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
          width?: number | null
        }
        Relationships: []
      }
      announcement_analytics: {
        Row: {
          announcement_id: string
          attendee_id: string | null
          created_at: string
          event_type: string
          id: string
        }
        Insert: {
          announcement_id: string
          attendee_id?: string | null
          created_at?: string
          event_type: string
          id?: string
        }
        Update: {
          announcement_id?: string
          attendee_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_analytics_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          dismiss_count: number
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          dismiss_count?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          dismiss_count?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      calendar: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          meeting_link: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          meeting_link?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          meeting_link?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_interactions: {
        Row: {
          content: string | null
          created_at: string
          id: string
          post_id: string
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          post_id: string
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          post_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_interactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          chapter_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_global: boolean
          link_url: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reasons: string[] | null
          moderation_score: number | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          updated_at: string
          user_id: string
          video_aspect_ratio: string | null
          video_url: string | null
        }
        Insert: {
          chapter_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_global?: boolean
          link_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reasons?: string[] | null
          moderation_score?: number | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          updated_at?: string
          user_id: string
          video_aspect_ratio?: string | null
          video_url?: string | null
        }
        Update: {
          chapter_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_global?: boolean
          link_url?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reasons?: string[] | null
          moderation_score?: number | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          updated_at?: string
          user_id?: string
          video_aspect_ratio?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          chapter_id: string | null
          company: string | null
          created_at: string
          default_role: string | null
          full_name: string
          headline: string | null
          id: string
          is_approved: boolean
          linkedin_url: string | null
          onesignal_player_id: string | null
          open_to_networking: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          chapter_id?: string | null
          company?: string | null
          created_at?: string
          default_role?: string | null
          full_name: string
          headline?: string | null
          id?: string
          is_approved?: boolean
          linkedin_url?: string | null
          onesignal_player_id?: string | null
          open_to_networking?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          chapter_id?: string | null
          company?: string | null
          created_at?: string
          default_role?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          is_approved?: boolean
          linkedin_url?: string | null
          onesignal_player_id?: string | null
          open_to_networking?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          message: string
          recipient_count: number
          redirect_url: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          message: string
          recipient_count?: number
          redirect_url?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          message?: string
          recipient_count?: number
          redirect_url?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recording_watch_progress: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          position_seconds: number
          recording_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          position_seconds?: number
          recording_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          position_seconds?: number
          recording_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_watch_progress_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          captions_status: string | null
          captions_track_id: string | null
          created_at: string
          description: string | null
          id: string
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          resources: Json | null
          sort_order: number | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploaded_by: string
          video_url: string | null
        }
        Insert: {
          captions_status?: string | null
          captions_track_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          resources?: Json | null
          sort_order?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
          video_url?: string | null
        }
        Update: {
          captions_status?: string | null
          captions_track_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          resources?: Json | null
          sort_order?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      album_photos_safe: {
        Row: {
          caption: string | null
          created_at: string | null
          file_size: number | null
          height: number | null
          id: string | null
          storage_path: string | null
          updated_at: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_size?: number | null
          height?: number | null
          id?: string | null
          storage_path?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_size?: number | null
          height?: number | null
          id?: string | null
          storage_path?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_chapter: { Args: { p_user_id: string }; Returns: string }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_advisor_for_chapter: {
        Args: { p_chapter_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      moderation_status: "pending" | "approved" | "flagged"
      order_status: "pending" | "completed" | "cancelled" | "refunded"
      user_role: "admin" | "advisor" | "member"
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
      moderation_status: ["pending", "approved", "flagged"],
      order_status: ["pending", "completed", "cancelled", "refunded"],
      user_role: ["admin", "advisor", "member"],
    },
  },
} as const
