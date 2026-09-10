-- ============================================================================
-- Politiques RLS de reference_courses (base de tarifs partagée)
-- À exécuter dans Supabase → SQL Editor UNIQUEMENT si l'import affiche
-- "❌ Import refusé par la base : new row violates row-level security policy".
-- Idempotent : peut être relancé.
-- ============================================================================

alter table reference_courses enable row level security;

-- Tout utilisateur connecté peut lire la base de tarifs
drop policy if exists "reference_courses_select_authenticated" on reference_courses;
create policy "reference_courses_select_authenticated"
on reference_courses for select
to authenticated
using (true);

-- Tout utilisateur connecté peut ajouter des tarifs (import de son listing).
-- Les doublons sont déjà écartés côté app via la contrainte unique sur `hash`.
drop policy if exists "reference_courses_insert_authenticated" on reference_courses;
create policy "reference_courses_insert_authenticated"
on reference_courses for insert
to authenticated
with check (true);

-- Seul l'admin peut modifier / supprimer directement
-- (la correction de tarif passe par admin_correct_fare, security definer)
drop policy if exists "reference_courses_update_admin" on reference_courses;
create policy "reference_courses_update_admin"
on reference_courses for update
to authenticated
using (auth.jwt() ->> 'email' = 'cherkinicolas@gmail.com')
with check (auth.jwt() ->> 'email' = 'cherkinicolas@gmail.com');

drop policy if exists "reference_courses_delete_admin" on reference_courses;
create policy "reference_courses_delete_admin"
on reference_courses for delete
to authenticated
using (auth.jwt() ->> 'email' = 'cherkinicolas@gmail.com');
