-- 09_activity_notifications.sql
-- contact, activity, notification, messages

CREATE TABLE contact (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  user_id INTEGER NOT NULL,
  type INTEGER NOT NULL
);

CREATE TABLE activity (
  id SERIAL PRIMARY KEY,
  estimate_id INTEGER REFERENCES estimate(id),
  project_id INTEGER REFERENCES project(id),
  user_id UUID REFERENCES profiles(id),
  estimate_reu_id INTEGER REFERENCES estimate_reu(id),
  project_update_log_id INTEGER REFERENCES project_update_log(id),
  product_id INTEGER, -- FK added after product table
  user_name VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  u_id VARCHAR(255),
  user_type VARCHAR(255) NOT NULL,
  action INTEGER NOT NULL,
  action_id INTEGER NOT NULL,
  project_title VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification (
  id SERIAL PRIMARY KEY,
  receiver_id UUID REFERENCES profiles(id),
  contact_id INTEGER REFERENCES contact(id),
  user_id UUID REFERENCES profiles(id),
  company_id INTEGER REFERENCES company(id),
  project_id INTEGER REFERENCES project(id),
  report_id INTEGER REFERENCES report(id),
  estimate_id INTEGER REFERENCES estimate(id),
  estimate_reu_id INTEGER REFERENCES estimate_reu(id),
  sender_name VARCHAR(255),
  disabled BOOLEAN,
  seen BOOLEAN NOT NULL,
  description VARCHAR(255) NOT NULL,
  status INTEGER,
  address VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  activity_id INTEGER REFERENCES activity(id),
  contact_id INTEGER REFERENCES contact(id),
  company_id INTEGER REFERENCES company(id),
  notification_id INTEGER REFERENCES notification(id),
  message VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
