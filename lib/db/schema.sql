-- Application tables (run after auth schema migration)

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  polar_subscription_id TEXT,
  polar_customer_id TEXT,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW() AT TIME ZONE 'UTC'),
  period_end TIMESTAMPTZ,
  kb_builds_used INTEGER NOT NULL DEFAULT 0,
  chat_messages_used INTEGER NOT NULL DEFAULT 0,
  research_used_today INTEGER NOT NULL DEFAULT 0,
  research_day DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_subscriptions_plan_idx ON user_subscriptions (plan);
CREATE INDEX IF NOT EXISTS user_subscriptions_polar_subscription_id_idx
  ON user_subscriptions (polar_subscription_id)
  WHERE polar_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'team',
  seat_limit INTEGER NOT NULL DEFAULT 5,
  kb_builds_used INTEGER NOT NULL DEFAULT 0,
  chat_messages_used INTEGER NOT NULL DEFAULT 0,
  research_used_today INTEGER NOT NULL DEFAULT 0,
  research_day DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::date,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW() AT TIME ZONE 'UTC'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id INTEGER NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members (user_id);

-- Queue-based knowledge-base builds (docs/TRANSCRIPT-PIPELINE.md)
CREATE TABLE IF NOT EXISTS kb_build_runs (
  kb_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'building'
    CHECK (status IN ('building', 'finalizing', 'ready', 'failed')),
  persistent BOOLEAN NOT NULL DEFAULT FALSE,
  transcript_mode TEXT NOT NULL DEFAULT 'captions',
  total_videos INTEGER NOT NULL,
  finalize_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS kb_build_runs_active_user_idx
  ON kb_build_runs (user_id)
  WHERE status IN ('building', 'finalizing');

CREATE TABLE IF NOT EXISTS kb_video_jobs (
  kb_id TEXT NOT NULL REFERENCES kb_build_runs (kb_id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'fetching', 'fetched', 'embedding', 'indexed', 'skipped', 'failed')),
  error_class TEXT,
  error_message TEXT,
  chunk_ids TEXT[] NOT NULL DEFAULT '{}',
  minutes REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kb_id, video_id)
);

CREATE INDEX IF NOT EXISTS kb_video_jobs_open_idx
  ON kb_video_jobs (kb_id)
  WHERE status NOT IN ('indexed', 'skipped', 'failed');
