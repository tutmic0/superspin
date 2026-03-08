-- Run this in Supabase SQL Editor

-- Giveaways table
create table if not exists giveaways (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  winner_count integer not null default 1,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'in_progress', 'ended')),
  organizer_id text not null,
  organizer_username text not null,
  organizer_avatar text default '',
  created_at timestamptz default now()
);

-- Participants table
create table if not exists participants (
  id uuid default gen_random_uuid() primary key,
  giveaway_id uuid references giveaways(id) on delete cascade,
  user_id text not null,
  username text not null,
  name text default '',
  avatar_url text default '',
  joined_at timestamptz default now(),
  unique(giveaway_id, user_id)
);

-- Winners table
create table if not exists winners (
  id uuid default gen_random_uuid() primary key,
  giveaway_id uuid references giveaways(id) on delete cascade,
  user_id text not null,
  username text not null,
  name text default '',
  avatar_url text default '',
  prize_number integer not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table giveaways enable row level security;
alter table participants enable row level security;
alter table winners enable row level security;

-- RLS Policies for giveaways
create policy "Anyone can read giveaways" on giveaways for select using (true);
create policy "Authenticated users can insert giveaways" on giveaways for insert with check (auth.uid()::text = organizer_id);
create policy "Organizer can update their giveaway" on giveaways for update using (auth.uid()::text = organizer_id);

-- RLS Policies for participants
create policy "Anyone can read participants" on participants for select using (true);
create policy "Authenticated users can join" on participants for insert with check (auth.uid()::text = user_id);

-- RLS Policies for winners
create policy "Anyone can read winners" on winners for select using (true);
create policy "Organizer can save winners" on winners for insert with check (
  exists (
    select 1 from giveaways
    where giveaways.id = giveaway_id
    and giveaways.organizer_id = auth.uid()::text
  )
);
