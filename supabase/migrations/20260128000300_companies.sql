-- 03_companies.sql
-- company, company_update_log, deferred FK from profiles

CREATE TABLE company (
  id SERIAL PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id),
  admin_user_id UUID REFERENCES profiles(id),
  name VARCHAR(255) NOT NULL,
  notes VARCHAR(255),
  address VARCHAR(255) NOT NULL,
  address2 VARCHAR(255),
  image VARCHAR(255),
  property_priorities JSONB NOT NULL,
  service_areas JSONB NOT NULL,
  seen BOOLEAN NOT NULL,
  state VARCHAR(255) NOT NULL,
  status INTEGER NOT NULL,
  type VARCHAR(255) NOT NULL,
  website VARCHAR(255) NOT NULL,
  zip_code VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  is_deleted BOOLEAN,
  record_id VARCHAR(255),
  company_sub_type VARCHAR(255)
);

-- Deferred FK: profiles.associated_to_company_id -> company.id
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_company
  FOREIGN KEY (associated_to_company_id) REFERENCES company(id);

-- company_update_log
CREATE TABLE company_update_log (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES company(id),
  updated_by_id UUID REFERENCES profiles(id),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  update_log TEXT NOT NULL,
  seen BOOLEAN NOT NULL
);
