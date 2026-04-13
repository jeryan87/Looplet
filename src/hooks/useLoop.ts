import { useCallback, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Loop {
  id: string;
  user_id: string;
  name: string;
  child_name: string | null;
  child_pronoun: string;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  reminder_day: number;
  time_zone: string;
  last_sent_at: string | null;
  created_at: string;
}

interface LoopState {
  loop: Loop | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useLoop(session: Session | null): LoopState {
  const [loop, setLoop] = useState<Loop | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLoop = useCallback(async () => {
    if (!session) {
      setLoop(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('loops')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    setLoop(data ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchLoop();
  }, [fetchLoop]);

  return { loop, loading, refetch: fetchLoop };
}
