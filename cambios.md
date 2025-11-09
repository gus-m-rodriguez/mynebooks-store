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
let pagoVerificado = false;
let estadoVerificado = null;

if (paymentId) {
  // Usar endpoint público que no requiere autenticación
  const verificarRes = await ordenesApi.verificarPagoPublico(id, { payment_id: paymentId });
  estadoVerificado = verificarRes.data?.orden_estado;
  pagoVerificado = true;
  
  // Si el pago fue exitoso, mostrar inmediatamente
  if (estadoVerificado === "pagado") {
    setOrden({ estado: "pagado" });
    // Redirigir después de 5 segundos
    return;
  }
}

// Si no hay sesión pero se verificó el pago, usar ese estado
if (pagoVerificado && estadoVerificado) {
  setOrden({ estado: estadoVerificado });
}
```

**Archivo**: `frontend/src/api/ordenes.api.js`

**Nueva función agregada**:
```javascript
// Verificar pago desde redirect de Mercado Pago (endpoint público, no requiere autenticación)
verificarPagoPublico: (id, body) => cliente.post(`/ordenes/${id}/verificar-pago-publico`, body),
```

**Mejoras adicionales**:
- Logging completo de query params para debugging
- Manejo mejorado del estado cuando no hay sesión
- Si el endpoint público retorna "pagado", se muestra inmediatamente sin esperar obtener la orden

**Explicación**: 
- Ahora se usa el endpoint público cuando hay `payment_id` en la URL.
- Esto permite verificar el pago incluso si el usuario no tiene sesión activa.
- Si el pago fue exitoso, se muestra inmediatamente sin depender de la sesión.

---

### 9. Mejora en AuthContext para Prevenir Pérdida de Sesión

**Archivo**: `frontend/src/context/AuthContext.jsx`

**Ubicación**: Función `checkAuth` en el `useEffect` (línea ~132)

**Problema**: 
- Si `getProfile()` fallaba por cualquier razón (red, servidor, etc.), se limpiaba la sesión completamente.
- Esto causaba que el usuario perdiera su sesión al volver de Mercado Pago.

**Cambio**:

**ANTES**:
```javascript
useEffect(() => {
  const checkAuth = async () => {
    if (Cookie.get("token")) {
      try {
        const res = await authApi.getProfile();
        setUser(res.data);
        setIsAuth(true);
      } catch (error) {
        console.error("Error verificando autenticación:", error);
        // Limpiaba la sesión por CUALQUIER error
        setUser(null);
        setIsAuth(false);
        Cookie.remove("token");
      }
    }
    setLoading(false);
  };
  checkAuth();
}, []);
```

**DESPUÉS**:
```javascript
useEffect(() => {
  const checkAuth = async () => {
    const token = Cookie.get("token");
    if (token) {
      try {
        const res = await authApi.getProfile();
        setUser(res.data);
        setIsAuth(true);
      } catch (error) {
        console.error("Error verificando autenticación:", error);
        // Solo limpiar la sesión si es un error 401 (token inválido)
        if (error.response?.status === 401) {
          console.log("[AuthContext] Token inválido, limpiando sesión");
          setUser(null);
          setIsAuth(false);
          Cookie.remove("token");
        } else {
          // Para otros errores (red, servidor, etc.), mantener el token
          // pero marcar como no autenticado temporalmente
          console.warn("[AuthContext] Error temporal verificando autenticación, manteniendo token");
          setIsAuth(false);
        }
      }
    }
    setLoading(false);
  };
  checkAuth();
}, []);
```

**Explicación**: 
- Solo limpia la sesión si el error es 401 (token inválido o expirado).
- Para errores de red o del servidor, mantiene el token.
- Esto evita perder la sesión por problemas temporales al volver de Mercado Pago.

---

### 10. Logging Mejorado en Backend

**Archivo**: `backend/src/controllers/ordenes.controller.js`

**Función**: `verificarPagoPublico`

**Cambios**:
- Se agregaron logs adicionales para debugging:
  ```javascript
  console.log(`[VerificarPagoPublico] Payment ID: ${payment_id}, Orden ID: ${id}`);
  console.log(`[VerificarPagoPublico] External reference del pago: ${pagoInfo.external_reference}`);
  console.log(`[VerificarPagoPublico] ✅ Orden ${id} actualizada: ${ordenActual.estado} -> ${nuevoEstado}`);
  ```
- Se incluye `payment_id` en la respuesta JSON para verificación.

**Explicación**: 
- Facilita el debugging en producción.
- Permite verificar que el endpoint se está ejecutando correctamente.

---

### 11. Manejo de collection_id y Búsqueda de Pagos por Orden

**Problema Identificado**:
- Mercado Pago en Checkout Pro puede enviar `collection_id` (ID de la preferencia) en lugar de `payment_id` (ID del pago real) en la URL de redirect.
- Cuando se intenta verificar el pago con `payment_id`, Mercado Pago retorna error 400 indicando que el ID no es válido.
- Esto causa que el pago no se registre y la orden quede en estado "pendiente".

**Archivo**: `backend/src/libs/mercadopago.js`

**Nuevas funciones agregadas**:

1. **`buscarPagosPorOrden`** (líneas ~165-193):
```javascript
export const buscarPagosPorOrden = async (ordenId) => {
  try {
    // Buscar pagos usando la API de search de Mercado Pago
    const searchParams = {
      external_reference: ordenId.toString(),
      limit: 10,
    };
    
    // Usar la API REST directamente
    const axios = (await import("axios")).default;
    const response = await axios.get("https://api.mercadopago.com/v1/payments/search", {
      params: searchParams,
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      // Retornar el pago más reciente
      return response.data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error("Error buscando pagos por orden:", error);
    throw error;
  }
};
```

2. **`obtenerPreferencia`** (líneas ~198-206):
```javascript
export const obtenerPreferencia = async (preferenceId) => {
  try {
    const result = await preference.get({ id: preferenceId });
    return result;
  } catch (error) {
    console.error("Error obteniendo preferencia de Mercado Pago:", error);
    throw error;
  }
};
```

**Archivo**: `backend/src/controllers/ordenes.controller.js`

**Función modificada**: `verificarPagoPublico` (líneas ~1260-1333)

**Cambios principales**:

**ANTES**:
```javascript
const { payment_id, status } = req.body;

// Validar que se proporcionó payment_id
if (!payment_id) {
  return res.status(400).json({
    message: "payment_id es requerido",
  });
}

// Intentar obtener pago directamente
pagoInfo = await obtenerPago(payment_id);
```

**DESPUÉS**:
```javascript
const { payment_id, collection_id, status } = req.body;

// Validar que se proporcionó al menos uno de los IDs
if (!payment_id && !collection_id) {
  return res.status(400).json({
    message: "payment_id o collection_id es requerido",
  });
}

// Estrategia 1: Si tenemos payment_id, intentar obtenerlo directamente
if (payment_id) {
  try {
    pagoInfo = await obtenerPago(payment_id);
  } catch (error) {
    console.warn(`No se pudo obtener pago con payment_id=${payment_id}`);
    // Continuar con otras estrategias
  }
}

// Estrategia 2: Si no funcionó, buscar pagos por external_reference
if (!pagoInfo) {
  try {
    const { buscarPagosPorOrden } = await import("../libs/mercadopago.js");
    pagoInfo = await buscarPagosPorOrden(id);
  } catch (error) {
    console.warn(`No se pudo buscar pagos por orden:`, error.message);
  }
}

// Si aún no tenemos pagoInfo, retornar error con sugerencia
if (!pagoInfo) {
  return res.status(400).json({
    message: "No se pudo encontrar el pago en Mercado Pago. El pago puede estar pendiente o el ID proporcionado no es válido.",
    orden_estado: ordenActual.estado,
    sugerencia: "Espera unos minutos y verifica nuevamente, o espera a que el webhook procese el pago.",
  });
}
```

**Archivo**: `frontend/src/pages/OrdenSuccessPage.jsx`

**Cambios** (líneas ~19-67):

**ANTES**:
```javascript
// Extraer payment_id de los query params
const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");

if (paymentId) {
  const verificarRes = await ordenesApi.verificarPagoPublico(id, { payment_id: paymentId });
}
```

**DESPUÉS**:
```javascript
// Extraer payment_id o collection_id de los query params
// En Checkout Pro, Mercado Pago puede enviar collection_id (preferencia) o payment_id (pago)
const paymentId = searchParams.get("payment_id");
const collectionId = searchParams.get("collection_id");

// Log de todos los query params para debugging
console.log("[OrdenSuccessPage] Query params completos:", Object.fromEntries(searchParams.entries()));
console.log("[OrdenSuccessPage] Payment ID extraído:", paymentId);
console.log("[OrdenSuccessPage] Collection ID extraído:", collectionId);

// Enviar payment_id o collection_id al backend
if (paymentId || collectionId) {
  // Preparar body con los IDs disponibles
  const body = {};
  if (paymentId) body.payment_id = paymentId;
  if (collectionId) body.collection_id = collectionId;
  
  const verificarRes = await ordenesApi.verificarPagoPublico(id, body);
}
```

**Explicación**: 
- El sistema ahora maneja tanto `payment_id` como `collection_id`.
- Si `payment_id` no funciona, busca pagos por `external_reference` (ID de la orden).
- Esto resuelve el problema cuando Mercado Pago envía `collection_id` en lugar de `payment_id`.
- El frontend envía ambos parámetros si están disponibles, permitiendo al backend elegir la mejor estrategia.

---

### 12. Mejoras de Logging en Backend para Debugging

**Problema Identificado**:
- Los logs no eran suficientemente detallados para diagnosticar problemas con pagos.
- Cuando ocurría un error "Payment not found" (404), no se tenía suficiente información para entender por qué.

**Archivo**: `backend/src/libs/mercadopago.js`

**Función modificada**: `obtenerPago` (líneas ~151-167)

**Cambios**:
```javascript
// ANTES:
export const obtenerPago = async (paymentId) => {
  try {
    const result = await payment.get({ id: paymentId });
    return result;
  } catch (error) {
    console.error("Error obteniendo pago de Mercado Pago:", error);
    throw error;
  }
};

// DESPUÉS:
export const obtenerPago = async (paymentId) => {
  try {
    console.log(`[obtenerPago] Consultando pago con ID: ${paymentId}`);
    const result = await payment.get({ id: paymentId });
    console.log(`[obtenerPago] ✅ Pago obtenido exitosamente: ID=${result.id}, Estado=${result.status}`);
    return result;
  } catch (error) {
    console.error("[obtenerPago] ❌ Error obteniendo pago de Mercado Pago:", {
      paymentId,
      message: error.message,
      status: error.status,
      code: error.code,
      cause: error.cause,
    });
    throw error;
  }
};
```

**Función modificada**: `buscarPagosPorOrden` (líneas ~165-207)

**Cambios**:
```javascript
// Se agregaron logs detallados:
console.log(`[buscarPagosPorOrden] Buscando pagos para orden ${ordenId} con parámetros:`, searchParams);
console.log(`[buscarPagosPorOrden] Respuesta de Mercado Pago:`, {
  total: response.data?.paging?.total || 0,
  results_count: response.data?.results?.length || 0,
});
console.log(`[buscarPagosPorOrden] ✅ Pago encontrado: ID=${pagoMasReciente.id}, Estado=${pagoMasReciente.status}`);
// O
console.log(`[buscarPagosPorOrden] ⚠️ No se encontraron pagos para la orden ${ordenId}`);
```

**Archivo**: `backend/src/controllers/ordenes.controller.js`

**Función modificada**: `verificarPagoPublico` (líneas ~1290-1348)

**Cambios principales**:
- Logs más detallados en cada paso del proceso
- Detección específica del error 404 (Payment not found) con código 2000
- Información detallada en los errores retornados al frontend

**ANTES**:
```javascript
try {
  pagoInfo = await obtenerPago(payment_id);
} catch (error) {
  console.warn(`No se pudo obtener pago con payment_id=${payment_id}:`, error.message);
}
```

**DESPUÉS**:
```javascript
try {
  console.log(`[VerificarPagoPublico] Intentando obtener pago con payment_id=${payment_id}`);
  pagoInfo = await obtenerPago(payment_id);
  console.log(`[VerificarPagoPublico] ✅ Pago obtenido exitosamente con payment_id=${payment_id}`);
  console.log(`[VerificarPagoPublico] Estado del pago: ${pagoInfo.status}, External reference: ${pagoInfo.external_reference}`);
} catch (error) {
  console.warn(`[VerificarPagoPublico] ⚠️ No se pudo obtener pago con payment_id=${payment_id}`);
  console.warn(`[VerificarPagoPublico] Error detallado:`, {
    message: error.message,
    status: error.status,
    code: error.code,
    cause: error.cause,
  });
  // Si el error es 404 (Payment not found), el payment_id puede ser inválido o ser un collection_id
  if (error.status === 404 || error.cause?.code === 2000) {
    console.log(`[VerificarPagoPublico] El payment_id ${payment_id} no existe en Mercado Pago. Puede ser un collection_id (preferencia).`);
  }
}
```

**Explicación**: 
- Los logs ahora proporcionan información detallada sobre cada paso del proceso de verificación.
- Facilita el debugging en producción cuando ocurren errores.
- Permite identificar rápidamente si el problema es un `payment_id` inválido, un `collection_id`, o un pago que aún no existe.

---

### 13. Mejora Final en AuthContext para Prevenir Pérdida de Sesión

**Problema Identificado**:
- Aunque se había mejorado el `AuthContext` para no limpiar la sesión por errores temporales, el usuario seguía siendo redirigido al login.
- El problema era que `isAuth` se establecía como `false` antes de verificar la sesión, causando redirecciones innecesarias.

**Archivo**: `frontend/src/context/AuthContext.jsx`

**Función modificada**: `checkAuth` en el `useEffect` (líneas ~132-187)

**Cambios principales**:

**ANTES**:
```javascript
useEffect(() => {
  const checkAuth = async () => {
    const token = Cookie.get("token");
    if (token) {
      try {
        const res = await authApi.getProfile();
        setUser(res.data);
        setIsAuth(true);
      } catch (error) {
        if (error.response?.status === 401) {
          // Limpiar sesión
        } else {
          // Mantener token pero marcar como no autenticado
          setIsAuth(false); // ← Esto causaba redirecciones
        }
      }
    }
    setLoading(false);
  };
  checkAuth();
}, []);
```

**DESPUÉS**:
```javascript
useEffect(() => {
  const checkAuth = async () => {
    const token = Cookie.get("token");
    if (token) {
      // Si hay token, asumir que la sesión es válida inicialmente
      // Esto evita redirecciones innecesarias al login
      setIsAuth(true); // ← Establecer inmediatamente
      
      try {
        const res = await authApi.getProfile();
        setUser(res.data);
        setIsAuth(true);
        console.log("[AuthContext] ✅ Sesión verificada exitosamente");
      } catch (error) {
        console.error("[AuthContext] Error verificando autenticación:", error);
        console.error("[AuthContext] Detalles del error:", {
          status: error.response?.status,
          message: error.message,
          code: error.code,
        });
        
        // Solo limpiar la sesión si es un error 401 (no autorizado)
        if (error.response?.status === 401) {
          console.log("[AuthContext] ❌ Token inválido (401), limpiando sesión");
          setUser(null);
          setIsAuth(false);
          Cookie.remove("token");
        } else {
          // Para otros errores (red, servidor, etc.), mantener el token y el estado
          console.warn("[AuthContext] ⚠️ Error temporal verificando autenticación, manteniendo sesión");
          console.warn("[AuthContext] El token sigue en las cookies, la sesión se mantendrá");
          // Mantener isAuth como true para evitar redirecciones innecesarias
          // Intentar verificar nuevamente después de un breve delay
          setTimeout(async () => {
            try {
              const retryRes = await authApi.getProfile();
              setUser(retryRes.data);
              setIsAuth(true);
              console.log("[AuthContext] ✅ Sesión verificada exitosamente en reintento");
            } catch (retryError) {
              console.warn("[AuthContext] ⚠️ Reintento falló, pero manteniendo sesión");
            }
          }, 2000);
        }
      }
    } else {
      console.log("[AuthContext] No hay token en las cookies");
      setIsAuth(false);
    }
    setLoading(false);
  };
  checkAuth();
}, []);
```

**Explicación**: 
- **Establecer `isAuth` inmediatamente**: Si hay token en cookies, se establece `isAuth = true` antes de verificar, evitando redirecciones al login mientras se verifica.
- **Mantener sesión en errores temporales**: Si la verificación falla con un error temporal (no 401), mantiene `isAuth = true` y hace un reintento automático después de 2 segundos.
- **Solo limpiar en 401**: Solo limpia la sesión si es un error 401 (token inválido o expirado).
- **Logging mejorado**: Logs más detallados para debugging.

**Beneficios**:
- El usuario no es redirigido al login cuando vuelve de Mercado Pago, incluso si hay errores temporales de red.
- La sesión se mantiene mientras el token sea válido.
- Reintentos automáticos para recuperar la sesión después de errores temporales.

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
   - `OrdenSuccessPage` extrae el `payment_id` y/o `collection_id` de la URL.
   - Llama a `verificarPagoPublico` (endpoint público) con ambos parámetros si están disponibles.
   - El backend intenta encontrar el pago usando dos estrategias:
     - **Estrategia 1**: Si hay `payment_id`, intenta obtenerlo directamente de Mercado Pago.
     - **Estrategia 2**: Si falla o no hay `payment_id`, busca pagos por `external_reference` (ID de la orden).
   - Una vez encontrado el pago, el backend:
     - Valida que corresponde a la orden (mediante `external_reference`).
     - Crea o actualiza el registro de pago en la tabla `pagos`.
     - Actualiza el estado de la orden según el resultado:
       - `approved` → `"pagado"` (descuenta stock y libera reserva)
       - `rejected` → `"rechazado"` (solo libera reserva)
       - `cancelled` → `"cancelada_mp"` (solo libera reserva)
       - `pending`/`in_process` → `"en_pago"` (no cambia stock)
     - Actualiza el registro en la tabla `pagos` con estado, monto y fecha.
     - Registra en auditoría.
     - Envía email de confirmación si el pago fue aprobado.
   - El frontend muestra el estado correcto inmediatamente, incluso sin sesión activa.

4. **Webhook de Mercado Pago** (puede llegar antes o después):
   - Si llega después, el webhook verifica que el pago ya fue procesado (idempotencia).
   - Si llega antes, la verificación manual detecta que ya está actualizado.
   - Ambos métodos son idempotentes y seguros.

---

## Archivos Modificados

1. `frontend/package.json` - Agregado flag `-s` al comando start
2. `backend/src/controllers/ordenes.controller.js` - Mejorada función `verificarPago` + nueva función `verificarPagoPublico` + logging mejorado + manejo de `collection_id` + detección de errores 404
3. `backend/src/libs/mercadopago.js` - Agregadas funciones `buscarPagosPorOrden` y `obtenerPreferencia` + logging mejorado en `obtenerPago` y `buscarPagosPorOrden`
4. `backend/src/router/ordenes.routes.js` - Agregada ruta pública `verificar-pago-publico`
5. `frontend/src/pages/OrdenSuccessPage.jsx` - Extracción de `payment_id` y `collection_id` de URL + uso de endpoint público + mejor manejo de estados + logging mejorado
6. `frontend/src/api/ordenes.api.js` - Agregada función `verificarPagoPublico`
7. `frontend/src/App.jsx` - Rutas de success/failure/pending ahora son públicas
8. `frontend/src/context/AuthContext.jsx` - Mejora para no perder sesión por errores temporales + establecer `isAuth` inmediatamente + reintentos automáticos
9. `backend/src/controllers/auth.controller.js` - Mejorados comentarios en configuración de cookies

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
- **AuthContext mejorado**: 
  - Ya no pierde la sesión por errores temporales de red o servidor, solo por tokens inválidos (401).
  - Establece `isAuth = true` inmediatamente si hay token en cookies, evitando redirecciones al login.
  - Reintentos automáticos después de 2 segundos si la verificación falla temporalmente.
- **Endpoint público seguro**: La seguridad se basa en validar el `payment_id` con Mercado Pago antes de procesar, no en autenticación del usuario.
- **Manejo de collection_id**: El sistema ahora maneja tanto `payment_id` como `collection_id`, y busca pagos por `external_reference` si el `payment_id` no es válido o no está disponible.
- **Logging mejorado**: Logs detallados en todo el flujo de verificación de pagos para facilitar el debugging en producción.

## Estados que Actualiza el Endpoint Público

El endpoint `verificarPagoPublico` actualiza:

1. **Estado de la orden** (`ordenes.estado`):
   - `approved` → `"pagado"`
   - `rejected` → `"rechazado"`
   - `cancelled` → `"cancelada_mp"`
   - `pending`/`in_process` → `"en_pago"`

2. **Registro de pago** (`pagos`):
   - `estado`: Estado de Mercado Pago
   - `monto`: Monto de la transacción
   - `fecha_pago`: Fecha actual si es `approved`, `NULL` en otros casos

3. **Stock de productos**:
   - Si `approved`: Descuenta `stock` y libera `stock_reserved`
   - Si `rejected`/`cancelled`: Solo libera `stock_reserved`
   - Si `pending`/`in_process`: No cambia stock

4. **Auditoría**: Registra el evento en la tabla `auditoria`

---

## Próximos Pasos

1. Hacer commit y push de los cambios.
2. Railway redeployará automáticamente.
3. Probar el flujo completo en producción.
4. Monitorear los logs para verificar que todo funciona correctamente.

