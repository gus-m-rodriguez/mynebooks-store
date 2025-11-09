import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import myneblueImage from './assets/myneblue.png'

// Páginas públicas
import HomePage from './pages/HomePage.jsx'
import ProductosPage from './pages/ProductosPage.jsx'
import ProductoDetailPage from './pages/ProductoDetailPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

// Páginas protegidas (usuario)
import ProfilePage from './pages/ProfilePage.jsx'
import CarritoPage from './pages/CarritoPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import OrdenesPage from './pages/OrdenesPage.jsx'
import OrdenDetailPage from './pages/OrdenDetailPage.jsx'
import OrdenSuccessPage from './pages/OrdenSuccessPage.jsx'
import OrdenFailurePage from './pages/OrdenFailurePage.jsx'
import OrdenPendingPage from './pages/OrdenPendingPage.jsx'

// Páginas protegidas (admin)
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx'
import AdminProductosPage from './pages/admin/AdminProductosPage.jsx'
import AdminOrdenesPage from './pages/admin/AdminOrdenesPage.jsx'
import AdminPagosPage from './pages/admin/AdminPagosPage.jsx'
import AdminUsuariosPage from './pages/admin/AdminUsuariosPage.jsx'
import AdminLogsPage from './pages/admin/AdminLogsPage.jsx'

function App() {
  const { isAuth } = useAuth()

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Fondo de marca de agua */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `url(${myneblueImage})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Contenido principal con z-index para estar sobre el fondo */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Routes>
          {/* Rutas públicas - Accesibles para todos */}
            <Route path="/" element={<HomePage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/productos/:id" element={<ProductoDetailPage />} />
          {/* Rutas de catálogo con filtros - Accesibles para todos */}
            <Route path="/catalogo" element={<ProductosPage />} />
            <Route path="/destacados" element={<ProductosPage />} />
            <Route path="/novedades" element={<ProductosPage />} />
            <Route path="/promociones" element={<ProductosPage />} />
          
          {/* Rutas solo para usuarios NO autenticados */}
          <Route element={<ProtectedRoute isAllowed={!isAuth} redirectTo="/catalogo" />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Rutas de resultado de pago (públicas para permitir redirect desde Mercado Pago) */}
          <Route path="/ordenes/:id/success" element={<OrdenSuccessPage />} />
          <Route path="/ordenes/:id/failure" element={<OrdenFailurePage />} />
          <Route path="/ordenes/:id/pending" element={<OrdenPendingPage />} />

          {/* Rutas protegidas (usuario autenticado) */}
          <Route element={<ProtectedRoute isAllowed={isAuth} redirectTo="/login" />}>
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/carrito" element={<CarritoPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/ordenes" element={<OrdenesPage />} />
            <Route path="/ordenes/:id" element={<OrdenDetailPage />} />
          </Route>

          {/* Rutas protegidas (admin) */}
          <Route element={<ProtectedRoute isAllowed={isAuth} redirectTo="/login" requireAdmin />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/productos" element={<AdminProductosPage />} />
            <Route path="/admin/ordenes" element={<AdminOrdenesPage />} />
            <Route path="/admin/pagos" element={<AdminPagosPage />} />
            <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
            <Route path="/admin/logs" element={<AdminLogsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      </div>
    </div>
  )
}

export default App

