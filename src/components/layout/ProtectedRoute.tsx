import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PageLoader } from '../ui/LoadingSpinner'

const USE_MOCK = !import.meta.env.VITE_FIREBASE_PROJECT_ID

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (USE_MOCK) return <>{children}</>
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
