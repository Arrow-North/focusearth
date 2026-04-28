-- Migration: Notification email trigger
-- Triggers the send-notification-email Edge Function when a notification is inserted
-- Requires: pg_net extension (already enabled)

-- Note: pg_net must be enabled in your Supabase project
-- This should already be done in 20260128000000_extensions.sql

------------------------------------------------------------
-- Function to call the Edge Function via pg_net
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_notify_on_notification_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_function_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get the Edge Function URL from Supabase project settings
  -- The actual URL will be: https://<project-ref>.supabase.co/functions/v1/send-notification-email
  v_edge_function_url := current_setting('app.settings.edge_function_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Only trigger for notifications that should send emails
  -- Skip disabled notifications or ones without a receiver
  IF NEW.receiver_id IS NULL OR NEW.disabled = true THEN
    RETURN NEW;
  END IF;

  -- Skip certain notification types that don't need emails
  -- (adjust this list based on business requirements)
  IF NEW.status IN (20) THEN -- message_received handled separately
    RETURN NEW;
  END IF;

  -- Use pg_net to call the Edge Function asynchronously
  -- This won't block the INSERT operation
  PERFORM net.http_post(
    url := v_edge_function_url || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'record', row_to_json(NEW)::jsonb
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send notification email: %', SQLERRM;
    RETURN NEW;
END;
$$;

------------------------------------------------------------
-- Create the trigger on notification table
------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_notification_email ON notification;

CREATE TRIGGER trg_notification_email
  AFTER INSERT ON notification
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_on_notification_insert();

------------------------------------------------------------
-- Alternative: Simplified webhook-based trigger
-- Use this if pg_net is not available or for simpler setups
------------------------------------------------------------

-- If you prefer to use Supabase's built-in database webhooks instead:
-- 1. Go to Database > Webhooks in Supabase Dashboard
-- 2. Create a new webhook:
--    - Name: notification-email-webhook
--    - Table: notification
--    - Events: INSERT
--    - URL: https://<project-ref>.supabase.co/functions/v1/send-notification-email
--    - HTTP Headers: Authorization: Bearer <service_role_key>
--
-- This approach is simpler and doesn't require pg_net,
-- but the trigger approach gives more control over filtering.

------------------------------------------------------------
-- Comment to document the configuration needed
------------------------------------------------------------

COMMENT ON FUNCTION fn_notify_on_notification_insert() IS
'Triggers email notifications via Edge Function when notifications are created.
Requires app.settings.edge_function_url and app.settings.service_role_key to be configured.

To configure these settings, run:
ALTER DATABASE postgres SET app.settings.edge_function_url = ''https://your-project-ref.supabase.co'';
ALTER DATABASE postgres SET app.settings.service_role_key = ''your-service-role-key'';

Or use Supabase Dashboard > Project Settings > Database > Configuration to set these values.
';
