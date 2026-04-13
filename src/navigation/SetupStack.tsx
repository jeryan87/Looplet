import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SetupStackParamList } from './types';
import { colors } from '../constants/theme';

import CreateLoopScreen from '../screens/onboarding/CreateLoopScreen';
import AddRecipientsScreen from '../screens/onboarding/AddRecipientsScreen';
import SetCadenceScreen from '../screens/onboarding/SetCadenceScreen';

const Stack = createNativeStackNavigator<SetupStackParamList>();

export default function SetupStack() {
  return (
    <Stack.Navigator
      initialRouteName="CreateLoop"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CreateLoop" component={CreateLoopScreen} />
      <Stack.Screen name="AddRecipients" component={AddRecipientsScreen} />
      <Stack.Screen name="SetCadence" component={SetCadenceScreen} />
    </Stack.Navigator>
  );
}
