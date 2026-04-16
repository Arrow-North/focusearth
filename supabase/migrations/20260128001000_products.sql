-- 10_products.sql
-- product table + deferred FK from activity

CREATE TABLE product (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  company_id INTEGER REFERENCES company(id),
  project_id INTEGER REFERENCES project(id),
  report_id INTEGER REFERENCES report(id),
  estimate_su_id INTEGER REFERENCES estimate(id),
  airtable_record VARCHAR(255) NOT NULL,
  airtable_base VARCHAR(255),
  airtable_colum_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ
);

-- Deferred FK: activity.product_id -> product.id
ALTER TABLE activity
  ADD CONSTRAINT fk_activity_product
  FOREIGN KEY (product_id) REFERENCES product(id);
