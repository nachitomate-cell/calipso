import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Input } from '../../components/ui/Input'
import { AlertCircle } from 'lucide-react'
import Logo from '../../components/ui/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Intenta nuevamente.')
    } else {
      navigate('/admin')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 font-body">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        <p className="text-center text-white/40 text-xs tracking-widest uppercase mb-6">Panel de Administración</p>

        <form onSubmit={handleLogin} className="bg-white rounded-card p-8 shadow-brand-lg space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="admin@calipso.cl"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="flex items-center gap-2 text-coral-dark bg-coral-light rounded-input px-4 py-3 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-coral hover:bg-coral-hover disabled:opacity-60 text-white font-semibold py-3 rounded-card transition-all duration-200 text-sm tracking-wide uppercase mt-2"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-white/25 text-xs mt-6">
          Modo demo: sin .env activo, el admin es accesible directamente
        </p>
      </div>
    </div>
  )
}
