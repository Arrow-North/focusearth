-- 01_enums_and_types.sql
-- Custom ENUM types

CREATE TYPE user_type_enum AS ENUM ('SUPERADMIN', 'Sa', 'Au', 'Reu', 'Su', 'Eu', 'Gu');
CREATE TYPE company_type_enum AS ENUM ('REU', 'SU', 'EU');
