-- ============================================================
-- 0012_perfil_preferencias.sql — Preferencia de sede en el perfil
-- ============================================================
-- Añade `sede_preferida` a profiles para que la usuaria arranque el
-- agendado en su sede más usada. Es dato propio, editable por la usuaria
-- en su perfil (RLS ya permite update de la propia fila; el trigger
-- guard_admin_invariants solo bloquea cambios de rol/estado).
-- ============================================================

alter table public.profiles
  add column if not exists sede_preferida uuid references public.sedes (id) on delete set null;
