import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<MainStackParamList, 'IntroOutro'>;

const AUTOSAVE_DELAY_MS = 800;

const FIELD_META = {
  intro: {
    title: 'Opening',
    hint: "A note to kick off the letter — how the week started, what's been on your mind, a quick hello.",
    placeholder: "Dear family,\n\nWhat a week it's been\u2026",
  },
  outro: {
    title: 'Closing',
    hint: 'Wrap things up — a warm sign-off, a thought you want to leave them with.',
    placeholder: 'Sending love from our corner of the world…',
  },
};

export default function IntroOutroScreen({ navigation, route }: Props) {
  const { letterId, field } = route.params;
  const meta = FIELD_META[field];

  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing value on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('letters')
        .select(field)
        .eq('id', letterId)
        .single();
      if (data) setText((data as Record<string, string>)[field] ?? '');
      setLoaded(true);
    }
    load();
  }, [letterId, field]);

  const save = useCallback(async (value: string) => {
    setSaving(true);
    await supabase.from('letters').update({ [field]: value }).eq('id', letterId);
    setSaving(false);
  }, [letterId, field]);

  function handleTextChange(value: string) {
    setText(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(value), AUTOSAVE_DELAY_MS);
  }

  async function handleSaveAndDone() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await save(text);
    navigation.navigate('Home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.flex}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.back}>← Back</Text>
            </TouchableOpacity>
            {saving && <Text style={styles.savingText}>Saving…</Text>}
          </View>

          {/* Title + hint */}
          <Text style={styles.sectionLabel}>{meta.title}</Text>
          <Text style={styles.hint}>{meta.hint}</Text>

          {/* Text input */}
          {loaded && (
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={handleTextChange}
              multiline
              placeholder={meta.placeholder}
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
              autoFocus={!text}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Fixed Save & done */}
      <View style={styles.saveBar}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveAndDone}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving…' : 'Save & done'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  back: { fontSize: typography.base, color: colors.primary, fontWeight: '500' },
  savingText: { fontSize: typography.sm, color: colors.textMuted },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    lineHeight: typography.sm * 1.5,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    fontSize: typography.base,
    color: colors.textPrimary,
    lineHeight: typography.base * 1.7,
    textAlignVertical: 'top',
  },
  saveBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.textInverse, fontSize: typography.base, fontWeight: '600' },
});
