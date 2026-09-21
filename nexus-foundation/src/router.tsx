import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { HomePage } from './pages/HomePage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/auth/AuthGuard';

function protectedRoute(path: string, element: React.ReactNode) {
  return {
    path,
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: element,
      },
    ],
  };
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/auth/signin',
    element: <SignInPage />,
  },
  {
    path: '/auth/signup',
    element: <SignUpPage />,
  },
  {
    path: '/auth/callback',
    element: <OAuthCallbackPage />,
  },
  protectedRoute('/home', <HomePage />),
  protectedRoute('/messages', <ComingSoonPage title="Tin nhắn" />),
  protectedRoute('/music', <ComingSoonPage title="Âm nhạc" />),
  protectedRoute('/watch', <ComingSoonPage title="Video" />),
  protectedRoute('/settings', <ComingSoonPage title="Cài đặt" />),
]);
