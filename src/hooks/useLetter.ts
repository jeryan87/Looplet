import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Letter {
  id: string;
  loop_id: string;
  status: 'draft' | 'sent';
  prompt_responses: Record<string, string>; // { p2: "text...", p7: "text..." }
  sent_at: string | null;
  created_at: string;
}

export interface LetterPhoto {
  id: string;
  letter_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

interface LetterState {
  letter: Letter | null;
  photos: LetterPhoto[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useLetter(loopId: string | null): LetterState {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [photos, setPhotos] = useState<LetterPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLetter = useCallback(async () => {
    if (!loopId) {
      setLetter(null);
      setPhotos([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: letterData } = await supabase
      .from('letters')
      .select('*')
      .eq('loop_id', loopId)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (letterData) {
      const { data: photoData } = await supabase
        .from('letter_photos')
        .select('*')
        .eq('letter_id', letterData.id)
        .order('sort_order', { ascending: true });

      setLetter(letterData as Letter);
      setPhotos((photoData ?? []) as LetterPhoto[]);
    } else {
      setLetter(null);
      setPhotos([]);
    }

    setLoading(false);
  }, [loopId]);

  useEffect(() => {
    fetchLetter();
  }, [fetchLetter]);

  return { letter, photos, loading, refetch: fetchLetter };
}

// Creates a new draft letter for a loop and returns its id.
export async function createDraftLetter(loopId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('letters')
    .insert({ loop_id: loopId, status: 'draft', prompt_responses: {} })
    .select('id')
    .single();

  if (error || !data) return null;
  return data.id;
}
