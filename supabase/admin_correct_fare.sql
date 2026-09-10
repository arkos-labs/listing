-- ============================================================================
-- Correction de tarif par l'admin (support.tsx → bouton "Corriger")
-- À exécuter dans Supabase → SQL Editor. Idempotent : peut être relancé.
-- ============================================================================

-- 1. On supprime toutes les anciennes versions de la fonction
drop function if exists admin_correct_fare(uuid[], numeric, numeric);
drop function if exists admin_correct_fare(uuid[], double precision, double precision);
drop function if exists admin_correct_fare(uuid[], int, numeric);

-- 2. Recréation propre. Retourne un JSON avec le nombre de lignes modifiées.
create function admin_correct_fare(
  course_ids uuid[],
  new_qte_bon numeric,
  new_montant_achat numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text;
  courses_updated int := 0;
  reference_updated int := 0;
  n int;
  r record;
begin
  -- Seul l'admin peut appeler cette fonction
  caller_email := coalesce(auth.jwt() ->> 'email', '');
  if caller_email <> 'cherkinicolas@gmail.com' then
    raise exception 'Accès refusé (%)', caller_email;
  end if;

  -- a) Les courses signalées par le chauffeur
  update courses
  set qte_bon = new_qte_bon,
      montant_achat = new_montant_achat
  where id = any(course_ids);
  get diagnostics courses_updated = row_count;

  -- b) La référence (les chips "Type de course") pour le même trajet + véhicule
  for r in
    select distinct lieu_enlevement, lieu_livraison, vehicule
    from courses
    where id = any(course_ids)
  loop
    update reference_courses
    set qte_bon = new_qte_bon
    where lower(trim(lieu_enlevement)) = lower(trim(r.lieu_enlevement))
      and lower(trim(lieu_livraison)) = lower(trim(r.lieu_livraison))
      and coalesce(lower(trim(vehicule)), '') = coalesce(lower(trim(r.vehicule)), '');
    get diagnostics n = row_count;
    reference_updated := reference_updated + n;
  end loop;

  return jsonb_build_object(
    'courses_updated', courses_updated,
    'reference_updated', reference_updated
  );
end;
$$;

grant execute on function admin_correct_fare(uuid[], numeric, numeric) to authenticated;

-- 3. Realtime sur `courses` pour que le chauffeur voie la correction en direct
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'courses'
  ) then
    alter publication supabase_realtime add table courses;
  end if;
end $$;
