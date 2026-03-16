-- ============================================================
-- MIGRATION: Phase 8 - Audit Scale & PII Hard Lock
-- ============================================================

-- ─── 1. AUDIT LOGS SCALING INDEXES ──────────────────────────
-- These indexes convert a full table scan into an O(1) index lookup
-- regardless of how many millions of rows exist in the audit logs.

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record 
ON public.audit_logs (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_at 
ON public.audit_logs (performed_at DESC);

-- ─── 2. PII DATA HARD-LOCK ──────────────────────────────────
-- Revoke all read/select access from the raw customers table for authenticated users.
-- This ensures developers CANNOT bypass the masking view: `.from('customers')`
-- will now throw a Permission Denied error from PostgREST instead of resolving.
-- The safe view `customers_safe_view` retains SELECT access.

REVOKE SELECT ON public.customers FROM authenticated;
GRANT SELECT ON public.customers_safe_view TO authenticated;
