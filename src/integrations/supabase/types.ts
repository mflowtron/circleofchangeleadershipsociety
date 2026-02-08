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
      agenda_items: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          event_id: string
          id: string
          is_highlighted: boolean
          item_type: string
          location: string | null
          sort_order: number
          speaker_ids: string[] | null
          starts_at: string
          title: string
          track: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_id: string
          id?: string
          is_highlighted?: boolean
          item_type?: string
          location?: string | null
          sort_order?: number
          speaker_ids?: string[] | null
          starts_at: string
          title: string
          track?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_id?: string
          id?: string
          is_highlighted?: boolean
          item_type?: string
          location?: string | null
          sort_order?: number
          speaker_ids?: string[] | null
          starts_at?: string
          title?: string
          track?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendee_bookmarks: {
        Row: {
          agenda_item_id: string
          attendee_id: string
          created_at: string
          id: string
        }
        Insert: {
          agenda_item_id: string
          attendee_id: string
          created_at?: string
          id?: string
        }
        Update: {
          agenda_item_id?: string
          attendee_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_bookmarks_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendee_bookmarks_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendee_checkins: {
        Row: {
          attendee_id: string
          check_in_date: string
          checked_in_at: string
          checked_in_by: string | null
          created_at: string
          event_id: string
          id: string
          notes: string | null
        }
        Insert: {
          attendee_id: string
          check_in_date?: string
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          attendee_id?: string
          check_in_date?: string
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendee_checkins_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendee_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      attendees: {
        Row: {
          additional_info: Json | null
          attendee_email: string
          attendee_name: string
          created_at: string
          id: string
          is_speaker: boolean
          order_item_id: string | null
          track_access: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_info?: Json | null
          attendee_email?: string
          attendee_name?: string
          created_at?: string
          id?: string
          is_speaker?: boolean
          order_item_id?: string | null
          track_access?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_info?: Json | null
          attendee_email?: string
          attendee_name?: string
          created_at?: string
          id?: string
          is_speaker?: boolean
          order_item_id?: string | null
          track_access?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendees_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_participants: {
        Row: {
          attendee_id: string
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          left_at: string | null
          muted_until: string | null
          role: string
        }
        Insert: {
          attendee_id: string
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          muted_until?: string | null
          role?: string
        }
        Update: {
          attendee_id?: string
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          muted_until?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agenda_item_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string
          id: string
          is_archived: boolean
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id: string
          id?: string
          is_archived?: boolean
          name?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string
          id?: string
          is_archived?: boolean
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          badge_template: Json | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          hotels: Json | null
          id: string
          is_published: boolean
          short_description: string | null
          slug: string
          starts_at: string
          timezone: string | null
          title: string
          travel_contact_email: string | null
          travel_info: string | null
          updated_at: string
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          badge_template?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          hotels?: Json | null
          id?: string
          is_published?: boolean
          short_description?: string | null
          slug: string
          starts_at: string
          timezone?: string | null
          title: string
          travel_contact_email?: string | null
          travel_info?: string | null
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          badge_template?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          hotels?: Json | null
          id?: string
          is_published?: boolean
          short_description?: string | null
          slug?: string
          starts_at?: string
          timezone?: string | null
          title?: string
          travel_contact_email?: string | null
          travel_info?: string | null
          updated_at?: string
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          reactions: Json | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      order_access_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          quantity: number
          ticket_type_id: string
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          quantity?: number
          ticket_type_id: string
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          ticket_type_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string
          edit_token: string | null
          email: string
          event_id: string
          fees_cents: number
          full_name: string
          id: string
          order_number: string
          phone: string | null
          purchaser_is_attending: boolean | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          edit_token?: string | null
          email: string
          event_id: string
          fees_cents?: number
          full_name: string
          id?: string
          order_number: string
          phone?: string | null
          purchaser_is_attending?: boolean | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          edit_token?: string | null
          email?: string
          event_id?: string
          fees_cents?: number
          full_name?: string
          id?: string
          order_number?: string
          phone?: string | null
          purchaser_is_attending?: boolean | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
          module_access: string[] | null
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
          module_access?: string[] | null
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
          module_access?: string[] | null
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
          event_id: string | null
          id: string
          message: string
          recipient_count: number
          redirect_url: string | null
          status: string
          title: string
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          created_at?: string
          created_by: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          message: string
          recipient_count?: number
          redirect_url?: string | null
          status?: string
          title: string
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          message?: string
          recipient_count?: number
          redirect_url?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
      speakers: {
        Row: {
          bio: string | null
          company: string | null
          created_at: string
          event_id: string
          id: string
          linkedin_url: string | null
          name: string
          photo_url: string | null
          sort_order: number
          title: string | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          created_at?: string
          event_id: string
          id?: string
          linkedin_url?: string | null
          name: string
          photo_url?: string | null
          sort_order?: number
          title?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          created_at?: string
          event_id?: string
          id?: string
          linkedin_url?: string | null
          name?: string
          photo_url?: string | null
          sort_order?: number
          title?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "speakers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_virtual: boolean
          max_per_order: number
          name: string
          price_cents: number
          quantity_available: number | null
          quantity_sold: number
          sales_end_at: string | null
          sales_start_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_virtual?: boolean
          max_per_order?: number
          name: string
          price_cents?: number
          quantity_available?: number | null
          quantity_sold?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_virtual?: boolean
          max_per_order?: number
          name?: string
          price_cents?: number
          quantity_available?: number | null
          quantity_sold?: number
          sales_end_at?: string | null
          sales_start_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_events: { Args: { p_user_id: string }; Returns: boolean }
      check_access: {
        Args: { p_module: string; p_user_id: string }
        Returns: boolean
      }
      generate_order_number: { Args: never; Returns: string }
      get_user_chapter: { Args: { p_user_id: string }; Returns: string }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_advisor_for_chapter: {
        Args: { p_chapter_id: string; p_user_id: string }
        Returns: boolean
      }
      is_event_owner: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      reserve_tickets: {
        Args: { _quantity: number; _ticket_type_id: string }
        Returns: boolean
      }
      verify_order_edit_token: {
        Args: { p_order_id: string; p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      moderation_status: "pending" | "approved" | "flagged"
      order_status: "pending" | "completed" | "cancelled" | "refunded"
      user_role: "admin" | "organizer" | "advisor" | "member"
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
      user_role: ["admin", "organizer", "advisor", "member"],
    },
  },
} as const
