-- ── Feedback table ───────────────────────────────────────────────────────────
-- Run this in Supabase Dashboard → SQL Editor

create table if not exists feedback (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now()             not null,
  user_id    uuid        references auth.users(id) on delete set null,
  name       text,
  email      text,
  type       text        check (type in ('bug', 'feature', 'general')),
  message    text        not null,
  rating     int         check (rating between 1 and 5),
  status     text        default 'new'
);

-- Enable RLS
alter table feedback enable row level security;

-- Anyone (including anonymous) can insert feedback
create policy "Anyone can submit feedback"
  on feedback for insert
  with check (true);

-- Only the service role (your Supabase dashboard / admin) can read all feedback
-- Authenticated users can only read their own submissions
create policy "Users can read own feedback"
  on feedback for select
  using (auth.uid() = user_id);
