import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadow } from '../../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName, iconActive: IconName) => ({
  title,
  tabBarIcon: ({ focused, color }: { focused: boolean; color: import('react-native').ColorValue }) => <Ionicons name={focused ? iconActive : icon} size={23} color={color as string} />,
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom + 12, 28);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.night,
        tabBarInactiveTintColor: '#9A90B8',
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11.5 },
        tabBarStyle: {
          height: 66 + bottomPad,
          paddingTop: 8,
          paddingBottom: bottomPad,
          borderTopColor: colors.border,
          backgroundColor: colors.white,
        },
      }}
    >
      <Tabs.Screen name="calendar" options={tab('Calendrier', 'calendar-outline', 'calendar')} />
      <Tabs.Screen name="learn" options={tab('Apprendre', 'school-outline', 'school')} />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarLabelStyle: { fontFamily: fonts.extrabold, fontSize: 12 },
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                marginTop: -22,
                backgroundColor: focused ? colors.pink : colors.purple,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: colors.white,
                ...shadow,
                elevation: 5,
              }}
            >
              <Ionicons name={focused ? 'home' : 'home-outline'} size={28} color={colors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="play" options={tab('Jouer', 'game-controller-outline', 'game-controller')} />
      <Tabs.Screen name="help" options={tab('Aide', 'help-circle-outline', 'help-circle')} />
    </Tabs>
  );
}
