import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { HomePage } from './pages/HomePage'
import { AppShell } from './components/layout/AppShell'
import { AuthGuard } from './components/auth/AuthGuard'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/auth/signin', element: <SignInPage /> },
  { path: '/auth/signup', element: <SignUpPage /> },
  { path: '/auth/callback', element: <OAuthCallbackPage /> },
  {
    path: '/home',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [{ index: true, element: <HomePage /> }],
  },
])
