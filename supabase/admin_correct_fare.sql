-- ============================================================================
-- Correction de tarif par l'admin (support.tsx → bouton "Corriger")
-- À exécuter dans Supabase → SQL Editor. Idempotent : peut être relancé.
-- ============================================================================

-- 1. On supprime toutes les anciennes versions de la fonction
drop function if exists admin_correct_fare(uuid[], numeric, numeric);
drop function if exists admin_correct_fare(uuid[], numeric, numeric, uuid[]);
drop function if exists admin_correct_fare(uuid[], double precision, double precision);
drop function if exists admin_correct_fare(uuid[], int, numeric);

-- 2. Recréation propre.
--    course_ids    : les courses du chauffeur signalées dans le message
--    reference_ids : les lignes de reference_courses qui alimentent le chip
--                    "Type de course" — calculées par l'app avec le même matching
--                    que la saisie (flou + véhicule canonique, dans les 2 sens)
--    Retourne un JSON avec le nombre de lignes réellement modifiées.
create function admin_correct_fare(
  course_ids uuid[],
  new_qte_bon numeric,
  new_montant_achat numeric,
  reference_ids uuid[] default '{}'
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

  -- b) La référence, par IDs exacts fournis par l'app.
  --    On bumpe created_at : l'app compare le created_at le plus récent avec son
  --    cache local — c'est ce qui force TOUS les appareils à recharger la référence.
  if coalesce(array_length(reference_ids, 1), 0) > 0 then
    update reference_courses
    set qte_bon = new_qte_bon,
        created_at = now()
    where id = any(reference_ids);
    get diagnostics reference_updated = row_count;
  end if;

  -- c) Filet de sécurité (anciens messages sans reference_ids) : matching texte
  if reference_updated = 0 then
    for r in
      select distinct lieu_enlevement, lieu_livraison, vehicule
      from courses
      where id = any(course_ids)
    loop
      update reference_courses
      set qte_bon = new_qte_bon,
          created_at = now()
      where (
          (lower(trim(lieu_enlevement)) = lower(trim(r.lieu_enlevement))
           and lower(trim(lieu_livraison)) = lower(trim(r.lieu_livraison)))
          or
          (lower(trim(lieu_enlevement)) = lower(trim(r.lieu_livraison))
           and lower(trim(lieu_livraison)) = lower(trim(r.lieu_enlevement)))
        )
        and (
          coalesce(trim(r.vehicule), '') = ''
          or lower(trim(coalesce(vehicule, ''))) = lower(trim(r.vehicule))
        );
      get diagnostics n = row_count;
      reference_updated := reference_updated + n;
    end loop;
  end if;

  return jsonb_build_object(
    'courses_updated', courses_updated,
    'reference_updated', reference_updated
  );
end;
$$;

grant execute on function admin_correct_fare(uuid[], numeric, numeric, uuid[]) to authenticated;

-- 3. Realtime : le chauffeur voit la correction de ses courses en direct,
--    et la référence corrigée se propage à tous les appareils connectés.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'courses'
  ) then
    alter publication supabase_realtime add table courses;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reference_courses'
  ) then
    alter publication supabase_realtime add table reference_courses;
  end if;
end $$;
