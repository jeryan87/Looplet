import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';
import Input from '../../components/ui/Input';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    }
    // Success: onAuthStateChange fires → RootNavigator switches to Main automatically.
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your Looplet account.</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.switchLinkText}>
              Don't have an account?{' '}
              <Text style={styles.switchLinkBold}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  back: { marginBottom: spacing.xl },
  backText: {
    fontSize: typography.base,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  form: { gap: spacing.lg },
  errorText: {
    fontSize: typography.sm,
    color: colors.error,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: '600',
  },
  switchLink: { marginTop: spacing.xl, alignItems: 'center' },
  switchLinkText: {
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  switchLinkBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
