import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

type Message = {
  id: string;
  user_id: string;
  content: string;
  sender: 'user' | 'admin';
  created_at: string;
};

type Conversation = {
  user_id: string;
  prenom: string;
  email: string;
  last_message: string;
  last_at: string;
  unread: number;
};

export default function AdminSupportScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedPrenom, setSelectedPrenom] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchConversations();
    const channel = supabase
      .channel('admin_support')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => {
        fetchConversations();
        if (selectedUser) fetchMessages(selectedUser);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUser]);

  const fetchConversations = async () => {
    const { data: msgs } = await supabase
      .from('support_messages')
      .select('user_id, content, sender, created_at, read_at')
      .order('created_at', { ascending: false });

    if (!msgs) { setLoading(false); return; }

    // Grouper par user_id
    const map = new Map<string, { last_message: string; last_at: string; unread: number }>();
    for (const m of msgs) {
      if (!map.has(m.user_id)) {
        map.set(m.user_id, {
          last_message: m.content,
          last_at: m.created_at,
          unread: m.sender === 'user' && !m.read_at ? 1 : 0,
        });
      } else if (m.sender === 'user' && !m.read_at) {
        map.get(m.user_id)!.unread++;
      }
    }

    // Récupérer les prénoms
    const userIds = Array.from(map.keys());
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, prenom, email')
      .in('id', userIds);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    const convs: Conversation[] = userIds.map(uid => {
      const p = profileMap.get(uid);
      return {
      user_id: uid,
      prenom: p?.prenom || 'Utilisateur',
      email: p?.email || '',
      ...map.get(uid)!,
    };});

    convs.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
    setConversations(convs);
    setLoading(false);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    // Marquer comme lu
    await supabase
      .from('support_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .is('read_at', null);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const openConversation = (conv: Conversation) => {
    setSelectedUser(conv.user_id);
    setSelectedPrenom(conv.prenom);
    fetchMessages(conv.user_id);
  };

  const send = async () => {
    if (!text.trim() || !selectedUser) return;
    const content = text.trim();
    setText('');
    await supabase.from('support_messages').insert({
      user_id: selectedUser,
      content,
      sender: 'admin',
    });
    fetchMessages(selectedUser);
  };

  const s = styles(colors, isDark);

  // Vue conversation
  if (selectedUser) {
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => { setSelectedUser(null); fetchConversations(); }} style={s.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={s.headerAvatar}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
              {selectedPrenom[0]?.toUpperCase()}
            </Text>
          </View>
          <Text style={s.headerTitle}>{selectedPrenom}</Text>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const isAdmin = item.sender === 'admin';
            return (
              <View style={[s.bubble, isAdmin ? s.bubbleMe : s.bubbleUser]}>
                <Text style={[s.bubbleText, isAdmin ? s.bubbleTextMe : s.bubbleTextUser]}>
                  {item.content}
                </Text>
                <Text style={{ fontSize: 10, marginTop: 4, color: isAdmin ? 'rgba(255,255,255,0.6)' : colors.textFaint, textAlign: 'right' }}>
                  {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />

        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Répondre…"
            placeholderTextColor={colors.textFaint}
            multiline
          />
          <TouchableOpacity style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]} onPress={send} disabled={!text.trim()}>
            <Send size={18} color="#fff" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Liste des conversations
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Messages des chauffeurs</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#134024" style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={s.empty}>
          <MessageSquare size={40} color={colors.textFaint} strokeWidth={1.5} />
          <Text style={s.emptyText}>Aucun message pour le moment</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {conversations.map(conv => (
            <TouchableOpacity key={conv.user_id} style={s.convCard} onPress={() => openConversation(conv)}>
              <View style={[s.convAvatar, { backgroundColor: '#134024' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                  {conv.prenom[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.convName}>{conv.prenom}</Text>
                <Text style={{ fontSize: 11, color: colors.textFaint, fontWeight: '500' }} numberOfLines={1}>{conv.email}</Text>
                <Text style={s.convLast} numberOfLines={1}>{conv.last_message}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={s.convTime}>
                  {new Date(conv.last_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {conv.unread > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{conv.unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? colors.bg : '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#134024', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 },

  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 16, padding: 14,
  },
  convAvatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  convName: { fontSize: 15, fontWeight: '700', color: colors.text },
  convLast: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  convTime: { fontSize: 11, color: colors.textFaint },
  badge: {
    backgroundColor: '#134024', borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  list: { padding: 16, gap: 8, paddingBottom: 24 },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12, paddingHorizontal: 14, marginVertical: 2 },
  bubbleMe: { backgroundColor: '#134024', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleUser: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextUser: { color: colors.text },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontWeight: '500', color: colors.text, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#134024', alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', marginTop: 80, gap: 16 },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
});
