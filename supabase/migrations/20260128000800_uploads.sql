-- 08_uploads.sql
-- uploads, uploads_company, uploads_projects, uploads_invoice, uploads_receipt

CREATE TABLE uploads (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  files TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  file_type INTEGER,
  sort_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE uploads_company (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  company_id INTEGER REFERENCES company(id),
  file_id INTEGER REFERENCES uploads(id)
);

CREATE TABLE uploads_projects (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  project_id INTEGER REFERENCES project(id),
  files_id INTEGER REFERENCES uploads(id)
);

CREATE TABLE uploads_invoice (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  file_id INTEGER REFERENCES uploads(id),
  estimate_su_id INTEGER REFERENCES estimate(id),
  estimate_reu_id INTEGER REFERENCES estimate_reu(id)
);

CREATE TABLE uploads_receipt (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  file_id INTEGER REFERENCES uploads(id),
  estimate_su_id INTEGER REFERENCES estimate(id),
  estimate_reu_id INTEGER REFERENCES estimate_reu(id)
);
