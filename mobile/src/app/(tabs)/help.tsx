import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { NightHeader } from '../../components/Header';
import { Button, Card, Disclaimer, SectionTitle, T } from '../../components/ui';
import { HELP_STATUS, HELP_TYPES } from '../../lib/constants';
import { useApi } from '../../lib/hooks';
import { colors, space } from '../../lib/theme';

type Request = { id: number; type: string; subject: string | null; status: string; created_at: string; public_messages_count: number };
type Contact = { id: number; name: string; phone: string; description: string };

/** Espace « Je suis là pour toi ». */
export default function Help() {
  const requests = useApi<Request[]>('/help-requests');
  const contacts = useApi<Contact[]>('/emergency-contacts');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NightHeader title="Je suis là pour toi 💜" subtitle="Tu n'es pas seule" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} refreshControl={<RefreshControl refreshing={requests.loading} onRefresh={requests.reload} />}>
        <Button title="J'ai besoin d'aide urgente" icon="flash" onPress={() => router.push('/help/emergency')} style={{ marginTop: -space.xl }} />

        <SectionTitle title="De quoi as-tu besoin ?" />
        {HELP_TYPES.map((t) => (
          <Card key={t.value} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm }} onPress={() => router.push({ pathname: '/help/new', params: { type: t.value } })}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={24} color={colors.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <T weight="extrabold">{t.label}</T>
              <T size={13} color={colors.textMuted}>
                {t.desc}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Card>
        ))}

        <Card tint={colors.pinkSoft} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md }} onPress={() => router.push('/centers')}>
          <T size={34}>📍</T>
          <View style={{ flex: 1 }}>
            <T weight="black">Trouver un centre près de moi</T>
            <T size={13} color={colors.textMuted}>
              Centres de santé, conseils ados, protections gratuites
            </T>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.pink} />
        </Card>

        {!!requests.data?.length && (
          <>
            <SectionTitle title="Mes demandes" />
            {requests.data.map((r) => {
              const st = HELP_STATUS[r.status];
              return (
                <Card key={r.id} style={{ marginBottom: space.sm, flexDirection: 'row', alignItems: 'center' }} onPress={() => router.push(`/help/${r.id}`)}>
                  <View style={{ flex: 1 }}>
                    <T weight="extrabold">{r.subject || HELP_TYPES.find((t) => t.value === r.type)?.label}</T>
                    <T size={12} color={colors.textMuted}>
                      {new Date(r.created_at).toLocaleDateString('fr-FR')} · {r.public_messages_count} réponse(s)
                    </T>
                  </View>
                  <View style={{ backgroundColor: st?.color, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                    <T weight="bold" size={12} color={colors.white}>
                      {st?.label}
                    </T>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {!!contacts.data?.length && (
          <>
            <SectionTitle title="Numéros utiles" />
            <Card tint={colors.lavenderSoft}>
              {contacts.data.map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                  <View style={{ flex: 1 }}>
                    <T weight="extrabold">{c.name}</T>
                    <T size={13} color={colors.textMuted}>
                      {c.description}
                    </T>
                  </View>
                  <Button title={c.phone} icon="call" small variant="purple" onPress={() => Linking.openURL(`tel:${c.phone}`)} />
                </View>
              ))}
            </Card>
          </>
        )}
        <Disclaimer />
      </ScrollView>
    </View>
  );
}
