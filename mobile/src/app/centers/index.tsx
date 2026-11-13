import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Center, CenterCard } from '../../components/Centers';
import { CentersMap, MapHandle, Region } from '../../components/CentersMap';
import { MoonIcon } from '../../components/Moon';
import { Button, Card, Check, Chip, Loading, Segmented, styles as ui, T } from '../../components/ui';
import { useCycle } from '../../context/CycleContext';
import { api } from '../../lib/api';
import { SERVICES } from '../../lib/constants';
import { store } from '../../lib/storage';
import { colors, radius, space } from '../../lib/theme';

type Filters = { types: string[]; services: string[]; radius: number; openNow: boolean; free: boolean; accessible: boolean; language: string | null };
const DEFAULT_FILTERS: Filters = { types: [], services: [], radius: 10, openNow: false, free: false, accessible: false, language: null };
const DAKAR = { latitude: 14.7167, longitude: -17.4677 };

/** Carte et liste des centres proches. */
export default function Centers() {
  const insets = useSafeAreaInsets();
  const { online } = useCycle();
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [centers, setCenters] = useState<Center[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [offlinePack, setOfflinePack] = useState<Center[] | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapHandle>(null);

  useEffect(() => {
    store.get<Center[] | null>('centers:offline', null).then(setOfflinePack);
    Location.getForegroundPermissionsAsync().then(async (p) => {
      if (p.granted) {
        setPermission('granted');
        locate();
      } else if (!p.canAskAgain) setPermission('denied');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = async () => {
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) return setPermission('denied');
      setPermission('granted');
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPosition({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      setPermission('denied');
    }
  };

  const search = useCallback(
    async (bounds?: Region) => {
      setLoading(true);
      const p = new URLSearchParams();
      if (position && !query) {
        p.set('lat', String(position.latitude));
        p.set('lng', String(position.longitude));
        if (!bounds) p.set('radius', String(filters.radius));
      }
      if (bounds) {
        p.set('bounds[north]', String(bounds.latitude + bounds.latitudeDelta / 2));
        p.set('bounds[south]', String(bounds.latitude - bounds.latitudeDelta / 2));
        p.set('bounds[east]', String(bounds.longitude + bounds.longitudeDelta / 2));
        p.set('bounds[west]', String(bounds.longitude - bounds.longitudeDelta / 2));
      }
      if (query) p.set('q', query);
      filters.types.forEach((t) => p.append('types[]', t));
      filters.services.forEach((s) => p.append('services[]', s));
      if (filters.openNow) p.set('open_now', '1');
      if (filters.free) p.set('free', '1');
      if (filters.accessible) p.set('accessible', '1');
      if (filters.language) p.set('language', filters.language);
      try {
        const res = await api<{ data: Center[] }>(`/resources?${p.toString()}`);
        setCenters(res.data);
      } catch {
        setCenters(null);
      } finally {
        setLoading(false);
      }
    },
    [position, query, filters],
  );

  useEffect(() => {
    if (online && (position || query || permission === 'denied')) search();
  }, [position, filters, online, permission]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadPack = async () => {
    const r = await api<{ data: Center[] }>(`/resources/offline?region=${encodeURIComponent(centers?.[0]?.region ?? 'Dakar')}`).catch(() => null);
    if (r) {
      await store.set('centers:offline', r.data);
      setOfflinePack(r.data);
    }
  };

  const activeCount = filters.types.length + filters.services.length + (filters.openNow ? 1 : 0) + (filters.free ? 1 : 0) + (filters.accessible ? 1 : 0) + (filters.language ? 1 : 0);
  const toggleType = (t: string | null) => setFilters((f) => ({ ...f, types: t === null ? [] : f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t] }));

  // ---------- Hors ligne ----------
  if (!online) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TopBar insets={insets.top} />
        <View style={s.offlineBar}>
          <Ionicons name="cloud-offline" size={18} color={colors.night} />
          <T weight="black">Mode hors ligne</T>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg }}>
          <View style={{ alignItems: 'center', marginVertical: space.lg }}>
            <T size={60}>🗺️</T>
            <T weight="black" size={19} style={{ textAlign: 'center' }}>
              La carte n'est pas disponible sans connexion Internet.
            </T>
            <T color={colors.textMuted} style={{ textAlign: 'center' }}>
              La carte reviendra quand tu auras du réseau.
            </T>
          </View>
          {offlinePack?.length ? (
            <>
              <T weight="black" style={{ marginBottom: space.sm }}>
                Centres enregistrés sur ton téléphone
              </T>
              {offlinePack.filter((c) => c.type !== 'hotline').map((c) => (
                <CenterCard key={c.id} c={c} compact />
              ))}
              {offlinePack.filter((c) => c.type === 'hotline').map((c) => (
                <Card key={c.id} tint={colors.lavenderSoft} style={{ marginBottom: space.sm, flexDirection: 'row', alignItems: 'center' }}>
                  <T weight="bold" style={{ flex: 1 }}>
                    {c.name}
                  </T>
                  <Button title={c.phone ?? ''} small variant="purple" icon="call" onPress={() => Linking.openURL(`tel:${c.phone}`)} />
                </Card>
              ))}
            </>
          ) : (
            <T color={colors.textMuted} style={{ textAlign: 'center' }}>
              Astuce : quand tu as du réseau, télécharge les centres de ta région pour les consulter hors ligne.
            </T>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------- Autorisation de la position ----------
  if (permission === 'unknown' && !query) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar insets={insets.top} />
        <View style={{ flex: 1, padding: space.xl, justifyContent: 'center', alignItems: 'center', gap: space.md }}>
          <T size={80}>📍</T>
          <T weight="black" size={24}>
            Autoriser ta position
          </T>
          <T style={{ textAlign: 'center', lineHeight: 22 }}>
            Pour trouver les centres près de toi, Moon a besoin de ta position. Ta position n'est jamais enregistrée ni partagée.
          </T>
          <Button title="Autoriser la position" variant="purple" style={{ alignSelf: 'stretch', marginTop: space.lg }} onPress={locate} />
          <Button title="Plutôt choisir ma ville ou mon quartier" variant="outline" style={{ alignSelf: 'stretch' }} onPress={() => setPermission('denied')} />
        </View>
      </View>
    );
  }

  const list = centers ?? [];
  const initial = position ?? (list[0]?.latitude ? { latitude: list[0].latitude, longitude: list[0].longitude! } : DAKAR);

  return (
    <View style={{ flex: 1 }}>
      <TopBar insets={insets.top}>
        <View style={[ui.input, s.search]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => search()}
            returnKeyType="search"
            placeholder="Rechercher un centre ou un quartier"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, paddingVertical: 8, fontSize: 15 }}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </TopBar>

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm }}>
        <Segmented
          options={[
            { value: 'list', label: 'Liste' },
            { value: 'map', label: 'Carte' },
          ]}
          value={mode}
          onChange={(v) => setMode(v as 'list' | 'map')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          <Chip label="Tous" active={!filters.types.length} onPress={() => toggleType(null)} />
          <Chip label="Conseils ados" active={filters.types.includes('youth_center')} onPress={() => toggleType('youth_center')} />
          <Chip label="Centres de santé" active={filters.types.includes('health_center')} onPress={() => toggleType('health_center')} />
          <Chip label="Ouvert maintenant" active={filters.openNow} onPress={() => setFilters((f) => ({ ...f, openNow: !f.openNow }))} />
          <Chip label="Gratuit" active={filters.free} onPress={() => setFilters((f) => ({ ...f, free: !f.free }))} />
          <Chip label={activeCount ? `Filtres (${activeCount})` : 'Filtres'} icon="options" onPress={() => setShowFilters(true)} />
        </ScrollView>
      </View>

      {mode === 'map' ? (
        <View style={{ flex: 1, marginTop: space.sm }}>
          <CentersMap
            mapRef={mapRef}
            initial={initial}
            centers={list}
            showsUserLocation={permission === 'granted'}
            onRegionChange={setRegion}
          />
          {region && (
            <Pressable style={s.searchArea} onPress={() => search(region)}>
              <Ionicons name="refresh" size={16} color={colors.night} />
              <T weight="extrabold" size={13}>
                Rechercher dans cette zone
              </T>
            </Pressable>
          )}
          <Pressable style={s.locateBtn} onPress={locate} accessibilityLabel="Ma position">
            <Ionicons name="locate" size={24} color={colors.night} />
          </Pressable>
          <View style={s.mapSheet}>
            <T weight="black" size={18}>
              {list.length} centre{list.length > 1 ? 's' : ''} près de toi
            </T>
            {list[0] && <CenterCard c={list[0]} compact />}
            <Button title="J'ai besoin d'aide urgente" icon="flash" small onPress={() => router.push('/help/emergency')} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xl }}>
          {loading && <Loading />}
          {!loading && centers && list.length === 0 && (
            <View style={{ alignItems: 'center', gap: space.md, marginTop: space.lg }}>
              <MoonIcon size={64} />
              <T weight="black" size={19} style={{ textAlign: 'center' }}>
                Aucun centre proche de cette zone pour l'instant
              </T>
              <Button title="Élargir la recherche" icon="search" variant="purple" style={{ alignSelf: 'stretch' }} onPress={() => setFilters({ ...DEFAULT_FILTERS, radius: 50 })} />
              <Button title="Voir les numéros utiles" icon="call" variant="outline" style={{ alignSelf: 'stretch' }} onPress={() => router.push('/help/emergency')} />
              <Button title="Proposer un centre à ajouter" variant="ghost" onPress={() => router.push('/centers/suggest')} />
            </View>
          )}
          {list.map((c) => (
            <CenterCard key={c.id} c={c} />
          ))}
          {list.length > 0 && (
            <Card tint={colors.lavenderSoft} style={{ marginTop: space.md, alignItems: 'center', gap: space.sm }}>
              <T weight="bold" style={{ textAlign: 'center' }}>
                {offlinePack ? `✅ ${offlinePack.length} centres enregistrés pour le mode hors ligne` : 'Consulte ces centres même sans réseau'}
              </T>
              <Button title={offlinePack ? 'Mettre à jour' : 'Télécharger les centres de ma région'} icon="download" small variant="purple" onPress={downloadPack} />
            </Card>
          )}
        </ScrollView>
      )}

      <FiltersModal visible={showFilters} value={filters} onClose={() => setShowFilters(false)} onApply={(f) => (setFilters(f), setShowFilters(false))} />
    </View>
  );
}

function TopBar({ insets, children }: { insets: number; children?: React.ReactNode }) {
  return (
    <View style={[s.top, { paddingTop: insets + space.sm }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </Pressable>
        <MoonIcon size={28} />
        <T weight="black" size={21} color={colors.white}>
          Moon
        </T>
      </View>
      {children}
    </View>
  );
}

function FiltersModal({ visible, value, onClose, onApply }: { visible: boolean; value: Filters; onClose: () => void; onApply: (f: Filters) => void }) {
  const [f, setF] = useState(value);
  useEffect(() => setF(value), [value, visible]);
  const toggle = (key: 'types' | 'services', v: string) => setF((cur) => ({ ...cur, [key]: cur[key].includes(v) ? cur[key].filter((x) => x !== v) : [...cur[key], v] }));
  const radii = useMemo(() => [1, 3, 5, 10, 20], []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <View style={s.modalHeader}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
            <Ionicons name="close" size={26} color={colors.night} />
          </Pressable>
          <T weight="black" size={19}>
            Filtres
          </T>
          <Pressable onPress={() => setF(DEFAULT_FILTERS)}>
            <T weight="bold" color={colors.purple}>
              Réinitialiser
            </T>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
          <View style={{ gap: space.md }}>
            <T weight="black">Type de centre</T>
            <Check checked={f.types.includes('youth_center')} onPress={() => toggle('types', 'youth_center')} label="Conseils ados" />
            <Check checked={f.types.includes('health_center')} onPress={() => toggle('types', 'health_center')} label="Centres de santé" />
            <Check checked={f.types.includes('distribution')} onPress={() => toggle('types', 'distribution')} label="Distribution de protections" />
          </View>
          <View>
            <T weight="black" style={{ marginBottom: space.sm }}>
              Distance : {f.radius} km
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {radii.map((r) => (
                <Chip key={r} label={`${r} km`} active={f.radius === r} onPress={() => setF({ ...f, radius: r })} />
              ))}
            </View>
          </View>
          <Row label="🕒 Ouvert maintenant" value={f.openNow} onChange={(v) => setF({ ...f, openNow: v })} />
          <View style={{ gap: space.md }}>
            <T weight="black">Services</T>
            {Object.entries(SERVICES).map(([k, sv]) => (
              <Check key={k} checked={f.services.includes(k)} onPress={() => toggle('services', k)} label={sv.label} />
            ))}
          </View>
          <Row label="🎁 Gratuit" value={f.free} onChange={(v) => setF({ ...f, free: v })} />
          <View style={{ gap: space.md }}>
            <T weight="black">Langue</T>
            <Check checked={f.language === 'fr'} onPress={() => setF({ ...f, language: f.language === 'fr' ? null : 'fr' })} label="Français" />
            <Check checked={f.language === 'wo'} onPress={() => setF({ ...f, language: f.language === 'wo' ? null : 'wo' })} label="Wolof" />
          </View>
          <Row label="♿ Accessible" value={f.accessible} onChange={(v) => setF({ ...f, accessible: v })} />
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: space.sm, padding: space.lg }}>
          <Button title="Réinitialiser" variant="outline" style={{ flex: 1 }} onPress={() => setF(DEFAULT_FILTERS)} />
          <Button title="Voir les résultats" variant="purple" style={{ flex: 1 }} onPress={() => onApply(f)} />
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <T weight="bold" style={{ flex: 1 }}>
        {label}
      </T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.night, false: colors.border }} />
    </View>
  );
}

const s = StyleSheet.create({
  top: { backgroundColor: colors.night, paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2, borderRadius: radius.pill },
  offlineBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: space.md, backgroundColor: colors.gold },
  searchArea: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  locateBtn: { position: 'absolute', right: 16, top: 70, width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  mapSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.lg, gap: space.sm },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, paddingTop: space.xl },
});
