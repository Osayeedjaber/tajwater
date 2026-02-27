-- Add admin reply column to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();

-- Drop existing admin write policy if any
DROP POLICY IF EXISTS "Admins can manage tickets" ON public.tickets;

-- Add policy allowing admins to update any ticket (for status + reply)
CREATE POLICY "Admins can manage tickets"
  ON public.tickets FOR ALL
  USING (exists (select 1 from public.admin_users where email = auth.email()));
