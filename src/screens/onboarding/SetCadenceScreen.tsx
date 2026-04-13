import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SetupStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';
import { useLoopContext } from '../../contexts/LoopContext';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<SetupStackParamList, 'SetCadence'>;

const CADENCES = [
  { label: 'Weekly', value: 'weekly' as const },
  { label: 'Every two weeks', value: 'biweekly' as const },
  { label: 'Monthly', value: 'monthly' as const },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SetCadenceScreen({ route }: Props) {
  const { loopId } = route.params;
  const { refetch } = useLoopContext();

  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [reminderDay, setReminderDay] = useState(0); // 0 = Sunday
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setError('');
    setLoading(true);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { error: dbError } = await supabase
      .from('loops')
      .update({ cadence, reminder_day: reminderDay, time_zone: timeZone })
      .eq('id', loopId);

    if (dbError) {
      setLoading(false);
      setError('Something went wrong. Please try again.');
      return;
    }

    // Trigger RootNavigator to re-evaluate — loop now exists → switches to MainStack
    await refetch();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>When should we remind you?</Text>
        <Text style={styles.subtitle}>
          We'll send you a push notification so you never miss a letter.
        </Text>

        <Text style={styles.sectionLabel}>How often?</Text>
        <View style={styles.pillGroup}>
          {CADENCES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.pill, cadence === c.value && styles.pillActive]}
              onPress={() => setCadence(c.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, cadence === c.value && styles.pillTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Which day?</Text>
        <View style={styles.dayRow}>
          {DAYS.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayPill, reminderDay === index && styles.pillActive]}
              onPress={() => setReminderDay(index)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dayText, reminderDay === index && styles.pillTextActive]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Setting up…' : 'Start sending'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  sectionLabel: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  pillGroup: { gap: spacing.sm, marginBottom: spacing.xl },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pillTextActive: { color: colors.textInverse },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  dayPill: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: '600',
  },
});
