import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthProvider';
import { NotificationsProvider } from './features/notifications/context/NotificationsProvider';
import { LanguageProvider } from './shared/i18n/LanguageProvider';
import './index.css';
import { router } from './router.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <NotificationsProvider>
          <RouterProvider router={router} />
        </NotificationsProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
);
