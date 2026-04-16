-- 02_auth_and_profiles.sql
-- profiles (replaces user table), user_roles, user_user_roles

-- profiles table: PK is UUID referencing auth.users(id)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_id SERIAL UNIQUE,
  email VARCHAR(180) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  type user_type_enum NOT NULL,
  roles JSONB,
  profile_features JSONB,
  primary_interests JSONB,
  communication_preferences JSONB,
  enabled BOOLEAN NOT NULL DEFAULT false,
  confirm_token VARCHAR(255),
  title VARCHAR(255),
  avatar VARCHAR(255),
  hear_from_us VARCHAR(255),
  old_password VARCHAR(255),
  uuid VARCHAR(255),
  invited_to_company BOOLEAN NOT NULL DEFAULT false,
  company_to_sync VARCHAR(255),
  record_id VARCHAR(255),
  record_id_from_projects_users VARCHAR(255),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  associated_to_company_id INTEGER, -- FK added after company table created
  last_password_reset_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_roles
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(255) NOT NULL,
  admin_permissions JSONB
);

-- user_user_roles (composite PK)
CREATE TABLE user_user_roles (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_roles_id INTEGER NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, user_roles_id)
);
