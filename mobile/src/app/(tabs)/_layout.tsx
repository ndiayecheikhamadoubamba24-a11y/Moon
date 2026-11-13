import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { colors, fonts } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName, iconActive: IconName) => ({
  title,
  tabBarIcon: ({ focused, color }: { focused: boolean; color: import('react-native').ColorValue }) => <Ionicons name={focused ? iconActive : icon} size={24} color={color as string} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.night,
        tabBarInactiveTintColor: '#9A90B8',
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12 },
        tabBarStyle: { height: 66, paddingTop: 6, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: colors.white },
      }}
    >
      <Tabs.Screen name="index" options={tab('Accueil', 'home-outline', 'home')} />
      <Tabs.Screen name="calendar" options={tab('Calendrier', 'calendar-outline', 'calendar')} />
      <Tabs.Screen name="learn" options={tab('Apprendre', 'school-outline', 'school')} />
      <Tabs.Screen name="play" options={tab('Jouer', 'game-controller-outline', 'game-controller')} />
      <Tabs.Screen name="help" options={tab('Aide', 'help-circle-outline', 'help-circle')} />
    </Tabs>
  );
}
