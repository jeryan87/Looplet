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

type Props = NativeStackScreenProps<SetupStackParamList, 'AddRecipients'>;

interface Recipient {
  id: string;
  name: string;
  email: string;
}

function makeRow(): Recipient {
  return { id: Math.random().toString(36).slice(2), name: '', email: '' };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AddRecipientsScreen({ navigation, route }: Props) {
  const { loopId } = route.params;
  const [recipients, setRecipients] = useState<Recipient[]>([makeRow()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateRow(id: string, field: 'name' | 'email', value: string) {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function addRow() {
    setRecipients((prev) => [...prev, makeRow()]);
  }

  function removeRow(id: string) {
    if (recipients.length === 1) return;
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleContinue() {
    for (const r of recipients) {
      if (!r.name.trim()) {
        setError('Please enter a name for each recipient.');
        return;
      }
      if (!isValidEmail(r.email.trim())) {
        setError(`"${r.email}" doesn't look like a valid email address.`);
        return;
      }
    }

    setError('');
    setLoading(true);

    const rows = recipients.map((r) => ({
      loop_id: loopId,
      name: r.name.trim(),
      email: r.email.trim().toLowerCase(),
    }));

    const { error: dbError } = await supabase.from('recipients').insert(rows);

    setLoading(false);

    if (dbError) {
      setError('Something went wrong. Please try again.');
      return;
    }

    navigation.navigate('SetCadence', { loopId });
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
          <Text style={styles.step}>Step 2 of 3</Text>
          <Text style={styles.title}>Who gets your letter?</Text>
          <Text style={styles.subtitle}>
            Add the grandparents, family, and friends you want to keep in the loop.
            They'll receive a beautiful email — no app needed.
          </Text>

          <View style={styles.rows}>
            {recipients.map((r, index) => (
              <View key={r.id} style={styles.recipientBlock}>
                <View style={styles.recipientHeader}>
                  <Text style={styles.recipientLabel}>Person {index + 1}</Text>
                  {recipients.length > 1 && (
                    <TouchableOpacity onPress={() => removeRow(r.id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Input
                  label="Name"
                  value={r.name}
                  onChangeText={(v) => updateRow(r.id, 'name', v)}
                  placeholder="Grandma Sue"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <Input
                  label="Email"
                  value={r.email}
                  onChangeText={(v) => updateRow(r.id, 'email', v)}
                  placeholder="sue@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                />
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={addRow} style={styles.addLink}>
            <Text style={styles.addLinkText}>+ Add another person</Text>
          </TouchableOpacity>

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
  rows: { gap: spacing.xl },
  recipientBlock: { gap: spacing.md },
  recipientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipientLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeText: {
    fontSize: typography.sm,
    color: colors.error,
    fontWeight: '500',
  },
  addLink: { marginTop: spacing.lg, alignItems: 'center' },
  addLinkText: {
    fontSize: typography.base,
    color: colors.primary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: '600',
  },
});
