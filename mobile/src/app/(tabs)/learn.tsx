import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { HScroll, tipEmoji } from '../../components/Tips';
import { Card, Chip, ErrorBox, Loading, SectionTitle, styles as ui, T } from '../../components/ui';
import { useApi } from '../../lib/hooks';
import { colors, space } from '../../lib/theme';

type Module = { id: number; title: string; slug: string; summary: string; duration_minutes: number; progress: number; completed: boolean; category?: { name: string } };
type Category = { id: number; name: string; slug: string };
type Guide = { id: number; kind: string; title: string; slug: string; icon: string | null };

export default function Learn() {
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (q.length >= 2) params.set('q', q);
  const modules = useApi<{ data: Module[] }>(`/modules?${params.toString()}`);
  const categories = useApi<Category[]>('/categories');
  const guides = useApi<Guide[]>('/guides');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Apprendre" subtitle="Comprendre son corps, sans tabou" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <View style={[ui.input, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, marginTop: -space.xl }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher un sujet" placeholderTextColor={colors.textMuted} style={{ flex: 1, paddingVertical: 10, fontSize: 16 }} />
        </View>

        <HScroll>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: space.md }}>
            <Chip label="Tous" active={!category} onPress={() => setCategory(null)} />
            {categories.data?.map((c) => (
              <Chip key={c.id} label={c.name} active={category === c.slug} onPress={() => setCategory(c.slug)} />
            ))}
          </View>
        </HScroll>

        {modules.loading && !modules.data && <Loading />}
        {modules.error && !modules.data && <ErrorBox message={modules.error} onRetry={modules.reload} />}
        {modules.data?.data.length === 0 && (
          <T color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.lg }}>
            Aucun module trouvé.
          </T>
        )}
        {modules.data?.data.map((m) => (
          <Card key={m.id} style={{ marginBottom: space.md }} onPress={() => router.push(`/module/${m.slug}`)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: m.completed ? colors.greenSoft : colors.lavender, alignItems: 'center', justifyContent: 'center' }}>
                <T size={26}>{m.completed ? '✅' : '📘'}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="extrabold" size={16}>
                  {m.title}
                </T>
                <T size={13} color={colors.textMuted} numberOfLines={2}>
                  {m.summary}
                </T>
                <T size={12} weight="bold" color={colors.purple} style={{ marginTop: 4 }}>
                  🕒 {m.duration_minutes} min{m.progress > 0 && !m.completed ? ` · ${m.progress} %` : ''}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        ))}

        {!!guides.data?.length && (
          <>
            <SectionTitle icon="🧴" title="Fiches pratiques" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {guides.data
                .filter((g) => g.kind === 'practical')
                .map((g) => (
                  <Card key={g.id} style={{ width: '48.5%', padding: space.md }} onPress={() => router.push(`/guide/${g.slug}`)}>
                    <T size={26}>{tipEmoji(g.icon) === '💡' ? '🌸' : tipEmoji(g.icon)}</T>
                    <T weight="extrabold" size={14} style={{ marginTop: 4 }}>
                      {g.title}
                    </T>
                  </Card>
                ))}
            </View>
            <SectionTitle icon="⚠️" title="Signaux à surveiller" />
            {guides.data
              .filter((g) => g.kind === 'alert')
              .map((g) => (
                <Card key={g.id} tint={colors.redSoft} style={{ marginBottom: space.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push(`/guide/${g.slug}`)}>
                  <T weight="extrabold" style={{ flex: 1 }}>
                    {g.title}
                  </T>
                  <Ionicons name="chevron-forward" size={18} color={colors.red} />
                </Card>
              ))}
          </>
        )}

        <Card tint={colors.goldSoft} style={{ marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.md }} onPress={() => router.push('/faq')}>
          <T size={30}>❓</T>
          <View style={{ flex: 1 }}>
            <T weight="black">Questions fréquentes</T>
            <T size={13} color={colors.textMuted}>
              Les réponses de nos éducatrices
            </T>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.night} />
        </Card>
      </ScrollView>
    </View>
  );
}
