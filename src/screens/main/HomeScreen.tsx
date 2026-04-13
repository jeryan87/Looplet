import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MainStackParamList } from '../../navigation/types';
import { useLoopContext } from '../../contexts/LoopContext';
import { useLetter, createDraftLetter } from '../../hooks/useLetter';
import { supabase } from '../../lib/supabase';
import { PROMPTS } from '../../constants/prompts';
import { colors, typography, spacing, radius } from '../../constants/theme';

const MAX_PHOTOS = 5;
const THUMB_SIZE = 72;

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>;

const CADENCE_LABEL: Record<string, string> = {
  weekly: 'weekly',
  biweekly: 'every two weeks',
  monthly: 'monthly',
};

export default function HomeScreen({ navigation }: Props) {
  const { loop } = useLoopContext();
  const { letter, photos, loading, refetch } = useLetter(loop?.id ?? null);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Refetch every time this screen comes into focus (e.g. returning from WriteResponse)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const responses = letter?.prompt_responses ?? {};
  const filledPromptIds = Object.keys(responses);
  const filledCount = filledPromptIds.length;
  const canSend = filledCount === 3;

  function getPhotoUrl(storagePath: string): string {
    const { data } = supabase.storage.from('letter-photos').getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function ensureDraft(): Promise<string | null> {
    if (letter?.id) return letter.id;
    if (!loop) return null;
    const id = await createDraftLetter(loop.id);
    if (id) await refetch();
    return id;
  }

  async function handleAddPhoto() {
    const letterId = await ensureDraft();
    if (!letterId) return;
    if (photos.length >= MAX_PHOTOS) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    const asset = result.assets[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingPhoto(false); return; }

    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const storagePath = `${user.id}/${letterId}/${Date.now()}.${ext}`;
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('letter-photos')
      .upload(storagePath, blob, { contentType: `image/${ext}` });

    if (uploadError) {
      setUploadingPhoto(false);
      Alert.alert('Upload failed', 'Please try again.');
      return;
    }

    await supabase.from('letter_photos').insert({
      letter_id: letterId,
      storage_path: storagePath,
      sort_order: photos.length,
    });

    await refetch();
    setUploadingPhoto(false);
  }

  async function handleDeletePhoto(photoId: string, storagePath: string) {
    Alert.alert('Remove photo?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.storage.from('letter-photos').remove([storagePath]);
          await supabase.from('letter_photos').delete().eq('id', photoId);
          await refetch();
        },
      },
    ]);
  }

  async function handleAddMoment() {
    if (!loop) return;

    let letterId = letter?.id ?? null;
    if (!letterId) {
      // No draft yet — create one
      letterId = await createDraftLetter(loop.id);
      if (!letterId) return;
      await refetch();
    }
    navigation.navigate('PromptPicker', { letterId });
  }

  async function handleEditPrompt(promptId: string) {
    if (!letter) return;
    navigation.navigate('WriteResponse', { letterId: letter.id, promptId });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.loopName}>{loop?.name ?? 'Your newsletter'}</Text>
            <Text style={styles.cadenceLabel}>
              Sent {CADENCE_LABEL[loop?.cadence ?? 'weekly']}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* This week's letter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This week's letter</Text>

          {/* Filled prompts */}
          {filledPromptIds.map((promptId) => {
            const prompt = PROMPTS.find((p) => p.id === promptId);
            if (!prompt) return null;
            const promptText = prompt.text
              .replace(/{name}/g, loop?.child_name ?? 'them')
              .replace(/{pronoun}/g, loop?.child_pronoun ?? 'they');
            return (
              <TouchableOpacity
                key={promptId}
                style={styles.promptRow}
                onPress={() => handleEditPrompt(promptId)}
                activeOpacity={0.7}
              >
                <View style={styles.promptRowLeft}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.promptText} numberOfLines={2}>
                    {promptText}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}

          {/* Add more prompts (up to 3) */}
          {filledCount < 3 && (
            <TouchableOpacity
              style={styles.addRow}
              onPress={handleAddMoment}
              activeOpacity={0.7}
            >
              <View style={styles.promptRowLeft}>
                <Text style={styles.addIcon}>+</Text>
                <Text style={styles.addText}>
                  {filledCount === 0
                    ? 'Add your first moment'
                    : filledCount === 1
                    ? 'Add another moment'
                    : 'Add one more moment'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Photos */}
        <View style={styles.photoSection}>
          <Text style={styles.photoSectionTitle}>
            Photos ({photos.length}/{MAX_PHOTOS})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                onPress={() => handleDeletePhoto(photo.id, photo.storage_path)}
                style={styles.photoThumb}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: getPhotoUrl(photo.storage_path) }}
                  style={styles.photoImage}
                />
                <View style={styles.photoDeleteBadge}>
                  <Text style={styles.photoDeleteIcon}>×</Text>
                </View>
              </TouchableOpacity>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddPhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.7}
              >
                {uploadingPhoto
                  ? <ActivityIndicator color={colors.primary} />
                  : <Text style={styles.addPhotoIcon}>+</Text>
                }
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Preview & Send */}
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={() => letter && navigation.navigate('Preview', { letterId: letter.id })}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          <Text style={[styles.sendButtonText, !canSend && styles.sendButtonTextDisabled]}>
            {canSend ? 'Preview & Send' : `${filledCount} of 3 moments written`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  headerText: { flex: 1, marginRight: spacing.md },
  loopName: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cadenceLabel: { fontSize: typography.sm, color: colors.textMuted },
  settingsIcon: { fontSize: 22, color: colors.textMuted, paddingTop: 2 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  promptRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  checkmark: { fontSize: typography.base, color: colors.primary, fontWeight: '700', width: 20 },
  addIcon: { fontSize: typography.lg, color: colors.primary, fontWeight: '300', width: 20, textAlign: 'center' },
  promptText: { flex: 1, fontSize: typography.base, color: colors.textPrimary, lineHeight: typography.base * 1.4 },
  addText: { flex: 1, fontSize: typography.base, color: colors.primary, fontWeight: '500' },
  chevron: { fontSize: typography.lg, color: colors.textMuted, marginLeft: spacing.sm },
  photoSection: {
    marginBottom: spacing.lg,
  },
  photoSectionTitle: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  photoRow: { flexDirection: 'row' },
  photoThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
    position: 'relative',
  },
  photoImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
  },
  photoDeleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDeleteIcon: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  addPhotoButton: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addPhotoIcon: { fontSize: 28, color: colors.primary, fontWeight: '300' },
  sendButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: colors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: { color: colors.textInverse, fontSize: typography.base, fontWeight: '600' },
  sendButtonTextDisabled: { color: colors.textMuted },
});
