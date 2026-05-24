import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { LettersStackParamList } from '../../navigation/types';
import { useLoopContext } from '../../contexts/LoopContext';
import { Letter } from '../../hooks/useLetter';
import { supabase } from '../../lib/supabase';
import { PROMPTS } from '../../constants/prompts';
import { colors, typography, spacing, radius } from '../../constants/theme';

type ArchiveLetter = Letter & {
  letter_photos: Array<{ id: string; storage_path: string; sort_order: number }>;
};

type Props = NativeStackScreenProps<LettersStackParamList, 'Archive'>;

function formatSentDate(sentAt: string): string {
  return new Date(sentAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function getSummaryLine(promptCount: number): string {
  return `${promptCount} moment${promptCount !== 1 ? 's' : ''}`;
}

function getPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from('letter-photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

function getSnippet(letter: ArchiveLetter): string {
  for (const prompt of PROMPTS) {
    const response = letter.prompt_responses[prompt.id];
    if (response) {
      return response.split('\n')[0].slice(0, 120);
    }
  }
  return '';
}

function LetterCard({
  letter,
  onPress,
}: {
  letter: ArchiveLetter;
  onPress: () => void;
}) {
  const promptCount = Object.keys(letter.prompt_responses).length;
  const sortedPhotos = [...(letter.letter_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const snippet = getSnippet(letter);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatSentDate(letter.sent_at!)}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
      <Text style={styles.cardSummary}>{getSummaryLine(promptCount)}</Text>
      {!!snippet && (
        <Text style={styles.cardSnippet} numberOfLines={2}>{snippet}</Text>
      )}
      {sortedPhotos.length > 0 && (
        <View style={styles.cardPhotos}>
          {sortedPhotos.slice(0, 3).map((photo) => (
            <Image
              key={photo.id}
              source={{ uri: getPhotoUrl(photo.storage_path) }}
              style={styles.cardPhotoThumb}
            />
          ))}
          {sortedPhotos.length > 3 && (
            <View style={styles.cardPhotoMore}>
              <Text style={styles.cardPhotoMoreText}>+{sortedPhotos.length - 3}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ArchiveScreen({ navigation }: Props) {
  const { loop } = useLoopContext();
  const [letters, setLetters] = useState<ArchiveLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLetters = useCallback(async () => {
    if (!loop) return;
    setLoading(true);
    const { data } = await supabase
      .from('letters')
      .select('*, letter_photos(id, storage_path, sort_order)')
      .eq('loop_id', loop.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false });
    setLetters((data ?? []) as ArchiveLetter[]);
    setLoading(false);
  }, [loop]);

  useFocusEffect(
    useCallback(() => {
      fetchLetters();
    }, [fetchLetters])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={letters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.title}>Past letters</Text>
        }
        renderItem={({ item }) => (
          <LetterCard
            letter={item}
            onPress={() => navigation.navigate('ArchiveRead', { letterId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No letters sent yet</Text>
            <Text style={styles.emptySubtitle}>
              Your sent letters will appear here. Send your first one from the Home tab.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chevron: { fontSize: typography.lg, color: colors.textMuted },
  cardSummary: {
    fontSize: typography.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  cardSnippet: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: typography.sm * 1.5,
  },
  cardPhotos: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cardPhotoThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
  },
  cardPhotoMore: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPhotoMoreText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.base * 1.5,
  },
});
