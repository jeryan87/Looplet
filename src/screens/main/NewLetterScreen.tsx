import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { useLoopContext } from '../../contexts/LoopContext';
import { useLetter } from '../../hooks/useLetter';
import { PROMPTS } from '../../constants/prompts';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<MainStackParamList, 'PromptPicker'>;

export default function PromptPickerScreen({ navigation, route }: Props) {
  const { letterId } = route.params;
  const { loop } = useLoopContext();
  const { letter } = useLetter(loop?.id ?? null);

  const responses = letter?.prompt_responses ?? {};
  const filledIds = new Set(Object.keys(responses));
  const filledCount = filledIds.size;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>{filledCount} of 3 chosen</Text>
      </View>

      <Text style={styles.title}>What do you want to share?</Text>
      <Text style={styles.subtitle}>Pick a moment from this week. You can always add more later.</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {PROMPTS.map((prompt) => {
          const isFilled = filledIds.has(prompt.id);
          const isDisabled = isFilled || filledCount >= 3;
          const promptText = prompt.text
            .replace(/{name}/g, loop?.child_name ?? 'them')
            .replace(/{pronoun}/g, loop?.child_pronoun ?? 'they');

          return (
            <TouchableOpacity
              key={prompt.id}
              style={[styles.promptRow, isDisabled && styles.promptRowDisabled]}
              onPress={() => {
                if (isDisabled) return;
                navigation.navigate('WriteResponse', { letterId, promptId: prompt.id });
              }}
              activeOpacity={isDisabled ? 1 : 0.7}
            >
              <Text style={[styles.promptText, isDisabled && styles.promptTextDisabled]}>
                {promptText}
              </Text>
              {isFilled ? (
                <Text style={styles.filledBadge}>✓ Written</Text>
              ) : filledCount < 3 ? (
                <Text style={styles.chevron}>›</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  back: { fontSize: typography.base, color: colors.primary, fontWeight: '500' },
  counter: { fontSize: typography.sm, color: colors.textMuted, fontWeight: '500' },
  title: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    lineHeight: typography.base * 1.5,
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.sm },
  promptRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptRowDisabled: { borderColor: colors.borderLight, backgroundColor: colors.background },
  promptText: {
    flex: 1,
    fontSize: typography.base,
    color: colors.textPrimary,
    lineHeight: typography.base * 1.4,
    marginRight: spacing.sm,
  },
  promptTextDisabled: { color: colors.textMuted },
  chevron: { fontSize: typography.lg, color: colors.textMuted },
  filledBadge: {
    fontSize: typography.sm,
    color: colors.primary,
    fontWeight: '600',
  },
});
