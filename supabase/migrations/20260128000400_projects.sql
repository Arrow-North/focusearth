-- 04_projects.sql
-- project, project_update_log, project_user_statuses, user_project, users_invited

CREATE TABLE project (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES company(id),
  user_id UUID REFERENCES profiles(id),
  address VARCHAR(255),
  address2 VARCHAR(255),
  areas JSONB,
  complience_hyperlink VARCHAR(255),
  sales_tax VARCHAR(255),
  cost_per_kilowatt_hour VARCHAR(255),
  image VARCHAR(255),
  notes JSONB,
  property_priorities JSONB,
  property_size VARCHAR(255),
  property_type VARCHAR(255),
  request_light_count BOOLEAN,
  state VARCHAR(255),
  status VARCHAR(255),
  title VARCHAR(255),
  zip_code INTEGER,
  be_financing VARCHAR(255),
  city VARCHAR(255),
  deposit_amount INTEGER,
  interest_rate VARCHAR(255),
  labor_cost VARCHAR(255),
  light_count VARCHAR(255),
  light_count_estimate VARCHAR(255),
  loan_period INTEGER,
  operation_days_per_year INTEGER,
  files JSONB,
  proposals JSONB,
  bidding BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  priority_admin BOOLEAN NOT NULL,
  archived BOOLEAN NOT NULL,
  status_admin VARCHAR(255) NOT NULL,
  airtable_id VARCHAR(255)
);

CREATE TABLE project_update_log (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES project(id),
  updated_by_id UUID REFERENCES profiles(id),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  update_log TEXT NOT NULL
);

CREATE TABLE project_user_statuses (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES project(id),
  user_id UUID REFERENCES profiles(id),
  project_title VARCHAR(255) NOT NULL,
  user_type VARCHAR(255) NOT NULL,
  status VARCHAR(255) NOT NULL,
  priority BOOLEAN NOT NULL,
  hidden BOOLEAN NOT NULL,
  sort_id INTEGER
);

-- user_project (composite PK)
CREATE TABLE user_project (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, project_id)
);

-- users_invited (composite PK)
CREATE TABLE users_invited (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, project_id)
);
