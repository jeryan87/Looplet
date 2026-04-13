import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MainStackParamList } from '../../navigation/types';
import { useLoopContext } from '../../contexts/LoopContext';
import { useLetter } from '../../hooks/useLetter';
import { supabase } from '../../lib/supabase';
import { PROMPTS, formatPrompt } from '../../constants/prompts';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<MainStackParamList, 'WriteResponse'>;

const MAX_PHOTOS = 5;
const AUTOSAVE_DELAY_MS = 800;

export default function WriteResponseScreen({ navigation, route }: Props) {
  const { letterId, promptId } = route.params;
  const { loop } = useLoopContext();
  const { letter, photos, refetch } = useLetter(loop?.id ?? null);

  const prompt = PROMPTS.find((p) => p.id === promptId);
  const promptText = prompt && loop
    ? formatPrompt(prompt, loop.child_name ?? 'them', loop.child_pronoun)
    : '';

  const [text, setText] = useState(letter?.prompt_responses[promptId] ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill text once letter loads
  useEffect(() => {
    if (letter?.prompt_responses[promptId] !== undefined) {
      setText(letter.prompt_responses[promptId]);
    }
  }, [letter, promptId]);

  const saveResponse = useCallback(async (value: string) => {
    setSaving(true);
    // Use Postgres jsonb merge operator via rpc or manual merge
    const current = letter?.prompt_responses ?? {};
    const updated = { ...current, [promptId]: value };
    await supabase
      .from('letters')
      .update({ prompt_responses: updated })
      .eq('id', letterId);
    setSaving(false);
  }, [letter, letterId, promptId]);

  function handleTextChange(value: string) {
    setText(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveResponse(value), AUTOSAVE_DELAY_MS);
  }

  async function handleSaveAndDone() {
    // Flush any pending debounced save immediately
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveResponse(text);
    navigation.navigate('Home');
  }

  async function handleRemovePrompt() {
    Alert.alert(
      'Remove this moment?',
      'Your response will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const current = letter?.prompt_responses ?? {};
            const updated = { ...current };
            delete updated[promptId];
            await supabase
              .from('letters')
              .update({ prompt_responses: updated })
              .eq('id', letterId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  async function handleAddPhoto() {
    if (photos.length >= MAX_PHOTOS) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);

    const asset = result.assets[0];
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploadingPhoto(false); return; }

    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    const storagePath = `${session.user.id}/${letterId}/${Date.now()}.jpg`;
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => resolve(xhr.response as ArrayBuffer);
      xhr.onerror = () => reject(new Error('XHR read failed'));
      xhr.open('GET', manipulated.uri);
      xhr.send();
    });

    const { error: uploadError } = await supabase.storage
      .from('letter-photos')
      .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg' });

    if (uploadError) {
      setUploadingPhoto(false);
      Alert.alert('Upload failed', uploadError.message);
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

  function getPhotoUrl(storagePath: string): string {
    const { data } = supabase.storage.from('letter-photos').getPublicUrl(storagePath);
    return data.publicUrl;
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
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.back}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              {saving && <Text style={styles.savingText}>Saving…</Text>}
              {letter?.prompt_responses[promptId] !== undefined && (
                <TouchableOpacity onPress={handleRemovePrompt} style={styles.removeButton}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Prompt */}
          <Text style={styles.promptLabel}>Prompt</Text>
          <Text style={styles.promptText}>{promptText}</Text>

          {/* Text input */}
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={handleTextChange}
            multiline
            placeholder="Write your response here…"
            placeholderTextColor={colors.textMuted}
            textAlignVertical="top"
            autoFocus={!text}
          />

          {/* Photos */}
          <View style={styles.photosSection}>
            <Text style={styles.photosLabel}>
              Photos ({photos.length}/{MAX_PHOTOS})
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => handleDeletePhoto(photo.id, photo.storage_path)}
                  style={styles.photoThumb}
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
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Save & done button */}
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

const THUMB_SIZE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  back: { fontSize: typography.base, color: colors.primary, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  savingText: { fontSize: typography.sm, color: colors.textMuted },
  removeButton: { paddingVertical: 4 },
  removeText: { fontSize: typography.sm, color: colors.error, fontWeight: '500' },
  promptLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  promptText: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: typography.xl * 1.3,
    marginBottom: spacing.xl,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.textPrimary,
    lineHeight: typography.base * 1.6,
    minHeight: 200,
    marginBottom: spacing.xl,
  },
  photosSection: {},
  photosLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  photoRow: { flexDirection: 'row', paddingTop: 8 },
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
