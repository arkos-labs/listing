import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const SUPER_ADMIN = 'cherkinicolas@gmail.com';

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

// ─── VUE ADMIN (cherkinicolas@gmail.com) ────────────────────────────────────
function AdminView({ colors, isDark }: { colors: any; isDark: boolean }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchConversations();
    const channel = supabase
      .channel('admin_support_all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => {
        fetchConversations();
        if (selected) fetchMessages(selected.user_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  const fetchConversations = async () => {
    const { data: msgs } = await supabase
      .rpc('get_all_support_messages');

    if (!msgs) { setLoading(false); return; }

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

    const userIds = Array.from(map.keys());
    if (userIds.length === 0) { setLoading(false); return; }

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
      };
    });

    convs.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
    setConversations(convs);
    setLoading(false);
  };

  const fetchMessages = async (userId: string) => {
    const { data: all } = await supabase.rpc('get_all_support_messages');
    const filtered = (all ?? [])
      .filter((m: Message) => m.user_id === userId)
      .sort((a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setMessages(filtered);
    await supabase
      .from('support_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .is('read_at', null);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const send = async () => {
    if (!text.trim() || !selected) return;
    const content = text.trim();
    setText('');
    // Ajout optimiste
    const tempMsg: Message = {
      id: Date.now().toString(),
      user_id: selected.user_id,
      content,
      sender: 'admin',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    await supabase.rpc('admin_send_message', {
      p_user_id: selected.user_id,
      p_content: content,
    });
  };

  const s = styles(colors, isDark);

  // Vue conversation ouverte
  if (selected) {
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => { setSelected(null); fetchConversations(); }} style={s.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={[s.convAvatar, { backgroundColor: '#134024' }]}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
              {selected.prenom[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{selected.prenom}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }}>{selected.email}</Text>
          </View>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const isAdmin = item.sender === 'admin';
            return (
              <View style={[s.bubble, isAdmin ? s.bubbleMe : s.bubbleOther]}>
                <Text style={[s.bubbleText, { color: isAdmin ? '#fff' : colors.text }]}>{item.content}</Text>
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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}>
          {conversations.map(conv => (
            <TouchableOpacity
              key={conv.user_id}
              style={s.convCard}
              onPress={() => { setSelected(conv); fetchMessages(conv.user_id); }}
            >
              <View style={[s.convAvatar, { backgroundColor: '#134024' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                  {conv.prenom[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.convName}>{conv.prenom}</Text>
                <Text style={{ fontSize: 11, color: colors.textFaint, fontWeight: '500' }}>{conv.email}</Text>
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

// ─── VUE CHAUFFEUR ───────────────────────────────────────────────────────────
function DriverView({ colors, isDark }: { colors: any; isDark: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel('support_driver_' + user?.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: `user_id=eq.${user?.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setLoading(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    // Ajout optimiste immédiat
    const tempMsg: Message = {
      id: Date.now().toString(),
      user_id: user?.id ?? '',
      content,
      sender: 'user',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    setSending(true);
    await supabase.from('support_messages').insert({
      user_id: user?.id,
      content,
      sender: 'user',
    });
    setSending(false);
  };

  const s = styles(colors, isDark);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Support</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }}>Réponse rapide garantie</Text>
        </View>
        <View style={s.avatar}>
          <Text style={{ fontSize: 18 }}>👤</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>👋</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, fontWeight: '500' }}>
                Posez votre question.{'\n'}L'administrateur vous répondra rapidement.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender === 'user';
            return (
              <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                <Text style={[s.bubbleText, { color: isMe ? '#fff' : colors.text }]}>{item.content}</Text>
                <Text style={{ fontSize: 10, marginTop: 4, color: isMe ? 'rgba(255,255,255,0.6)' : colors.textFaint, textAlign: 'right' }}>
                  {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Votre message…"
          placeholderTextColor={colors.textFaint}
          multiline
        />
        <TouchableOpacity style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]} onPress={send} disabled={!text.trim() || sending}>
          <Send size={18} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
export default function SupportScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  if (userEmail === null) return <ActivityIndicator color={colors.green} style={{ flex: 1, marginTop: 100 }} />;

  if (userEmail === SUPER_ADMIN) return <AdminView colors={colors} isDark={isDark} />;
  return <DriverView colors={colors} isDark={isDark} />;
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? colors.bg : '#F0F4F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },

  convCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  convAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  convName: { fontSize: 15, fontWeight: '700', color: colors.text },
  convLast: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  convTime: { fontSize: 11, color: colors.textFaint },
  badge: { backgroundColor: '#134024', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  list: { padding: 16, gap: 8, paddingBottom: 24 },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12, paddingHorizontal: 14, marginVertical: 2 },
  bubbleMe: { backgroundColor: '#1A6137', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },

  empty: { alignItems: 'center', marginTop: 80, gap: 4 },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 110 : 96,
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, backgroundColor: isDark ? colors.bgSubtle : '#F3F4F6',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontWeight: '500', color: colors.text, maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A6137', alignItems: 'center', justifyContent: 'center' },
});
