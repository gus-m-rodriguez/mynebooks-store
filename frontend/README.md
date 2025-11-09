# 🎨 MyneBooks Frontend

**La cara bonita de MyneBooks Store** ✨

Este es el frontend de **MyneBooks Store**, la interfaz de usuario que hace que comprar mangas sea una experiencia mágica. Desarrollado con **React 18+** y **Vite**, este frontend ofrece una experiencia de usuario fluida, responsive y moderna.

## 🎯 ¿Qué hace este frontend?

Este frontend es como el **protagonista** de la historia: interactúa con los usuarios, muestra el catálogo de forma atractiva, gestiona el carrito de compras, y hace que todo el proceso de compra sea intuitivo y agradable. Todo con diseño responsive que se ve genial en cualquier dispositivo.

### ✨ Características principales

- 🎨 **Diseño moderno** con Tailwind CSS
- 📱 **Completamente responsive** (móvil, tablet, desktop)
- 🛍️ **Catálogo interactivo** con búsqueda y filtros avanzados
- 🛒 **Carrito persistente** que se mantiene entre sesiones
- 🔐 **Autenticación** con JWT y Context API
- 💳 **Checkout integrado** con Mercado Pago
- 👥 **Panel administrativo** completo con permisos
- 🎭 **Rutas protegidas** según rol del usuario
- ⚡ **Carga rápida** gracias a Vite
- 🎯 **Formularios validados** con React Hook Form

## 🛠️ Stack Tecnológico

- **React** 18.2+ - Biblioteca de UI
- **Vite** 4.4+ - Build tool súper rápido
- **React Router DOM** 7.9+ - Enrutamiento
- **Tailwind CSS** 3.3+ - Framework de estilos
- **React Hook Form** 7.45+ - Gestión de formularios
- **Axios** 1.6+ - Cliente HTTP
- **React Icons** 5.5+ - Iconografía
- **js-cookie** 3.0+ - Manejo de cookies

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── api/                  # Clientes API (Axios configurado)
│   │   ├── admin.api.js
│   │   ├── auth.api.js
│   │   ├── axios.js         # Configuración base de Axios
│   │   ├── carrito.api.js
│   │   ├── ordenes.api.js
│   │   ├── productos.api.js
│   │   └── usuarios.api.js
│   ├── components/           # Componentes reutilizables
│   │   ├── admin/           # Componentes del panel admin
│   │   │   └── AdminSubNav.jsx
│   │   ├── carrito/         # Componentes del carrito
│   │   │   ├── CartItem.jsx
│   │   │   └── index.js
│   │   ├── layout/          # Layout principal
│   │   │   ├── Navbar.jsx   # Barra de navegación
│   │   │   └── Footer.jsx   # Pie de página
│   │   ├── ordenes/         # Componentes de órdenes
│   │   │   └── OrdenesSubNav.jsx
│   │   ├── productos/       # Componentes de productos
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductFilters.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   ├── QuantitySelector.jsx
│   │   │   └── index.js
│   │   ├── ui/              # Componentes UI base
│   │   │   ├── Alert.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Loading.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── index.js
│   │   └── ProtectedRoute.jsx  # Componente para rutas protegidas
│   ├── context/             # Context API (estado global)
│   │   ├── AuthContext.jsx  # Context de autenticación
│   │   └── CartContext.jsx  # Context del carrito
│   ├── pages/               # Páginas de la aplicación
│   │   ├── admin/          # Páginas del panel admin
│   │   │   ├── AdminDashboardPage.jsx
│   │   │   ├── AdminLogsPage.jsx
│   │   │   ├── AdminOrdenesPage.jsx
│   │   │   ├── AdminPagosPage.jsx
│   │   │   ├── AdminProductosPage.jsx
│   │   │   └── AdminUsuariosPage.jsx
│   │   ├── CarritoPage.jsx
│   │   ├── CheckoutPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── NotFoundPage.jsx
│   │   ├── OrdenDetailPage.jsx
│   │   ├── OrdenesPage.jsx
│   │   ├── OrdenFailurePage.jsx
│   │   ├── OrdenPendingPage.jsx
│   │   ├── OrdenSuccessPage.jsx
│   │   ├── ProductoDetailPage.jsx
│   │   ├── ProductosPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── ResetPasswordPage.jsx
│   ├── styles/              # Estilos globales
│   │   └── index.css
│   ├── App.jsx              # Componente principal (rutas)
│   └── main.jsx             # Punto de entrada
├── index.html
├── vite.config.js           # Configuración de Vite
├── tailwind.config.js       # Configuración de Tailwind
├── postcss.config.js        # Configuración de PostCSS
└── package.json
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** 20 o superior
- **npm** o **yarn**

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del frontend:

```env
VITE_API_URL=http://localhost:3000/api
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173` 🟢

## 🎨 Páginas y Rutas

### Rutas Públicas (accesibles para todos)

- `/` - Página de inicio (redirige a `/catalogo` si estás autenticado)
- `/productos` - Catálogo de productos
- `/productos/:id` - Detalle de un producto
- `/catalogo` - Catálogo completo
- `/destacados` - Productos destacados
- `/novedades` - Novedades
- `/promociones` - Productos en promoción

### Rutas de Autenticación (solo para NO autenticados)

- `/login` - Iniciar sesión
- `/register` - Registrarse
- `/forgot-password` - Recuperar contraseña
- `/reset-password` - Restablecer contraseña (con token)

### Rutas Protegidas (solo para autenticados)

- `/perfil` - Perfil del usuario
- `/carrito` - Carrito de compras
- `/checkout` - Proceso de pago
- `/ordenes` - Lista de órdenes del usuario
- `/ordenes/:id` - Detalle de una orden
- `/ordenes/:id/success` - Pago exitoso
- `/ordenes/:id/failure` - Pago fallido
- `/ordenes/:id/pending` - Pago pendiente

### Rutas de Administración (solo para admins)

- `/admin` - Dashboard administrativo
- `/admin/productos` - Gestión de productos
- `/admin/ordenes` - Gestión de órdenes
- `/admin/pagos` - Gestión de pagos
- `/admin/usuarios` - Gestión de usuarios
- `/admin/logs` - Logs de auditoría

## 🎭 Sistema de Rutas Protegidas

El componente `ProtectedRoute` maneja el acceso a rutas según:
- **Autenticación**: Usuario debe estar logueado
- **Rol**: Algunas rutas requieren ser admin
- **Permisos**: El panel admin verifica permisos específicos

```jsx
<Route element={<ProtectedRoute isAllowed={isAuth} redirectTo="/login" />}>
  {/* Rutas protegidas */}
</Route>
```

## 🔐 Context API

### AuthContext

Maneja el estado de autenticación:
- `isAuth` - Usuario autenticado
- `user` - Datos del usuario
- `signin()` - Iniciar sesión
- `signout()` - Cerrar sesión
- `signup()` - Registrarse
- `loading` - Estado de carga

### CartContext

Maneja el estado del carrito:
- `cart` - Items del carrito
- `addToCart()` - Agregar producto
- `removeFromCart()` - Eliminar producto
- `updateQuantity()` - Actualizar cantidad
- `clearCart()` - Vaciar carrito

## 🎨 Componentes UI

Componentes reutilizables en `components/ui/`:

- **Button** - Botones estilizados
- **Input** - Inputs con validación
- **Card** - Tarjetas
- **Alert** - Alertas y mensajes
- **Loading** - Indicadores de carga
- **Modal** - Modales

Todos usan **Tailwind CSS** para estilos consistentes.

## 📡 Clientes API

Los clientes API en `api/` están configurados con:
- **Axios** base configurado en `axios.js`
- Interceptores para manejo de errores
- Headers automáticos con tokens
- Manejo de cookies

### Ejemplo de uso

```jsx
import { productosApi } from '../api/productos.api.js'

const productos = await productosApi.getAll()
```

## 🎯 Formularios

Todos los formularios usan **React Hook Form**:
- Validación en tiempo real
- Manejo de errores
- Integración con Tailwind

### Ejemplo

```jsx
const { register, handleSubmit, formState: { errors } } = useForm()

<form onSubmit={handleSubmit(onSubmit)}>
  <Input
    {...register('email', { required: 'Email es requerido' })}
    error={errors.email}
  />
</form>
```

## 🎨 Estilos con Tailwind

El proyecto usa **Tailwind CSS** para todos los estilos:
- Configuración personalizada en `tailwind.config.js`
- Colores personalizados (base-crema, primary, etc.)
- Componentes reutilizables
- Diseño responsive con breakpoints

## 🔧 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo con Vite (súper rápido ⚡)
npm run build    # Construir para producción (optimizado)
npm run preview  # Previsualizar el build de producción
npm run lint     # Ejecutar ESLint (mantener código limpio)
```

## 🌐 Proxy de Desarrollo

Vite está configurado con proxy para desarrollo:
- Requests a `/api` se redirigen a `http://localhost:3000`
- Evita problemas de CORS en desarrollo
- Configurado en `vite.config.js`

## 📱 Diseño Responsive

El frontend está optimizado para:
- **Móviles** (< 640px)
- **Tablets** (640px - 1024px)
- **Desktop** (> 1024px)

Usa breakpoints de Tailwind para adaptarse automáticamente.

## 🎭 Estados de Carga

Todas las páginas manejan estados de:
- **Loading** - Cargando datos
- **Error** - Error al cargar
- **Empty** - Sin datos
- **Success** - Datos cargados

## 🔄 Integración con Mercado Pago

El checkout redirige a Mercado Pago Checkout Pro:
1. Usuario completa datos en `/checkout`
2. Se crea preferencia en backend
3. Redirección a Mercado Pago
4. Retorno a `/ordenes/:id/success` o `/ordenes/:id/failure`

## 🐛 Debugging

Para debugging:
- **React DevTools** - Inspeccionar componentes
- **Redux DevTools** - (no aplica, usamos Context)
- **Network Tab** - Ver requests a la API
- `console.log` - Logs en desarrollo

## 📚 Documentación Adicional

- **SRS**: Ver `../DOCUMENTACION/SRS_MyneBooks_UTN_Wizards_v1_3_Actualizado.html`
- **Manual Usuario**: Ver `../DOCUMENTACION/Manual_Usuario.md`
- **Manual Admin**: Ver `../DOCUMENTACION/Manual_Administrador.md`

## 🎨 Mejores Prácticas

- **Componentes pequeños** y reutilizables
- **Separación de concerns** (lógica vs presentación)
- **Hooks personalizados** cuando sea necesario
- **Validación** en formularios
- **Manejo de errores** en todas las peticiones
- **Loading states** para mejor UX

## 🤝 Contribución

Este frontend es parte del Proyecto Integrador de **UTN Wizards**. Si eres parte del equipo, ¡bienvenido! Si no, este proyecto es principalmente para fines académicos.

## 👥 Equipo

**UTN Wizards** - Los magos detrás del código 🧙‍♂️

- Víctor Alejandro
- Florencia B.
- Axel
- Franco Cardozo
- Rocío
- Alejandro
- Gustavo
- Brisa

---

**Desarrollado con ❤️ y mucho café ☕ por UTN Wizards - 2025**

*"Frontend bonito, UX impecable"* 🎨✨

