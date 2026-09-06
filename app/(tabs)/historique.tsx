import { useMemo, useState } from 'react';
import { ScrollView, Modal, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useCourses } from '@/context/CoursesContext';
import { useClosures } from '@/context/ClosuresContext';
import { useFuel } from '@/context/FuelContext';
import { useTheme } from '@/context/ThemeContext';
import { formatEuro, formatQte } from '@/lib/kpi';
import { radius, shadow } from '@/lib/theme';
import type { Course } from '@/types/course';
import type { Domaine } from '@/lib/domaine';
import { detectDomaine } from '@/lib/domaine';
import { Trash2, ChevronDown, ChevronUp, Lock, Fuel, Wrench, Clock, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { formatDuration } from '@/lib/worktime';

function getEffectiveDomaine(c: Course): Domaine {
  if (c.domaine) return c.domaine;
  return detectDomaine(c.lieuEnlevement ?? '', c.lieuLivraison ?? '');
}

/** Même logique que lib/optimisation.ts — dérive le delta affiché depuis les adresses */
function isParis(lieu: string): boolean {
  if (/\b75\d{3}\b/.test(lieu)) return true;
  if (/\bPARIS\b/i.test(lieu) && !/\b(9[1-5]|7[78])\d{3}\b/.test(lieu)) return true;
  return false;
}
function getOptimisationLabel(c: Course): string {
  if (!c.optimise) return '';
  const parisPareil = isParis(c.lieuEnlevement ?? '') && isParis(c.lieuLivraison ?? '');
  return parisPareil ? '−0.5 opt.' : '−1.0 opt.';
}

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toDateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type DayGroup  = { id: string; dateIso: string; title: string; total: number; bons: number; essence: number; courses: Course[] };
type MonthGroup = { id: string; yearMonth: string; title: string; total: number; bons: number; essence: number; days: DayGroup[] };

export default function HistoryScreen() {
  const { courses, remove, clearAll, update } = useCourses();
  const { closures } = useClosures();
  const { expenses: fuelExpenses } = useFuel();
  const { colors } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Seul le mois en cours est ouvert par défaut — les mois précédents sont fermés
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([toYearMonth(new Date())]));
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [domaineFilter, setDomaineFilter] = useState<'all' | Domaine>('all');

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const toggleMonth = (id: string) => setExpandedMonths((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleDay = (id: string) => setCollapsedDays((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filteredCourses = useMemo(
    () => domaineFilter === 'all' ? courses : courses.filter((c) => getEffectiveDomaine(c) === domaineFilter),
    [courses, domaineFilter]
  );

  const countMedical = useMemo(() => courses.filter((c) => getEffectiveDomaine(c) === 'medical').length, [courses]);
  const countCourse  = useMemo(() => courses.filter((c) => getEffectiveDomaine(c) === 'courseCourse').length, [courses]);
  const totalCa = useMemo(() => filteredCourses.reduce((s, c) => s + c.montantAchat, 0), [filteredCourses]);

  // Map date ISO → essence du jour (ex: "2026-07-31" → 40)
  const fuelByDate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of fuelExpenses) {
      const d = e.date.slice(0, 10); // "YYYY-MM-DD"
      m[d] = (m[d] ?? 0) + e.montant;
    }
    return m;
  }, [fuelExpenses]);

  // Map yearMonth → essence du mois (ex: "2026-07" → 80)
  const fuelByMonth = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of fuelExpenses) {
      const ym = e.date.slice(0, 7);
      m[ym] = (m[ym] ?? 0) + e.montant;
    }
    return m;
  }, [fuelExpenses]);

  const closureMap = useMemo(() => {
    const m: Record<string, typeof closures[0]> = {};
    for (const cl of closures) m[cl.yearMonth] = cl;
    return m;
  }, [closures]);

  const months = useMemo(() => {
    const mgroups: Record<string, MonthGroup> = {};
    const sorted = [...filteredCourses].sort((a, b) => new Date(b.dateSaisie).getTime() - new Date(a.dateSaisie).getTime());

    sorted.forEach((c) => {
      const d = new Date(c.dateSaisie);
      const ym = toYearMonth(d);
      const dateIso = toDateIso(d);
      const monthStr = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const mId = ym;
      const mTitle = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
      const dayStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });
      const dId = `${mId}-${dateIso}`;
      const dTitle = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);

      if (!mgroups[mId]) mgroups[mId] = { id: mId, yearMonth: ym, title: mTitle, total: 0, bons: 0, essence: fuelByMonth[ym] ?? 0, days: [] };
      let dGroup = mgroups[mId].days.find(x => x.id === dId);
      if (!dGroup) {
        dGroup = { id: dId, dateIso, title: dTitle, total: 0, bons: 0, essence: fuelByDate[dateIso] ?? 0, courses: [] };
        mgroups[mId].days.push(dGroup);
      }
      dGroup.courses.push(c);
      dGroup.total += c.montantAchat;
      dGroup.bons  += c.qteBon;
      mgroups[mId].total += c.montantAchat;
      mgroups[mId].bons  += c.qteBon;
    });

    return Object.values(mgroups).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  }, [filteredCourses, fuelByDate, fuelByMonth]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Historique</Text>
          <Text style={styles.subtitle}>
            {filteredCourses.length} course{filteredCourses.length > 1 ? 's' : ''} · {formatEuro(totalCa)}
          </Text>
        </View>
        {courses.length > 0 ? (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setConfirmClear(true)}>
            <Trash2 size={15} color={colors.red} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtres domaine */}
      {courses.length > 0 ? (
        <View style={styles.filterRow}>
          {([
            { key: 'all', label: `Tout (${courses.length})` },
            { key: 'courseCourse', label: `🚴 À course (${countCourse})` },
            { key: 'medical', label: `🏥 Médical (${countMedical})` },
          ] as const).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, domaineFilter === f.key && styles.filterChipActive]}
              onPress={() => setDomaineFilter(f.key)}
            >
              <Text style={[styles.filterChipText, domaineFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {courses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Aucune course</Text>
          <Text style={styles.emptySub}>Ajoutez-en depuis l'onglet Saisie.</Text>
        </View>
      ) : filteredCourses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Aucune course dans cette catégorie.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {months.map((m) => {
            const isCollapsed = !expandedMonths.has(m.id);
            const closure = closureMap[m.yearMonth];
            const isLocked = !!closure;
            const closedAt = closure ? new Date(closure.closedAt) : null;

            return (
              <View key={m.id} style={styles.monthWrap}>
                {/* Header mois */}
                <TouchableOpacity
                  style={[styles.monthHeader, isLocked && styles.monthHeaderLocked]}
                  onPress={() => toggleMonth(m.id)}
                  activeOpacity={0.85}
                >
                  {/* Titre + date clôture */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: isLocked && closure && !isCollapsed ? 14 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isLocked && <Lock size={14} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />}
                      <Text style={styles.monthTitle}>{m.title}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isLocked && closedAt && (
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>
                          Clôturé le {closedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </Text>
                      )}
                      {isCollapsed
                        ? <ChevronDown size={18} color="rgba(255,255,255,0.7)" />
                        : <ChevronUp size={18} color="rgba(255,255,255,0.7)" />}
                    </View>
                  </View>

                  {/* Panel détaillé si verrouillé */}
                  {isLocked && closure && !isCollapsed ? (
                    <View style={{ gap: 10, marginTop: 4 }}>
                      {/* CA + bons */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <View>
                          <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 }}>{formatEuro(closure.ca)}</Text>
                          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 }}>{formatQte(closure.bons)} bons · {closure.courses} course{closure.courses > 1 ? 's' : ''}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: closure.net >= 0 ? '#6EE7A0' : '#FCA5A5' }}>{formatEuro(closure.net)}</Text>
                          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>Net</Text>
                        </View>
                      </View>

                      {/* Grille stats */}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { icon: <Fuel size={12} color="rgba(255,255,255,0.8)" />, label: 'Essence', val: `−${formatEuro(closure.essence)}` },
                          { icon: <Wrench size={12} color="rgba(255,255,255,0.8)" />, label: 'Moto', val: `−${formatEuro(closure.moto)}` },
                          { icon: <Clock size={12} color="rgba(255,255,255,0.8)" />, label: 'Travail', val: formatDuration(closure.heuresTravail ?? 0) },
                          { icon: <TrendingUp size={12} color="rgba(255,255,255,0.8)" />, label: 'Km', val: `${formatQte(closure.km ?? 0)} km` },
                        ].map((s) => (
                          <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, alignItems: 'center', gap: 3 }}>
                            {s.icon}
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{s.val}</Text>
                            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.2 }}>{s.label}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Taux horaire */}
                      {(closure.tauxHoraire ?? 0) > 0 && (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Taux horaire du mois</Text>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff' }}>{formatEuro(closure.tauxHoraire)}/h</Text>
                        </View>
                      )}
                    </View>
                  ) : isLocked && closure && isCollapsed ? (
                    <Text style={styles.monthSub}>{formatQte(closure.bons)} bons · Net {formatEuro(closure.net)}</Text>
                  ) : !isLocked ? (
                    // Mois ouvert : afficher bons / brut / essence / net
                    isCollapsed ? (
                      <Text style={styles.monthSub}>{formatQte(m.bons)} bon{m.bons > 1 ? 's' : ''} · {formatEuro(m.total)}{m.essence > 0 ? ` · Net ${formatEuro(m.total - m.essence)}` : ''}</Text>
                    ) : (
                      <View style={{ gap: 8, marginTop: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <View>
                            <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.8 }}>{formatEuro(m.total)}</Text>
                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2 }}>
                              {formatQte(m.bons)} bon{m.bons > 1 ? 's' : ''} · {filteredCourses.filter(c => toYearMonth(new Date(c.dateSaisie)) === m.yearMonth).length} course{filteredCourses.filter(c => toYearMonth(new Date(c.dateSaisie)) === m.yearMonth).length > 1 ? 's' : ''}
                            </Text>
                          </View>
                          {m.essence > 0 && (
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 20, fontWeight: '900', color: '#6EE7A0' }}>{formatEuro(m.total - m.essence)}</Text>
                              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>Net</Text>
                            </View>
                          )}
                        </View>
                        {m.essence > 0 && (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, alignItems: 'center', gap: 2 }}>
                              <Fuel size={12} color="rgba(255,255,255,0.8)" />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FCA5A5' }}>−{formatEuro(m.essence)}</Text>
                              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.2 }}>Essence</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, alignItems: 'center', gap: 2 }}>
                              <TrendingUp size={12} color="rgba(255,255,255,0.8)" />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{formatEuro(m.total)}</Text>
                              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.2 }}>Brut</Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, alignItems: 'center', gap: 2 }}>
                              <TrendingUp size={12} color="rgba(255,255,255,0.8)" />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: '#6EE7A0' }}>{formatEuro(m.total - m.essence)}</Text>
                              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.2 }}>Net</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )
                  ) : null}
                </TouchableOpacity>

                {!isCollapsed && (
                  <View style={styles.monthContent}>
                    {m.days.map((d) => {
                      const isDayCollapsed = collapsedDays.has(d.id);
                      return (
                        <View key={d.id} style={styles.dayWrap}>
                          <TouchableOpacity style={styles.dayHeader} onPress={() => toggleDay(d.id)}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.dayTitle}>{d.title}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                                <Text style={styles.daySub}>
                                  {d.courses.length} course{d.courses.length > 1 ? 's' : ''} · {formatQte(d.bons)} bon{d.bons > 1 ? 's' : ''} · {formatEuro(d.total)}
                                </Text>
                                {d.essence > 0 && (
                                  <View style={styles.essenceBadge}>
                                    <Fuel size={10} color={colors.red} />
                                    <Text style={[styles.essenceBadgeText, { color: colors.red }]}>−{formatEuro(d.essence)}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            {isDayCollapsed
                              ? <ChevronDown size={16} color={colors.textMuted} />
                              : <ChevronUp size={16} color={colors.textMuted} />}
                          </TouchableOpacity>

                          {!isDayCollapsed && (
                            <View style={styles.dayContent}>
                              {d.courses.map((c) => (
                                <Row
                                  key={c.id}
                                  course={c}
                                  locked={isLocked}
                                  onDelete={() => setConfirmDelete(c)}
                                  onUpdate={(domaine) => update(c.id, { domaine })}
                                  colors={colors}
                                />
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal supprimer */}
      <Modal transparent visible={confirmDelete !== null} animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Supprimer cette course ?</Text>
            <Text style={styles.modalBody}>{(confirmDelete?.lieuEnlevement || '—') + ' → ' + (confirmDelete?.lieuLivraison || '—')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmDelete(null)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDelete} onPress={async () => { if (confirmDelete) await remove(confirmDelete.id); setConfirmDelete(null); }}>
                <Text style={styles.modalDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal vider */}
      <Modal transparent visible={confirmClear} animationType="fade" onRequestClose={() => setConfirmClear(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Vider tout l'historique ?</Text>
            <Text style={styles.modalBody}>Les {courses.length} course{courses.length > 1 ? 's' : ''} seront supprimées définitivement.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmClear(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDelete} onPress={async () => { await clearAll(); setConfirmClear(false); }}>
                <Text style={styles.modalDeleteText}>Tout vider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ course, locked, onDelete, onUpdate, colors }: { course: Course; locked: boolean; onDelete: () => void; onUpdate: (d: 'medical' | 'courseCourse') => void; colors: any }) {
  const isMedical = getEffectiveDomaine(course) === 'medical';
  const accent = isMedical ? (colors.amber ?? '#D97706') : colors.green;
  const accentSoft = isMedical ? (colors.amberSoft ?? '#FEF3C7') : colors.greenSoft;
  const initials = (course.lieuEnlevement || '?').slice(0, 2).toUpperCase();
  const d = new Date(course.dateSaisie);

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    return (
      <TouchableOpacity 
        style={{ backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center', width: 72, borderTopRightRadius: 18, borderBottomRightRadius: 18 }}
        onPress={onDelete}
      >
        <Trash2 size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} rightThreshold={40} containerStyle={{ backgroundColor: colors.red, borderRadius: 18, marginBottom: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 18,
          borderLeftWidth: 3,
          borderLeftColor: accent,
          overflow: 'hidden',
          ...shadow as any,
        }}
      >
        {/* Zone principale — tap pour changer domaine */}
        <TouchableOpacity
          activeOpacity={locked ? 1 : 0.85}
          onPress={() => !locked && onUpdate(isMedical ? 'courseCourse' : 'medical')}
          disabled={locked}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 4 }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: accent }}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
              {course.lieuEnlevement || '—'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1, fontWeight: '500' }} numberOfLines={1}>
              → {course.lieuLivraison || '—'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: accentSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: accent, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {isMedical ? 'Médical' : 'À course'}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textFaint, fontWeight: '500' }}>
                {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {formatQte(course.qteBon)} bon{course.qteBon > 1 ? 's' : ''}
              </Text>
              {course.optimise && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.amberSoft ?? '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                  <AlertTriangle size={9} color={colors.amber ?? '#D97706'} />
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.amber ?? '#D97706', textTransform: 'uppercase', letterSpacing: 0.3 }}>{getOptimisationLabel(course)}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Zone droite — montant + bouton suppression */}
        <View style={{ alignItems: 'flex-end', gap: 6, paddingRight: 14, paddingLeft: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: accent }}>{formatEuro(course.montantAchat)}</Text>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 5, borderRadius: 8, backgroundColor: colors.redSoft ?? '#FEE2E2' }}
          >
            <Trash2 size={13} color={colors.red} />
          </TouchableOpacity>
          {locked && <Lock size={10} color={colors.textFaint} />}
        </View>
      </View>
    </Swipeable>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 18, paddingTop: 16 },

    header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
    clearBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.redSoft ?? '#FEE2E2',
    },

    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: { backgroundColor: colors.green, borderColor: colors.green },
    filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    filterChipTextActive: { color: '#fff', fontWeight: '700' },

    emptyWrap: { alignItems: 'center', gap: 10, marginTop: 64 },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    emptySub: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },

    monthWrap: { marginBottom: 22 },
    monthHeader: {
      backgroundColor: colors.heroBg ?? '#0F4D2C',
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 18,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    monthHeaderLocked: {
      backgroundColor: '#1A3828',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    monthTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
    monthSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '500' },

    monthContent: { gap: 10 },
    dayWrap: { marginBottom: 4 },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    dayTitle: { fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
    daySub: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    essenceBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: colors.redSoft ?? '#FEE2E2',
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
    },
    essenceBadgeText: { fontSize: 11, fontWeight: '700' },
    dayContent: { gap: 8 },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 22,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: 24,
      width: '100%',
      maxWidth: 360,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    modalBody: { fontSize: 14, color: colors.textMuted, marginTop: 10, lineHeight: 22 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
    modalCancel: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.border,
    },
    modalCancelText: { color: colors.text, fontWeight: '700' },
    modalDelete: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.red,
    },
    modalDeleteText: { color: '#fff', fontWeight: '700' },
  });
}
