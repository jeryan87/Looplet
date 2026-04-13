import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../constants/theme';

// TODO: Phase 3 — 7-day free trial, then $4.99/month or $39.99/year via RevenueCat
export default function PaywallScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Start your free trial</Text>
        <Text style={styles.subtitle}>7 days free, then $4.99/month</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  title: { fontSize: typography.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.base, color: colors.textSecondary },
});
