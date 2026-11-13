import { RefObject } from 'react';
import { View } from 'react-native';
import { colors } from '../lib/theme';
import { Center } from './Centers';
import { T } from './ui';

export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
export type MapHandle = unknown;

/** Aperçu web : react-native-maps ne fonctionne que sur mobile. */
export function CentersMap({ centers }: { mapRef: RefObject<MapHandle | null>; initial: { latitude: number; longitude: number }; centers: Center[]; showsUserLocation: boolean; onRegionChange: (r: Region) => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' }}>
      <T weight="bold" color={colors.textMuted}>
        🗺️ Carte disponible sur l'application mobile ({centers.length} centres)
      </T>
    </View>
  );
}
