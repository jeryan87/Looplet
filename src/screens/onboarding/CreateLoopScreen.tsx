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
import { SetupStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';
import Input from '../../components/ui/Input';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<SetupStackParamList, 'CreateLoop'>;

const PRONOUNS = [
  { label: 'they/them', value: 'they' },
  { label: 'she/her', value: 'she' },
  { label: 'he/him', value: 'he' },
];

export default function CreateLoopScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [childName, setChildName] = useState('');
  const [pronoun, setPronoun] = useState('they');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!name.trim()) {
      setError('Please give your newsletter a name.');
      return;
    }
    if (!childName.trim()) {
      setError("Please enter your child's name.");
      return;
    }

    setError('');
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error: dbError } = await supabase
      .from('loops')
      .insert({
        user_id: user.id,
        name: name.trim(),
        child_name: childName.trim(),
        child_pronoun: pronoun,
      })
      .select('id')
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError('Something went wrong. Please try again.');
      return;
    }

    navigation.navigate('AddRecipients', { loopId: data.id });
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
          <Text style={styles.step}>Step 1 of 3</Text>
          <Text style={styles.title}>Create your loop</Text>
          <Text style={styles.subtitle}>
            This is your newsletter. Give it a name your family will recognise.
          </Text>

          <View style={styles.form}>
            <Input
              label="Newsletter name"
              value={name}
              onChangeText={setName}
              placeholder="The Smith Family Newsletter"
              autoCapitalize="words"
              returnKeyType="next"
            />
            <Input
              label="Child's name"
              value={childName}
              onChangeText={setChildName}
              placeholder="e.g. Mia"
              autoCapitalize="words"
              returnKeyType="done"
            />

            <View>
              <Text style={styles.pronounLabel}>Pronoun</Text>
              <View style={styles.pillRow}>
                {PRONOUNS.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.pill, pronoun === p.value && styles.pillActive]}
                    onPress={() => setPronoun(p.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.pillText, pronoun === p.value && styles.pillTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Saving…' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  step: {
    fontSize: typography.sm,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: spacing.sm,
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
    lineHeight: typography.base * 1.5,
    marginBottom: spacing.xl,
  },
  form: { gap: spacing.lg },
  pronounLabel: {
    fontSize: typography.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pillRow: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pillTextActive: { color: colors.textInverse },
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
});
