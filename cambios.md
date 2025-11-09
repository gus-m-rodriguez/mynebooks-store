# Cambios Realizados - Fix de Pago Mercado Pago

## Fecha: 2025-01-XX

## Problemas Identificados

1. **Error 404 en ruta `/ordenes/:id/success`**: Después de pagar con Mercado Pago y hacer clic en "Volver a la tienda", se mostraba un error 404.
2. **Pérdida de sesión**: El usuario era redirigido a la página de login después del redirect de Mercado Pago.
3. **Pago no registrado**: El sistema no actualizaba el estado de la orden a "pagado" aunque el pago fuera exitoso en Mercado Pago.

## Problema Raíz Identificado

El problema principal era que:
- Las rutas `/ordenes/:id/success` estaban protegidas y requerían autenticación.
- Cuando el usuario volvía de Mercado Pago, las cookies podían no estar disponibles inmediatamente.
- `ProtectedRoute` redirigía a `/login` ANTES de que se pudiera ejecutar la verificación del pago.
- La función `verificarPago` requería autenticación, por lo que nunca se ejecutaba.

---

## Cambios Implementados

### 1. Fix de Routing SPA (Single Page Application)

**Archivo**: `frontend/package.json`

**Cambio**:
```json
// Antes:
"start": "serve dist -p $PORT"

// Después:
"start": "serve dist -s -p $PORT"
```

**Explicación**: 
- Se agregó el flag `-s` (single page application mode) al comando `serve`.
- Esto permite que todas las rutas del frontend se redirijan al `index.html`, permitiendo que React Router maneje el routing del lado del cliente.
- Sin este flag, el servidor intentaba buscar archivos físicos en rutas como `/ordenes/46/success`, causando el error 404.

---

### 2. Mejora en Verificación de Pago con Payment ID

**Archivo**: `backend/src/controllers/ordenes.controller.js`

**Función modificada**: `verificarPago` (línea ~971)

**Cambio en la firma de la función**:
```javascript
// ANTES:
export const verificarPago = async (req, res) => {
  try {
    const { id } = req.params;
    // ... resto del código

// DESPUÉS:
export const verificarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_id } = req.body; // ← NUEVO: payment_id opcional desde query params
    // ... resto del código
```

**Reemplazo completo de la sección de búsqueda de pago** (líneas ~994-1007):

**ANTES**:
```javascript
// Buscar pago asociado a la orden
const pago = await pool.query(
  "SELECT id_pago, mp_id, estado FROM pagos WHERE id_orden = $1 ORDER BY fecha_creacion DESC LIMIT 1",
  [id]
);

if (pago.rowCount === 0 || !pago.rows[0].mp_id) {
  // No hay pago registrado aún, la orden sigue en proceso
  return res.json({
    message: "No hay pago registrado para esta orden aún",
    orden_estado: ordenActual.estado,
    actualizado: false,
  });
}

const pagoActual = pago.rows[0];
const mpId = pagoActual.mp_id;
```

**DESPUÉS**:
```javascript
// Buscar pago asociado a la orden
let pago = await pool.query(
  "SELECT id_pago, mp_id, estado FROM pagos WHERE id_orden = $1 ORDER BY fecha_creacion DESC LIMIT 1",
  [id]
);

let pagoActual = null;
let mpId = null;

// Si hay payment_id en el body pero no hay registro de pago, crear uno temporal
if (payment_id && (pago.rowCount === 0 || !pago.rows[0].mp_id)) {
  console.log(`[VerificarPago] No hay registro de pago, pero se recibió payment_id=${payment_id}, creando registro temporal...`);
  
  // Verificar que el payment_id corresponde a esta orden consultando Mercado Pago
  let pagoInfo;
  try {
    pagoInfo = await obtenerPago(payment_id);
  } catch (error) {
    console.error(`[VerificarPago] Error consultando Mercado Pago con payment_id:`, error);
    return res.status(400).json({
      message: "El payment_id proporcionado no es válido o no existe en Mercado Pago",
      orden_estado: ordenActual.estado,
    });
  }

  // Verificar que el external_reference del pago corresponde a esta orden
  if (pagoInfo.external_reference !== id.toString()) {
    return res.status(400).json({
      message: "El payment_id no corresponde a esta orden",
      orden_estado: ordenActual.estado,
    });
  }

  // Crear registro de pago temporal
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Verificar si ya existe un pago con este mp_id (idempotencia)
    const pagoExistente = await client.query(
      "SELECT id_pago, id_orden, estado FROM pagos WHERE mp_id = $1",
      [payment_id]
    );

    if (pagoExistente.rowCount > 0) {
      // Ya existe, usar ese
      pagoActual = pagoExistente.rows[0];
      mpId = payment_id;
      await client.query("COMMIT");
    } else {
      // Crear nuevo registro de pago
      const totalOrden = await client.query(
        `SELECT SUM(cantidad * precio_unitario) as total 
         FROM orden_items 
         WHERE id_orden = $1`,
        [id]
      );
      const monto = parseFloat(totalOrden.rows[0]?.total || pagoInfo.transaction_amount || 0);

      const nuevoPago = await client.query(
        `INSERT INTO pagos (id_orden, mp_id, estado, monto, fecha_pago) 
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_pago, mp_id, estado`,
        [
          id,
          payment_id,
          pagoInfo.status,
          monto,
          pagoInfo.status === "approved" ? new Date() : null,
        ]
      );

      pagoActual = nuevoPago.rows[0];
      mpId = payment_id;
      await client.query("COMMIT");
      console.log(`[VerificarPago] Registro de pago creado: id_pago=${pagoActual.id_pago}, mp_id=${mpId}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} else if (pago.rowCount > 0 && pago.rows[0].mp_id) {
  // Hay registro de pago existente
  pagoActual = pago.rows[0];
  mpId = pagoActual.mp_id;
} else {
  // No hay pago registrado y no se proporcionó payment_id
  return res.json({
    message: "No hay pago registrado para esta orden aún. Espera a que el webhook procese el pago o proporciona el payment_id.",
    orden_estado: ordenActual.estado,
    actualizado: false,
  });
}
```

**Nota importante**: El resto de la función continúa igual después de esta sección. El código que sigue (verificación con Mercado Pago, actualización de estado, etc.) no cambia.

**Beneficio**: 
- Permite verificar el pago inmediatamente después del redirect, incluso si el webhook de Mercado Pago aún no ha llegado.
- El sistema puede actualizar el estado de la orden a "pagado" sin esperar al webhook.

---

### 3. Extracción de Payment ID desde URL

**Archivo**: `frontend/src/pages/OrdenSuccessPage.jsx`

**Cambio 1 - Import** (línea ~2):
```javascript
// ANTES:
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// DESPUÉS:
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
```

**Cambio 2 - Agregar hook useSearchParams** (después de línea ~9):
```javascript
// ANTES:
const OrdenSuccessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  // ...

// DESPUÉS:
const OrdenSuccessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // ← NUEVO
  const [loading, setLoading] = useState(true);
  // ...
```

**Cambio 3 - Modificar función verificarOrden dentro del useEffect** (líneas ~14-26):

**ANTES**:
```javascript
useEffect(() => {
  const verificarOrden = async () => {
    try {
      setLoading(true);
      // Primero intentar verificar el pago con Mercado Pago (esto actualiza el estado si el pago fue aprobado)
      try {
        console.log("[OrdenSuccessPage] Verificando pago con Mercado Pago para orden:", id);
        const verificarRes = await ordenesApi.verificarPago(id);
        console.log("[OrdenSuccessPage] Resultado de verificación:", verificarRes.data);
      } catch (err) {
        console.error("[OrdenSuccessPage] Error verificando pago:", err);
        // Continuar aunque falle la verificación
      }
```

**DESPUÉS**:
```javascript
useEffect(() => {
  const verificarOrden = async () => {
    try {
      setLoading(true);
      // Extraer payment_id de los query params si está disponible
      const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
      
      // Primero intentar verificar el pago con Mercado Pago (esto actualiza el estado si el pago fue aprobado)
      try {
        console.log("[OrdenSuccessPage] Verificando pago con Mercado Pago para orden:", id);
        console.log("[OrdenSuccessPage] Payment ID de URL:", paymentId);
        
        // Si hay payment_id en la URL, enviarlo al backend
        const verificarRes = await ordenesApi.verificarPago(id, paymentId ? { payment_id: paymentId } : {});
        console.log("[OrdenSuccessPage] Resultado de verificación:", verificarRes.data);
      } catch (err) {
        console.error("[OrdenSuccessPage] Error verificando pago:", err);
        // Continuar aunque falle la verificación
      }
```

**Nota**: El resto del código del componente no cambia.

**Beneficio**: 
- Aprovecha la información que Mercado Pago envía en la URL de redirect.
- Permite verificar el pago inmediatamente sin depender del webhook.

---

### 4. Actualización de API del Frontend

**Archivo**: `frontend/src/api/ordenes.api.js`

**Cambio**:
```javascript
// Antes:
verificarPago: (id) => cliente.post(`/ordenes/${id}/verificar-pago`),

// Después:
verificarPago: (id, body) => cliente.post(`/ordenes/${id}/verificar-pago`, body),
```

**Explicación**: 
- La función ahora acepta un segundo parámetro `body` opcional.
- Permite enviar el `payment_id` al backend.

---

### 5. Configuración de Cookies (Mejora)

**Archivo**: `backend/src/controllers/auth.controller.js`

**Ubicación**: Función `signin` (línea ~129)

**Cambio**: Solo se mejoraron los comentarios. La configuración ya estaba correcta, pero se agregó un comentario explicativo.

**Código** (no cambió, solo se agregó comentario):
```javascript
res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // En producción debe ser true cuando sameSite es "none"
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: 1000 * 60 * 60 * 24, // 1 día
});
```

**Explicación**: 
- En producción, las cookies necesitan `secure: true` cuando `sameSite: "none"` para funcionar correctamente en dominios diferentes.
- Esto asegura que las cookies se envíen correctamente después del redirect desde Mercado Pago.
- **Nota**: Este cambio fue principalmente documental, la configuración ya estaba correcta.

---

### 6. Endpoint Público para Verificar Pago (SOLUCIÓN DEFINITIVA)

**Archivo**: `backend/src/controllers/ordenes.controller.js`

**Nueva función**: `verificarPagoPublico` (línea ~1257)

**Propósito**: 
- Endpoint público que NO requiere autenticación.
- Se llama desde el redirect de Mercado Pago cuando el usuario puede no tener sesión activa.
- La seguridad se basa en validar el `payment_id` con Mercado Pago antes de procesar.

**Funcionalidad**:
1. Valida que se proporcionó `payment_id`.
2. Verifica el `payment_id` con la API de Mercado Pago.
3. Valida que el `payment_id` corresponde a la orden (mediante `external_reference`).
4. Crea o actualiza el registro de pago en la base de datos.
5. Actualiza el estado de la orden según el resultado de Mercado Pago.
6. Maneja el stock (descuenta si aprobado, libera reserva si rechazado).

**Archivo**: `backend/src/router/ordenes.routes.js`

**Cambio**:
```javascript
// ANTES:
const router = Router();
router.use(isAuth); // Todas las rutas requieren autenticación

// DESPUÉS:
const router = Router();

// RUTA PÚBLICA: Verificar pago desde redirect de Mercado Pago
router.post("/:id/verificar-pago-publico", verificarPagoPublico);

// Rutas de usuario autenticado
router.use(isAuth);
```

**Explicación**: 
- El endpoint público se define ANTES de aplicar el middleware `isAuth`.
- Esto permite que se llame sin autenticación.
- La seguridad se garantiza validando el `payment_id` con Mercado Pago.

---

### 7. Rutas de Success/Failure/Pending Públicas

**Archivo**: `frontend/src/App.jsx`

**Cambio**:
```jsx
// ANTES:
<Route element={<ProtectedRoute isAllowed={isAuth} redirectTo="/login" />}>
  <Route path="/ordenes/:id/success" element={<OrdenSuccessPage />} />
  <Route path="/ordenes/:id/failure" element={<OrdenFailurePage />} />
  <Route path="/ordenes/:id/pending" element={<OrdenPendingPage />} />
</Route>

// DESPUÉS:
{/* Rutas de resultado de pago (públicas para permitir redirect desde Mercado Pago) */}
<Route path="/ordenes/:id/success" element={<OrdenSuccessPage />} />
<Route path="/ordenes/:id/failure" element={<OrdenFailurePage />} />
<Route path="/ordenes/:id/pending" element={<OrdenPendingPage />} />

{/* Rutas protegidas (usuario autenticado) */}
<Route element={<ProtectedRoute isAllowed={isAuth} redirectTo="/login" />}>
  {/* ... otras rutas ... */}
</Route>
```

**Explicación**: 
- Las rutas de resultado de pago ahora son públicas.
- Esto permite que el usuario acceda a ellas incluso si no tiene sesión activa.
- El componente `OrdenSuccessPage` usa el endpoint público para verificar el pago.

---

### 8. Actualización de OrdenSuccessPage para Usar Endpoint Público

**Archivo**: `frontend/src/pages/OrdenSuccessPage.jsx`

**Cambio en el useEffect**:

**ANTES**:
```javascript
const verificarRes = await ordenesApi.verificarPago(id, paymentId ? { payment_id: paymentId } : {});
```

**DESPUÉS**:
```javascript
if (paymentId) {
  // Usar endpoint público que no requiere autenticación
  const verificarRes = await ordenesApi.verificarPagoPublico(id, { payment_id: paymentId });
}
```

**Archivo**: `frontend/src/api/ordenes.api.js`

**Nueva función agregada**:
```javascript
// Verificar pago desde redirect de Mercado Pago (endpoint público, no requiere autenticación)
verificarPagoPublico: (id, body) => cliente.post(`/ordenes/${id}/verificar-pago-publico`, body),
```

**Explicación**: 
- Ahora se usa el endpoint público cuando hay `payment_id` en la URL.
- Esto permite verificar el pago incluso si el usuario no tiene sesión activa.
- Si no hay sesión, se muestra un mensaje genérico pero positivo.

---

## Flujo Completo Actualizado

1. **Usuario inicia pago**: 
   - Se crea la orden en estado "pendiente".
   - Se reserva stock cuando se inicia el pago.
   - Se crea la preferencia de Mercado Pago.

2. **Usuario paga en Mercado Pago**:
   - Mercado Pago procesa el pago.
   - Mercado Pago redirige al usuario a `/ordenes/:id/success?payment_id=...&status=approved`.

3. **Usuario llega a la página de success**:
   - `OrdenSuccessPage` extrae el `payment_id` de la URL.
   - Llama a `verificarPago` con el `payment_id`.
   - El backend:
     - Si no hay registro de pago, crea uno temporal con el `payment_id`.
     - Verifica el estado del pago con Mercado Pago.
     - Actualiza el estado de la orden a "pagado" si el pago fue aprobado.
     - Descuenta stock y libera reserva.

4. **Webhook de Mercado Pago** (puede llegar antes o después):
   - Si llega después, el webhook verifica que el pago ya fue procesado (idempotencia).
   - Si llega antes, la verificación manual detecta que ya está actualizado.

---

## Archivos Modificados

1. `frontend/package.json` - Agregado flag `-s` al comando start
2. `backend/src/controllers/ordenes.controller.js` - Mejorada función `verificarPago` + nueva función `verificarPagoPublico`
3. `backend/src/router/ordenes.routes.js` - Agregada ruta pública `verificar-pago-publico`
4. `frontend/src/pages/OrdenSuccessPage.jsx` - Extracción de `payment_id` de URL + uso de endpoint público
5. `frontend/src/api/ordenes.api.js` - Agregada función `verificarPagoPublico`
6. `frontend/src/App.jsx` - Rutas de success/failure/pending ahora son públicas
7. `backend/src/controllers/auth.controller.js` - Mejorados comentarios en configuración de cookies

---

## Testing Recomendado

1. **Probar flujo completo de pago**:
   - Crear una orden.
   - Iniciar el pago.
   - Completar el pago en Mercado Pago (sandbox).
   - Verificar que se redirige correctamente a `/ordenes/:id/success`.
   - Verificar que la sesión se mantiene.
   - Verificar que el estado de la orden se actualiza a "pagado".

2. **Verificar en panel de administración**:
   - Confirmar que la orden aparece como "Pagada".
   - Verificar que el stock se descontó correctamente.

3. **Probar caso de webhook tardío**:
   - Simular que el webhook llega después del redirect.
   - Verificar que el sistema maneja correctamente ambos casos.

---

## Notas Adicionales

- El sistema ahora tiene **doble verificación**: tanto el redirect del usuario como el webhook pueden actualizar el estado del pago.
- Se implementó **idempotencia**: si el webhook llega después de la verificación manual, no se procesa dos veces.
- Las cookies están configuradas para funcionar correctamente en producción con dominios diferentes (frontend y backend en Railway).

---

## Próximos Pasos

1. Hacer commit y push de los cambios.
2. Railway redeployará automáticamente.
3. Probar el flujo completo en producción.
4. Monitorear los logs para verificar que todo funciona correctamente.

