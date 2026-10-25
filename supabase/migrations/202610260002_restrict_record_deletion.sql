-- Restrict destructive deletion of operational records to workspace owners and managers.
-- All existing tenant-membership checks remain in place for reads/writes; this
-- policy adds a least-privilege boundary around DELETE operations.
DROP POLICY IF EXISTS app_records_delete_member ON public.app_records;

CREATE POLICY app_records_delete_owner_manager
ON public.app_records
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.memberships AS m
    WHERE m.tenant_id = app_records.tenant_id
      AND m.user_id = (SELECT auth.uid())
      AND m.is_active = true
      AND lower(m.role) IN ('owner', 'manager')
  )
);

COMMENT ON POLICY app_records_delete_owner_manager ON public.app_records IS
  'Only active workspace owners and managers may delete operational records. Other active members can continue using the existing read/insert/update policies.';
