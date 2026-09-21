import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useAuthListener } from './hooks/useAuth'

export default function App() {
  useAuthListener()
  return <RouterProvider router={router} />
}
