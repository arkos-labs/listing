/**
 * ListingNotificationBell.tsx
 *
 * Cloche de notification flottante en haut à droite, visible sur tout
 * l'écran. Un badge indique combien d'imports de listing n'ont pas encore
 * été vus par l'utilisateur courant. Contrairement à un toast, elle ne
 * disparaît jamais toute seule : elle reste tant que le chauffeur n'a pas
 * ouvert la liste (ce qui marque tout comme vu), même au-delà de 24h.
 *
 * Usage : placer <ListingNotificationBell /> dans _layout.tsx.
 */

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, Package, X } from 'lucide-react-native';
import { useListingNotifications, type ListingNotification } from '@/context/ListingNotificationsContext';
import { useTheme } from '@/context/ThemeContext';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffJ = Math.floor(diffH / 24);
  return `il y a ${diffJ}j`;
}

export function ListingNotificationBell() {
  const { unseenNotifications, totalUnseenCourseCount, markAllSeen } = useListingNotifications();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  // Capture au moment de l'ouverture : markAllSeen() vide unseenNotifications
  // presque aussitôt (mise à jour optimiste), le panneau doit continuer à
  // afficher ce qui vient d'être marqué vu plutôt que de se vider sous les yeux.
  const [shown, setShown] = useState<{ notifications: ListingNotification[]; total: number }>({ notifications: [], total: 0 });

  const hasUnseen = unseenNotifications.length > 0;

  const handleOpen = () => {
    setShown({ notifications: unseenNotifications, total: totalUnseenCourseCount });
    setOpen(true);
    // Ouvrir la liste = avoir vu les notifications : elles ne réapparaissent
    // plus après fermeture, mais restent affichées ci-dessous pendant que
    // le panneau est ouvert (voir `shown`).
    if (hasUnseen) markAllSeen();
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.bellBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleOpen}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Bell size={18} color={colors.text} />
        {hasUnseen && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unseenNotifications.length > 9 ? '9+' : unseenNotifications.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>Notifications</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color={colors.textFaint} />
              </TouchableOpacity>
            </View>

            {shown.notifications.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune notification récente.</Text>
            ) : (
              <>
                <Text style={[styles.summary, { color: colors.textMuted }]}>
                  {shown.total} course{shown.total > 1 ? 's' : ''} ajoutée{shown.total > 1 ? 's' : ''} à la base au total
                </Text>
                {shown.notifications.map((n, i) => (
                  <View
                    key={n.id}
                    style={[styles.row, i < shown.notifications.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: '#16a34a22' }]}>
                      <Package size={16} color="#16a34a" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.text }]}>
                        {n.courseCount} course{n.courseCount > 1 ? 's' : ''} ajoutée{n.courseCount > 1 ? 's' : ''}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors.textFaint }]}>{timeAgo(n.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 9998,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'flex-end',
  },
  panel: {
    marginTop: 58,
    marginRight: 16,
    width: 300,
    maxWidth: '90%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 13, paddingVertical: 8 },
  summary: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 13, fontWeight: '700' },
  rowSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
});
