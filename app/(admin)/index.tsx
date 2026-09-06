/**
 * Dashboard admin — vue globale de tous les chauffeurs.
 * Chaque carte affiche : prénom, email, courses du mois, bons du mois,
 * CA, essence, KM, dernier import listing, + bouton notification push.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FlatList, RefreshControl, StyleSheet, Text, Modal,
  TouchableOpacity, View, ActivityIndicator, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Bell, Clock, TrendingUp, Fuel, Navigation, Package, Users, Zap, Download, Plus, X, PowerOff } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { shadow } from '@/lib/theme';
import { importCoursesToSupabase } from '@/lib/supabaseSync';
import { normalizeLieu } from '@/lib/normalizeLieu';

interface DriverStats {
  id: string;
  prenom: string;
  email: string;
  last_listing_import_at: string | null;
  last_listing_filename: string | null;
  last_listing_file_path: string | null;
  // Stats du mois courant
  courses: number;
  bonsJour: number;
  bonsMois: number;
  heuresJour: string;
  heuresMois: string;
  ca: number;
  essence: number;
  km: number;
  isActive: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Jamais';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffJ = Math.floor(diffH / 24);
  if (diffH < 1) return 'Il y a moins d\'1h';
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffJ === 1) return 'Hier';
  if (diffJ < 7) return `Il y a ${diffJ} jours`;
  return d.toLocaleDateString('fr-FR');
}

function formatMoney(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      <Icon size={13} color={color} strokeWidth={2.5} />
      <View>
        <Text style={[styles.chipLabel, { color: colors.textFaint }]}>{label}</Text>
        <Text style={[styles.chipValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

async function downloadListing(filePath: string) {
  const { data, error } = await supabase.storage
    .from('listings')
    .createSignedUrl(filePath, 300); // URL valide 5 minutes
  if (error || !data?.signedUrl) {
    if (typeof window !== 'undefined') window.alert('❌ Impossible de générer le lien de téléchargement.');
    return;
  }
  if (typeof window !== 'undefined') {
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = filePath.split('/').pop() ?? 'listing';
    a.click();
  }
}

function DriverCard({ driver, onNotif, onDisconnect, onViewListings }: { driver: DriverStats; onNotif: (id: string, prenom: string, hasListing: boolean) => void; onDisconnect: (id: string, prenom: string) => void; onViewListings: (id: string, prenom: string) => void }) {
  const { colors } = useTheme();
  const initials = driver.prenom.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, shadow as any]}>
      {/* En-tête */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: '#134024' }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.driverName, { color: colors.text }]}>{driver.prenom}</Text>
          <Text style={[styles.driverEmail, { color: colors.textFaint }]}>{driver.email}</Text>
        </View>
        {driver.isActive && (
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: '#FEE2E2', marginRight: 8 }]}
            onPress={() => onDisconnect(driver.id, driver.prenom)}
          >
            <PowerOff size={16} color="#DC2626" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => onNotif(driver.id, driver.prenom, !!driver.last_listing_import_at)}
        >
          <Bell size={16} color="#134024" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Dernier import */}
      <View style={[styles.importRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Clock size={12} color={colors.textFaint} />
        <View style={{ flex: 1 }}>
          {driver.last_listing_filename ? (
            <Text style={[styles.importText, { color: colors.textMuted }]} numberOfLines={1}>
              📄 <Text style={{ fontWeight: '800', color: colors.text }}>{driver.last_listing_filename}</Text>
            </Text>
          ) : null}
          <Text style={[styles.importText, { color: colors.textMuted }]}>
            {driver.last_listing_filename ? '' : 'Listing : '}
            <Text style={{ fontWeight: '700', color: colors.text }}>{formatDate(driver.last_listing_import_at)}</Text>
          </Text>
        </View>
        {driver.last_listing_import_at ? (
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => onViewListings(driver.id, driver.prenom)}
          >
            <Download size={14} color="#134024" strokeWidth={2.5} />
            <Text style={styles.downloadBtnText}>Historique fichiers</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats grille */}
      <View style={styles.statsGrid}>
        <StatChip icon={Package} label="Courses" value={String(driver.courses)} color="#134024" />
        <StatChip icon={Clock} label="Heures (Auj.)" value={driver.heuresJour} color="#059669" />
        <StatChip icon={Clock} label="Heures (Mois)" value={driver.heuresMois} color="#059669" />
        <StatChip icon={TrendingUp} label="Bons (Auj.)" value={String(driver.bonsJour)} color="#2563eb" />
        <StatChip icon={TrendingUp} label="Bons (Mois)" value={String(driver.bonsMois)} color="#2563eb" />
        <StatChip icon={TrendingUp} label="CA" value={formatMoney(driver.ca)} color="#16a34a" />
        <StatChip icon={Fuel} label="Essence" value={formatMoney(driver.essence)} color="#dc2626" />
        <StatChip icon={Navigation} label="KM" value={`${driver.km.toLocaleString('fr-FR')} km`} color="#7c3aed" />
      </View>
    </View>
  );
}

const VEHICULE_OPTIONS = [
  '2 ROUES EXPRESS',
  '2 ROUES URGENCE VITALE',
  '2 ROUES PROGRAMME',
  'BREAK EXPRESS',
  'BREAK NORMAL',
];

function AddCourseModal({ visible, onClose, onSaved }: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [enlevement, setEnlevement] = useState('');
  const [livraison, setLivraison] = useState('');
  const [vehicule, setVehicule] = useState('2 ROUES EXPRESS');
  const [qteBon, setQteBon] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setEnlevement(''); setLivraison('');
    setVehicule('2 ROUES EXPRESS'); setQteBon('');
    setError('');
  };

  const handleSave = async () => {
    if (!enlevement.trim()) { setError('Lieu d\'enlèvement requis.'); return; }
    if (!livraison.trim()) { setError('Lieu de livraison requis.'); return; }
    const bons = parseFloat(qteBon.replace(',', '.'));
    if (!qteBon || isNaN(bons) || bons <= 0) { setError('Nombre de bons invalide.'); return; }

    setSaving(true);
    setError('');
    const result = await importCoursesToSupabase([{
      lieuEnlevement: normalizeLieu(enlevement.trim().toUpperCase()),
      lieuLivraison: normalizeLieu(livraison.trim().toUpperCase()),
      vehicule,
      qteBon: bons,
      domaine: 'courseCourse',
    }]);
    setSaving(false);

    if (result.errors > 0) {
      setError('Erreur lors de l\'enregistrement.');
    } else if (result.duplicates > 0) {
      setError('Cette course existe déjà en base.');
    } else {
      reset();
      onSaved();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          {/* Titre */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ajouter une course</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.bg }]}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Enlèvement */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>LIEU D'ENLÈVEMENT</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6', color: colors.text }]}
              placeholder="Ex: ST ANTOINE EFS"
              placeholderTextColor={colors.textFaint}
              value={enlevement}
              onChangeText={(v) => { setEnlevement(v); setError(''); }}
              autoCapitalize="characters"
              returnKeyType="next"
            />

            {/* Livraison */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>LIEU DE LIVRAISON</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6', color: colors.text }]}
              placeholder="Ex: BICHAT MYCOBACTERIOLOGIE"
              placeholderTextColor={colors.textFaint}
              value={livraison}
              onChangeText={(v) => { setLivraison(v); setError(''); }}
              autoCapitalize="characters"
              returnKeyType="next"
            />

            {/* Type de course */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>TYPE DE COURSE</Text>
            <View style={styles.vehiculeGrid}>
              {VEHICULE_OPTIONS.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.vehiculeChip,
                    { backgroundColor: vehicule === v ? '#134024' : (isDark ? colors.bgSubtle : '#F3F4F6') },
                  ]}
                  onPress={() => setVehicule(v)}
                >
                  <Text style={[
                    styles.vehiculeChipText,
                    { color: vehicule === v ? '#fff' : colors.text },
                  ]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nombre de bons */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>NOMBRE DE BONS</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6', color: colors.text }]}
              placeholder="Ex: 2.5"
              placeholderTextColor={colors.textFaint}
              value={qteBon}
              onChangeText={(v) => { setQteBon(v); setError(''); }}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Boutons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.btnSecondary, { backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}
                onPress={onClose}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: saving ? '#5a8a6a' : '#134024' }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.btnPrimaryText}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DriverFilesModal({ driver, onClose }: {
  driver: { id: string; prenom: string } | null;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [files, setFiles] = useState<{ name: string; created_at: string; id: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!driver) return;
    setLoading(true);
    supabase.storage.from('listings').list(driver.id, { sortBy: { column: 'created_at', order: 'desc' } })
      .then(({ data, error }) => {
        if (!error && data) {
           setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'));
        }
        setLoading(false);
      });
  }, [driver]);

  if (!driver) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Fichiers de {driver.prenom}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.bg }]}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#134024" style={{ marginVertical: 40 }} />
          ) : files.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 40 }}>Aucun fichier trouvé.</Text>
          ) : (
            <FlatList
              data={files}
              keyExtractor={(f) => f.id || f.name}
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={[styles.importRow, { backgroundColor: colors.bg, borderColor: colors.border, marginHorizontal: 0, paddingVertical: 12 }]}>
                  <Clock size={16} color={colors.textFaint} />
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={[styles.importText, { color: colors.text, fontWeight: '800', fontSize: 13 }]} numberOfLines={1}>
                      {item.name.replace(/^\d+_/, '')} 
                    </Text>
                    <Text style={[styles.importText, { color: colors.textMuted }]}>
                      {new Date(item.created_at).toLocaleString('fr-FR')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => downloadListing(`${driver.id}/${item.name}`)}
                  >
                    <Download size={14} color="#134024" strokeWidth={2.5} />
                    <Text style={styles.downloadBtnText}>Ouvrir</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AdminDashboard() {
  const { colors, isDark } = useTheme();
  const { logout, prenom } = useAuth();
  const [drivers, setDrivers] = useState<DriverStats[]>([]);
  const [refCount, setRefCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [viewListingsDriver, setViewListingsDriver] = useState<{ id: string; prenom: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const todayDate = new Date().toISOString().slice(0, 10);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) { /* loading déjà géré */ }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, prenom, email, last_listing_import_at, last_listing_filename, last_listing_file_path')
      .eq('role', 'driver');

    const { count } = await supabase
      .from('reference_courses')
      .select('*', { count: 'exact', head: true });

    setRefCount(count ?? 0);

    if (!profiles || profiles.length === 0) {
      setDrivers([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const driverStats: DriverStats[] = await Promise.all(
      profiles.map(async (p) => {
        const [{ data: courses }, { data: fuel }, { data: km }, { data: workSessions }] = await Promise.all([
          supabase
            .from('courses')
            .select('qte_bon, montant_achat, date_saisie')
            .eq('driver_id', p.id)
            .eq('month_year', currentYearMonth),
          supabase
            .from('fuel_expenses')
            .select('montant')
            .eq('driver_id', p.id)
            .eq('month_year', currentYearMonth),
          supabase
            .from('km_entries')
            .select('km')
            .eq('driver_id', p.id)
            .eq('month_year', currentYearMonth),
          supabase
            .from('work_sessions')
            .select('start_time, end_time')
            .eq('driver_id', p.id)
            .eq('month_year', currentYearMonth),
        ]);

        const todayCourses = courses?.filter(c => (c.date_saisie ?? '').startsWith(todayDate)) || [];
        const todaySessions = workSessions?.filter(s => (s.start_time ?? '').startsWith(todayDate)) || [];

        const computeHours = (sessions: any[]) => {
          let totalMs = 0;
          for (const s of sessions) {
             const start = new Date(s.start_time).getTime();
             const end = s.end_time ? new Date(s.end_time).getTime() : Date.now();
             totalMs += Math.max(0, end - start);
          }
          const h = Math.floor(totalMs / 3600000);
          const m = Math.floor((totalMs % 3600000) / 60000);
          return `${h}h${m.toString().padStart(2, '0')}`;
        };

        return {
          id: p.id,
          prenom: p.prenom,
          email: p.email,
          last_listing_import_at: p.last_listing_import_at,
          last_listing_filename: p.last_listing_filename ?? null,
          last_listing_file_path: p.last_listing_file_path ?? null,
          courses: courses?.length ?? 0,
          heuresJour: computeHours(todaySessions),
          heuresMois: computeHours(workSessions || []),
          bonsJour: todayCourses.reduce((s, c) => s + (c.qte_bon ?? 0), 0),
          bonsMois: courses?.reduce((s, c) => s + (c.qte_bon ?? 0), 0) ?? 0,
          ca: courses?.reduce((s, c) => s + (c.montant_achat ?? 0), 0) ?? 0,
          essence: fuel?.reduce((s, f) => s + (f.montant ?? 0), 0) ?? 0,
          km: km?.reduce((s, k) => s + (k.km ?? 0), 0) ?? 0,
          isActive: todaySessions.some(s => !s.end_time),
        };
      })
    );

    driverStats.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return b.ca - a.ca;
    });

    setDrivers(driverStats);
    setLoading(false);
    setRefreshing(false);
  }, [currentYearMonth]);

  // Chargement initial
  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Realtime WebSocket ───────────────────────────────────────────────────
  // Écoute les INSERT/UPDATE/DELETE sur courses, fuel, km, profiles
  // et rafraîchit les stats en direct (debounce 800ms pour batcher les événements)
  useEffect(() => {
    const triggerRefresh = () => {
      setLiveIndicator(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchData(true);
        setTimeout(() => setLiveIndicator(false), 1500);
      }, 800);
    };

    const channel = supabase
      .channel('admin_live_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_expenses' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'km_entries' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_sessions' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reference_courses' }, triggerRefresh)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleDisconnect = async (driverId: string, prenom: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`Forcer la fin de session pour ${prenom} ?`)) return;
    try {
      await supabase.from('work_sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('driver_id', driverId)
        .is('end_time', null);
      fetchData(true);
    } catch (e) {
      console.error(e);
    }
  };

  const sendNotif = async (driverId: string, driverPrenom: string, hasListing: boolean) => {
    const monthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const defaultMsg = hasListing
      ? `Bonjour ${driverPrenom}, votre listing du mois de ${monthLabel} a bien été reçu. Merci de vérifier que toutes vos courses sont à jour pour garantir la fiabilité de vos données.`
      : `Bonjour ${driverPrenom}, nous n'avons pas encore reçu votre listing pour le mois de ${monthLabel}. Merci de l'importer dès que possible afin d'assurer le bon suivi de vos courses et de vos données.`;

    let message: string | null = defaultMsg;
    if (typeof window !== 'undefined') {
      message = window.prompt(`Message pour ${driverPrenom} :`, defaultMsg);
    }
    if (!message || !message.trim()) return;

    const { error } = await supabase.from('notifications').insert({
      driver_id: driverId,
      message: message.trim(),
      is_read: false,
    });

    if (error) {
      console.error('Erreur envoi notification :', error.message);
      if (typeof window !== 'undefined') window.alert('❌ Erreur lors de l\'envoi.');
    } else {
      if (typeof window !== 'undefined') window.alert(`✅ Rappel envoyé à ${driverPrenom}.`);
    }
  };

  const totalCa = drivers.reduce((acc, d) => acc + d.ca, 0);
  const totalBons = drivers.reduce((acc, d) => acc + d.bonsMois, 0);
  const activeCount = drivers.filter(d => d.isActive).length;

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color="#134024" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header admin flottant et flouté */}
      <BlurView
        intensity={isDark ? 30 : 70}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.header, { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }]}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
            <View style={[styles.liveBadge, { backgroundColor: liveIndicator ? '#16a34a' : '#134024' }]}>
              <Zap size={10} color="#fff" fill="#fff" />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Bonjour {prenom} 👋</Text>
        </View>
        <TouchableOpacity 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); logout(); }} 
          style={[styles.logoutBtn, { backgroundColor: colors.border }]}
        >
          <Text style={[styles.logoutText, { color: colors.textMuted }]}>Déconnexion</Text>
        </TouchableOpacity>
      </BlurView>

      <AddCourseModal
        visible={showAddCourse}
        onClose={() => setShowAddCourse(false)}
        onSaved={() => { setRefCount(c => c + 1); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
      />

      <DriverFilesModal
        driver={viewListingsDriver}
        onClose={() => setViewListingsDriver(null)}
      />

      {/* Liste chauffeurs avec KPIs en Header */}
      {drivers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucun chauffeur enregistré pour l'instant.
          </Text>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingTop: 140, padding: 16, paddingBottom: 80, gap: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#134024" progressViewOffset={140} />}
          ListHeaderComponent={() => (
            <View style={{ marginBottom: 4 }}>
              {/* Compteur références en dégradé */}
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddCourse(true); }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isDark ? ['#134024', '#064e3b'] : ['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.refBanner}
                >
                  <Users size={16} color="#fff" />
                  <Text style={styles.refText}>
                    <Text style={{ fontWeight: '900' }}>{refCount.toLocaleString('fr-FR')}</Text> références
                  </Text>
                  <Text style={[styles.refSub, { color: 'rgba(255,255,255,0.8)' }]}>
                    {drivers.length} chauffeur{drivers.length > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.addBtn}>
                    <Plus size={14} color="#059669" strokeWidth={3} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* KPIs globaux en dégradé subtil */}
              <View style={[styles.kpiGrid, { paddingHorizontal: 0, marginTop: 12 }]}>
                <LinearGradient
                  colors={isDark ? ['#1f2937', '#111827'] : ['#ffffff', '#f8fafc']}
                  style={[styles.kpiCard, shadow as any]}
                >
                  <TrendingUp size={20} color="#16a34a" />
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{formatMoney(totalCa)}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>CA Global</Text>
                </LinearGradient>
                <LinearGradient
                  colors={isDark ? ['#1f2937', '#111827'] : ['#ffffff', '#f8fafc']}
                  style={[styles.kpiCard, shadow as any]}
                >
                  <Package size={20} color="#2563eb" />
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{totalBons}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Bons livrés</Text>
                </LinearGradient>
                <LinearGradient
                  colors={isDark ? ['#1f2937', '#111827'] : ['#ffffff', '#f8fafc']}
                  style={[styles.kpiCard, shadow as any]}
                >
                  <Zap size={20} color={activeCount > 0 ? "#eab308" : colors.textMuted} />
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{activeCount}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>En ligne</Text>
                </LinearGradient>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <DriverCard 
              driver={item} 
              onNotif={(id, prenom, hasListing) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); sendNotif(id, prenom, hasListing); }} 
              onDisconnect={(id, prenom) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleDisconnect(id, prenom); }}
              onViewListings={(id, prenom) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewListingsDriver({ id, prenom }); }}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  logoutText: { fontSize: 13, fontWeight: '700' },
  refBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 4, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  refText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  refSub: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 20, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  driverName: { fontSize: 16, fontWeight: '800' },
  driverEmail: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  notifBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#E8F5EC', alignItems: 'center', justifyContent: 'center',
  },
  importRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12, borderWidth: 1,
  },
  importText: { fontSize: 12, fontWeight: '500' },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#E8F5EC', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  downloadBtnText: { fontSize: 11, fontWeight: '700', color: '#134024' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingTop: 0 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minWidth: '45%', flex: 1 },
  chipLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  chipValue: { fontSize: 15, fontWeight: '900', marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  liveText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  addBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  kpiGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  kpiCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { fontSize: 18, fontWeight: '900', marginTop: 8, marginBottom: 2 },
  kpiLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8,
  },
  textInput: {
    height: 50, borderRadius: 14, paddingHorizontal: 16,
    fontSize: 15, fontWeight: '600',
  },
  vehiculeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  vehiculeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  vehiculeChipText: { fontSize: 12, fontWeight: '700' },
  errorBox: {
    backgroundColor: '#fee2e2', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 14,
  },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  modalBtns: {
    flexDirection: 'row', gap: 10, marginTop: 24,
  },
  btnSecondary: {
    flex: 1, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontSize: 15, fontWeight: '700' },
  btnPrimary: {
    flex: 1, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
