import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import App from '@/App';
import '@/globals.css';

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return;
  try {
    const { worker } = await import('@daltaners/mock-data/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
    console.log('[MSW] Mock Service Worker started');
  } catch (err) {
    console.warn('[MSW] Failed to start Mock Service Worker:', err);
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
});
