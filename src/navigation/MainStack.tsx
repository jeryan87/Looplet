import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import { colors } from '../constants/theme';

import HomeScreen from '../screens/main/HomeScreen';
import NewLetterScreen from '../screens/main/NewLetterScreen';
import WriteLetterScreen from '../screens/main/WriteLetterScreen';
import IntroOutroScreen from '../screens/main/IntroOutroScreen';
import PreviewScreen from '../screens/main/PreviewScreen';
import SendScreen from '../screens/main/SendScreen';

// NOTE: This file is superseded by MainTabNavigator — kept only so the file
// remains valid TypeScript. Archive and Settings now live in their own tab stacks.
const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="PromptPicker" component={NewLetterScreen} />
      <Stack.Screen name="WriteResponse" component={WriteLetterScreen} />
      <Stack.Screen name="IntroOutro" component={IntroOutroScreen} />
      <Stack.Screen name="Preview" component={PreviewScreen} />
      <Stack.Screen name="Send" component={SendScreen} />
    </Stack.Navigator>
  );
}
