import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ErrorBox, Loading, T } from '../../components/ui';
import { api } from '../../lib/api';
import { RESOURCE_TYPES, SERVICES } from '../../lib/constants';
import { useApi } from '../../lib/hooks';
import { colors, space } from '../../lib/theme';
import { Center, openDirections, openingLabel } from '../../components/Centers';

export default function CenterDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: c, loading, error, reload } = useApi<Center & { saved: boolean }>(`/resources/${id}`);
  const [saved, setSaved] = useState<boolean | null>(null);
  const isSaved = saved ?? c?.saved ?? false;

  const toggleSave = async () => {
    setSaved(!isSaved);
    await api(`/resources/${id}/save`, { method: isSaved ? 'DELETE' : 'POST' }).catch(() => setSaved(isSaved));
  };

  if (loading && !c) return <Loading />;
  if (error && !c) return <ErrorBox message={error} onRetry={reload} />;
  if (!c) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.hero, { paddingTop: insets.top + space.sm }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={26} color={colors.white} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <Pressable onPress={() => Share.share({ message: `${c.name}${c.address ? ` – ${c.address}` : ''}${c.phone ? ` – ${c.phone}` : ''}` })} hitSlop={10} accessibilityLabel="Partager">
              <Ionicons name="share-social-outline" size={24} color={colors.white} />
            </Pressable>
            <Pressable onPress={toggleSave} hitSlop={10} accessibilityLabel="Enregistrer">
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={colors.white} />
            </Pressable>
          </View>
        </View>
        <T size={60} style={{ textAlign: 'center', marginTop: space.md }}>
          {c.type === 'health_center' ? '🏥' : '💗'}
        </T>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + 100 }}>
        <Card style={{ marginTop: -space.xxl }}>
          <T weight="black" size={20}>
            {c.name}
          </T>
          <T size={13} color={colors.textMuted} style={{ marginTop: 2 }}>
            {RESOURCE_TYPES[c.type]?.label}
            {c.distance_km !== null ? ` · ${String(c.distance_km).replace('.', ',')} km · ${c.walking_minutes} min à pied` : ''}
          </T>
          <View style={s.actions}>
            {c.phone && <Action icon="call" label="Appeler" onPress={() => Linking.openURL(`tel:${c.phone}`)} />}
            {c.latitude && <Action icon="navigate" label="Itinéraire" onPress={() => openDirections(c)} />}
            <Action icon="share-social" label="Partager" onPress={() => Share.share({ message: `${c.name} ${c.phone ?? ''}` })} />
            <Action icon={isSaved ? 'heart' : 'heart-outline'} label={isSaved ? 'Enregistré' : 'Enregistrer'} onPress={toggleSave} />
          </View>
        </Card>

        <Card tint={c.opening.open ? colors.greenSoft : colors.lavender} style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.opening.open ? colors.green : '#9A90B8' }} />
          <T weight="extrabold">{openingLabel(c.opening)}</T>
        </Card>
        {c.address && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: space.md }}>
            <Ionicons name="location" size={20} color={colors.night} />
            <T style={{ flex: 1 }}>{c.address}</T>
          </View>
        )}

        {!!c.services?.length && (
          <>
            <T weight="black" size={17} style={{ marginTop: space.xl, marginBottom: space.sm }}>
              Ce qu'on y propose
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {c.services.map((sv) => (
                <View key={sv} style={s.service}>
                  <T size={26}>{SERVICES[sv]?.emoji ?? '✨'}</T>
                  <T size={12} weight="bold" style={{ textAlign: 'center' }}>
                    {SERVICES[sv]?.label ?? sv}
                  </T>
                </View>
              ))}
            </View>
          </>
        )}

        {c.is_confidential && (
          <Card tint={colors.lavender} style={{ marginTop: space.lg, flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <Ionicons name="shield-checkmark" size={30} color={colors.purple} />
            <T style={{ flex: 1 }}>Tu peux venir seule, on t'écoute sans te juger. Tout est confidentiel.</T>
          </Card>
        )}
        {c.verified_at && (
          <T size={12} color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.lg }}>
            Informations vérifiées le {c.verified_at.split('-').reverse().join('/')}
          </T>
        )}
        <Pressable onPress={() => router.push({ pathname: '/centers/suggest', params: { resource_id: String(c.id) } })}>
          <T size={13} weight="bold" color={colors.purple} style={{ textAlign: 'center', marginTop: 6, textDecorationLine: 'underline' }}>
            Signaler une erreur sur cette fiche
          </T>
        </Pressable>
      </ScrollView>
      {c.latitude && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space.md }]}>
          <Button title="Y aller" icon="arrow-forward" variant="purple" onPress={() => openDirections(c)} />
        </View>
      )}
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', flex: 1, gap: 4 }} accessibilityRole="button">
      <View style={s.actionIcon}>
        <Ionicons name={icon} size={22} color={colors.night} />
      </View>
      <T size={12} weight="bold">
        {label}
      </T>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.night, padding: space.lg, paddingBottom: space.xxl * 1.5 },
  actions: { flexDirection: 'row', marginTop: space.lg },
  actionIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  service: { width: '23%', backgroundColor: colors.pinkSoft, borderRadius: 14, padding: 8, alignItems: 'center', gap: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, backgroundColor: colors.background },
});
