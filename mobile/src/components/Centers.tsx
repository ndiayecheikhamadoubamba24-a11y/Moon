import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { RESOURCE_TYPES } from '../lib/constants';
import { colors, space } from '../lib/theme';
import { Button, Card, T } from './ui';

export type Center = {
  id: number;
  name: string;
  type: string;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  services: string[] | null;
  languages: string[] | null;
  is_free: boolean;
  is_confidential: boolean;
  is_accessible: boolean;
  walk_in: boolean;
  audience: string | null;
  description: string | null;
  verified_at: string | null;
  opening: { open: boolean; closes_at?: string; opens_at?: string; opens_day?: string };
  distance_km: number | null;
  walking_minutes: number | null;
};

const DAYS: Record<string, string> = { mon: 'lundi', tue: 'mardi', wed: 'mercredi', thu: 'jeudi', fri: 'vendredi', sat: 'samedi', sun: 'dimanche' };

export function openingLabel(o: Center['opening']) {
  if (o.open) return `Ouvert · ferme à ${o.closes_at?.replace(':', ' h ').replace(' h 00', ' h')}`;
  if (o.opens_at) {
    const when = o.opens_day === 'today' ? "aujourd'hui" : o.opens_day === 'tomorrow' ? 'demain' : DAYS[o.opens_day ?? ''] ?? 'bientôt';
    return `Fermé · rouvre ${when} à ${o.opens_at.replace(':', ' h ').replace(' h 00', ' h')}`;
  }
  return 'Fermé';
}

export function CenterCard({ c, compact }: { c: Center; compact?: boolean }) {
  const type = RESOURCE_TYPES[c.type];
  return (
    // La carte n'est pas un bouton (elle contient des boutons) : seule la partie haute ouvre la fiche.
    <Card style={{ marginBottom: space.sm }}>
      <Pressable onPress={() => router.push(`/centers/${c.id}`)} accessibilityRole="link" accessibilityLabel={`Voir la fiche : ${c.name}`} style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={(type?.icon ?? 'location') as keyof typeof Ionicons.glyphMap} size={22} color={c.type === 'health_center' ? colors.night : colors.pink} />
        </View>
        <View style={{ flex: 1 }}>
          <T weight="extrabold" size={15}>
            {c.name}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.opening.open ? colors.green : '#9A90B8' }} />
            <T size={13} weight="semibold" color={c.opening.open ? colors.green : colors.textMuted}>
              {openingLabel(c.opening)}
            </T>
          </View>
          {!compact && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {c.is_free && <Tag label="Gratuit" />}
              {c.is_confidential && <Tag label="Confidentiel" />}
              {c.walk_in && <Tag label="Sans rendez-vous" />}
              {c.audience === 'all' && <Tag label="Filles et garçons" />}
            </View>
          )}
        </View>
        {c.distance_km !== null && (
          <View style={{ alignItems: 'flex-end' }}>
            <T weight="black" size={14}>
              {String(c.distance_km).replace('.', ',')} km
            </T>
            <T size={12} color={colors.textMuted}>
              {c.walking_minutes} min à pied
            </T>
          </View>
        )}
      </Pressable>
      {!compact && c.phone && (
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          <Button title="Appeler" icon="call" small variant="purple" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${c.phone}`)} />
          {c.latitude && <Button title="Itinéraire" icon="navigate" small variant="outline" style={{ flex: 1 }} onPress={() => openDirections(c)} />}
        </View>
      )}
    </Card>
  );
}

export function openDirections(c: Center) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}&travelmode=walking`);
}

function Tag({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: colors.pinkSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <T size={11} weight="bold" color={colors.pink}>
        {label}
      </T>
    </View>
  );
}

