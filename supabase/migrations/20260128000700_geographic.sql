-- 07_geographic.sql
-- state, city, postal_code

CREATE TABLE state (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  abbreviation VARCHAR(5) NOT NULL
);

CREATE TABLE city (
  id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES state(id),
  name VARCHAR(50) NOT NULL
);

CREATE TABLE postal_code (
  id SERIAL PRIMARY KEY,
  city_id INTEGER NOT NULL REFERENCES city(id),
  code INTEGER NOT NULL
);
