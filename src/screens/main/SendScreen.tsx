import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { useLoopContext } from '../../contexts/LoopContext';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../constants/theme';

type Props = NativeStackScreenProps<MainStackParamList, 'Send'>;

interface Recipient {
  id: string;
  name: string;
  email: string;
}

type SendState = 'idle' | 'sending' | 'success' | 'error';

export default function SendScreen({ navigation, route }: Props) {
  const { letterId } = route.params;
  const { loop } = useLoopContext();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendState, setSendState] = useState<SendState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadRecipients() {
      if (!loop) return;
      const { data } = await supabase
        .from('recipients')
        .select('id, name, email')
        .eq('loop_id', loop.id)
        .order('created_at', { ascending: true });
      setRecipients((data ?? []) as Recipient[]);
      setLoading(false);
    }
    loadRecipients();
  }, [loop]);

  async function handleSend() {
    setSendState('sending');
    setErrorMsg('');

    const { data, error } = await supabase.functions.invoke('send-letter', {
      body: { letterId },
    });

    if (error || !data?.success) {
      setSendState('error');
      setErrorMsg(data?.error ?? error?.message ?? 'Unknown error');
      return;
    }

    setSendState('success');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (sendState === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.successIcon}>✉</Text>
          <Text style={styles.successTitle}>Letter sent!</Text>
          <Text style={styles.successSubtitle}>
            {recipients.length === 1
              ? `${recipients[0].name} will get it shortly.`
              : `${recipients.length} people will get it shortly.`}
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.85}
          >
            <Text style={styles.doneButtonText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Ready to send?</Text>
        <Text style={styles.subtitle}>
          Your letter will be emailed to these people:
        </Text>

        <View style={styles.recipientList}>
          {recipients.map((r) => (
            <View key={r.id} style={styles.recipientRow}>
              <Text style={styles.recipientName}>{r.name}</Text>
              <Text style={styles.recipientEmail}>{r.email}</Text>
            </View>
          ))}
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[styles.sendButton, sendState === 'sending' && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={sendState === 'sending'}
          activeOpacity={0.85}
        >
          {sendState === 'sending'
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.sendButtonText}>
                Send to {recipients.length} {recipients.length === 1 ? 'person' : 'people'}
              </Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  topBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  back: { fontSize: typography.base, color: colors.primary, fontWeight: '500' },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  title: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  recipientList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  recipientRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  recipientName: { fontSize: typography.base, fontWeight: '600', color: colors.textPrimary },
  recipientEmail: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  errorText: {
    fontSize: typography.sm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  sendButtonText: { color: colors.textInverse, fontSize: typography.base, fontWeight: '600' },
  successIcon: { fontSize: 56, marginBottom: spacing.lg },
  successTitle: {
    fontSize: typography.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.full,
  },
  doneButtonText: { color: colors.textInverse, fontSize: typography.base, fontWeight: '600' },
});
