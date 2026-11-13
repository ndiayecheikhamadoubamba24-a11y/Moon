import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { NightHeader } from '../components/Header';
import { Button, Card, ErrorBox, Loading, Screen, styles as ui, T } from '../components/ui';
import { useApi } from '../lib/hooks';
import { colors, space } from '../lib/theme';

type Faq = { id: number; question: string; answer: string; category?: { name: string } };

export default function FaqScreen() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const { data, loading, error, reload } = useApi<{ data: Faq[] }>(`/faqs${q.length >= 2 ? `?q=${encodeURIComponent(q)}` : ''}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Questions fréquentes" back />
      <Screen edges={['bottom']}>
        <View style={[ui.input, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, marginBottom: space.lg }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher une question" placeholderTextColor={colors.textMuted} style={{ flex: 1, paddingVertical: 10, fontSize: 16 }} />
        </View>
        {loading && !data && <Loading />}
        {error && !data && <ErrorBox message={error} onRetry={reload} />}
        {data?.data.map((f) => (
          <Card key={f.id} style={{ marginBottom: space.sm }}>
            <Pressable onPress={() => setOpen(open === f.id ? null : f.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T weight="extrabold" style={{ flex: 1 }}>
                {f.question}
              </T>
              <Ionicons name={open === f.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.purple} />
            </Pressable>
            {open === f.id && (
              <T style={{ marginTop: space.sm, lineHeight: 22 }} color={colors.textMuted}>
                {f.answer}
              </T>
            )}
          </Card>
        ))}
        <Card tint={colors.lavender} style={{ marginTop: space.lg, alignItems: 'center', gap: space.sm }}>
          <T weight="black">Tu ne trouves pas ta réponse ?</T>
          <Button title="Poser une question anonyme" variant="purple" small onPress={() => router.push({ pathname: '/help/new', params: { type: 'question' } })} />
        </Card>
      </Screen>
    </View>
  );
}
