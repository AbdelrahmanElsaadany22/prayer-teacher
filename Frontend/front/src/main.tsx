import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthProvider';
import { NotificationsProvider } from './features/notifications/context/NotificationsProvider';
import { LanguageProvider } from './shared/i18n/LanguageProvider';
import { ThemeProvider } from './shared/theme/ThemeProvider';
import { RadiusProvider } from './shared/theme/RadiusProvider';
import { PatternProvider } from './shared/theme/PatternProvider';
import './index.css';
import './theme-switcher.css';
import { router } from './router.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RadiusProvider>
      <PatternProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationsProvider>
            <RouterProvider router={router} />
          </NotificationsProvider>
        </AuthProvider>
      </LanguageProvider>
      </PatternProvider>
      </RadiusProvider>
    </ThemeProvider>
  </StrictMode>,
);
