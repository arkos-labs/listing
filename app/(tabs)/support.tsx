import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { Send, ArrowLeft, MessageSquare, Trash2 } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useReference } from '@/context/ReferenceContext';
import { supabase } from '@/lib/supabase';
import { invalidateCache, formatImportResult } from '@/lib/supabaseSync';
import * as DocumentPicker from 'expo-document-picker';
import { parseExcelFile } from '@/lib/excelImport';
import { parsePdfFile } from '@/lib/pdfImport';
import { matchByPickupAndDelivery, resolveVehicule } from '@/lib/reference';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FareRoute = { enl: string; liv: string; veh: string };
type FareData = { ids: string[]; qte: number; montant: number; routes?: FareRoute[] };

/** Message technique de signalement de tarif (visible uniquement par l'admin). */
const isFareSignal = (m: { content: string }) => m.content.includes('|||FARE_DATA:');
/** Message technique "course hors base" (visible uniquement par l'admin). */
const isNewRouteSignal = (m: { content: string }) => m.content.includes('|||NEW_ROUTE:');
/** Message technique import de listing */
const isImportSignal = (m: { content: string }) => m.content.includes('|||IMPORT_LISTING:');
/** Tout signal technique caché au chauffeur. */
const isHiddenSignal = (m: { content: string }) => isFareSignal(m) || isNewRouteSignal(m) || isImportSignal(m);

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

// ─── BOUTON CORRECTION TARIF ─────────────────────────────────────────────────
function FareCorrectButton({
  fareData,
  userId,
  onDone,
  colors,
}: {
  fareData: FareData;
  userId: string;
  onDone: () => void;
  colors: any;
}) {
  const { referenceCourses, refresh: refreshReference } = useReference();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ courses: number; reference: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lignes de référence qui alimentent le chip "Type de course" pour ce trajet.
  // On réutilise exactement le matching de la saisie (flou + véhicule canonique, 2 sens)
  // pour que le prix affiché change réellement après correction.
  // Règle stricte : on ne modifie QUE le type de course concerné. Si le chauffeur
  // n'a pas choisi de type et que le trajet en a plusieurs, on ne touche pas à la référence.
  const { referenceIds, referenceSkipReason } = (() => {
    const ids = new Set<string>();
    let skipReason: string | null = null;
    for (const r of fareData.routes ?? []) {
      let veh = r.veh?.trim() || '';
      if (!veh) {
        const resolved = resolveVehicule(referenceCourses, r.enl, r.liv)
          ?? resolveVehicule(referenceCourses, r.liv, r.enl);
        if (!resolved || resolved.ambiguous) {
          skipReason = 'type de course non précisé par le chauffeur';
          continue;
        }
        veh = resolved.vehicule;
      }
      let rows = matchByPickupAndDelivery(referenceCourses, r.enl, r.liv, veh);
      if (rows.length === 0) rows = matchByPickupAndDelivery(referenceCourses, r.liv, r.enl, veh);
      for (const row of rows) ids.add(row.id);
    }
    return { referenceIds: Array.from(ids), referenceSkipReason: skipReason };
  })();

  const applyCorrection = async () => {
    setLoading(true);
    setErrorMsg(null);

    // RPC security definer (voir supabase/admin_correct_fare.sql) : met à jour
    // les courses signalées + la référence, et renvoie le nombre de lignes touchées.
    const { data, error } = await supabase.rpc('admin_correct_fare', {
      course_ids: fareData.ids,
      new_qte_bon: fareData.qte,
      new_montant_achat: fareData.montant,
      reference_ids: referenceIds,
    });
    setLoading(false);
    setConfirm(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    const coursesUpdated = Number(data?.courses_updated ?? -1);
    const referenceUpdated = Number(data?.reference_updated ?? 0);
    if (coursesUpdated < 0) {
      setErrorMsg("Ancienne version de la fonction SQL — exécuter supabase/admin_correct_fare.sql");
      return;
    }
    if (coursesUpdated === 0) {
      setErrorMsg('Aucune course modifiée (courses introuvables ou déjà supprimées)');
      return;
    }

    setDone({ courses: coursesUpdated, reference: referenceUpdated });
    // Vider le cache local de la référence pour que la saisie affiche le nouveau prix
    await invalidateCache();
    refreshReference();
    await supabase.from('support_messages').insert({
      user_id: userId,
      content: `✅ Tarif corrigé : ${fareData.qte} bons · ${fareData.montant.toFixed(2)}€ (${coursesUpdated} course${coursesUpdated > 1 ? 's' : ''} modifiée${coursesUpdated > 1 ? 's' : ''}${referenceUpdated > 0 ? `, référence mise à jour` : ''}).`,
      sender: 'admin',
    });
    onDone();
  };

  if (done) {
    return (
      <View style={{ marginTop: 10, backgroundColor: '#d1fae5', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' }}>
        <Text style={{ color: '#134024', fontWeight: '700', fontSize: 13 }}>
          ✅ {done.courses} course{done.courses > 1 ? 's' : ''} · {done.reference} référence{done.reference > 1 ? 's' : ''} modifiée{done.reference > 1 ? 's' : ''}
        </Text>
        {done.reference === 0 && referenceSkipReason && (
          <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' }}>
            Référence non modifiée : {referenceSkipReason}
          </Text>
        )}
      </View>
    );
  }

  if (confirm) {
    return (
      <View style={{ marginTop: 10, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, gap: 10 }}>
        <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
          Corriger à {fareData.qte} bons ({fareData.montant.toFixed(2)}€) ?
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: '#e5e7eb', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
            onPress={() => setConfirm(false)}
            disabled={loading}
          >
            <Text style={{ color: '#374151', fontWeight: '700', fontSize: 13 }}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: '#1A6137', borderRadius: 8, paddingVertical: 8, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
            onPress={applyCorrection}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Confirmer</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 10, gap: 6 }}>
      {errorMsg && (
        <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
          ❌ Erreur : {errorMsg}
        </Text>
      )}
      <TouchableOpacity
        style={{ backgroundColor: '#1A6137', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' }}
        onPress={() => setConfirm(true)}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
          ✏️ Corriger à {fareData.qte} bons ({fareData.montant.toFixed(2)}€)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── BOUTON AJOUT NOUVELLE COURSE ──────────────────────────────────────────────
function NewRouteAddButton({
  routeData,
  userId,
  onDone,
}: {
  routeData: { ids: string[]; routes: { enl: string; liv: string; veh: string; qteBon: number; montant: number }[] };
  userId: string;
  onDone: () => void;
}) {
  const { importFiles } = useReference();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applyAdd = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const inputs = routeData.routes.map(r => ({
        lieuEnlevement: r.enl,
        lieuLivraison: r.liv,
        vehicule: r.veh || undefined,
        qteBon: r.qteBon,
      }));
      const res = await importFiles(inputs);
      if (res.errors > 0 && res.inserted === 0) {
        setErrorMsg(res.errorMessage || 'Erreur lors de l\'ajout');
        setLoading(false);
        return;
      }
      setDone(true);
      await supabase.from('support_messages').insert({
        user_id: userId,
        content: `✅ Nouvelle course ajoutée à la base de référence (${res.inserted} insérée${res.inserted > 1 ? 's' : ''}, ${res.duplicates + res.alreadyInDb} existante${res.duplicates + res.alreadyInDb > 1 ? 's' : ''}).`,
        sender: 'admin',
      });
      onDone();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
    setLoading(false);
  };

  if (done) {
    return (
      <View style={{ marginTop: 10, backgroundColor: '#dbeafe', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' }}>
        <Text style={{ color: '#1e40af', fontWeight: '700', fontSize: 13 }}>
          ✅ Ajouté à la base de référence
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 10, gap: 6 }}>
      {errorMsg && (
        <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
          ❌ Erreur : {errorMsg}
        </Text>
      )}
      <TouchableOpacity
        style={{ backgroundColor: '#1d4ed8', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
        onPress={applyAdd}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
            ➕ Ajouter à la base
          </Text>
        }
      </TouchableOpacity>
    </View>
  );
}

function ImportListingButton({ colors }: { colors: any }) {
  const { importFiles } = useReference();
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const doImport = async () => {
    setImporting(true);
    setMsg(null);
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
      if (res.canceled || !res.assets || res.assets.length === 0) return;

      let allInputs: Awaited<ReturnType<typeof parseExcelFile>> = [];
      for (const asset of res.assets) {
        try {
          const isPdf = asset.name?.toLowerCase().endsWith('.pdf') || asset.mimeType === 'application/pdf';
          const rows = isPdf ? await parsePdfFile(asset.uri) : await parseExcelFile(asset.uri);
          allInputs = allInputs.concat(rows);
        } catch (fileErr) {}
      }

      if (allInputs.length === 0) {
        setMsg('Aucune ligne exploitable trouvée');
        return;
      }

      const filesToUpload = res.assets.map(a => ({ name: a.name ?? 'fichier inconnu', uri: a.uri }));
      const result = await importFiles(allInputs, filesToUpload);
      setMsg(formatImportResult(result));
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const m = `📥 Import de listing (via Support) par ${user.email}\n\nLignes ajoutées : ${result.inserted}\nLignes existantes ignorées : ${result.duplicates + result.alreadyInDb}\nErreurs : ${result.errors}\n\n|||IMPORT_LISTING:true|||`;
          await supabase.from('support_messages').insert([
            { user_id: user.id, content: m, sender: 'user' },
            { user_id: user.id, content: '✅ Merci pour votre import ! Vos tarifs seront mis à jour très prochainement dans la base de référence.', sender: 'admin' }
          ]);
        }
      } catch (e) {}
    } catch (e: any) {
      setMsg(`Erreur : ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={{ marginTop: 8 }}>
      <TouchableOpacity
        style={{ backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', opacity: importing ? 0.6 : 1 }}
        onPress={doImport}
        disabled={importing}
      >
        {importing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Importer mes listings</Text>}
      </TouchableOpacity>
      {msg && <Text style={{ fontSize: 11, color: '#fff', marginTop: 6 }}>{msg}</Text>}
    </View>
  );
}

// ─── VUE ADMIN (cherkinicolas@gmail.com) ────────────────────────────────────
function AdminView({ colors, isDark }: { colors: any; isDark: boolean }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchConversations();
    const channel = supabase
      .channel('admin_support_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        // Mettre à jour la liste des conversations
        fetchConversations();
        // Si la conversation ouverte correspond, ajouter le message instantanément
        if (selected && newMsg.user_id === selected.user_id) {
          setMessages(prev => {
            // Éviter les doublons (optimiste déjà ajouté)
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  const fetchConversations = async () => {
    try {
      // Tous les utilisateurs inscrits (bypass RLS via fonction)
      const { data: profiles } = await supabase
        .rpc('get_all_profiles');

      // Tous les messages
      const { data: msgs } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });

      const msgMap = new Map<string, { last_message: string; last_at: string; unread: number }>();
      for (const m of (msgs ?? [])) {
        if (!msgMap.has(m.user_id)) {
          msgMap.set(m.user_id, {
            last_message: m.content,
            last_at: m.created_at,
            unread: m.sender === 'user' && !m.read_at ? 1 : 0,
          });
        } else if (m.sender === 'user' && !m.read_at) {
          msgMap.get(m.user_id)!.unread++;
        }
      }

      const convs: Conversation[] = ((profiles ?? []) as { id: string; prenom: string | null; email: string | null }[]).map(p => ({
        user_id: p.id,
        prenom: p.prenom || 'Utilisateur',
        email: p.email || '',
        last_message: msgMap.get(p.id)?.last_message ?? '',
        last_at: msgMap.get(p.id)?.last_at ?? '',
        unread: msgMap.get(p.id)?.unread ?? 0,
      }));

      // Ajouter les utilisateurs qui ont envoyé des messages mais qui ne sont pas dans profiles (ex: admin)
      const profileIds = new Set(convs.map(c => c.user_id));
      for (const [userId, meta] of msgMap.entries()) {
        if (!profileIds.has(userId)) {
          convs.push({
            user_id: userId,
            prenom: 'Moi (Admin)',
            email: '',
            last_message: meta.last_message,
            last_at: meta.last_at,
            unread: meta.unread,
          });
        }
      }

      // Trier : non lus en premier → avec messages (par date récente) → sans message
      convs.sort((a, b) => {
        const aHasMsg = !!a.last_at;
        const bHasMsg = !!b.last_at;
        if (b.unread !== a.unread) return b.unread - a.unread;
        if (aHasMsg && bHasMsg) return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
        if (aHasMsg) return -1;
        if (bHasMsg) return 1;
        return a.prenom.localeCompare(b.prenom);
      });

      setConversations(convs);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    await supabase
      .from('support_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .is('read_at', null);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const send = async () => {
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    await supabase.from('support_messages').insert({
      user_id: selected.user_id,
      content,
      sender: 'admin',
    });
    setSending(false);
  };

  const askForListing = async () => {
    if (!selected || sending) return;
    setSending(true);
    await supabase.from('support_messages').insert({
      user_id: selected.user_id,
      content: `Veuillez importer vos derniers listings Excel ou PDF (via le bouton ci-dessous) pour que l'application puisse mieux calculer vos courses.\n|||ASK_IMPORT|||`,
      sender: 'admin',
    });
    setSending(false);
  };

  const askAllForListing = async () => {
    if (broadcasting) return;
    setBroadcasting(true);
    
    // Pour ne pas envoyer au SUPER_ADMIN lui-même
    const usersToNotify = conversations.filter(c => c.email !== SUPER_ADMIN);
    
    if (usersToNotify.length === 0) {
      setBroadcasting(false);
      return;
    }

    const messagesToInsert = usersToNotify.map(c => ({
      user_id: c.user_id,
      content: `Veuillez importer vos derniers listings Excel ou PDF (via le bouton ci-dessous) pour que l'application puisse mieux calculer vos courses.\n|||ASK_IMPORT|||`,
      sender: 'admin'
    }));

    await supabase.from('support_messages').insert(messagesToInsert);
    await fetchConversations();
    setBroadcasting(false);
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
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isAdminMsg = item.sender === 'admin';

            // Détection message de signalement tarif (format |||FARE_DATA:{...}|||)
            const fareMatch = item.content.match(/\|\|\|FARE_DATA:(.+?)\|\|\|/s);
            let fareData: FareData | null = null;
            try { if (fareMatch) fareData = JSON.parse(fareMatch[1]); } catch {}
            const isFareIssue = !!fareData && (fareData.ids?.length ?? 0) > 0;
            
            // Détection message course hors base (format |||NEW_ROUTE:{...}|||)
            const newRouteMatch = item.content.match(/\|\|\|NEW_ROUTE:(.+?)\|\|\|/s);
            let newRouteData: any = null;
            try { if (newRouteMatch) newRouteData = JSON.parse(newRouteMatch[1]); } catch {}
            const isNewRouteIssue = !!newRouteData && (newRouteData.routes?.length ?? 0) > 0;

            const isAskImport = item.content.includes('|||ASK_IMPORT|||');

            // Texte visible (sans les blocs de données techniques)
            const visibleContent = item.content
              .replace(/\s*\|\|\|FARE_DATA:.+?\|\|\|/s, '')
              .replace(/\s*\|\|\|NEW_ROUTE:.+?\|\|\|/s, '')
              .replace(/\s*\|\|\|IMPORT_LISTING:.+?\|\|\|/s, '')
              .replace('|||ASK_IMPORT|||', '')
              .trim();

            return (
              <View style={[s.bubble, isAdminMsg ? s.bubbleMe : s.bubbleOther]}>
                <Text style={[s.bubbleText, { color: isAdminMsg ? '#fff' : colors.text }]}>{visibleContent}</Text>
                <Text style={{ fontSize: 10, marginTop: 4, color: isAdminMsg ? 'rgba(255,255,255,0.6)' : colors.textFaint, textAlign: 'right' }}>
                  {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isAskImport && (
                  <ImportListingButton colors={colors} />
                )}
                {isFareIssue && fareData && (
                  <FareCorrectButton
                    fareData={fareData}
                    userId={item.user_id}
                    onDone={() => fetchMessages(item.user_id)}
                    colors={colors}
                  />
                )}
                {isNewRouteIssue && newRouteData && (
                  <NewRouteAddButton
                    routeData={newRouteData}
                    userId={item.user_id}
                    onDone={() => fetchMessages(item.user_id)}
                  />
                )}
              </View>
            );
          }}
        />

        <View style={{ backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 8 }}>
           <TouchableOpacity 
             onPress={askForListing} 
             style={{ backgroundColor: '#134024', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, opacity: sending ? 0.5 : 1, alignSelf: 'flex-start' }} 
             disabled={sending}
           >
             <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>📄 Demander les listings</Text>
           </TouchableOpacity>
        </View>

        <View style={[s.inputBar, { borderTopWidth: 0, paddingTop: 8 }]}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Répondre…"
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

  // Liste des conversations
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Messages des chauffeurs</Text>
      </View>

      {conversations.filter(c => c.email !== SUPER_ADMIN).length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <TouchableOpacity 
            style={{ backgroundColor: '#134024', borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: broadcasting ? 0.6 : 1 }}
            onPress={askAllForListing}
            disabled={broadcasting}
          >
            {broadcasting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>📄 Demander les listings à TOUS les chauffeurs</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#134024" style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={s.empty}>
          <MessageSquare size={40} color={colors.textFaint} strokeWidth={1.5} />
          <Text style={s.emptyText}>Aucun message pour le moment</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Conversations actives */}
          {conversations.filter(c => c.last_at).length > 0 && (
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textFaint, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, letterSpacing: 0.5 }}>
              CONVERSATIONS
            </Text>
          )}
          {conversations.filter(c => c.last_at).map(conv => (
            <TouchableOpacity
              key={conv.user_id}
              style={[s.convCard, conv.unread > 0 && { borderLeftWidth: 3, borderLeftColor: '#1A6137' }]}
              onPress={() => { setSelected(conv); fetchMessages(conv.user_id); }}
            >
              <View style={[s.convAvatar, { backgroundColor: conv.unread > 0 ? '#1A6137' : '#4b5563' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                  {conv.prenom[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[s.convName, conv.unread > 0 && { color: '#1A6137' }]}>{conv.prenom}</Text>
                  <Text style={s.convTime}>
                    {new Date(conv.last_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <Text style={[s.convLast, conv.unread > 0 && { fontWeight: '700', color: colors.text }]} numberOfLines={1}>
                    {conv.last_message}
                  </Text>
                  {conv.unread > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{conv.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Utilisateurs sans message */}
          {conversations.filter(c => !c.last_at).length > 0 && (
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textFaint, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6, letterSpacing: 0.5 }}>
              TOUS LES CHAUFFEURS
            </Text>
          )}
          {conversations.filter(c => !c.last_at).map(conv => (
            <TouchableOpacity
              key={conv.user_id}
              style={s.convCard}
              onPress={() => { setSelected(conv); fetchMessages(conv.user_id); }}
            >
              <View style={[s.convAvatar, { backgroundColor: '#9ca3af' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                  {conv.prenom[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.convName}>{conv.prenom}</Text>
                <Text style={{ fontSize: 12, color: colors.textFaint, fontStyle: 'italic', marginTop: 2 }}>Aucun message — Envoyer le premier</Text>
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
    if (!user?.id) return;
    fetchMessages();
    const channel = supabase
      .channel('support_driver_' + user?.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `user_id=eq.${user?.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        // Les signalements de tarif sont destinés à l'admin uniquement :
        // le chauffeur ne voit que la confirmation "✅ Tarif corrigé"
        if (isHiddenSignal(newMsg)) return;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    if (user?.id) fetchMessages();
  }, [user?.id]));

  const fetchMessages = async () => {
    try {
      if (!user?.id) return;
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      setMessages((data ?? []).filter(m => !isHiddenSignal(m)));
      // Marquer les messages admin comme lus
      await supabase
        .from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('sender', 'admin')
        .is('read_at', null);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Mise à jour de la mémoire locale à CHAQUE fois qu'un message s'affiche, 
  // y compris la réponse automatique après un import.
  useEffect(() => {
    if (messages.length > 0) {
      const maxTime = Math.max(...messages.map(m => new Date(m.created_at).getTime()));
      AsyncStorage.setItem('last_read_support', new Date(maxTime + 1000).toISOString()).catch(() => {});
    }
  }, [messages]);

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

  const clearChat = () => {
    if (messages.length === 0) return;
    Alert.alert(
      "Vider la conversation",
      "Voulez-vous vraiment effacer tous les messages ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Effacer", 
          style: "destructive", 
          onPress: async () => {
            if (!user?.id) return;
            setLoading(true);
            await supabase.from('support_messages').delete().eq('user_id', user.id);
            setMessages([]);
            setLoading(false);
          }
        }
      ]
    );
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
        <TouchableOpacity onPress={clearChat} style={{ marginRight: 12, opacity: messages.length > 0 ? 1 : 0.4 }} disabled={messages.length === 0}>
          <Trash2 size={20} color={colors.red} />
        </TouchableOpacity>
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
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
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
            const isAskImport = item.content.includes('|||ASK_IMPORT|||');
            const visibleContent = item.content.replace('|||ASK_IMPORT|||', '').trim();
            return (
              <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                <Text style={[s.bubbleText, { color: isMe ? '#fff' : colors.text }]}>{visibleContent}</Text>
                <Text style={{ fontSize: 10, marginTop: 4, color: isMe ? 'rgba(255,255,255,0.6)' : colors.textFaint, textAlign: 'right' }}>
                  {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isAskImport && !isMe && (
                  <ImportListingButton colors={colors} />
                )}
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
    paddingTop: Platform.OS === 'web' ? 16 : 56, paddingBottom: 16, paddingHorizontal: 20,
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
