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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // Success: onAuthStateChange in useAuth fires → RootNavigator switches to Main automatically.
    // If email confirmation is enabled, Supabase will not create a session yet —
    // in that case show a "check your email" message instead.
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

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Free for 7 days, then $4.99/month.</Text>

          <View style={styles.form}>
            <Input
              label="Your name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Jane Smith"
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
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
              placeholder="6+ characters"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Creating account…' : 'Create account'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.switchLinkText}>
              Already have an account?{' '}
              <Text style={styles.switchLinkBold}>Sign in</Text>
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
