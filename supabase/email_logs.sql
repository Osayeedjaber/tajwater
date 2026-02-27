-- ============================================================
-- email_logs table — tracks all emails sent (system + admin)
-- Run this in: supabase.com → your project → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  email_type      text NOT NULL,   -- 'order_confirmation' | 'admin_custom' | 'ticket_reply' | 'welcome'
  subject         text NOT NULL,
  status          text NOT NULL DEFAULT 'sent',   -- 'sent' | 'failed'
  resend_id       text,
  error_message   text,
  sent_by         text,            -- NULL = system, admin email = manually sent
  metadata        jsonb,           -- e.g. { "order_id": "..." }
  sent_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_email_logs"          ON public.email_logs;
CREATE POLICY "admin_read_email_logs" ON public.email_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "service_role_insert_email_logs" ON public.email_logs;
CREATE POLICY "service_role_insert_email_logs" ON public.email_logs
  FOR INSERT WITH CHECK (true);
