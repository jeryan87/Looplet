import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../constants/theme';

// TODO: Phase 2 — loop settings, recipients, cadence, subscription management
export default function SettingsScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut();
    // onAuthStateChange fires → RootNavigator switches back to Onboarding automatically.
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>More settings coming soon.</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.85}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.error,
    fontSize: typography.base,
    fontWeight: '500',
  },
});
