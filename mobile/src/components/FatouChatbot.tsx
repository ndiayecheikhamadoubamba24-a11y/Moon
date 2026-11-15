import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api, errorMessage } from '../lib/api';
import { store } from '../lib/storage';
import { colors, fonts, radius, shadow, space } from '../lib/theme';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  'Comment dire non sans culpabiliser ?',
  'J’hésite sur une décision importante',
  'Comment mieux gérer mon stress ?',
  'Conseils pour me sentir plus confiante',
];

const WELCOME = (name?: string): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: `Coucou ${name || 'ma sœur'} 💜 Je suis Fatou, ta grande sœur Moon ! Tu peux me parler de tes décisions, de tes doutes, de ton comportement ou de ton bien-être. De quoi aimerais-tu qu’on discute ?`,
});

export function FatouChatbot() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [WELCOME(user?.name)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Accord explicite avant tout envoi à un service d'IA externe (exigé par Apple, règle 5.1.2, et par la loi).
  const [consent, setConsent] = useState<boolean | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    setMessages((prev) => (prev.length === 1 && prev[0].id === 'welcome' ? [WELCOME(user?.name)] : prev));
  }, [user?.name]);

  useEffect(() => {
    store.get<boolean>('fatou:consent', false).then(setConsent);
  }, []);

  const acceptConsent = () => {
    setConsent(true);
    store.set('fatou:consent', true);
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [open, messages.length, loading]);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading || !consent) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!textOverride) setInput('');
    setLoading(true);

    try {
      const history = nextMessages
        .filter((m) => m.id !== 'welcome')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api<{ reply: string }>('/chat/fatou', {
        method: 'POST',
        body: { messages: history },
        timeout: 25000,
      });

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: res.reply },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `${errorMessage(e)} Tu peux réessayer ou consulter l'onglet Aide si besoin 💜`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([WELCOME(user?.name)]);
    setInput('');
  };

  return (
    <>
      {!open && (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel="Discuter avec Fatou"
          style={({ pressed }) => [
            styles.fab,
            { bottom: Math.max(insets.bottom + 12, 28) + 80 },
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
        >
          <View style={styles.fabAvatar}>
            <Ionicons name="sparkles" size={22} color={colors.white} />
          </View>
          <Text style={styles.fabLabel}>Fatou</Text>
        </Pressable>
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Ionicons name="sparkles" size={20} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Fatou · Conseillère Moon</Text>
                  <Text style={styles.subtitle}>Décisions, comportements & bien-être</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <Pressable onPress={reset} hitSlop={8} style={styles.iconBtn} accessibilityLabel="Nouvelle discussion">
                  <Ionicons name="refresh" size={19} color={colors.white} />
                </Pressable>
                <Pressable onPress={() => setOpen(false)} hitSlop={8} style={styles.iconBtn} accessibilityLabel="Fermer">
                  <Ionicons name="close" size={22} color={colors.white} />
                </Pressable>
              </View>
            </View>

            {!consent ? (
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                <View style={styles.consentCard}>
                  <Text style={styles.consentTitle}>Avant de discuter avec Fatou</Text>
                  <Text style={styles.consentText}>
                    Fatou est une assistante virtuelle : ses réponses sont écrites par une intelligence artificielle, pas par une personne de l’équipe.
                  </Text>
                  <Text style={styles.consentText}>
                    Pour te répondre, tes messages, ton pseudo et ta tranche d’âge sont envoyés à un service d’IA externe (Groq, ou Google Gemini en secours). Ils ne sont pas enregistrés par Moon et ne servent pas à la publicité.
                  </Text>
                  <Text style={styles.consentText}>
                    N’écris pas ton nom complet, ton adresse ou ton numéro. Fatou ne remplace pas un professionnel de santé : en cas de danger ou de douleur forte, utilise l’onglet Aide.
                  </Text>
                  <Pressable onPress={acceptConsent} style={styles.consentBtn} accessibilityRole="button">
                    <Text style={styles.consentBtnText}>J’ai compris, je veux discuter</Text>
                  </Pressable>
                  <Pressable onPress={() => setOpen(false)} style={styles.consentLater} accessibilityRole="button">
                    <Text style={styles.consentLaterText}>Pas maintenant</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
            <ScrollView
              ref={scrollRef}
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <View key={m.id} style={[styles.bubbleRow, isUser ? styles.rowRight : styles.rowLeft]}>
                    <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                      <Text style={[styles.bubbleText, isUser ? styles.userText : styles.botText]}>
                        {m.content}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {messages.length === 1 && !loading && (
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <Pressable key={s} onPress={() => send(s)} style={styles.chip}>
                      <Text style={styles.chipText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {loading && (
                <View style={[styles.bubbleRow, styles.rowLeft]}>
                  <View style={[styles.bubble, styles.botBubble, styles.typing]}>
                    <ActivityIndicator size="small" color={colors.purple} />
                    <Text style={styles.typingText}>Fatou réfléchit…</Text>
                  </View>
                </View>
              )}
            </ScrollView>
            )}

            {consent && (
            <View style={styles.inputBar}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Écris à Fatou…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1500}
                style={styles.input}
                onSubmitEditing={() => send()}
              />
              <Pressable
                onPress={() => send()}
                disabled={!input.trim() || loading}
                style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.45 }]}
                accessibilityLabel="Envoyer"
              >
                <Ionicons name="send" size={18} color={colors.white} />
              </Pressable>
            </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  consentCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: colors.border },
  consentTitle: { fontFamily: fonts.black, fontSize: 18, color: colors.text },
  consentText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.text },
  consentBtn: { backgroundColor: colors.purple, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: space.sm },
  consentBtnText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.white },
  consentLater: { alignItems: 'center', paddingVertical: 6 },
  consentLaterText: { fontFamily: fonts.bold, fontSize: 14, color: colors.purple },
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.purple,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.white,
    ...shadow,
    elevation: 6,
  },
  fabAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: {
    color: colors.white,
    fontFamily: fonts.extrabold,
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43, 24, 88, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '84%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.night,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 16,
  },
  subtitle: {
    color: colors.lilac,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  iconBtn: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: space.lg,
    gap: space.md,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
  },
  botBubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.purple,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  botText: {
    color: colors.text,
  },
  userText: {
    color: colors.white,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
  chip: {
    backgroundColor: colors.lavender,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  chipText: {
    color: colors.purple,
    fontFamily: fonts.bold,
    fontSize: 12.5,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  typingText: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

