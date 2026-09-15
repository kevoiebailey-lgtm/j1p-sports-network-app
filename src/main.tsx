import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LogoProvider } from './context/LogoContext.tsx';
import { GlobalErrorBoundary } from './components/Common/GlobalErrorBoundary.tsx';

// Catch and suppress benign Vite HMR WebSocket connection errors in sandbox preview environments
if (typeof window !== 'undefined') {
  const isViteWsError = (err: any): boolean => {
    if (!err) return false;
    const str = typeof err === 'string' ? err : (err.message || err.reason || err.toString?.() || '');
    const stack = err.stack || '';
    return (
      str.includes('WebSocket closed without opened') ||
      str.includes('failed to connect to websocket') ||
      str.includes('WebSocket') ||
      stack.includes('WebSocket')
    );
  };

  const origError = console.error;
  console.error = (...args: any[]) => {
    const combined = args.map(a => (a && (a.message || a.stack || (typeof a === 'string' ? a : ''))) || '').join(' ');
    if (isViteWsError(combined)) return;
    origError(...args);
  };

  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    const combined = args.map(a => (a && (a.message || a.stack || (typeof a === 'string' ? a : ''))) || '').join(' ');
    if (isViteWsError(combined)) return;
    origWarn(...args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isViteWsError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isViteWsError(event.error) || isViteWsError(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Register PWA Service Worker
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('[Just1Play PWA] ServiceWorker registered with scope:', registration.scope);
        },
        (err) => {
          console.warn('[Just1Play PWA] ServiceWorker registration failed:', err);
        }
      );
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider>
        <LogoProvider>
          <App />
        </LogoProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);



