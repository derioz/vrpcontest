import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/ui/toast.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import './seasonal/christmas.css';
import { initSeason } from './seasonal/season';

initSeason();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Vital RP Photo Contest">
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
