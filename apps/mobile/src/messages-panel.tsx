import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, type ChatMessage, type Conversation, type Locale, type Principal } from './api';
import { Card, Field, Notice, PrimaryButton, colors, tx } from './ui';

export function MessagesPanel({
  locale,
  principal,
  initialConversationId,
}: {
  locale: Locale;
  principal: Principal;
  initialConversationId?: string | null;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState(initialConversationId ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rtl = locale === 'ar';

  const errorMessage = (err: unknown) => err instanceof ApiError || err instanceof Error ? err.message : tx(locale, 'Could not load messages', 'تعذر تحميل الرسائل');

  async function load(preferred?: string) {
    setError('');
    try {
      const list = await api.conversations();
      setConversations(list);
      const target = preferred || activeId || list[0]?.id || '';
      if (target) {
        setActiveId(target);
        setMessages(await api.messages(target));
      } else {
        setMessages([]);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => { void load(initialConversationId ?? undefined); }, [initialConversationId]);

  async function open(id: string) {
    setActiveId(id); setError('');
    try { setMessages(await api.messages(id)); } catch (err) { setError(errorMessage(err)); }
  }

  async function send() {
    if (!activeId || !draft.trim()) return;
    setBusy(true); setError('');
    try {
      const sent = await api.sendMessage(activeId, draft.trim());
      setMessages((current) => [...current, sent]);
      setDraft('');
      setConversations((current) => current.map((item) => item.id === activeId ? { ...item, lastMessageAt: sent.createdAt } : item));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const candidate = principal.effectiveRole === 'candidate';
  return (
    <View style={styles.wrap}>
      <Notice locale={locale} message={error} />
      <Text style={[styles.help, rtl && styles.rtl]}>
        {candidate
          ? tx(locale, 'Companies start the first conversation. Once contacted, you can reply normally.', 'تبدأ الشركات المحادثة الأولى. بعد التواصل معك يمكنك الرد بشكل طبيعي.')
          : tx(locale, 'Start first contact from Search, then continue the conversation here.', 'ابدأ التواصل الأول من البحث ثم أكمل المحادثة هنا.')}
      </Text>
      <View style={styles.conversations}>
        {conversations.length === 0 ? <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'No conversations yet.', 'لا توجد محادثات بعد.')}</Text> : conversations.map((conversation) => (
          <Pressable key={conversation.id} style={[styles.conversation, activeId === conversation.id && styles.active]} onPress={() => void open(conversation.id)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>C</Text></View>
            <View style={styles.flex}>
              <Text style={[styles.conversationTitle, rtl && styles.rtl]}>{candidate ? tx(locale, 'Company conversation', 'محادثة شركة') : tx(locale, 'Candidate conversation', 'محادثة مرشح')}</Text>
              <Text style={[styles.meta, rtl && styles.rtl]} numberOfLines={1}>{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString() : tx(locale, 'New conversation', 'محادثة جديدة')}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Card>
        {!activeId ? <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'Choose a conversation.', 'اختر محادثة.')}</Text> : (
          <>
            <View style={styles.messageList}>
              {messages.length === 0 ? <Text style={[styles.empty, rtl && styles.rtl]}>{tx(locale, 'No messages yet.', 'لا توجد رسائل بعد.')}</Text> : messages.map((message) => {
                const mine = message.senderUserId === principal.userId;
                return (
                  <View key={message.id} style={[styles.bubble, mine && styles.bubbleMine, rtl && styles.bubbleRtl]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleMineText, rtl && styles.rtl]}>{message.body}</Text>
                    <Text style={[styles.time, mine && styles.timeMine]}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                );
              })}
            </View>
            <Field locale={locale} label={tx(locale, 'Message', 'الرسالة')} value={draft} onChangeText={setDraft} multiline placeholder={tx(locale, 'Write a professional message…', 'اكتب رسالة مهنية…')} />
            <PrimaryButton label={busy ? tx(locale, 'Sending…', 'جاري الإرسال…') : tx(locale, 'Send', 'إرسال')} onPress={() => void send()} disabled={busy || !draft.trim()} />
          </>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  help: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  conversations: { gap: 8 },
  conversation: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.line, padding: 11, borderRadius: 14 },
  active: { borderColor: '#60A5FA', backgroundColor: '#EFF6FF' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '900' },
  flex: { flex: 1, minWidth: 0 },
  conversationTitle: { color: colors.ink, fontWeight: '850' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 18 },
  messageList: { gap: 8 },
  bubble: { alignSelf: 'flex-start', maxWidth: '86%', backgroundColor: '#F1F5F9', borderRadius: 15, padding: 10 },
  bubbleRtl: { alignItems: 'flex-end' },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.blue },
  bubbleText: { color: colors.ink, lineHeight: 19 },
  bubbleMineText: { color: '#FFF' },
  time: { color: colors.muted, fontSize: 9, marginTop: 4 },
  timeMine: { color: '#DBEAFE' },
});
