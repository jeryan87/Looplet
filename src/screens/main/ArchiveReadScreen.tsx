import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LettersStackParamList } from '../../navigation/types';
import { useLoopContext } from '../../contexts/LoopContext';
import { Letter } from '../../hooks/useLetter';
import { supabase } from '../../lib/supabase';
import { PROMPTS, formatPrompt } from '../../constants/prompts';
import { colors, typography, spacing, radius } from '../../constants/theme';

// Concrete pixel sizes for photos — avoids % + aspectRatio inside overflow:hidden
const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_GAP = spacing.sm;
const PHOTO_SIZE = Math.floor((SCREEN_WIDTH - spacing.xl * 4 - PHOTO_GAP) / 2);
const PHOTO_FULL = SCREEN_WIDTH - spacing.xl * 4;

type ArchivePhoto = { id: string; storage_path: string; sort_order: number };
type LetterWithPhotos = Letter & { letter_photos: ArchivePhoto[] };

type Props = NativeStackScreenProps<LettersStackParamList, 'ArchiveRead'>;

export default function ArchiveReadScreen({ navigation, route }: Props) {
  const { letterId } = route.params;
  const { loop } = useLoopContext();
  const [letter, setLetter] = useState<LetterWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: rows } = await supabase
        .from('letters')
        .select('*, letter_photos(id, storage_path, sort_order)')
        .eq('id', letterId);
      const raw = (rows?.[0] ?? null) as LetterWithPhotos | null;
      setLetter(raw);
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

  const date = letter.sent_at
    ? new Date(letter.sent_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'Sent';

  const filledPrompts = PROMPTS.filter((p) => letter.prompt_responses[p.id]);
  const sortedPhotos = [...(letter.letter_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Letters</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Sent letter</Text>
        <View style={{ width: 80 }} />
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
            {/* Intro */}
            {letter.show_intro && !!letter.intro && (
              <View style={styles.introOutroSection}>
                <Text style={styles.introOutroText}>{letter.intro}</Text>
              </View>
            )}

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

            {/* Outro */}
            {letter.show_outro && !!letter.outro && (
              <View style={styles.introOutroSection}>
                <Text style={styles.introOutroText}>{letter.outro}</Text>
              </View>
            )}

            {/* Photos */}
            {sortedPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {sortedPhotos.map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: getPhotoUrl(photo.storage_path) }}
                    style={[
                      styles.photoGridImage,
                      sortedPhotos.length === 1 && styles.photoGridImageFull,
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
  back: { fontSize: typography.base, color: colors.primary, fontWeight: '500', width: 80 },
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
  introOutroSection: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  introOutroText: {
    fontSize: typography.base,
    color: colors.textPrimary,
    lineHeight: typography.base * 1.7,
    fontStyle: 'italic',
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
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.sm,
  },
  photoGridImageFull: {
    width: PHOTO_FULL,
    height: PHOTO_FULL,
  },
  emailFooter: {
    fontSize: typography.xs,
    color: colors.textMuted,
    lineHeight: typography.xs * 1.6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.lg,
  },
});
