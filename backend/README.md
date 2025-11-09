# 🧙‍♂️ MyneBooks Backend API

**El cerebro mágico detrás de MyneBooks Store** ⚡

Este es el backend de **MyneBooks Store**, la API REST que alimenta toda la magia del e-commerce. Desarrollado con **Express.js** y **PostgreSQL**, este backend maneja autenticación, gestión de productos, carrito de compras, integración con Mercado Pago, y mucho más.

## 🎯 ¿Qué hace este backend?

Este backend es como el **sensei** que coordina todo: desde autenticar usuarios hasta procesar pagos, gestionar stock con reservas temporales, y mantener un sistema de auditoría completo. Todo con seguridad nivel S y código limpio.

### ✨ Características principales

- 🔐 **Autenticación robusta** con JWT y cookies seguras
- 👥 **Sistema de roles y permisos** granular (cliente, admin, super_admin)
- 🛒 **Gestión de carrito** persistente por usuario
- 📦 **Gestión de stock** con reservas temporales (TTL de 15 minutos)
- 💳 **Integración con Mercado Pago** (Checkout Pro + Webhooks)
- 📧 **Sistema de emails** para recuperación de contraseña
- ☁️ **Almacenamiento en AWS S3** para imágenes de productos
- 🔄 **Job automático** para liberar reservas expiradas
- 📝 **Sistema de auditoría** que registra todas las operaciones críticas
- ✅ **Validación de datos** con Joi en todos los endpoints

## 🛠️ Stack Tecnológico

- **Node.js** 20+ - El motor de JavaScript
- **Express.js** 4.18+ - Framework web minimalista y potente
- **PostgreSQL** 15+ - Base de datos relacional confiable
- **JWT** 9.0+ - Tokens de autenticación
- **bcrypt** 5.1+ - Cifrado de contraseñas
- **Joi** 17.11+ - Validación de esquemas
- **Nodemailer** 7.0+ - Envío de emails
- **Mercado Pago SDK** 2.1+ - Integración de pagos
- **AWS SDK S3** 3.927+ - Almacenamiento de archivos
- **Multer** 2.0+ - Manejo de uploads

## 📁 Estructura del Proyecto

```
backend/
├── database/
│   └── init.sql              # Script de inicialización de la BD
├── src/
│   ├── controllers/          # Lógica de negocio (los que hacen el trabajo pesado)
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── carrito.controller.js
│   │   ├── ordenes.controller.js
│   │   ├── pagos.controller.js
│   │   ├── productos.controller.js
│   │   ├── upload.controller.js
│   │   └── usuarios.controller.js
│   ├── middlewares/          # Los guardianes (auth, validación, permisos)
│   │   ├── admin.middleware.js
│   │   ├── auth.middleware.js
│   │   ├── permissions.middleware.js
│   │   ├── superAdmin.middleware.js
│   │   └── validate.middleware.js
│   ├── router/               # Definición de rutas (las puertas de entrada)
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── carrito.routes.js
│   │   ├── ordenes.routes.js
│   │   ├── pagos.routes.js
│   │   ├── productos.routes.js
│   │   └── usuarios.routes.js
│   ├── schemas/              # Validaciones con Joi (los que verifican que todo esté bien)
│   │   ├── auth.schema.js
│   │   ├── carrito.schema.js
│   │   ├── ordenes.schema.js
│   │   ├── pagos.schema.js
│   │   ├── productos.schema.js
│   │   └── usuarios.schema.js
│   ├── libs/                 # Librerías personalizadas
│   │   ├── jwt.js           # Utilidades de JWT
│   │   └── mercadopago.js   # Configuración de Mercado Pago
│   ├── utils/                # Utilidades varias
│   │   ├── carrito.js       # Funciones del carrito
│   │   ├── email.js         # Configuración de Nodemailer
│   │   └── s3.js            # Funciones de AWS S3
│   ├── jobs/                 # Jobs automáticos
│   │   └── expirarReservas.js  # Libera reservas expiradas cada 5 minutos
│   ├── db.js                 # Conexión a PostgreSQL
│   ├── config.js             # Configuración centralizada
│   ├── app.js                # Configuración de Express
│   └── index.js              # Punto de entrada (donde todo comienza)
└── package.json
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** 20 o superior
- **PostgreSQL** 15 o superior
- **npm** o **yarn**

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Base de Datos

Primero, asegúrate de tener PostgreSQL corriendo. Luego:

```bash
# Crear la base de datos
createdb mynebooks

# Ejecutar el script de inicialización
psql -d mynebooks -f database/init.sql
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del backend con las siguientes variables:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mynebooks
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres

# JWT (usa un string largo y aleatorio, muy importante)
JWT_SECRET=tu_secret_jwt_muy_seguro_y_largo_aqui
JWT_EXPIRES_IN=7d

# Mercado Pago
MP_ACCESS_TOKEN=tu_access_token_de_mercado_pago
MP_WEBHOOK_SECRET=tu_webhook_secret

# AWS S3 (opcional en desarrollo)
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-2
AWS_S3_BUCKET=mynebooks-portadas
AWS_S3_BASE_URL=https://mynebooks-portadas.s3.us-east-2.amazonaws.com

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_de_gmail
EMAIL_FROM=noreply@mynebooks.com

# Servidor
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# TTL de reservas (en minutos)
RESERVA_TTL_MINUTOS=15
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000` 🟢

## 📡 Endpoints de la API

### Autenticación (`/api/auth`)
- `POST /register` - Registro de nuevos usuarios
- `POST /login` - Inicio de sesión
- `POST /logout` - Cerrar sesión
- `GET /me` - Obtener información del usuario actual
- `POST /forgot-password` - Solicitar recuperación de contraseña
- `POST /reset-password` - Restablecer contraseña con token

### Productos (`/api/productos`)
- `GET /` - Listar productos (con filtros y paginación)
- `GET /:id` - Obtener producto por ID
- `POST /` - Crear producto (admin)
- `PUT /:id` - Actualizar producto (admin)
- `DELETE /:id` - Eliminar producto (admin)

### Carrito (`/api/carrito`)
- `GET /` - Obtener carrito del usuario
- `POST /` - Agregar producto al carrito
- `PUT /:id` - Actualizar cantidad de un item
- `DELETE /:id` - Eliminar item del carrito
- `DELETE /` - Vaciar carrito completo

### Órdenes (`/api/ordenes`)
- `GET /` - Listar órdenes del usuario
- `GET /:id` - Obtener orden por ID
- `POST /` - Crear nueva orden
- `POST /:id/iniciar-pago` - Iniciar proceso de pago (reserva stock)

### Pagos (`/api/pagos`)
- `POST /webhook` - Webhook de Mercado Pago (procesa notificaciones)
- `GET /:id` - Obtener información de un pago

### Usuarios (`/api/usuarios`)
- `GET /` - Listar usuarios (admin)
- `GET /:id` - Obtener usuario por ID
- `PUT /:id` - Actualizar usuario
- `PUT /:id/rol` - Cambiar rol de usuario (admin)
- `PUT /:id/permisos` - Asignar permisos (admin)

### Administración (`/api/admin`)
- `GET /dashboard` - Estadísticas del sistema
- `GET /logs` - Logs de auditoría
- `GET /ingresos` - Información de pagos

### Upload (`/api/upload`)
- `POST /` - Subir imagen de producto (admin)

## 🔐 Sistema de Autenticación

El backend utiliza **JWT (JSON Web Tokens)** para autenticación:

1. **Login**: El usuario envía email y contraseña
2. **Validación**: Se verifica con bcrypt
3. **Token**: Se genera un JWT firmado
4. **Cookie**: El token se envía en una cookie httpOnly y secure
5. **Middleware**: `auth.middleware.js` verifica el token en cada request protegido

### Bloqueo automático

- Tras **5 intentos fallidos** de login, la cuenta se bloquea por 30 minutos
- El contador se reinicia al iniciar sesión exitosamente

## 📦 Gestión de Stock con Reservas

El sistema implementa un mecanismo inteligente de reservas temporales:

1. **Crear orden**: Estado `pendiente`, sin reserva de stock
2. **Iniciar pago**: Estado `en_pago`, stock se reserva por 15 minutos (TTL)
3. **Pago exitoso**: Estado `pagado`, stock se descuenta permanentemente
4. **Pago fallido/expirado**: Stock se libera automáticamente

### Job automático

Un job se ejecuta cada **5 minutos** para:
- Buscar órdenes `en_pago` con `fecha_expiracion` vencida
- Liberar el stock reservado
- Reactivar el carrito del usuario
- Cambiar estado a `pendiente`

## 💳 Integración con Mercado Pago

### Flujo de pago

1. Usuario crea orden y la inicia
2. Backend crea preferencia en Mercado Pago
3. Usuario es redirigido a Checkout Pro
4. Mercado Pago envía webhook con resultado
5. Backend procesa webhook (idempotente)
6. Stock se actualiza según resultado

### Webhooks

El endpoint `/api/pagos/webhook` procesa notificaciones de Mercado Pago:
- Verifica firma del webhook
- Procesa solo una vez (idempotencia con `mp_id`)
- Actualiza estado de orden y pago
- Libera o descuenta stock según resultado

## 📧 Sistema de Emails

Utiliza **Nodemailer** para:
- **Recuperación de contraseña**: Envía token por email
- **Confirmaciones**: (pendiente de implementar)

### Configuración Gmail

Para usar Gmail, necesitas crear una **App Password**:
1. Ve a tu cuenta de Google
2. Seguridad → Verificación en 2 pasos
3. Contraseñas de aplicaciones
4. Genera una nueva para "Correo"

## ☁️ Almacenamiento en AWS S3

Las imágenes de productos se almacenan en S3:
- Upload mediante `multer` y `@aws-sdk/client-s3`
- URLs públicas para acceso desde el frontend
- Configuración opcional (puedes usar almacenamiento local en desarrollo)

## 🔧 Scripts Disponibles

```bash
npm run dev      # Modo desarrollo con watch (se recarga automáticamente)
npm start        # Modo producción
npm test         # Tests (pendiente de implementar)
```

## 🗄️ Base de Datos

### Tablas principales

- **usuarios**: Información de usuarios y autenticación
- **productos**: Catálogo con stock y precios
- **carrito**: Items del carrito por usuario
- **ordenes**: Órdenes con estados y TTL
- **orden_items**: Items de cada orden
- **pagos**: Información de pagos de Mercado Pago
- **auditoria**: Logs de operaciones
- **permisos**: Permisos del sistema
- **permisos_usuarios**: Relación usuarios-permisos

### Reglas de negocio

- **Reserva temporal**: Stock se reserva por 15 minutos al iniciar pago
- **Validación de stock**: No se pueden agregar productos sin stock al carrito
- **Idempotencia**: Webhooks se procesan solo una vez
- **Un solo Super Admin**: Restricción a nivel de BD y código

## 🛡️ Seguridad

- **JWT** con cookies httpOnly y secure
- **bcrypt** para hash de contraseñas (10 rounds)
- **Validación** con Joi en todos los endpoints
- **CORS** configurado para el frontend
- **Rate limiting** (pendiente de implementar)
- **Sanitización** de inputs

## 🐛 Debugging

El backend usa `morgan` para logging de requests:
- Formato: `combined`
- Muestra: método, URL, status, tiempo de respuesta

Para ver logs más detallados, agrega `console.log` en los controladores.

## 📚 Documentación Adicional

- **SRS**: Ver `../DOCUMENTACION/SRS_MyneBooks_UTN_Wizards_v1_3_Actualizado.html`
- **Manual Admin**: Ver `../DOCUMENTACION/Manual_Administrador.md`

## 🤝 Contribución

Este backend es parte del Proyecto Integrador de **UTN Wizards**. Si eres parte del equipo, ¡bienvenido! Si no, este proyecto es principalmente para fines académicos.

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

*"Backend robusto, código limpio"* ⚡✨

