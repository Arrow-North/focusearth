-- Allow any authenticated user to view SUPERADMIN and Au profiles
-- so the Contact page recipient list is visible to all user types.
CREATE POLICY profiles_select_contact_recipients ON profiles FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND type IN ('SUPERADMIN', 'Au')
  AND is_deleted = false
);