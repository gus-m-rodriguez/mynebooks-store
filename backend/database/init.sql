-- Base de datos para MyneBooks Store
-- PostgreSQL 15+
-- Basado en el SRS v1.2 - Diccionario de Datos

-- Crear base de datos (ejecutar manualmente)
-- CREATE DATABASE mynebooks;

-- Tabla de usuarios (según diccionario: id_usuario, nombre/apellido, email, password_hash, rol)
-- Agregado: es_super_admin para identificar al Administrador General, direccion_envio para envíos
-- Agregado: intentos_fallidos y cuenta_bloqueada_hasta para bloqueo automático tras 5 intentos fallidos
-- Roles: 'cliente', 'admin', 'super_admin'
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    direccion_envio VARCHAR(500), -- Dirección de envío del usuario (opcional, se puede actualizar en perfil)
    rol VARCHAR(20) DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin', 'super_admin')),
    es_super_admin BOOLEAN DEFAULT false,
    intentos_fallidos INTEGER DEFAULT 0 CHECK (intentos_fallidos >= 0), -- Contador de intentos fallidos de inicio de sesión
    cuenta_bloqueada_hasta TIMESTAMP NULL, -- Timestamp hasta cuando la cuenta está bloqueada (NULL = no bloqueada)
    reset_password_token VARCHAR(255) NULL, -- Token para restablecimiento de contraseña
    reset_password_expires TIMESTAMP NULL, -- Expiración del token de restablecimiento (1 hora)
    -- Restricción: solo puede haber un super admin (se valida en código también)
    CONSTRAINT check_super_admin CHECK (
        (es_super_admin = true AND rol = 'super_admin') OR 
        (es_super_admin = false)
    )
);

-- Tabla de productos (según diccionario: id_producto, titulo, autor, categoria, precio, stock, stock_reserved, imagen_url)
-- IMPORTANTE: categoria es VARCHAR(100) directo, NO es FK según el diccionario
-- Agregado: fecha_creacion para ordenar por novedades, descripcion para detalle de producto, precio_promocional para promociones
CREATE TABLE IF NOT EXISTS productos (
    id_producto SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(150) NOT NULL,
    categoria VARCHAR(100),
    precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
    precio_promocional DECIMAL(10, 2) CHECK (precio_promocional >= 0 AND precio_promocional < precio),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_reserved INTEGER NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
    imagen_url TEXT,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Restricción de integridad: stock - stock_reserved >= 0
    CONSTRAINT check_stock_available CHECK (stock - stock_reserved >= 0)
);

-- Tabla de carrito (no está en diccionario pero es necesaria para el flujo)
-- Regla de negocio: productos sin stock no pueden agregarse al carrito
CREATE TABLE IF NOT EXISTS carrito (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    activo BOOLEAN DEFAULT true,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de órdenes (según diccionario: id_orden, id_usuario, fecha_creacion, estado)
-- Agregado: fecha_expiracion para manejar TTL de reservas temporales, direccion_envio para envío
-- Estados:
--   'pendiente': Orden creada, sin reserva de stock aún
--   'en_pago': Proceso de pago iniciado, stock reservado
--   'pagado': Pago exitoso, stock descontado
--   'en_envio': Orden enviada al comprador
--   'entregada': Orden entregada al comprador
--   'cancelado': Usuario canceló, stock liberado
--   'rechazado': MP rechazó (sin fondos), stock liberado
--   'error': Error en proceso, stock reservado hasta intervención admin
--   'expirada': TTL vencido sin pago, stock liberado (NOTA: el job automático vuelve a 'pendiente' y reactiva carrito)
CREATE TABLE IF NOT EXISTS ordenes (
    id_orden SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP, -- TTL para reservas temporales (ej: 15 min desde inicio de pago)
    direccion_envio VARCHAR(500) NOT NULL, -- Dirección de envío (requerida antes de iniciar pago)
    estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_pago', 'pagado', 'en_envio', 'entregada', 'cancelado', 'cancelada_usuario', 'cancelada_administrador', 'cancelada_mp', 'rechazado', 'error', 'expirada'))
);

-- Tabla de items de orden (según diccionario: id_item, id_orden, id_producto, cantidad, precio_unitario)
-- Regla de integridad: cantidad <= stock - stock_reserved
CREATE TABLE IF NOT EXISTS orden_items (
    id_item SERIAL PRIMARY KEY,
    id_orden INTEGER NOT NULL REFERENCES ordenes(id_orden) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario >= 0)
);

-- Tabla de pagos (según diccionario: id_pago, id_orden, mp_id, estado, monto, fecha_pago)
CREATE TABLE IF NOT EXISTS pagos (
    id_pago SERIAL PRIMARY KEY,
    id_orden INTEGER NOT NULL REFERENCES ordenes(id_orden) ON DELETE CASCADE,
    mp_id VARCHAR(100),
    estado VARCHAR(50),
    monto DECIMAL(10, 2) NOT NULL CHECK (monto >= 0),
    fecha_pago TIMESTAMP
);

-- Tabla de auditoría (según diccionario: id_evento, tipo, usuario, fecha)
CREATE TABLE IF NOT EXISTS auditoria (
    id_evento SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    usuario VARCHAR(100),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_carrito_usuario ON carrito(usuario_id);
CREATE INDEX IF NOT EXISTS idx_carrito_activo ON carrito(activo);
-- Índice único parcial: solo un producto activo por usuario a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_carrito_usuario_producto_activo 
    ON carrito(usuario_id, producto_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_ordenes_usuario ON ordenes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_expiracion ON ordenes(fecha_expiracion) WHERE estado = 'en_pago';
CREATE INDEX IF NOT EXISTS idx_orden_items_orden ON orden_items(id_orden);
CREATE INDEX IF NOT EXISTS idx_pagos_orden ON pagos(id_orden);
-- Índice único para mp_id para garantizar idempotencia de webhooks
-- Solo aplica cuando mp_id no es NULL (permite múltiples NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_mp_id_unique ON pagos(mp_id) WHERE mp_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_super_admin ON usuarios(es_super_admin) WHERE es_super_admin = true;

-- Comentarios sobre reglas de negocio implementadas:
-- 1. stock_reserved: unidades reservadas temporalmente al INICIAR proceso de pago (TTL configurable, ej: 15 min)
-- 2. stock - stock_reserved >= 0: garantiza disponibilidad coherente
-- 3. Los productos sin stock (stock - stock_reserved = 0) no pueden agregarse al carrito
-- 4. La disponibilidad visible en catálogo = stock - stock_reserved
-- 5. El stock definitivo se descuenta solo cuando estado = 'pagado'
-- 6. Estados que liberan stock_reserved: 'cancelado', 'rechazado', 'expirada'
--    Cuando se cancela/rechaza una orden 'en_pago', también se reactiva el carrito del usuario
-- 7. Estado 'error': mantiene stock_reserved hasta intervención de administrador
-- 8. fecha_expiracion: se calcula al INICIAR pago (no al crear orden) = fecha_inicio_pago + TTL
-- 9. Un job periódico verifica órdenes 'en_pago' que superaron fecha_expiracion:
--    - Vuelve la orden a estado 'pendiente' (como si el usuario cancelara)
--    - Libera stock_reserved
--    - Reactiva el carrito del usuario (vuelve los items al carrito)
--    - Limpia fecha_expiracion
-- 10. Flujo: crearOrden (pendiente, sin reserva) -> iniciarPago (en_pago, con reserva) -> resultado (pagado/cancelado/rechazado/error)
-- 11. Si expira 'en_pago': vuelve a 'pendiente' y reactiva carrito (el usuario puede intentar pagar de nuevo)

-- Tabla de permisos administrativos
-- Permisos sobre áreas administrativas:
-- - manejo_stock: Gestion de stock de productos
-- - carga_catalogo: Crear, modificar y eliminar productos del catalogo
-- - listas_precios: Definir y modificar listas de precios
-- - impresion_pdf: Generar catalogo en PDF
-- - admin_ordenes: Administrar ordenes de pedido
-- - acceso_logs: Acceso a logs de auditoria
CREATE TABLE IF NOT EXISTS permisos (
    id_permiso SERIAL PRIMARY KEY,
    nombre_permiso VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT
);

-- Tabla de relación usuarios-permisos
CREATE TABLE IF NOT EXISTS permisos_usuarios (
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_permiso INTEGER NOT NULL REFERENCES permisos(id_permiso) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_permiso)
);

-- Índices para permisos_usuarios (después de crear la tabla)
CREATE INDEX IF NOT EXISTS idx_permisos_usuarios_usuario ON permisos_usuarios(id_usuario);
CREATE INDEX IF NOT EXISTS idx_permisos_usuarios_permiso ON permisos_usuarios(id_permiso);

-- Insertar permisos disponibles
-- Los permisos representan acceso a paneles administrativos específicos
INSERT INTO permisos (nombre_permiso, descripcion) VALUES
    ('Dashboard', 'Acceso al panel de dashboard administrativo'),
    ('Productos', 'Acceso al panel de gestion de productos'),
    ('Ordenes', 'Acceso al panel de gestion de ordenes'),
    ('Usuarios', 'Acceso al panel de gestion de usuarios'),
    ('Ingresos', 'Acceso al panel de gestion de ingresos y pagos'),
    ('Auditoria', 'Acceso al panel de logs de auditoria')
ON CONFLICT (nombre_permiso) DO UPDATE SET descripcion = EXCLUDED.descripcion;



