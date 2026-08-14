'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export function useGamblyRealtime(
  channelName: string,
  onEvent?: (payload: unknown) => void
) {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase.channel(channelName);
    if (onEvent) {
      channel.on('broadcast', { event: '*' }, (payload) => onEvent(payload));
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, onEvent]);
}
