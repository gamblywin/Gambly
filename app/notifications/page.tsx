'use client';
import { useCallback, useState } from 'react';
import { FeaturePage } from '@/components/FeaturePage';
import { useGamblyRealtime } from '@/hooks/useGamblyRealtime';

export default function Page(){
  const [,setTick]=useState(0);
  const onEvent=useCallback(()=>setTick(x=>x+1),[]);
  useGamblyRealtime('gambly-notifications', onEvent);
  return <FeaturePage kind="notifications" />;
}
