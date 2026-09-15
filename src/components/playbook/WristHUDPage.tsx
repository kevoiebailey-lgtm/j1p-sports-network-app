'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { LiveBroadcastHUD } from '../wristband/LiveBroadcastHUD';
import { WristbandPrintExporter } from '../wristband/WristbandPrintExporter';

export function WristHUDPage() {
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ teamId?: string }>();
  const navigate = useNavigate();

  const teamId = searchParams.get('team') || routeParams.teamId || 'default_team';
  const initialPosition = searchParams.get('pos') || 'QB';

  const [activeSubView, setActiveSubView] = useState<'hud' | 'print'>('hud');

  // Screen Wake Lock on field
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (_) {}
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) {
        try {
          wakeLock.release();
        } catch (_) {}
      }
    };
  }, []);

  if (activeSubView === 'print') {
    return (
      <main className="min-h-screen bg-[#08090C] text-white p-4 sm:p-6 flex flex-col items-center">
        <WristbandPrintExporter
          teamName={`Team ${teamId}`}
          selectedPosition={initialPosition}
          onBack={() => setActiveSubView('hud')}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090C] text-white p-3 sm:p-6 flex flex-col">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
        <LiveBroadcastHUD
          teamId={teamId}
          initialPosition={initialPosition}
          onOpenPrintCard={() => setActiveSubView('print')}
          onOpenPlayLab={() => navigate('/playbook')}
        />
      </div>
    </main>
  );
}

export default WristHUDPage;
