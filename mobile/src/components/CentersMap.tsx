import { router } from 'expo-router';
import { RefObject } from 'react';
import MapView, { Marker, Region } from 'react-native-maps';
import { colors } from '../lib/theme';
import { Center, openingLabel } from './Centers';

export type { Region };
export type MapHandle = MapView;

type Props = {
  mapRef: RefObject<MapHandle | null>;
  initial: { latitude: number; longitude: number };
  centers: Center[];
  showsUserLocation: boolean;
  onRegionChange: (r: Region) => void;
};

/** Carte native (Google Maps sur Android, Apple Plans sur iOS). */
export function CentersMap({ mapRef, initial, centers, showsUserLocation, onRegionChange }: Props) {
  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={{ ...initial, latitudeDelta: 0.12, longitudeDelta: 0.12 }}
      showsUserLocation={showsUserLocation}
      onRegionChangeComplete={onRegionChange}
    >
      {centers
        .filter((c) => c.latitude && c.longitude)
        .map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.latitude!, longitude: c.longitude! }}
            title={c.name}
            description={openingLabel(c.opening)}
            pinColor={c.type === 'health_center' ? colors.night : colors.pink}
            onCalloutPress={() => router.push(`/centers/${c.id}`)}
          />
        ))}
    </MapView>
  );
}
