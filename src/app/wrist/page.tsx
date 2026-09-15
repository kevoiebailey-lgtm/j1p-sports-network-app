import React from 'react';
import WristHUDPage from '../../components/playbook/WristHUDPage';

/**
 * Dedicated Mobile Wrist Route (/wrist)
 * Optimized for arm sleeves, wrist mounts, and smartwatches.
 * Pure text real-time HUD syncing with coach sideline dispatcher.
 */
export default function WristPage() {
  return <WristHUDPage />;
}

export { WristPage, WristHUDPage };

