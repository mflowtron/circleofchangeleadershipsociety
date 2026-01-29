-- Create activity_logs table for admin monitoring
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_title text,
  user_id uuid,
  user_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read activity logs
CREATE POLICY "Admins can view activity logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- Create the log_activity function for triggers to use
CREATE OR REPLACE FUNCTION public.log_activity(
  _action text,
  _entity_type text,
  _entity_id uuid,
  _entity_title text,
  _user_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_name text;
BEGIN
  -- Get user name if user_id provided
  IF _user_id IS NOT NULL THEN
    SELECT full_name INTO _user_name FROM profiles WHERE user_id = _user_id;
  END IF;
  
  INSERT INTO activity_logs (action, entity_type, entity_id, entity_title, user_id, user_name, metadata)
  VALUES (_action, _entity_type, _entity_id, _entity_title, _user_id, _user_name, _metadata);
END;
$$;

-- Trigger function for profiles (user registrations/updates)
CREATE OR REPLACE FUNCTION log_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'create', 
      'user', 
      NEW.id, 
      NEW.full_name, 
      NEW.user_id,
      jsonb_build_object('is_approved', NEW.is_approved)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log significant changes
    IF OLD.is_approved IS DISTINCT FROM NEW.is_approved OR OLD.full_name IS DISTINCT FROM NEW.full_name THEN
      PERFORM log_activity(
        'update', 
        'user', 
        NEW.id, 
        NEW.full_name, 
        NEW.user_id,
        jsonb_build_object(
          'is_approved', NEW.is_approved,
          'was_approved', OLD.is_approved,
          'approval_changed', OLD.is_approved IS DISTINCT FROM NEW.is_approved
        )
      );
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_profile_changes
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_profile_activity();

-- Trigger function for posts
CREATE OR REPLACE FUNCTION log_post_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'create', 
      'post', 
      NEW.id, 
      LEFT(NEW.content, 50), 
      NEW.user_id,
      jsonb_build_object('is_global', NEW.is_global)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      'update', 
      'post', 
      NEW.id, 
      LEFT(NEW.content, 50), 
      NEW.user_id,
      jsonb_build_object('is_global', NEW.is_global)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      'delete', 
      'post', 
      OLD.id, 
      LEFT(OLD.content, 50), 
      OLD.user_id,
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_post_changes
AFTER INSERT OR UPDATE OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION log_post_activity();

-- Trigger function for comments
CREATE OR REPLACE FUNCTION log_comment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'create', 
      'comment', 
      NEW.id, 
      LEFT(NEW.content, 50), 
      NEW.user_id,
      jsonb_build_object('post_id', NEW.post_id)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      'delete', 
      'comment', 
      OLD.id, 
      LEFT(OLD.content, 50), 
      OLD.user_id,
      jsonb_build_object('post_id', OLD.post_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_comment_changes
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION log_comment_activity();

-- Trigger function for orders
CREATE OR REPLACE FUNCTION log_order_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'create', 
      'order', 
      NEW.id, 
      NEW.order_number, 
      NEW.user_id,
      jsonb_build_object('status', NEW.status, 'total_cents', NEW.total_cents, 'email', NEW.email)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_activity(
        'update', 
        'order', 
        NEW.id, 
        NEW.order_number, 
        NEW.user_id,
        jsonb_build_object('status', NEW.status, 'old_status', OLD.status)
      );
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_order_changes
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION log_order_activity();

-- Trigger function for events
CREATE OR REPLACE FUNCTION log_event_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'create', 
      'event', 
      NEW.id, 
      NEW.title, 
      NEW.created_by,
      jsonb_build_object('is_published', NEW.is_published)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      'update', 
      'event', 
      NEW.id, 
      NEW.title, 
      NEW.created_by,
      jsonb_build_object('is_published', NEW.is_published, 'was_published', OLD.is_published)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      'delete', 
      'event', 
      OLD.id, 
      OLD.title, 
      OLD.created_by,
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_event_changes
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION log_event_activity();

-- Trigger function for recordings
CREATE OR REPLACE FUNCTION log_recording_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'create', 
      'recording', 
      NEW.id, 
      NEW.title, 
      NEW.uploaded_by,
      jsonb_build_object('status', NEW.status)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      'delete', 
      'recording', 
      OLD.id, 
      OLD.title, 
      OLD.uploaded_by,
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_recording_changes
AFTER INSERT OR DELETE ON recordings
FOR EACH ROW EXECUTE FUNCTION log_recording_activity();

-- Trigger function for announcements
CREATE OR REPLACE FUNCTION log_announcement_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      'create', 
      'announcement', 
      NEW.id, 
      NEW.title, 
      NEW.created_by,
      jsonb_build_object('is_active', NEW.is_active)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_activity(
      'update', 
      'announcement', 
      NEW.id, 
      NEW.title, 
      NEW.created_by,
      jsonb_build_object('is_active', NEW.is_active)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      'delete', 
      'announcement', 
      OLD.id, 
      OLD.title, 
      OLD.created_by,
      NULL
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_announcement_changes
AFTER INSERT OR UPDATE OR DELETE ON announcements
FOR EACH ROW EXECUTE FUNCTION log_announcement_activity();