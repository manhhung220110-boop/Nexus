import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { SpotifyCallbackPage } from './pages/SpotifyCallbackPage';
import { HomePage } from './pages/HomePage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { VideoHomePage } from './pages/VideoHomePage';
import { WatchPage } from './pages/WatchPage';
import { MusicPage } from './pages/MusicPage';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/auth/AuthGuard';

function protectedSection(path: string, children: any[]) {
  return {
    path,
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children,
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
  {
    path: '/spotify/callback',
    element: <SpotifyCallbackPage />,
  },
  protectedSection('/home', [
    {
      index: true,
      element: <HomePage />,
    },
  ]),
  protectedSection('/messages', [
    {
      index: true,
      element: <ComingSoonPage title="Tin nhắn" />,
    },
  ]),
  protectedSection('/music', [
    {
      index: true,
      element: <MusicPage />,
    },
  ]),
  protectedSection('/watch', [
    {
      index: true,
      element: <VideoHomePage />,
    },
    {
      path: ':videoId',
      element: <WatchPage />,
    },
  ]),
  protectedSection('/settings', [
    {
      index: true,
      element: <ComingSoonPage title="Cài đặt" />,
    },
  ]),
]);
