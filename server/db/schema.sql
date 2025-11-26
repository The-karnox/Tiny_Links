-- Create links table for linkShort
CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked TIMESTAMPTZ NULL
);
