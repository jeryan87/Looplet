import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { useLoopContext } from '../../contexts/LoopContext';
import { Letter, LetterPhoto } from '../../hooks/useLetter';
import { supabase } from '../../lib/supabase';
import { PROMPTS, formatPrompt } from '../../constants/prompts';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<MainStackParamList, 'Preview'>;

export default function PreviewScreen({ navigation, route }: Props) {
  const { letterId } = route.params;
  const { loop } = useLoopContext();
  const [letter, setLetter] = useState<Letter | null>(null);
  const [photos, setPhotos] = useState<LetterPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: l } = await supabase
        .from('letters').select('*').eq('id', letterId).single();
      const { data: p } = await supabase
        .from('letter_photos').select('*').eq('letter_id', letterId)
        .order('sort_order', { ascending: true });
      setLetter(l as Letter);
      setPhotos((p ?? []) as LetterPhoto[]);
      setLoading(false);
    }
    load();
  }, [letterId]);

  function getPhotoUrl(storagePath: string): string {
    const { data } = supabase.storage.from('letter-photos').getPublicUrl(storagePath);
    return data.publicUrl;
  }

  if (loading || !letter || !loop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const date = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const filledPrompts = PROMPTS.filter((p) => letter.prompt_responses[p.id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Edit</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Preview</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Email card */}
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.emailHeader}>
            <Text style={styles.emailDate}>{date}</Text>
            <Text style={styles.emailLoopName}>{loop.name}</Text>
          </View>

          {/* Body */}
          <View style={styles.emailBody}>
            <Text style={styles.greeting}>Hi there,</Text>

            {filledPrompts.map((prompt) => {
              const promptText = formatPrompt(
                prompt,
                loop.child_name ?? 'them',
                loop.child_pronoun
              );
              return (
                <View key={prompt.id} style={styles.responseSection}>
                  <Text style={styles.responsePromptLabel}>{promptText}</Text>
                  <Text style={styles.responseText}>
                    {letter.prompt_responses[prompt.id]}
                  </Text>
                </View>
              );
            })}

            {/* Photos */}
            {photos.length > 0 && (
              <View style={styles.photoGrid}>
                {photos.map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: getPhotoUrl(photo.storage_path) }}
                    style={[
                      styles.photoGridImage,
                      photos.length === 1 && styles.photoGridImageFull,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Footer */}
            <Text style={styles.emailFooter}>
              You're receiving this because you were added to this newsletter.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.sendBar}>
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => navigation.navigate('Send', { letterId })}
          activeOpacity={0.85}
        >
          <Text style={styles.sendButtonText}>Send it →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  back: { fontSize: typography.base, color: colors.primary, fontWeight: '500', width: 48 },
  topBarTitle: { fontSize: typography.base, fontWeight: '600', color: colors.textPrimary },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  emailHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  emailDate: { fontSize: typography.xs, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  emailLoopName: { fontSize: typography.xl, fontWeight: '700', color: '#fff' },
  emailBody: { padding: spacing.xl },
  greeting: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  responseSection: { marginBottom: spacing.xl },
  responsePromptLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  responseText: {
    fontSize: typography.base,
    color: colors.textPrimary,
    lineHeight: typography.base * 1.7,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  photoGridImage: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  photoGridImageFull: { width: '100%' },
  emailFooter: {
    fontSize: typography.xs,
    color: colors.textMuted,
    lineHeight: typography.xs * 1.6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.lg,
  },
  sendBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  sendButtonText: { color: colors.textInverse, fontSize: typography.base, fontWeight: '600' },
});
