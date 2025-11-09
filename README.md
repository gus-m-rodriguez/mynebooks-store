# 📚 MyneBooks Store

**Tu tienda de libros y mangas favorita, desarrollada por otakus para otakus** 🎌✨

[![Stack](https://img.shields.io/badge/Stack-PERN-blue)](https://github.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.2+-61dafb)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791)](https://www.postgresql.org/)

## 🧙‍♂️ Bienvenido, viajero del código

¡Konnichiwa! 👋 

Somos **UTN Wizards**, un grupo de magos del código (wizards, como nuestro nombre lo indica 🧙‍♂️✨) que decidimos combinar nuestra pasión por la programación con nuestro amor por la cultura otaku y los mangas. 

Como verdaderos *wizards* del desarrollo, hemos conjurado este e-commerce usando las artes más poderosas del stack PERN (PostgreSQL, Express, React, Node.js) para crear una experiencia mágica donde cada click te acerca más a encontrar ese manga que tanto buscas o descubrir tu próxima serie favorita.

Este proyecto nació de la idea de que los otakus merecemos una plataforma hecha por otakus, que entienda nuestras necesidades: búsquedas precisas, catálogos organizados, y sobre todo, una experiencia de usuario que haga que comprar mangas sea tan emocionante como leerlos.

**MyneBooks Store** es más que un proyecto académico; es nuestra forma de demostrar que cuando combinas pasión, tecnología y un buen stack, puedes crear algo realmente especial. Cada línea de código fue escrita pensando en la comunidad otaku, porque sabemos lo importante que es tener acceso fácil y rápido a nuestras historias favoritas.

Así que siéntete como en casa, explora el código, contribuye si quieres, y sobre todo... ¡disfruta de la magia que hemos creado! 🎌📚✨

---

## 🎯 ¿Qué es MyneBooks Store?

**MyneBooks Store** es la plataforma de e-commerce que todo otaku necesita para conseguir sus mangas y libros favoritos. Desarrollada con amor y mucho mate 🧉 por el equipo **UTN Wizards**, esta tienda combina lo mejor de la tecnología moderna con una experiencia de usuario que hará que quieras comprar todos los volúmenes de tu serie favorita.

### ✨ Características que te van a encantar

- 🛍️ **Catálogo completo** con búsqueda avanzada y filtros (porque sabemos que buscas ese manga específico)
- 🛒 **Carrito inteligente** que nunca olvida tus productos (aunque cierres el navegador)
- 💳 **Pagos seguros** con Mercado Pago (para que puedas comprar sin preocuparte)
- 👥 **Sistema de roles** bien pensado (Visitante, Cliente, Admin, Super Admin - como en un RPG)
- 📦 **Gestión de stock** con reservas temporales (15 minutos para que no te quiten ese último volumen)
- 📊 **Panel administrativo** completo para los senseis que manejan la tienda
- 📧 **Recuperación de contraseña** por email (porque todos olvidamos nuestras contraseñas)
- 🔒 **Seguridad nivel S** con JWT, bcrypt y bloqueo automático (protección contra ataques)
- 📱 **Diseño responsive** que se ve genial en cualquier dispositivo (móvil, tablet, PC)
- 📝 **Sistema de auditoría** que registra todo (como un log de videojuego)

## 🛠️ Stack Tecnológico (Nuestras herramientas favoritas)

### Frontend (La parte bonita 🎨)
- **React** 18.2+ - Nuestra biblioteca de UI favorita
- **Vite** 4.4+ - Build tool súper rápido (más rápido que Goku)
- **React Router DOM** 7.9+ - Para navegar entre páginas sin recargar
- **Tailwind CSS** 3.3+ - Estilos sin escribir CSS tradicional (magia pura)
- **React Hook Form** 7.45+ - Formularios sin dolor de cabeza
- **Axios** 1.6+ - Para hablar con el backend
- **React Icons** 5.5+ - Iconos bonitos para todo

### Backend (La parte poderosa ⚡)
- **Node.js** 20+ - El motor que hace todo funcionar
- **Express.js** 4.18+ - Framework web minimalista y potente
- **PostgreSQL** 15+ - Base de datos relacional confiable
- **JWT** 9.0+ - Tokens de autenticación seguros
- **bcrypt** 5.1+ - Cifrado de contraseñas (nivel seguridad máxima)
- **Joi** 17.11+ - Validación de datos (porque confiar es bueno, validar es mejor)
- **Nodemailer** 7.0+ - Para enviar emails (recuperación de contraseña, confirmaciones)

### Servicios Externos (Los aliados externos 🤝)
- **AWS S3** - Donde guardamos todas las portadas de los mangas
- **Mercado Pago** - Para que puedas comprar con tranquilidad

## 📁 Estructura del Proyecto (Cómo está organizado todo)

```
PROYECTO INTEGRADOR/
├── backend/                 # El cerebro del sistema 🧠
│   ├── database/
│   │   └── init.sql        # Script para inicializar la BD
│   ├── src/
│   │   ├── controllers/    # La lógica de negocio (donde pasa la magia)
│   │   ├── middlewares/    # Los guardianes (auth, validación, permisos)
│   │   ├── router/         # Las rutas de la API
│   │   ├── schemas/        # Validaciones con Joi
│   │   ├── libs/           # Librerías útiles (JWT, Mercado Pago)
│   │   ├── utils/          # Utilidades varias (email, S3, carrito)
│   │   ├── jobs/           # Jobs automáticos (expirar reservas)
│   │   ├── db.js           # Conexión a PostgreSQL
│   │   ├── config.js       # Configuración centralizada
│   │   ├── app.js          # Configuración de Express
│   │   └── index.js        # Punto de entrada
│   ├── README.md           # Documentación del backend
│   └── package.json
│
├── frontend/                # La cara bonita del sistema 🎨
│   ├── src/
│   │   ├── api/            # Clientes para hablar con el backend
│   │   ├── components/     # Componentes reutilizables
│   │   │   ├── admin/      # Panel administrativo
│   │   │   ├── carrito/    # Todo lo del carrito
│   │   │   ├── layout/     # Navbar, Footer
│   │   │   ├── ordenes/    # Gestión de órdenes
│   │   │   ├── productos/  # Catálogo y productos
│   │   │   └── ui/         # Componentes base (botones, inputs, etc.)
│   │   ├── context/        # Context API (Auth, Cart)
│   │   ├── pages/          # Las páginas de la app
│   │   │   ├── admin/      # Páginas del panel admin
│   │   │   └── ...         # Páginas públicas y protegidas
│   │   ├── styles/         # Estilos globales
│   │   ├── App.jsx         # Componente principal (rutas)
│   │   └── main.jsx        # Punto de entrada
│   ├── index.html
│   ├── vite.config.js      # Configuración de Vite
│   ├── tailwind.config.js  # Configuración de Tailwind
│   ├── README.md           # Documentación del frontend
│   ├── GUIA_PAGO_MERCADO_PAGO.md  # Guía de pagos con MP
│   └── package.json
│
└── DOCUMENTACION/          # La documentación (muy importante 📚)
    ├── Manual_Usuario.md
    ├── Manual_Administrador.md
    ├── SRS_MyneBooks_UTN_Wizards_v1_3_Actualizado.html
    └── diagramas/          # Diagramas del sistema 📊
        ├── README.md       # Guía de diagramas
        ├── 01_gestion_catalogo.puml
        ├── 02_autenticacion_registro.puml
        ├── 03_gestion_carrito.puml
        ├── 04_proceso_compra.puml
        ├── 05_gestion_ordenes.puml
        ├── 06_gestion_perfil.puml
        ├── 07_panel_administrativo.puml
        ├── 08_sistema_procesamiento.puml
        ├── secuencia_01_registro_usuario.puml
        ├── secuencia_02_inicio_sesion.puml
        ├── secuencia_03_agregar_carrito.puml
        ├── secuencia_04_proceso_compra.puml
        ├── secuencia_05_webhook_mercadopago.puml
        ├── secuencia_06_liberar_reservas.puml
        ├── secuencia_07_recuperar_password.puml
        └── secuencia_08_crear_producto_admin.puml
```

## 🚀 Instalación y Configuración (Paso a paso, sin perderte)

### Prerrequisitos (Lo que necesitas antes de empezar)

- **Node.js** 20 o superior (si no lo tienes, descárgalo de [nodejs.org](https://nodejs.org/))
- **PostgreSQL** 15 o superior (nuestra BD favorita)
- **npm** o **yarn** (viene con Node.js)
- Cuenta de **AWS** (para S3) - opcional en desarrollo, puedes usar almacenamiento local
- Cuenta de **Mercado Pago** (sandbox para pruebas o productiva)

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd PROYECTO-INTEGRADOR
```

### 2. Configurar Base de Datos

Primero, asegúrate de tener PostgreSQL corriendo. Luego:

```bash
# Crear la base de datos
createdb mynebooks

# Ejecutar el script de inicialización (esto crea todas las tablas)
psql -d mynebooks -f backend/database/init.sql
```

¡Listo! Tu base de datos está lista para recibir datos. 🎉

### 3. Configurar Backend

```bash
cd backend
npm install
```

Ahora crea un archivo `.env` en la carpeta `backend/` con esto:

**backend/.env:**
```env
# Base de datos (ajusta según tu configuración)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mynebooks
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres

# JWT (usa un string largo y aleatorio, muy importante para seguridad)
JWT_SECRET=tu_secret_jwt_muy_seguro_y_largo_aqui
JWT_EXPIRES_IN=7d

# Mercado Pago (consigue tus credenciales en la dashboard de MP)
MP_ACCESS_TOKEN=tu_access_token_de_mercado_pago
MP_WEBHOOK_SECRET=tu_webhook_secret

# AWS S3 (opcional en desarrollo, puedes dejar esto vacío y usar almacenamiento local)
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-2
AWS_S3_BUCKET=mynebooks-portadas
AWS_S3_BASE_URL=https://mynebooks-portadas.s3.us-east-2.amazonaws.com

# Email (Nodemailer - para recuperación de contraseña)
# Si usas Gmail, necesitas una "App Password" (no tu contraseña normal)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_de_gmail
EMAIL_FROM=noreply@mynebooks.com

# Servidor
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. Configurar Frontend

```bash
cd frontend
npm install
```

Crea un archivo `.env` en la carpeta `frontend/`:

**frontend/.env:**
```env
VITE_API_URL=http://localhost:3000/api
```

### 5. ¡A correr el proyecto! 🏃‍♂️

Abre **dos terminales** (sí, necesitas dos):

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Si todo salió bien, deberías ver:
- Backend corriendo en `http://localhost:3000` 🟢
- Frontend corriendo en `http://localhost:5173` 🟢

¡Abre tu navegador y disfruta! 🎉

## 📖 Cómo usar el sistema

### Para usuarios normales (los compradores de mangas 📖)

1. **Navegar el catálogo**: Ve a `/catalogo` y explora todos los productos disponibles
2. **Buscar ese manga específico**: Usa el buscador en la barra superior (soporta búsqueda por título, autor, etc.)
3. **Crear cuenta**: Regístrate en `/register` (es rápido, prometemos)
4. **Agregar al carrito**: Solo usuarios autenticados pueden agregar productos (por seguridad)
5. **Comprar**: Ve al carrito y procede al checkout
6. **Seguir tu pedido**: Ve a "Mis Órdenes" para ver el estado de tus compras

### Para administradores (los senseis del sistema 👨‍💼)

1. **Iniciar sesión** con tu cuenta de admin
2. **Acceder al panel** desde "Administración" en la barra superior
3. **Gestionar productos**: Agregar, editar o eliminar productos del catálogo
4. **Gestionar órdenes**: Ver y actualizar estados de pedidos
5. **Gestionar usuarios**: Asignar roles y permisos a otros usuarios
6. **Ver estadísticas**: Dashboard con métricas del sistema (ventas, productos, etc.)
7. **Revisar logs**: Auditoría de todas las operaciones (muy útil para debugging)

💡 **Tip**: Si quieres más detalles, tenemos manuales completos en `DOCUMENTACION/`:
- `Manual_Usuario.md` - Guía completa para usuarios
- `Manual_Administrador.md` - Guía completa para admins

## 🔐 Roles y Permisos (Como en un RPG 🎮)

El sistema tiene **4 roles principales** (cada uno con sus poderes):

1. **Visitante** 👤 - Puede navegar el catálogo y registrarse (nivel 1)
2. **Cliente** 🛒 - Puede gestionar carrito, comprar y ver sus órdenes (nivel 2)
3. **Administrador** 👨‍💼 - Acceso al panel según permisos asignados (nivel 3):
   - Dashboard (ver estadísticas)
   - Productos (gestionar catálogo)
   - Órdenes (gestionar pedidos)
   - Usuarios (gestionar usuarios y permisos)
   - Ingresos (ver pagos)
   - Auditoría (ver logs)
4. **Super Administrador** 👑 - Acceso completo a TODO (nivel máximo, solo puede haber uno)

## 🗄️ Base de Datos (Donde vive toda la información)

### Tablas principales

- **usuarios**: Info de usuarios y autenticación
- **productos**: El catálogo completo con stock y precios
- **carrito**: Items del carrito de cada usuario
- **ordenes**: Órdenes de compra con sus estados
- **orden_items**: Items de cada orden (qué productos tiene cada orden)
- **pagos**: Info de pagos de Mercado Pago
- **auditoria**: Logs de todas las operaciones (como un historial)
- **permisos**: Permisos disponibles del sistema
- **permisos_usuarios**: Relación usuarios-permisos (quién tiene qué permisos)

### Reglas de negocio importantes

- **Reserva temporal de stock**: Cuando inicias un pago, el stock se reserva por 15 minutos (TTL). Si no completas el pago, se libera automáticamente.
- **Liberación automática**: Un job periódico verifica y libera reservas expiradas (para que el stock no quede "atrapado").
- **Validación de stock**: Si un producto no tiene stock disponible, no puedes agregarlo al carrito (lógica, ¿no?).
- **Idempotencia de webhooks**: Cada pago de Mercado Pago se procesa solo una vez (evitamos duplicados).

## 🔧 Scripts disponibles (Comandos útiles)

### Backend

```bash
npm run dev      # Modo desarrollo con watch (se recarga automáticamente)
npm start        # Modo producción
npm test         # Tests (pendiente de implementar, pero está en el roadmap)
```

### Frontend

```bash
npm run dev      # Servidor de desarrollo con Vite (súper rápido)
npm run build    # Construir para producción (optimizado y minificado)
npm run preview # Previsualizar el build de producción
npm run lint     # Ejecutar ESLint (para mantener el código limpio)
```

## 🌐 Despliegue (Llevar el proyecto a producción)

El sistema puede desplegarse en varias plataformas:

- **Railway** 🚂 - Genial para backend y base de datos
- **Render** 🎨 - También muy bueno para backend y BD
- **Vercel** ⚡ - Perfecto para frontend (estático)
- **AWS** ☁️ - Para almacenamiento de imágenes (S3)

### Variables de entorno en producción

⚠️ **Importante**: Asegúrate de configurar TODAS las variables de entorno en tu plataforma de despliegue, especialmente:
- Credenciales de base de datos
- JWT_SECRET (¡muy importante para seguridad!)
- Credenciales de Mercado Pago
- Credenciales de AWS S3
- Configuración de email

## 📚 Documentación (Para los que quieren saber más)

Tenemos documentación completa en `DOCUMENTACION/`:

- **SRS (Especificación de Requisitos)**: `SRS_MyneBooks_UTN_Wizards_v1_3_Actualizado.html` - El documento técnico completo
- **Manual de Usuario**: `Manual_Usuario.md` - Guía paso a paso para usuarios
- **Manual de Administrador**: `Manual_Administrador.md` - Guía completa para admins

## 🧪 Testing (Por ahora está en desarrollo)

```bash
# Backend (pendiente de implementar)
cd backend
npm test

# Frontend (pendiente de implementar)
cd frontend
npm test
```

Estamos trabajando en esto, pero por ahora el sistema funciona perfectamente sin tests automatizados. Los tests manuales los hacemos nosotros (y funcionan bien, confía en nosotros 😄).

## 🤝 Contribución

Este es un proyecto académico desarrollado por el equipo **UTN Wizards** como parte del Proyecto Integrador de la UTN FR San Rafael. Si eres parte del equipo o un colaborador, ¡bienvenido! Si no, este proyecto es principalmente para fines académicos.

## 👥 El Equipo (Los otakus detrás del código)

**UTN Wizards** - Un grupo de desarrolladores apasionados por la tecnología y la cultura otaku 🎌

- Víctor Alejandro
- Florencia B.
- Axel
- Franco Cardozo
- Rocío
- Alejandro
- Gustavo
- Brisa

**Revisión Técnica y Funcional:** Gustavo, Franco y Florencia (nuestros senseis técnicos sufridos, que "abandonaron" temporalmente el gamming, manga y anime por este proyecto)  
**Supervisión Académica:** UTN FR San Rafael

## 📄 Licencia

Este proyecto se desarrolla bajo licencia académica y no puede ser distribuido comercialmente. Es parte de nuestro Proyecto Integrador, así que úsalo con responsabilidad.

## 🐛 Problemas conocidos (Cosas que sabemos que faltan)

- Los tests unitarios e integración están pendientes (pero el sistema funciona perfectamente)
- La generación de PDF del catálogo está pendiente (próximamente)
- El sistema de notificaciones por email está configurado pero requiere credenciales válidas de email en caso de querer implementarse en otros espacios

No te preocupes, estos son features que están en el roadmap pero el sistema funciona perfectamente sin ellos.

## 🔮 Próximas mejoras (Roadmap futuro)

- [ ] Implementación de tests unitarios y de integración
- [ ] Generación de PDF del catálogo (para imprimir y tener físico)
- [ ] Sistema de notificaciones push (para avisarte cuando llegue tu manga)
- [ ] Dashboard de analytics avanzado (más gráficos y métricas)
- [ ] Sistema de reseñas y calificaciones (para saber qué mangas son buenos)
- [ ] Wishlist de productos (tu lista de deseos personal)
- [ ] Sistema de cupones y descuentos (porque a todos nos gustan los descuentos)

## 📞 Soporte

¿Tienes dudas? ¿Encontraste un bug? ¿Quieres sugerir una feature?

- Revisa la documentación en `DOCUMENTACION/` primero
- Contacta al equipo UTN Wizards
- O simplemente abre un issue en el repositorio (si está disponible)

---

**Desarrollado con ❤️ y mucho mate 🧉 por UTN Wizards - 2025**

*"Código limpio, mangas ordenados"* 📚✨