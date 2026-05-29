-- Create matches table for Momentum Pool
-- Migrate from JSON file to Supabase Postgres

CREATE TABLE IF NOT EXISTS matches (
  id          TEXT PRIMARY KEY,
  home_team   TEXT NOT NULL,
  away_team   TEXT NOT NULL,
  home_code   TEXT,
  away_code   TEXT,
  home_badge  TEXT,
  away_badge  TEXT,
  competition TEXT NOT NULL DEFAULT '',
  group_name  TEXT,
  kickoff     BIGINT NOT NULL DEFAULT 0,
  half        TEXT NOT NULL DEFAULT 'pre',
  status      TEXT NOT NULL DEFAULT 'scheduled',
  pool_address  TEXT,
  pool_factory  TEXT,
  settled     BOOLEAN NOT NULL DEFAULT false,
  winner      SMALLINT,
  home_score  SMALLINT,
  away_score  SMALLINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by kickoff
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches (kickoff);
-- Index for status-based queries (live vs upcoming vs settled)
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches (status);
