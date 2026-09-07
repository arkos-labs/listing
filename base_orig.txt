import { useMemo, useState } from 'react';
import { FlatList, Modal, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useReference } from '@/context/ReferenceContext';
import { useTheme } from '@/context/ThemeContext';
import { parseExcelFile } from '@/lib/excelImport';
import { parsePdfFile } from '@/lib/pdfImport';
import { includesNormalized } from '@/lib/text';
import { formatQte } from '@/lib/kpi';
import { radius, shadow } from '@/lib/theme';
import type { ReferenceCourse } from '@/types/course';
import type { Domaine } from '@/lib/domaine';
import { detectDomaine } from '@/lib/domaine';

function getEffectiveDomaine(c: ReferenceCourse): Domaine {
  if (c.domaine) return c.domaine;
  return detectDomaine(c.lieuEnlevement ?? '', c.lieuLivraison ?? '');
}
import { Loader2, Plus, X, Search, Upload, Database, ArrowRight } from 'lucide-react-native';
import { CANONICAL_VEHICULES, canonicalizeVehicule } from '@/lib/vehicule';

export default function BaseScreen() {
  const { referenceCourses, importFiles, clearAll } = useReference();
  const { colors } = useTheme();
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [domaineFilter, setDomaineFilter] = useState<'all' | Domaine | 'suiveuse' | 'nuit'>('all');
  const [editingRow, setEditingRow] = useState<Partial<ReferenceCourse> | null>(null);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const filtered = useMemo(() => {
    let list = referenceCourses;
    if (query.trim()) list = list.filter((c) => includesNormalized(c.lieuEnlevement, query) || includesNormalized(c.lieuLivraison, query));
    if (domaineFilter === 'suiveuse') list = list.filter((c) => canonicalizeVehicule(c.vehicule) === 'SUIVEUSE');
    else if (domaineFilter === 'nuit') list = list.filter((c) => canonicalizeVehicule(c.vehicule) === 'NUIT');
    else if (domaineFilter !== 'all') list = list.filter((c) => getEffectiveDomaine(c) === domaineFilter);
    return list;
  }, [referenceCourses, query, domaineFilter]);

  const totalQte = useMemo(() => filtered.reduce((sum, c) => sum + (c.qteBon || 0), 0), [filtered]);

  const countMedical = useMemo(() => referenceCourses.filter((c) => getEffectiveDomaine(c) === 'medical').length, [referenceCourses]);
  const countCourse = useMemo(() => referenceCourses.filter((c) => getEffectiveDomaine(c) === 'courseCourse').length, [referenceCourses]);
  const countSuiveuse = useMemo(() => referenceCourses.filter((c) => canonicalizeVehicule(c.vehicule) === 'SUIVEUSE').length, [referenceCourses]);
  const countNuit = useMemo(() => referenceCourses.filter((c) => canonicalizeVehicule(c.vehicule) === 'NUIT').length, [referenceCourses]);

  const sections = useMemo(() => {
    if (domaineFilter !== 'all' || query.trim()) return null;
    const cc = referenceCourses.filter((c) => getEffectiveDomaine(c) === 'courseCourse');
    const med = referenceCourses.filter((c) => getEffectiveDomaine(c) === 'medical');
    const result = [];
    if (cc.length > 0) result.push({ key: 'courseCourse', title: `🚴 Course à course`, count: cc.length, data: cc });
    if (med.length > 0) result.push({ key: 'medical', title: `🏥 Médical`, count: med.length, data: med });
    return result;
  }, [referenceCourses, domaineFilter, query]);

  const pickAndImport = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/octet-stream',
          'application/pdf',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) { setImporting(false); return; }

      let allInputs = [] as Awaited<ReturnType<typeof parseExcelFile>>;
      for (const asset of res.assets) {
        const isPdf = asset.name?.toLowerCase().endsWith('.pdf') || asset.mimeType === 'application/pdf';
        if (isPdf) {
          allInputs = allInputs.concat(await parsePdfFile(asset.uri));
        } else {
          allInputs = allInputs.concat(await parseExcelFile(asset.uri));
        }
      }

      if (allInputs.length === 0) { setImportMsg('Aucune ligne exploitable trouvée.'); return; }
      // Construire le nom du/des fichier(s) pour l'admin
      const filename = res.assets.map((a) => a.name ?? 'fichier inconnu').join(', ');
      const firstUri = res.assets[0].uri;
      const n = await importFiles(allInputs, filename, firstUri);
      setImportMsg(`${n} référence${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} (${res.assets.length} fichier${res.assets.length > 1 ? 's' : ''}).`);
    } catch (e) {
      setImportMsg("Échec de l'import.");
      console.error('[import]', e);
    } finally { setImporting(false); }
  };

  const handleSaveModal = async () => {
    if (!editingRow || !editingRow.lieuEnlevement || !editingRow.lieuLivraison || (editingRow.qteBon || 0) <= 0) return;
    await importFiles([{ lieuEnlevement: editingRow.lieuEnlevement, lieuLivraison: editingRow.lieuLivraison, qteBon: editingRow.qteBon || 0, vehicule: canonicalizeVehicule(editingRow.vehicule) || undefined }]);
    setEditingRow(null);
    setImportMsg('Référence ajoutée manuellement.');
  };

  const renderItem = ({ item }: { item: ReferenceCourse }) => (
    <TouchableOpacity onPress={() => setEditingRow(item)}>
      <Row course={item} colors={colors} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Base</Text>
          <Text style={styles.subtitle}>{referenceCourses.length} référence{referenceCourses.length > 1 ? 's' : ''}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.importBtn} onPress={pickAndImport} disabled={importing}>
            {importing ? <Loader2 size={14} color={colors.green} /> : <Upload size={14} color={colors.green} />}
            <Text style={styles.importBtnText}>{importing ? 'Import…' : 'Importer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setEditingRow({ lieuEnlevement: '', lieuLivraison: '', qteBon: 1, vehicule: '' })}>
            <Plus size={15} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Banner import */}
      {importMsg ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{importMsg}</Text>
          <TouchableOpacity onPress={() => setImportMsg(null)}><X size={14} color={colors.greenDark} /></TouchableOpacity>
        </View>
      ) : null}

      {/* Recherche */}
      <View style={[styles.searchBar, shadow]}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Chercher enlèvement, livraison…"
          placeholderTextColor={colors.textFaint}
        />
        {query.length > 0 ? <TouchableOpacity onPress={() => setQuery('')}><X size={14} color={colors.textMuted} /></TouchableOpacity> : null}
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: `Tout (${referenceCourses.length})` },
          { key: 'courseCourse', label: `🚴 Course (${countCourse})` },
          { key: 'medical', label: `🏥 Médical (${countMedical})` },
          ...(countSuiveuse > 0 ? [{ key: 'suiveuse', label: `🏍 Suiveuse (${countSuiveuse})` }] : []),
          ...(countNuit > 0 ? [{ key: 'nuit', label: `🌙 Nuit (${countNuit})` }] : []),
        ].map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, domaineFilter === f.key && styles.filterChipActive]} onPress={() => setDomaineFilter(f.key as any)}>
            <Text style={[styles.filterChipText, domaineFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Résultats recherche */}
      {(query.trim() || domaineFilter !== 'all') ? (
        <View style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''} · {formatQte(totalQte)} bon{totalQte > 1 ? 's' : ''}</Text>
        </View>
      ) : null}

      {referenceCourses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}><Database size={32} color={colors.textFaint} /></View>
          <Text style={styles.emptyTitle}>Base vide</Text>
          <Text style={styles.emptySub}>Importe un fichier .xls ou ajoute une référence.</Text>
        </View>
      ) : sections ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeadTitle}>{section.title}</Text>
              <View style={styles.sectionHeadBadge}><Text style={styles.sectionHeadBadgeText}>{section.count}</Text></View>
            </View>
          )}
          SectionSeparatorComponent={() => <View style={{ height: 6 }} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={renderItem}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Aucun résultat.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={renderItem}
        />
      )}

      {referenceCourses.length > 0 ? (
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
          <Text style={styles.clearBtnText}>Vider la base</Text>
        </TouchableOpacity>
      ) : null}

      {/* Modal ajout/édition */}
      <Modal transparent visible={editingRow !== null} animationType="fade" onRequestClose={() => setEditingRow(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Référence de course</Text>
            <View style={{ marginTop: 16, gap: 12 }}>
              {[
                { label: 'Enlèvement', key: 'lieuEnlevement', placeholder: 'Ex. BICHAT' },
                { label: 'Livraison', key: 'lieuLivraison', placeholder: 'Ex. KREMLIN BICETRE' },
              ].map(({ label, key, placeholder }) => (
                <View key={key}>
                  <Text style={styles.modalLabel}>{label}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={(editingRow as any)?.[key] || ''}
                    onChangeText={(v) => setEditingRow((r) => ({ ...r!, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textFaint}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Bons</Text>
                  <TextInput style={styles.modalInput} value={editingRow?.qteBon?.toString() || ''} onChangeText={(v) => setEditingRow((r) => ({ ...r!, qteBon: parseFloat(v) || 0 }))} keyboardType="numeric" placeholder="2" placeholderTextColor={colors.textFaint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Type</Text>
                  <TextInput style={styles.modalInput} value={editingRow?.vehicule || ''} onChangeText={(v) => setEditingRow((r) => ({ ...r!, vehicule: v }))} placeholder="EXPRESS" placeholderTextColor={colors.textFaint} />
                </View>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditingRow(null)}><Text style={styles.modalCancelText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveModal}><Text style={styles.modalSaveText}>Enregistrer</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ course, colors }: { course: ReferenceCourse; colors: any }) {
  const canon = canonicalizeVehicule(course.vehicule);
  const isSuiveuse = canon === 'SUIVEUSE';
  const isNuit = canon === 'NUIT';
  const isMedical = !isSuiveuse && !isNuit && (course.domaine ?? detectDomaine(course.lieuEnlevement ?? '', course.lieuLivraison ?? '')) === 'medical';

  // Suiveuse — rendu spécial
  if (isSuiveuse) {
    return (
      <View style={[{ backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' }, shadow as any]}>
        {/* Bandeau violet en haut */}
        <View style={{ backgroundColor: '#6D28D9', paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>🏍 SUIVEUSE</Text>
          {course.dateCourse ? <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginLeft: 'auto' }}>{course.dateCourse}</Text> : null}
        </View>
        {/* Trajet */}
        <View style={{ padding: 14, gap: 10 }}>
          {/* Départ */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6D28D9', marginTop: 5 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#6D28D9', textTransform: 'uppercase', letterSpacing: 0.5 }}>Départ</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 1 }} numberOfLines={2}>{course.lieuEnlevement || '—'}</Text>
            </View>
          </View>
          {/* Ligne de connexion */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 8, alignItems: 'center' }}>
              <View style={{ width: 2, height: 20, backgroundColor: '#C4B5FD' }} />
            </View>
            <View style={{ flex: 1 }} />
          </View>
          {/* Arrivée */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#6D28D9', marginTop: 5 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#6D28D9', textTransform: 'uppercase', letterSpacing: 0.5 }}>Arrivée</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 1 }} numberOfLines={2}>{course.lieuLivraison || '—'}</Text>
            </View>
            <View style={{ backgroundColor: '#EDE9FE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 52 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#6D28D9' }}>{formatQte(course.qteBon)}</Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#6D28D9', letterSpacing: 0.5, marginTop: 1 }}>BONS</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Nuit — bandeau bleu nuit
  const accent = isNuit ? '#1E40AF' : isMedical ? (colors.amber ?? '#D97706') : colors.green;
  const accentSoft = isNuit ? '#DBEAFE' : isMedical ? (colors.amberSoft ?? '#FEF3C7') : colors.greenSoft;
  const initials = (course.lieuEnlevement || '?').slice(0, 2).toUpperCase();

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 14, paddingRight: 14, paddingLeft: 14, borderLeftWidth: 4, borderLeftColor: accent }, shadow as any]}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: accent }}>{isNuit ? '🌙' : initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={2}>{course.lieuEnlevement || '—'}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '500' }} numberOfLines={1}>→ {course.lieuLivraison || '—'}</Text>
        {course.dateCourse || course.vehicule ? (
          <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 2, fontWeight: '600' }}>{[course.dateCourse, course.vehicule].filter(Boolean).join(' · ')}</Text>
        ) : null}
      </View>
      <View style={{ backgroundColor: accentSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 52 }}>
        <Text style={{ fontSize: 17, fontWeight: '900', color: accent }}>{formatQte(course.qteBon)}</Text>
        <Text style={{ fontSize: 9, fontWeight: '800', color: accent, letterSpacing: 0.5, marginTop: 1 }}>BONS</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    title: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -0.8 },
    subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
    importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.greenSoft },
    importBtnText: { color: colors.green, fontWeight: '800', fontSize: 13 },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
    banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.greenSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
    bannerText: { color: colors.greenDark, fontSize: 13, fontWeight: '700', flex: 1 },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12 },
    searchInput: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600', outlineWidth: 0, padding: 0 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card, ...shadow as any },
    filterChipActive: { backgroundColor: colors.green },
    filterChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    filterChipTextActive: { color: '#fff' },
    resultBadge: { backgroundColor: colors.greenSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
    resultBadgeText: { color: colors.greenDark, fontSize: 13, fontWeight: '800' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 2, marginBottom: 8 },
    sectionHeadTitle: { fontSize: 15, fontWeight: '900', color: colors.text, flex: 1 },
    sectionHeadBadge: { backgroundColor: colors.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    sectionHeadBadgeText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
    emptyWrap: { alignItems: 'center', gap: 10, marginTop: 64 },
    emptyIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    emptySub: { fontSize: 14, color: colors.textMuted, fontWeight: '500', textAlign: 'center' },
    clearBtn: { alignItems: 'center', paddingVertical: 16 },
    clearBtnText: { color: colors.textFaint, fontWeight: '700', fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalCard: { backgroundColor: colors.card, borderRadius: 28, padding: 24, width: '100%', maxWidth: 360 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
    modalLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
    modalInput: { backgroundColor: colors.border, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text, fontWeight: '600' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
    modalCancel: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.border },
    modalCancelText: { color: colors.text, fontWeight: '700' },
    modalSave: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.green },
    modalSaveText: { color: '#fff', fontWeight: '800' },
  });
}
