import { Routes, Route, useLocation } from 'react-router-dom'
import PublicNav from './components/layout/PublicNav'
import Footer from './components/layout/Footer'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Home from './pages/Home'
import Menu from './pages/Menu'
import Reservations from './pages/Reservations'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import MenuAdmin from './pages/admin/MenuAdmin'
import TablesAdmin from './pages/admin/TablesAdmin'
import ReservationsAdmin from './pages/admin/ReservationsAdmin'

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')

  if (isAdmin && pathname !== '/admin/login') {
    return (
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="carta" element={<MenuAdmin />} />
                  <Route path="mesas" element={<TablesAdmin />} />
                  <Route path="reservas" element={<ReservationsAdmin />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/carta" element={<PublicLayout><Menu /></PublicLayout>} />
      <Route path="/reservas" element={<PublicLayout><Reservations /></PublicLayout>} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="carta" element={<MenuAdmin />} />
                <Route path="mesas" element={<TablesAdmin />} />
                <Route path="reservas" element={<ReservationsAdmin />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
