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
