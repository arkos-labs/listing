const fs = require('fs');
const path = require('path');

const content = `import { useMemo, useState } from 'react';
import { SectionList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCourses } from '@/context/CoursesContext';
import { formatEuro, formatQte } from '@/lib/kpi';
import { colors, radius, shadow } from '@/lib/theme';
import type { Course } from '@/types/course';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';

export default function HistoryScreen() {
  const { courses, remove, clearAll } = useCourses();
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // État pour savoir quels mois sont repliés (cachés).
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const totalCa = useMemo(() => courses.reduce((s, c) => s + c.montantAchat, 0), [courses]);

  // Groupement des courses par mois (ex: "Juillet 2026")
  const sections = useMemo(() => {
    const groups: Record<string, { courses: Course[]; total: number; count: number }> = {};
    
    courses.forEach((c) => {
      const d = new Date(c.dateSaisie);
      const monthName = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      if (!groups[title]) {
        groups[title] = { courses: [], total: 0, count: 0 };
      }
      groups[title].courses.push(c);
      groups[title].total += c.montantAchat;
      groups[title].count += 1;
    });

    return Object.entries(groups).map(([title, data]) => ({
      title,
      data: data.courses,
      total: data.total,
      count: data.count,
    }));
  }, [courses]);

  // Si c'est le premier rendu et qu'on a des sections, on pourrait vouloir fermer les anciens mois par défaut.
  // Pour la simplicité, on laisse tout ouvert ou on pourrait initialiser collapsedSections ici.

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Historique</Text>
          <Text style={styles.subtitle}>
            {courses.length} course{courses.length > 1 ? 's' : ''} · {formatEuro(totalCa)}
          </Text>
        </View>
        {courses.length > 0 ? (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setConfirmClear(true)}>
            <Trash2 size={15} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {courses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>Aucune course.{'\\n'}Ajoutez-en depuis l'onglet Saisie.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderSectionHeader={({ section }) => (
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(section.title)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionSub}>
                  {section.count} course{section.count > 1 ? 's' : ''} · {formatEuro(section.total)}
                </Text>
              </View>
              {collapsedSections.has(section.title) ? (
                <ChevronDown size={20} color={colors.textMuted} />
              ) : (
                <ChevronUp size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          )}
          renderItem={({ item, section }) => {
            if (collapsedSections.has(section.title)) return null;
            return <Row course={item} onDelete={() => setConfirmDelete(item)} />;
          }}
          stickySectionHeadersEnabled={false}
        />
      )}

      <Modal transparent visible={confirmDelete !== null} animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Supprimer cette course ?</Text>
            <Text style={styles.modalBody}>
              {(confirmDelete?.lieuEnlevement || '—') + ' → ' + (confirmDelete?.lieuLivraison || '—')}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmDelete(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDelete}
                onPress={async () => {
                  if (confirmDelete) await remove(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                <Text style={styles.modalDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={confirmClear} animationType="fade" onRequestClose={() => setConfirmClear(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Vider tout l'historique ?</Text>
            <Text style={styles.modalBody}>
              Les {courses.length} course{courses.length > 1 ? 's' : ''} enregistrées seront supprimées définitivement.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmClear(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDelete}
                onPress={async () => {
                  await clearAll();
                  setConfirmClear(false);
                }}
              >
                <Text style={styles.modalDeleteText}>Tout vider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ course, onDelete }: { course: Course; onDelete: () => void }) {
  const d = new Date(course.dateSaisie);
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {course.lieuEnlevement || '—'}
          </Text>
          <Text style={styles.rowAmount}>{formatEuro(course.montantAchat)}</Text>
        </View>
        <Text style={styles.rowDest} numberOfLines={1}>
          → {course.lieuLivraison || '—'}
        </Text>
        <Text style={styles.rowSub}>
          {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {formatQte(course.qteBon)} bon
          {course.qteBon > 1 ? 's' : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.rowDelete} hitSlop={8}>
        <Trash2 size={16} color={colors.red} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.black,
    borderRadius: radius.card,
    marginTop: 16,
    marginBottom: 10,
    ...shadow,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', textTransform: 'capitalize' },
  sectionSub: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 14,
    ...shadow,
  },
  rowMain: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  rowDest: { fontSize: 13, color: colors.textMuted },
  rowAmount: { fontSize: 16, fontWeight: '800', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  rowDelete: { padding: 6 },
  sep: { height: 8 },
  emptyWrap: { alignItems: 'center', gap: 12, marginTop: 48 },
  empty: { color: colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalBody: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.bg },
  modalCancelText: { color: colors.textMuted, fontWeight: '700' },
  modalDelete: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.red },
  modalDeleteText: { color: '#fff', fontWeight: '700' },
});
`;

fs.writeFileSync(path.join(__dirname, 'app/(tabs)/historique.tsx'), content);
console.log('Done rewriting historique.tsx');
