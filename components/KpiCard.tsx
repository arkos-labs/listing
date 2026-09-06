import { StyleSheet, Text, View } from 'react-native';
import { formatEuro } from '@/lib/kpi';

interface Props {
  label: string;
  value: string | number;
  isCurrency?: boolean;
  accent?: string;
  subtitle?: string;
}

export function KpiCard({ label, value, isCurrency, accent = '#0f172a', subtitle }: Props) {
  const display = isCurrency ? formatEuro(Number(value)) : String(value);
  return (
    <View style={styles.card}>
      <View style={styles.dotWrap}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {display}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minHeight: 118,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dotWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  subtitle: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
});
