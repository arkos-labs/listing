import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Modal, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Search, Plus, X, ChevronDown, ChevronUp, MapPin } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { shadow } from '@/lib/theme';

// ── Données initiales ────────────────────────────────────────────────────────
const INITIAL: { hopital: string; services: { service: string; indication: string }[] }[] = [
  {
    hopital: 'CHU Avicenne',
    services: [{ service: 'Biochimie', indication: 'Bat Lavoisier • 1er étage' }],
  },
  {
    hopital: 'CHU St Louis',
    services: [
      { service: 'EFS', indication: '1er étage' },
      { service: 'CDT', indication: '1er étage' },
      { service: 'Maternité Louis Devairgne', indication: '+2' },
    ],
  },
  {
    hopital: 'CHU Brousse',
    services: [{ service: 'Garde', indication: 'Bat Fred Siguier • 5ème étage' }],
  },
  {
    hopital: 'CHU Kremlin-Bicêtre',
    services: [
      { service: 'Broca — CDT / EFS', indication: '+3' },
      { service: 'Pharmacie Broca', indication: 'RDC' },
    ],
  },
  {
    hopital: 'CHU Robert Debré',
    services: [
      { service: 'Biochimie', indication: '+1' },
      { service: 'EFS', indication: '-2' },
      { service: 'Urgences', indication: '-2' },
      { service: 'Sortie', indication: '-4' },
      { service: 'Anapath', indication: '-3' },
    ],
  },
  {
    hopital: 'CHU Tenon',
    services: [
      { service: 'CDT', indication: 'Bat Achard' },
      { service: 'Exploration', indication: 'Bat orange • +3 • Porte 20' },
      { service: 'LBU — Labo de garde', indication: 'Porte 19' },
    ],
  },
  {
    hopital: 'CHU Cochin',
    services: [
      { service: 'Virologie', indication: '+6' },
      { service: 'HDJ Néphro', indication: 'Bat Grégoire • Porte 12' },
    ],
  },
  {
    hopital: 'CHU Garches',
    services: [{ service: 'CDT', indication: 'Bat Grossior • +1' }],
  },
  {
    hopital: 'CHU Bichat',
    services: [
      { service: 'CDT', indication: '+3' },
      { service: 'EFS', indication: '+3' },
    ],
  },
  {
    hopital: 'CHU Saint-Antoine',
    services: [{ service: 'LBU', indication: '+3' }],
  },
  {
    hopital: 'CHU Nanterre',
    services: [
      { service: 'Pneumologie', indication: 'Porte 12 • +2' },
      { service: 'Labo', indication: 'Porte 26' },
    ],
  },
  {
    hopital: 'CHU Louis Mourier',
    services: [{ service: 'Dépôt de sang', indication: '+1' }],
  },
  {
    hopital: 'CHU Mondor',
    services: [{ service: 'Immuno', indication: '+1' }],
  },
  {
    hopital: 'CHU Argenteuil',
    services: [{ service: 'Labo', indication: 'Bat Léonard de Vinci' }],
  },
  {
    hopital: 'Jean Verdier',
    services: [{ service: 'CDT', indication: '+5' }],
  },
];

// Formate les étages : "+3" → "3ème étage", "-2" → "Sous-sol 2", "+1" → "1er étage"
function formatIndication(text: string): string {
  return text.replace(/([+-]\d+)/g, (match) => {
    const n = parseInt(match);
    if (n > 0) {
      const suffix = n === 1 ? 'er' : 'ème';
      return `${n}${suffix} étage`;
    } else {
      return `Sous-sol ${Math.abs(n)}`;
    }
  });
}

type Indication = {
  id: string;
  hopital: string;
  service: string;
  indication: string;
  source: 'db';
};

export default function AidePage() {
  const { colors, isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dbData, setDbData] = useState<Indication[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal ajout
  const [modalVisible, setModalVisible] = useState(false);
  const [newHopital, setNewHopital] = useState('');
  const [newService, setNewService] = useState('');
  const [newIndication, setNewIndication] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchDbData();
  }, []);

  const fetchDbData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('aide_indications')
      .select('*')
      .order('created_at', { ascending: true });
    setDbData((data ?? []).map(d => ({ ...d, source: 'db' as const })));
    setLoading(false);
  };

  // Fusionner données initiales + BDD
  const allGroups = useMemo(() => {
    const map = new Map<string, { service: string; indication: string; isNew?: boolean }[]>();

    // Données initiales
    for (const h of INITIAL) {
      map.set(h.hopital, [...h.services]);
    }

    // Données BDD (ajouts communautaires)
    for (const d of dbData) {
      const key = d.hopital.trim();
      const entry = { service: d.service, indication: d.indication, isNew: true };
      if (map.has(key)) {
        map.get(key)!.push(entry);
      } else {
        map.set(key, [entry]);
      }
    }

    return Array.from(map.entries()).map(([hopital, services]) => ({ hopital, services }));
  }, [dbData]);

  // Filtrer par recherche
  const filtered = useMemo(() => {
    if (!search.trim()) return allGroups;
    const q = search.toLowerCase();
    return allGroups
      .map(g => ({
        hopital: g.hopital,
        services: g.services.filter(
          s => s.service.toLowerCase().includes(q) || s.indication.toLowerCase().includes(q) || g.hopital.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.services.length > 0 || g.hopital.toLowerCase().includes(q));
  }, [allGroups, search]);

  const handleAdd = async () => {
    if (!newHopital.trim() || !newService.trim() || !newIndication.trim()) {
      setSaveError('Tous les champs sont obligatoires.');
      return;
    }
    setSaving(true);
    setSaveError('');
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('aide_indications').insert({
      hopital: newHopital.trim(),
      service: newService.trim(),
      indication: newIndication.trim(),
      created_by: user?.id,
    });
    setSaving(false);
    if (error) {
      setSaveError('Erreur lors de l\'enregistrement.');
    } else {
      setModalVisible(false);
      setNewHopital('');
      setNewService('');
      setNewIndication('');
      fetchDbData();
    }
  };

  const s = makeStyles(colors, isDark);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Aide • Services</Text>
        <Text style={s.subtitle}>Trouvez un service dans les CHU</Text>
      </View>

      {/* Barre de recherche */}
      <View style={[s.searchBar, shadow]}>
        <Search size={16} color={colors.textFaint} />
        <TextInput
          style={s.searchInput}
          placeholder="Chercher un CHU, un service…"
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.textFaint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Liste */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <ActivityIndicator color={colors.green} style={{ marginTop: 32 }} />
        )}

        {filtered.map(group => {
          const isOpen = expanded === group.hopital || search.length > 0;
          return (
            <View key={group.hopital} style={[s.card, shadow]}>
              <TouchableOpacity
                style={s.cardHeader}
                onPress={() => setExpanded(isOpen && !search ? null : group.hopital)}
                activeOpacity={0.7}
              >
                <View style={s.cardHeaderLeft}>
                  <MapPin size={14} color={colors.green} strokeWidth={2} />
                  <Text style={s.hopitalName}>{group.hopital}</Text>
                </View>
                {!search && (isOpen
                  ? <ChevronUp size={16} color={colors.textFaint} />
                  : <ChevronDown size={16} color={colors.textFaint} />)}
              </TouchableOpacity>

              {isOpen && (
                <View style={s.servicesList}>
                  {group.services.map((sv, i) => (
                    <View key={i} style={[s.serviceRow, i < group.services.length - 1 && s.serviceRowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.serviceName}>{sv.service}</Text>
                        <Text style={s.serviceIndic}>{formatIndication(sv.indication)}</Text>
                      </View>
                      {sv.isNew && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>Communauté</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {filtered.length === 0 && !loading && (
          <Text style={[s.empty]}>Aucun résultat pour « {search} »</Text>
        )}
      </ScrollView>

      {/* Bouton ajouter */}
      <TouchableOpacity style={[s.fab, shadow]} onPress={() => setModalVisible(true)}>
        <Plus size={22} color="#fff" strokeWidth={2.5} />
        <Text style={s.fabText}>Ajouter une indication</Text>
      </TouchableOpacity>

      {/* Modal ajout */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalOverlay}>
            <View style={[s.modalCard, shadow]}>
              <View style={s.modalHeaderRow}>
                <Text style={s.modalTitle}>Nouvelle indication</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setSaveError(''); }}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={s.modalSubtitle}>Aidez la communauté en ajoutant une info utile</Text>

              <Text style={s.label}>CHU / HÔPITAL</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}
                placeholder="ex: CHU Tenon"
                placeholderTextColor={colors.textFaint}
                value={newHopital}
                onChangeText={setNewHopital}
              />

              <Text style={s.label}>SERVICE</Text>
              <TextInput
                style={[s.input, { color: colors.text, backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}
                placeholder="ex: Biochimie, CDT…"
                placeholderTextColor={colors.textFaint}
                value={newService}
                onChangeText={setNewService}
              />

              <Text style={s.label}>INDICATION</Text>
              <TextInput
                style={[s.input, s.inputMulti, { color: colors.text, backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6' }]}
                placeholder="ex: Bat Achard • +3 • Porte 12"
                placeholderTextColor={colors.textFaint}
                value={newIndication}
                onChangeText={setNewIndication}
                multiline
              />

              {saveError ? <Text style={s.errorText}>{saveError}</Text> : null}

              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: saving ? '#5a8a6a' : '#1A6137' }]}
                onPress={handleAdd}
                disabled={saving}
              >
                <Text style={s.saveBtnText}>{saving ? 'Enregistrement…' : 'Publier l\'indication'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.bg : '#F0F4F0' },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    title: { fontSize: 26, fontWeight: '900', color: isDark ? '#fff' : '#0F4D2C', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },

    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.card, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 10,
      marginHorizontal: 16, marginBottom: 16,
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },

    card: {
      backgroundColor: colors.card, borderRadius: 18,
      marginBottom: 10, overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    hopitalName: { fontSize: 15, fontWeight: '800', color: colors.text, flex: 1 },

    servicesList: { paddingHorizontal: 16, paddingBottom: 12 },
    serviceRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
    serviceRowBorder: { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0' },
    serviceName: { fontSize: 13, fontWeight: '700', color: colors.text },
    serviceIndic: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginTop: 1 },
    badge: { backgroundColor: '#d1fae5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#065f46' },

    empty: { textAlign: 'center', color: colors.textFaint, marginTop: 40, fontSize: 14 },

    fab: {
      position: 'absolute', bottom: 90, alignSelf: 'center',
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#1A6137', borderRadius: 28,
      paddingHorizontal: 20, paddingVertical: 14,
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: 40,
    },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
    modalSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 20, fontWeight: '500' },

    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.text, marginBottom: 6, marginLeft: 2 },
    input: {
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, fontWeight: '500', marginBottom: 14,
    },
    inputMulti: { height: 80, textAlignVertical: 'top' },

    errorText: { color: '#dc2626', fontSize: 13, fontWeight: '600', marginBottom: 10, textAlign: 'center' },

    saveBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
