'use client';

import React, { Component, ReactNode } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

// 1. Error Boundary to isolate third-party script crashes
export class PayPalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('PayPal SDK failed to load gracefully:', error);
  }

  render() {
    return this.props.children;
  }
}

// Helper to resolve PayPal Client ID safely without 'test' 400 Bad Request
export const getPayPalClientId = (): string => {
  let clientId = '';
  try {
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
      clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    }
  } catch {}
  try {
    if (!clientId && typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID) {
      clientId = (import.meta as any).env.VITE_PAYPAL_CLIENT_ID;
    }
  } catch {}
  try {
    if (!clientId && typeof process !== 'undefined' && process.env?.PAYPAL_CLIENT_ID) {
      clientId = process.env.PAYPAL_CLIENT_ID;
    }
  } catch {}

  // Avoid sending 'test' to avoid fatal 400 Bad Request on live PayPal CDN
  if (!clientId || clientId.trim() === '' || clientId.toLowerCase() === 'test') {
    return 'sb';
  }
  return clientId.trim();
};

// 2. Safe initial options strictly containing ONLY valid PayPal query options.
// Note: 'deferLoading' has been extracted from the options object and passed
// directly as a component prop on <PayPalScriptProvider deferLoading={true}>
// to prevent PayPal CDN from returning HTTP 400 (Disallowed query param: defer-loading).
export const initialPayPalOptions = {
  clientId: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PAYPAL_CLIENT_ID) || getPayPalClientId(),
  currency: 'USD',
  intent: 'capture' as const,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PayPalErrorBoundary>
      <PayPalScriptProvider
        options={initialPayPalOptions}
        deferLoading={true}
      >
        {children}
      </PayPalScriptProvider>
    </PayPalErrorBoundary>
  );
}

export const PayPalSafeProvider = Providers;
export default Providers;
