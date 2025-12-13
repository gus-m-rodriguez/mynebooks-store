# 📊 Análisis del Flujo de Mercado Pago en MyneBooks Store

## 🔍 Análisis del Error del MCP Server

### Problema Identificado

Según los logs del MCP Server, el problema fue:

1. **Errores HTTP 403 iniciales**: El servidor MCP de Mercado Pago requiere autenticación OAuth, pero inicialmente no había tokens almacenados.

2. **Ciclo de autenticación OAuth**:
   - Se inició el flujo OAuth correctamente
   - Se obtuvieron tokens de acceso (`accessTokenLen:74, refreshPresent:true, expiresIn:21600`)
   - **PERO** inmediatamente después se invalidaron las credenciales: `Invalidating credentials: all`
   - Se limpiaron los tokens: `Clearing stored OAuth data`

3. **Conexión exitosa final**:
   - Al final de los logs se ve: `Successfully connected to streamableHttp server`
   - Se encontraron **6 tools** disponibles: `Found 6 tools, 0 prompts, and 0 resources`

### Estado Actual

⚠️ **El MCP Server tiene problemas de conexión persistentes**

**Problema identificado en los logs más recientes**:

1. **Conexión inicial exitosa**:
   - Se conectó al servidor: `Successfully connected to streamableHttp server`
   - Se encontraron **6 tools** disponibles: `Found 6 tools, 0 prompts, and 0 resources`

2. **Desconexión del flujo SSE** (Server-Sent Events):
   - Línea 3767: `SSE stream disconnected, transport will reconnect automatically SSE stream disconnected: TypeError: terminated`
   - Línea 3779: `SSE stream disconnected, transport will reconnect automatically SSE stream disconnected: TypeError: terminated`

3. **Fallo en la reconexión**:
   - Línea 3781: `Client error for command Streamable HTTP error: Failed to open SSE stream: Conflict`
   - Línea 3782: `Client error for command Failed to reconnect SSE stream: Streamable HTTP error: Failed to open SSE stream: Conflict`

**Causa del error**:
El servidor MCP logró autenticarse y listar las herramientas, pero el flujo de comunicación SSE (usado para recibir actualizaciones en tiempo real) se desconectó y no pudo reconectarse debido a un **"Conflict"**. Esto indica que probablemente hay:
- Múltiples conexiones simultáneas intentando usar el mismo recurso
- Un problema de sincronización en el servidor MCP de Mercado Pago
- Un token OAuth que expiró o fue invalidado después de la conexión inicial

**Solución recomendada**:
1. Reiniciar Cursor completamente para limpiar conexiones duplicadas
2. Verificar que el token OAuth no haya expirado (tienen duración de 6 horas según logs: `expiresIn:21600`)
3. Si el problema persiste, deshabilitar y volver a habilitar el servidor MCP en la configuración de Cursor

---

## 🔄 Flujo Completo de Mercado Pago en la Aplicación

### 1. **Creación de Orden y Reserva de Stock**

**Archivo**: `backend/src/controllers/ordenes.controller.js` → `iniciarPago()`

**Proceso**:
```
1. Usuario completa checkout → Frontend llama POST /api/ordenes/:id/iniciar-pago
2. Backend valida:
   - Orden existe y pertenece al usuario
   - Orden está en estado 'pendiente'
   - Orden tiene dirección de envío válida (mínimo 10 caracteres)
   - Stock disponible para todos los items
3. Transacción de base de datos:
   - BEGIN TRANSACTION
   - UPDATE productos SET stock_reserved += cantidad (reserva stock)
   - UPDATE ordenes SET estado='en_pago', fecha_expiracion=now()+15min
   - INSERT INTO auditoria (tipo='pago_iniciado')
   - COMMIT TRANSACTION
```

**Código relevante** (líneas 370-594):
- Validación de stock antes de reservar
- Transacción atómica para garantizar consistencia
- Reserva de stock por 15 minutos

---

### 2. **Creación de Preferencia de Pago**

**Archivo**: `backend/src/libs/mercadopago.js` → `crearPreferenciaPago()`

**Proceso**:
```
1. Preparar items para Mercado Pago:
   - Validar título (no vacío, max 256 caracteres)
   - Validar precio (número > 0)
   - Validar cantidad (entero > 0)
   - Convertir a formato MP: {title, unit_price, quantity, currency_id: "ARS"}

2. Configurar preferencia:
   - items: Array de productos
   - external_reference: ID de la orden (para identificar en webhook)
   - back_urls: URLs de retorno (success, failure, pending)
   - auto_return: "approved" (solo si NO es localhost)
   - notification_url: URL del webhook del backend
   - payer: Email de comprador de prueba (solo en sandbox, opcional)

3. Crear preferencia en Mercado Pago:
   - POST https://api.mercadopago.com/checkout/preferences
   - Retornar sandbox_init_point (modo test) o init_point (producción)
```

**Características importantes**:
- ✅ Validación estricta de datos antes de enviar a MP
- ✅ Manejo diferenciado de sandbox vs producción
- ✅ Detección automática de localhost (omite auto_return)
- ✅ Configuración inteligente de notification_url

**Código relevante** (líneas 25-222):
```javascript
// Validaciones estrictas
if (!title || title.length === 0) {
  throw new Error(`Item ${index + 1}: El título no puede estar vacío`);
}
if (title.length > 256) {
  throw new Error(`Item ${index + 1}: El título no puede exceder 256 caracteres`);
}
if (isNaN(unit_price) || unit_price <= 0) {
  throw new Error(`Item ${index + 1}: El precio debe ser un número mayor a 0`);
}
```

---

### 3. **Redirección a Mercado Pago**

**Archivo**: `frontend/src/pages/CheckoutPage.jsx`

**Proceso**:
```
1. Usuario hace clic en "Pagar con Mercado Pago"
2. Frontend llama:
   - POST /api/ordenes (crear orden)
   - POST /api/ordenes/:id/iniciar-pago (obtener URL de pago)
3. Recibe sandbox_init_point o init_point
4. Redirige: window.location.href = urlPago
5. Usuario es llevado a Mercado Pago para completar el pago
```

**Código relevante** (líneas 43-87):
```javascript
const pagoRes = await ordenesApi.iniciarPago(ordenRes.data.id_orden);
const urlPago = pagoRes.data?.sandbox_init_point || pagoRes.data?.init_point;
if (urlPago) {
  window.location.href = urlPago;
}
```

---

### 4. **Procesamiento del Pago en Mercado Pago**

**Proceso externo** (fuera de tu aplicación):
```
1. Usuario completa el pago en Mercado Pago
2. Mercado Pago procesa el pago
3. Mercado Pago envía webhook a tu backend
4. Mercado Pago redirige al usuario según back_urls configuradas
```

---

### 5. **Recepción y Procesamiento del Webhook**

**Archivo**: `backend/src/controllers/pagos.controller.js` → `webhookMercadoPago()`

**Proceso detallado**:

#### 5.1. Validación de Seguridad
```javascript
// Validar firma del webhook usando MP_WEBHOOK_SECRET
const firmaValida = validarFirmaWebhook(xSignature, xRequestId, req.query, req.body);

if (!firmaValida) {
  // Registrar intento de webhook falso
  await pool.query(`INSERT INTO auditoria (tipo, usuario, fecha) 
                    VALUES ('webhook_rechazado_firma_invalida', 'sistema', CURRENT_TIMESTAMP)`);
  return res.status(401).json({ message: "Firma de webhook inválida" });
}
```

**Archivo**: `backend/src/libs/mercadopago.js` → `validarFirmaWebhook()`

**Validación de firma** (líneas 442-573):
- Extrae `timestamp` y `hash` del header `x-signature`
- Crea manifest: `id:${id};request-id:${requestId};ts:${timestamp};`
- Calcula HMAC-SHA256 usando `MP_WEBHOOK_SECRET`
- Compara con hash recibido (usando `crypto.timingSafeEqual` para prevenir timing attacks)
- En sandbox, permite webhooks sin validación (para desarrollo)

#### 5.2. Procesamiento del Webhook
```javascript
// Procesar webhook (puede ser tipo "payment" o "merchant_order")
const resultado = await procesarWebhook(data, req.query);

// Extraer información
const { payment_id, status, status_detail, external_reference, transaction_amount } = resultado;
```

**Archivo**: `backend/src/libs/mercadopago.js` → `procesarWebhook()`

**Tipos de notificaciones soportadas** (líneas 360-432):
1. **Tipo "payment"**: Contiene directamente el ID del pago
   - Obtiene información completa del pago: `obtenerPago(paymentId)`
   
2. **Tipo "merchant_order"**: Contiene la orden comercial
   - Extrae `merchant_order_id` desde query o body
   - Busca pagos asociados: `buscarPagosPorMerchantOrder(merchantOrderId)`
   - Obtiene el pago más reciente

#### 5.3. Idempotencia
```javascript
// Verificar si este webhook ya fue procesado
const pagoExistentePorMpId = await pool.query(
  "SELECT id_pago, id_orden, estado FROM pagos WHERE mp_id = $1",
  [payment_id]
);

if (pagoExistentePorMpId.rowCount > 0) {
  // Retornar éxito sin procesar nuevamente (idempotencia)
  return res.status(200).json({
    message: "Webhook ya procesado anteriormente (idempotencia)",
    idempotente: true,
  });
}
```

**Protecciones contra duplicados**:
- ✅ Verificación por `mp_id` antes de procesar
- ✅ Índice único en base de datos: `idx_pagos_mp_id_unique`
- ✅ Verificación dentro de la transacción (para concurrencia)

#### 5.4. Actualización de Estado de Orden

**Estados manejados** (líneas 120-159):

| Status MP | Estado Orden | Acción Stock | Descripción |
|-----------|--------------|--------------|-------------|
| `approved` | `pagado` | Descontar + Liberar reserva | Pago exitoso |
| `rejected` | `rechazado` | Solo liberar reserva | Pago rechazado (sin fondos, tarjeta inválida) |
| `cancelled` | `cancelada_mp` | Solo liberar reserva | Mercado Pago canceló el pago |
| `pending` | `en_pago` | Mantener reserva | Pago pendiente (transferencia bancaria) |
| `in_process` | `en_pago` | Mantener reserva | Pago en proceso |
| Otros | `error` | Mantener reserva | Error desconocido (requiere intervención admin) |

**Código de actualización** (líneas 162-303):
```javascript
// Usar transacción para garantizar atomicidad
const client = await pool.connect();
try {
  await client.query("BEGIN");
  
  // Actualizar estado de orden
  await client.query("UPDATE ordenes SET estado = $1 WHERE id_orden = $2", 
    [nuevoEstado, ordenId]);
  
  // Registrar/actualizar pago
  // Manejar stock según resultado
  // Reactivar carrito si es necesario
  
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
}
```

#### 5.5. Manejo de Stock

**Pago aprobado** (líneas 256-275):
```javascript
// Descontar stock y liberar reserva
await client.query(
  `UPDATE productos 
   SET stock = stock - $1, 
       stock_reserved = stock_reserved - $1 
   WHERE id_producto = $2 
     AND stock_reserved >= $1
   RETURNING id_producto`,
  [item.cantidad, item.id_producto]
);
```

**Pago rechazado/cancelado** (líneas 276-295):
```javascript
// Solo liberar reserva
await client.query(
  `UPDATE productos 
   SET stock_reserved = stock_reserved - $1 
   WHERE id_producto = $2 
     AND stock_reserved >= $1
   RETURNING id_producto`,
  [item.cantidad, item.id_producto]
);
```

**Características**:
- ✅ Verificación condicional: `stock_reserved >= cantidad` (previene valores negativos)
- ✅ Transacción atómica (todo o nada)
- ✅ Rollback automático en caso de error

#### 5.6. Reactivación de Carrito

**Código** (líneas 299-302):
```javascript
// Si la orden estaba 'en_pago' y se cancela/rechaza, reactivar el carrito
if (ordenActual.estado === "en_pago" && 
    (nuevoEstado === "cancelado" || nuevoEstado === "rechazado" || nuevoEstado === "cancelada_mp")) {
  await reactivarCarritoDesdeOrden(ordenActual.id_usuario, items.rows, client);
}
```

**Archivo**: `backend/src/utils/carrito.js` → `reactivarCarritoDesdeOrden()`

---

### 6. **Redirección del Usuario**

**URLs de retorno configuradas**:
- **Success**: `${ORIGIN}/ordenes/${id}/success`
- **Failure**: `${ORIGIN}/ordenes/${id}/failure`
- **Pending**: `${ORIGIN}/ordenes/${id}/pending`

**Páginas de resultado**:
- `frontend/src/pages/OrdenSuccessPage.jsx`
- `frontend/src/pages/OrdenFailurePage.jsx`
- `frontend/src/pages/OrdenPendingPage.jsx`

---

## 🔐 Seguridad Implementada

### 1. Validación de Firma de Webhook
- ✅ Implementación según especificación oficial de Mercado Pago
- ✅ Uso de `crypto.timingSafeEqual` para prevenir timing attacks
- ✅ Validación flexible en sandbox (permite desarrollo sin secret)
- ✅ Registro de intentos de webhooks falsos en auditoría

### 2. Idempotencia
- ✅ Verificación por `mp_id` antes de procesar
- ✅ Índice único en base de datos
- ✅ Verificación dentro de transacción (concurrencia)

### 3. Transacciones Atómicas
- ✅ Todas las operaciones de base de datos en transacciones
- ✅ Rollback automático en caso de error
- ✅ Verificaciones condicionales para prevenir inconsistencias

---

## 📋 Diagrama de Flujo Completo

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ 1. CheckoutPage.jsx             │
│    - Usuario completa dirección │
│    - Hace clic en "Pagar"       │
└──────┬──────────────────────────┘
       │
       │ POST /api/ordenes
       ▼
┌─────────────────────────────────┐
│ 2. ordenes.controller.js        │
│    - Crear orden (estado:       │
│      'pendiente')               │
└──────┬──────────────────────────┘
       │
       │ POST /api/ordenes/:id/iniciar-pago
       ▼
┌─────────────────────────────────┐
│ 3. ordenes.controller.js        │
│    iniciarPago()                │
│    - Validar orden              │
│    - Validar stock              │
│    - RESERVAR STOCK             │
│      (stock_reserved += cantidad)│
│    - Estado: 'en_pago'          │
│    - fecha_expiracion: +15min   │
└──────┬──────────────────────────┘
       │
       │ crearPreferenciaPago()
       ▼
┌─────────────────────────────────┐
│ 4. mercadopago.js               │
│    crearPreferenciaPago()       │
│    - Validar items              │
│    - Crear preferencia en MP    │
│    - Retornar init_point        │
└──────┬──────────────────────────┘
       │
       │ window.location.href = init_point
       ▼
┌─────────────────────────────────┐
│ 5. Mercado Pago (externo)      │
│    - Usuario completa pago      │
│    - MP procesa pago            │
└──────┬──────────────────────────┘
       │
       │ POST /api/pagos/webhook/mercadopago
       │ (Webhook)
       ▼
┌─────────────────────────────────┐
│ 6. pagos.controller.js          │
│    webhookMercadoPago()         │
│    - Validar firma              │
│    - Verificar idempotencia     │
│    - Procesar webhook           │
└──────┬──────────────────────────┘
       │
       │ procesarWebhook()
       ▼
┌─────────────────────────────────┐
│ 7. mercadopago.js               │
│    procesarWebhook()            │
│    - Obtener payment_id         │
│    - Obtener info del pago      │
│    - Retornar status            │
└──────┬──────────────────────────┘
       │
       │ Actualizar orden según status
       ▼
┌─────────────────────────────────┐
│ 8. pagos.controller.js          │
│    (continuación)               │
│    BEGIN TRANSACTION            │
│    - UPDATE ordenes (estado)    │
│    - INSERT/UPDATE pagos        │
│    - Manejar stock:             │
│      * approved: descontar      │
│      * rejected: liberar reserva│
│      * pending: mantener         │
│    - Reactivar carrito (si aplica)│
│    - INSERT auditoria           │
│    COMMIT TRANSACTION           │
└──────┬──────────────────────────┘
       │
       │ Redirección según back_urls
       ▼
┌─────────────────────────────────┐
│ 9. Frontend                     │
│    - OrdenSuccessPage           │
│    - OrdenFailurePage           │
│    - OrdenPendingPage           │
└─────────────────────────────────┘
```

---

## ✅ Puntos Fuertes de la Implementación

1. **Seguridad robusta**:
   - Validación de firma de webhook según spec oficial
   - Idempotencia para prevenir duplicados
   - Transacciones atómicas

2. **Manejo de stock correcto**:
   - Reserva temporal (15 minutos)
   - Liberación automática en rechazos
   - Descuento permanente en aprobaciones

3. **Manejo de errores completo**:
   - Validaciones en cada paso
   - Logging detallado
   - Rollback automático en errores

4. **Experiencia de usuario**:
   - Redirección automática (si no es localhost)
   - Páginas de resultado claras
   - Reactivación de carrito en cancelaciones

---

## ⚠️ Áreas de Mejora Potencial

1. **Timeout de reservas**:
   - Actualmente hay un job `expirarReservas.js` que libera reservas expiradas
   - Verificar que esté configurado correctamente

2. **Reintentos de webhook**:
   - Mercado Pago reintenta webhooks fallidos
   - El código retorna 500 en errores (MP reintentará)
   - Considerar retornar 200 para errores no recuperables

3. **Notificaciones por email**:
   - Ya implementado para pagos aprobados
   - Considerar notificaciones para otros estados

4. **Logging y monitoreo**:
   - Logging detallado ya implementado
   - Considerar agregar métricas/alertas para webhooks fallidos

---

## 🔧 Configuración Requerida

### Variables de Entorno Necesarias:

```env
# Mercado Pago
MP_ACCESS_TOKEN_TEST=TEST-xxxxx...        # Para sandbox
MP_ACCESS_TOKEN_PROD=APP_USR-xxxxx...     # Para producción
MP_MODE=sandbox                           # o "prod"
MP_WEBHOOK_SECRET=tu_secret_aqui         # Para validar webhooks

# URLs
ORIGIN=https://tu-frontend.com            # URL del frontend
BACKEND_URL=https://tu-backend.com        # URL del backend (para webhooks)
```

---

## 📊 Resumen del Flujo

| Paso | Componente | Acción | Estado BD |
|------|------------|--------|-----------|
| 1 | Frontend | Usuario completa checkout | - |
| 2 | Backend | Crear orden | `ordenes.estado = 'pendiente'` |
| 3 | Backend | Iniciar pago | `stock_reserved += cantidad`<br>`ordenes.estado = 'en_pago'` |
| 4 | Backend | Crear preferencia MP | - |
| 5 | Frontend | Redirigir a MP | - |
| 6 | MP | Usuario completa pago | - |
| 7 | MP | Enviar webhook | - |
| 8 | Backend | Validar y procesar | `ordenes.estado = 'pagado'/'rechazado'`<br>`stock` actualizado |

---

**Última actualización**: Diciembre 2024
