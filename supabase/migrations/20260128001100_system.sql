-- 11_system.sql
-- error_log, error_message, page, page_translation, user_catalogue_counts, user_platform_usage

CREATE TABLE error_log (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  code VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE error_message (
  id SERIAL PRIMARY KEY,
  code VARCHAR(5) NOT NULL,
  source VARCHAR(5) NOT NULL,
  details VARCHAR(255) NOT NULL,
  message VARCHAR(255) NOT NULL,
  CONSTRAINT uk_code UNIQUE (code, source)
);

CREATE TABLE page (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  image VARCHAR(255) NOT NULL,
  text TEXT,
  images JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE page_translation (
  id SERIAL PRIMARY KEY,
  object_id INTEGER REFERENCES page(id) ON DELETE CASCADE,
  locale VARCHAR(8) NOT NULL,
  field VARCHAR(32) NOT NULL,
  content TEXT,
  CONSTRAINT page_idx UNIQUE (locale, object_id, field)
);

CREATE TABLE user_catalogue_counts (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES profiles(id),
  fixture INTEGER NOT NULL,
  lamp INTEGER NOT NULL,
  control INTEGER NOT NULL,
  power_supply INTEGER NOT NULL,
  accessory INTEGER NOT NULL,
  companies INTEGER,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE user_platform_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  total INTEGER NOT NULL
);
