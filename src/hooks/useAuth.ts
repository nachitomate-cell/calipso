import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

// En mock/demo mode no hay Firebase real — auth es null
const USE_MOCK = !import.meta.env.VITE_FIREBASE_PROJECT_ID

export function useAuth() {
  // Mock mode: siempre "autenticado" para que ProtectedRoute muestre el admin
  const [user, setUser]       = useState<User | null>(USE_MOCK ? ({} as User) : null)
  const [loading, setLoading] = useState(!USE_MOCK)

  useEffect(() => {
    if (USE_MOCK || !auth) return   // noop en demo mode
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
