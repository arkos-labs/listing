-- ============================================================================
-- Notifications "listing ajouté" — visibles par tout le monde, jusqu'à ce
-- que chaque utilisateur les ait vues individuellement.
-- Déjà appliqué en production via l'outil de migration Supabase ; ce fichier
-- documente le schéma et permet de rejouer la migration si besoin (idempotent).
-- ============================================================================

create table if not exists listing_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  course_count int not null,
  created_by uuid references auth.users(id) on delete set null
);

alter table listing_notifications enable row level security;

-- Tout utilisateur connecté peut voir toutes les notifications (broadcast).
drop policy if exists "listing_notifications_select_authenticated" on listing_notifications;
create policy "listing_notifications_select_authenticated"
on listing_notifications for select
to authenticated
using (true);

-- Tout utilisateur connecté peut créer une notification (import de listing
-- ouvert à tous les chauffeurs, pas seulement l'admin — voir
-- reference_courses_policies.sql).
drop policy if exists "listing_notifications_insert_authenticated" on listing_notifications;
create policy "listing_notifications_insert_authenticated"
on listing_notifications for insert
to authenticated
with check (true);

-- Qui a déjà vu quelle notification : une ligne = "vu" pour cet utilisateur.
-- Pas de ligne = pas encore vue → reste affichée indéfiniment (au-delà de
-- 24h si personne ne l'a vue), jusqu'à ce qu'elle soit marquée vue.
create table if not exists listing_notification_reads (
  notification_id uuid not null references listing_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table listing_notification_reads enable row level security;

-- Chacun ne voit et ne crée que ses propres marques "vu".
drop policy if exists "listing_notification_reads_select_own" on listing_notification_reads;
create policy "listing_notification_reads_select_own"
on listing_notification_reads for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "listing_notification_reads_insert_own" on listing_notification_reads;
create policy "listing_notification_reads_insert_own"
on listing_notification_reads for insert
to authenticated
with check (user_id = auth.uid());

-- Realtime : les appareils connectés reçoivent l'annonce immédiatement,
-- sans attendre un rechargement manuel.
alter publication supabase_realtime add table listing_notifications;
