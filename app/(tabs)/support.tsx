import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Send, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'admin';
  created_at: string;
};

export default function SupportScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();

    // Écoute temps réel
    const channel = supabase
      .channel('support_' + user?.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
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
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Support</Text>
          <Text style={s.headerSub}>L'administrateur vous répondra rapidement</Text>
        </View>
        <View style={s.avatar}>
          <Text style={{ fontSize: 18 }}>👤</Text>
        </View>
      </View>

      {/* Messages */}
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
              <Text style={s.emptyTitle}>👋 Bonjour !</Text>
              <Text style={s.emptyText}>
                Envoyez un message à l'administrateur.{'\n'}Il vous répondra dès que possible.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender === 'user';
            return (
              <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleAdmin]}>
                <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextAdmin]}>
                  {item.content}
                </Text>
                <Text style={[s.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.textFaint }]}>
                  {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Votre message…"
          placeholderTextColor={colors.textFaint}
          multiline
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[s.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          <Send size={18} color="#fff" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  headerSub: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center',
  },

  list: { padding: 16, gap: 8, paddingBottom: 24 },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 28, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  bubble: {
    maxWidth: '80%', borderRadius: 18, padding: 12, paddingHorizontal: 14, marginVertical: 2,
  },
  bubbleMe: { backgroundColor: '#1A6137', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleAdmin: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextAdmin: { color: colors.text },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },

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
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A6137', alignItems: 'center', justifyContent: 'center',
  },
});
