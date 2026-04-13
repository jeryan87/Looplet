import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.content}>
        {/* Logo mark */}
        <View style={styles.logoMark}>
          <Text style={styles.logoIcon}>✉</Text>
        </View>

        {/* Wordmark */}
        <Text style={styles.appName}>Looplet</Text>
        <Text style={styles.tagline}>Keep your people in the loop.</Text>

        {/* Value props */}
        <View style={styles.valueProps}>
          <ValueProp text="A personal newsletter, not a feed" />
          <ValueProp text="Recipients get a beautiful email — no app needed" />
          <ValueProp text="Your words. Your voice. Never rewritten." />
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Get started — it's free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ValueProp({ text }: { text: string }) {
  return (
    <View style={styles.valuePropRow}>
      <Text style={styles.valuePropDot}>·</Text>
      <Text style={styles.valuePropText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logoIcon: {
    fontSize: 36,
    color: colors.textInverse,
  },
  appName: {
    fontSize: typography.xxxl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: typography.lg * typography.normal,
  },
  valueProps: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  valuePropDot: {
    fontSize: typography.lg,
    color: colors.primary,
    lineHeight: typography.base * typography.normal,
    fontWeight: '700',
  },
  valuePropText: {
    flex: 1,
    fontSize: typography.base,
    color: colors.textSecondary,
    lineHeight: typography.base * typography.normal,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.base,
    fontWeight: '500',
  },
});
