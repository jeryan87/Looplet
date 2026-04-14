import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { useLoop } from '../hooks/useLoop';
import { LoopContext } from '../contexts/LoopContext';
import { colors } from '../constants/theme';

import OnboardingStack from './OnboardingStack';
import SetupStack from './SetupStack';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { loop, loading: loopLoading, refetch } = useLoop(session);

  const loading = authLoading || (session !== null && loopLoading);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LoopContext.Provider value={{ loop, refetch }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {!session ? (
            <Stack.Screen name="Onboarding" component={OnboardingStack} />
          ) : loop === null ? (
            <Stack.Screen name="Setup" component={SetupStack} />
          ) : (
            <Stack.Screen name="Main" component={MainTabNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </LoopContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
