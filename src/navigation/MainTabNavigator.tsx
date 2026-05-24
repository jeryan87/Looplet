import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, MainStackParamList, LettersStackParamList, SettingsStackParamList } from './types';
import { colors } from '../constants/theme';

import HomeScreen from '../screens/main/HomeScreen';
import NewLetterScreen from '../screens/main/NewLetterScreen';
import WriteLetterScreen from '../screens/main/WriteLetterScreen';
import IntroOutroScreen from '../screens/main/IntroOutroScreen';
import PreviewScreen from '../screens/main/PreviewScreen';
import SendScreen from '../screens/main/SendScreen';
import ArchiveScreen from '../screens/main/ArchiveScreen';
import ArchiveReadScreen from '../screens/main/ArchiveReadScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Home tab stack (the full letter-writing flow) ────────────────────────────
const HomeStack = createNativeStackNavigator<MainStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="PromptPicker" component={NewLetterScreen} />
      <HomeStack.Screen name="WriteResponse" component={WriteLetterScreen} />
      <HomeStack.Screen name="IntroOutro" component={IntroOutroScreen} />
      <HomeStack.Screen name="Preview" component={PreviewScreen} />
      <HomeStack.Screen name="Send" component={SendScreen} />
    </HomeStack.Navigator>
  );
}

// ── Letters tab stack ────────────────────────────────────────────────────────
const LettersStack = createNativeStackNavigator<LettersStackParamList>();

function LettersStackNavigator() {
  return (
    <LettersStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <LettersStack.Screen name="Archive" component={ArchiveScreen} />
      <LettersStack.Screen name="ArchiveRead" component={ArchiveReadScreen} />
    </LettersStack.Navigator>
  );
}

// ── Settings tab stack ───────────────────────────────────────────────────────
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

// ── Bottom tab navigator ─────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { focused: IoniconsName; outline: IoniconsName }> = {
  HomeTab:     { focused: 'home',      outline: 'home-outline'      },
  LettersTab:  { focused: 'mail',      outline: 'mail-outline'      },
  SettingsTab: { focused: 'settings',  outline: 'settings-outline'  },
};

const TAB_LABELS: Record<string, string> = {
  HomeTab:     'Home',
  LettersTab:  'Letters',
  SettingsTab: 'Settings',
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.outline;
          return (
            <Ionicons
              name={iconName}
              size={size}
              color={focused ? colors.primary : colors.textMuted}
            />
          );
        },
        tabBarLabel: TAB_LABELS[route.name],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="LettersTab" component={LettersStackNavigator} />
      <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} />
    </Tab.Navigator>
  );
}
