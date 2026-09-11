-- Transition from Better Auth to Auth.js.
-- Destructive: drops legacy Better Auth tables and user_subscriptions when the
-- old TEXT user_id schema is detected. Re-run db:migrate after this to recreate tables.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_subscriptions'
      AND column_name = 'user_id'
      AND data_type = 'text'
  ) THEN
    DROP TABLE user_subscriptions;
    RAISE NOTICE 'Dropped legacy user_subscriptions (TEXT user_id). Subscription data was removed.';
  END IF;
END $$;

DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS verification CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
