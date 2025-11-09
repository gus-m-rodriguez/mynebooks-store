# 💳 Guía de Pago con Mercado Pago (Modo Test)

**Cómo probar el sistema de pagos sin usar dinero real** 🧪✨

Esta guía te ayudará a configurar y probar el sistema de pagos de **MyneBooks Store** usando una cuenta de testeo de Mercado Pago. Perfecto para desarrollo y pruebas sin preocuparte por usar dinero real.

## 🎯 ¿Por qué usar una cuenta de testeo?

- ✅ **No gastas dinero real** - Todas las transacciones son simuladas
- ✅ **Pruebas ilimitadas** - Puedes probar cuantas veces quieras
- ✅ **Diferentes escenarios** - Aprobar, rechazar, pendiente, etc.
- ✅ **Tarjetas de prueba** - Mercado Pago proporciona tarjetas especiales
- ✅ **Webhooks de prueba** - Puedes simular notificaciones de pago

## 📋 Paso 1: Crear cuenta de testeo en Mercado Pago

### 1.1 Crear cuenta de desarrollador

1. Ve a [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Haz clic en **"Crear cuenta"** o **"Iniciar sesión"** si ya tienes una
3. Si es tu primera vez, completa el registro básico

### 1.2 Acceder al panel de desarrolladores

1. Una vez logueado, ve a **"Tus integraciones"** o **"Aplicaciones"**
2. Si no tienes una aplicación, haz clic en **"Crear aplicación"**
3. Completa los datos:
   - **Nombre**: `MyneBooks Store` (o el que prefieras)
   - **Categoría**: E-commerce / Tienda online
   - **Plataforma**: Web

### 1.3 Obtener credenciales de test

Una vez creada la aplicación, verás dos tipos de credenciales:

#### 🔑 Credenciales de TEST (Sandbox)
- **Access Token**: `TEST-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx`
- **Public Key**: `TEST-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx`

#### 🔑 Credenciales de PRODUCCIÓN
- **Access Token**: `APP_USR-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx`
- **Public Key**: `APP_USR-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx`

⚠️ **Importante**: Para desarrollo y pruebas, usa **SIEMPRE las credenciales de TEST**.

## 🔧 Paso 2: Configurar el Backend

### 2.1 Configurar variables de entorno

Abre el archivo `.env` en la carpeta `backend/` y agrega:

```env
# Mercado Pago - Credenciales de TEST
MP_ACCESS_TOKEN=TEST-tu_access_token_aqui
MP_WEBHOOK_SECRET=tu_webhook_secret_aqui

# Ambiente
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 2.2 Obtener Webhook Secret

1. En el panel de Mercado Pago, ve a tu aplicación
2. Busca la sección **"Webhooks"** o **"Notificaciones"**
3. Configura la URL de tu webhook (en desarrollo, usa un túnel como ngrok):
   ```
   https://tu-dominio.ngrok.io/api/pagos/webhook
   ```
4. Copia el **Webhook Secret** que te proporciona Mercado Pago
5. Pégalo en `MP_WEBHOOK_SECRET` en tu `.env`

💡 **Tip**: Para desarrollo local, puedes usar [ngrok](https://ngrok.com/) para exponer tu servidor local:
```bash
ngrok http 3000
```

## 🎮 Paso 3: Probar el flujo de pago

### 3.1 Flujo completo

1. **Agregar productos al carrito**
   - Navega al catálogo
   - Agrega algunos productos al carrito
   - Ve a `/carrito` para revisar

2. **Ir al checkout**
   - Haz clic en **"Proceder al checkout"**
   - Completa la dirección de envío (mínimo 10 caracteres)
   - Haz clic en **"Confirmar y pagar"**

3. **Redirección a Mercado Pago**
   - Serás redirigido automáticamente a Mercado Pago Checkout Pro
   - El stock se reserva por 15 minutos (TTL)

4. **Completar el pago con tarjeta de prueba**
   - Usa una de las tarjetas de prueba de abajo
   - Completa los datos requeridos
   - Confirma el pago

5. **Resultado**
   - Serás redirigido de vuelta a MyneBooks Store
   - Verás la página de éxito, fallo o pendiente según el resultado

## 💳 Tarjetas de Prueba de Mercado Pago

Mercado Pago proporciona tarjetas especiales para probar diferentes escenarios:

### ✅ Pago Aprobado

**Tarjeta de crédito:**
- **Número**: `5031 7557 3453 0604`
- **CVV**: `123`
- **Fecha de vencimiento**: Cualquier fecha futura (ej: `11/25`)
- **Nombre del titular**: Cualquier nombre
- **DNI**: Cualquier DNI (ej: `12345678`)

**Tarjeta de débito:**
- **Número**: `5031 4332 1540 6351`
- **CVV**: `123`
- **Fecha de vencimiento**: Cualquier fecha futura
- **Nombre del titular**: Cualquier nombre
- **DNI**: Cualquier DNI

### ❌ Pago Rechazado

**Tarjeta rechazada por fondos insuficientes:**
- **Número**: `5031 4332 1540 6351`
- **CVV**: `123`
- **Fecha de vencimiento**: Cualquier fecha futura
- **Nombre del titular**: Cualquier nombre
- **DNI**: Cualquier DNI

**Tarjeta rechazada por datos inválidos:**
- **Número**: `5031 4332 1540 6351`
- **CVV**: `123`
- **Fecha de vencimiento**: Cualquier fecha **pasada** (ej: `01/20`)
- **Nombre del titular**: Cualquier nombre
- **DNI**: Cualquier DNI

### ⏳ Pago Pendiente

**Para pagos pendientes (transferencia bancaria):**
- Usa el método de pago **"Transferencia bancaria"** en lugar de tarjeta
- El pago quedará en estado pendiente hasta que se procese

### 🚫 Pago Cancelado

**Para cancelar un pago:**
- En el checkout de Mercado Pago, simplemente cierra la ventana o haz clic en "Cancelar"
- El stock reservado se liberará automáticamente después del TTL (15 minutos)

## 🔍 Escenarios de Prueba

### Escenario 1: Pago Exitoso ✅

1. Agrega productos al carrito
2. Ve al checkout y completa la dirección
3. Usa la tarjeta de crédito de prueba: `5031 7557 3453 0604`
4. Completa el pago
5. **Resultado esperado**:
   - Redirección a `/ordenes/:id/success`
   - Orden en estado `pagado`
   - Stock descontado permanentemente
   - Carrito vacío

### Escenario 2: Pago Rechazado ❌

1. Agrega productos al carrito
2. Ve al checkout y completa la dirección
3. Usa una tarjeta que cause rechazo (ver tarjetas arriba)
4. Intenta completar el pago
5. **Resultado esperado**:
   - Redirección a `/ordenes/:id/failure`
   - Orden en estado `rechazado`
   - Stock liberado inmediatamente
   - Puedes intentar pagar nuevamente desde "Mis Órdenes"

### Escenario 3: Pago Pendiente ⏳

1. Agrega productos al carrito
2. Ve al checkout y completa la dirección
3. Selecciona **"Transferencia bancaria"** como método de pago
4. Completa el proceso
5. **Resultado esperado**:
   - Redirección a `/ordenes/:id/pending`
   - Orden en estado `en_pago`
   - Stock reservado hasta que se procese el pago

### Escenario 4: Reserva Expirada ⏰

1. Agrega productos al carrito
2. Ve al checkout y completa la dirección
3. Inicia el pago (serás redirigido a Mercado Pago)
4. **NO completes el pago** - Espera más de 15 minutos
5. **Resultado esperado**:
   - El job automático libera el stock reservado
   - La orden vuelve a estado `pendiente`
   - El carrito se reactiva automáticamente
   - Puedes intentar pagar nuevamente

### Escenario 5: Webhook Duplicado 🔄

1. Completa un pago exitoso
2. Mercado Pago puede enviar el webhook múltiples veces
3. **Resultado esperado**:
   - El backend procesa el webhook solo una vez (idempotencia)
   - No se duplican los pagos
   - El stock se descuenta solo una vez

## 🛠️ Configuración de Webhooks (Desarrollo Local)

Para probar webhooks en desarrollo local, necesitas exponer tu servidor:

### Opción 1: Usar ngrok (Recomendado)

1. **Instalar ngrok**:
   ```bash
   # Windows (con Chocolatey)
   choco install ngrok
   
   # Mac (con Homebrew)
   brew install ngrok
   
   # O descarga desde https://ngrok.com/download
   ```

2. **Iniciar túnel**:
   ```bash
   ngrok http 3000
   ```

3. **Copiar la URL HTTPS**:
   ```
   https://abc123.ngrok.io
   ```

4. **Configurar en Mercado Pago**:
   - Ve a tu aplicación en Mercado Pago
   - Configura el webhook: `https://abc123.ngrok.io/api/pagos/webhook`
   - Guarda el Webhook Secret

5. **Actualizar .env**:
   ```env
   MP_WEBHOOK_SECRET=tu_webhook_secret_de_mercado_pago
   ```

### Opción 2: Usar localtunnel

```bash
npm install -g localtunnel
lt --port 3000
```

## 🐛 Troubleshooting (Solución de Problemas)

### Problema: "No se pudo obtener la URL de pago"

**Causa**: El `MP_ACCESS_TOKEN` no está configurado o es inválido.

**Solución**:
1. Verifica que `MP_ACCESS_TOKEN` esté en el `.env`
2. Asegúrate de usar el token de **TEST** (empieza con `TEST-`)
3. Reinicia el servidor backend

### Problema: "Webhook rechazado: Firma inválida"

**Causa**: El `MP_WEBHOOK_SECRET` no coincide con el configurado en Mercado Pago.

**Solución**:
1. Verifica el Webhook Secret en el panel de Mercado Pago
2. Actualiza `MP_WEBHOOK_SECRET` en el `.env`
3. Reinicia el servidor backend

### Problema: El pago se aprueba pero no se actualiza la orden

**Causa**: El webhook no está llegando o hay un error en el procesamiento.

**Solución**:
1. Verifica que el webhook esté configurado correctamente
2. Revisa los logs del backend para ver si llegan los webhooks
3. Verifica que la URL del webhook sea accesible (usa ngrok si estás en local)
4. Revisa que `MP_WEBHOOK_SECRET` esté correcto

### Problema: "Stock no disponible" aunque hay stock

**Causa**: El stock está reservado por otra orden en proceso.

**Solución**:
1. Espera 15 minutos para que expire la reserva
2. O cancela la orden anterior desde "Mis Órdenes"
3. El job automático libera reservas expiradas cada 5 minutos

### Problema: La tarjeta de prueba no funciona

**Causa**: Puede que estés usando credenciales de producción en lugar de test.

**Solución**:
1. Verifica que `MP_ACCESS_TOKEN` empiece con `TEST-`
2. Asegúrate de estar en el ambiente de test de Mercado Pago
3. Usa las tarjetas de prueba oficiales de Mercado Pago

## 📊 Verificar que todo funciona

### Checklist de verificación

- [ ] Credenciales de TEST configuradas en `.env`
- [ ] Webhook configurado en Mercado Pago
- [ ] Webhook Secret configurado en `.env`
- [ ] Backend corriendo en `http://localhost:3000`
- [ ] Frontend corriendo en `http://localhost:5173`
- [ ] Túnel ngrok activo (si pruebas webhooks en local)
- [ ] Puedes crear una orden
- [ ] Puedes iniciar el pago
- [ ] Te redirige a Mercado Pago
- [ ] Puedes completar el pago con tarjeta de prueba
- [ ] Te redirige de vuelta a MyneBooks Store
- [ ] La orden se actualiza correctamente
- [ ] El stock se descuenta/libera según corresponda

## 🔐 Seguridad en Producción

⚠️ **IMPORTANTE**: Cuando pases a producción:

1. **Cambia las credenciales**:
   - Usa `MP_ACCESS_TOKEN` de producción (empieza con `APP_USR-`)
   - Actualiza `MP_WEBHOOK_SECRET` con el de producción

2. **Configura el webhook de producción**:
   - URL: `https://tu-dominio.com/api/pagos/webhook`
   - Asegúrate de que sea HTTPS

3. **Verifica la firma del webhook**:
   - El backend valida automáticamente la firma
   - No deshabilites esta validación

4. **Monitorea los logs**:
   - Revisa regularmente los logs de auditoría
   - Verifica que los webhooks se procesen correctamente

## 📚 Recursos Adicionales

- **Documentación oficial de Mercado Pago**: [https://www.mercadopago.com.ar/developers/es/docs](https://www.mercadopago.com.ar/developers/es/docs)
- **Tarjetas de prueba**: [https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/testing](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/testing)
- **Webhooks**: [https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- **ngrok**: [https://ngrok.com/](https://ngrok.com/)

## 🎯 Resumen Rápido

1. **Crear cuenta** en Mercado Pago Developers
2. **Obtener credenciales de TEST** (Access Token y Webhook Secret)
3. **Configurar `.env`** en el backend
4. **Configurar webhook** en Mercado Pago (usar ngrok para local)
5. **Probar con tarjetas de prueba** de Mercado Pago
6. **Verificar** que todo funcione correctamente

---

**¡Listo para probar!** 🚀

Si tienes problemas, revisa la sección de Troubleshooting o consulta la documentación oficial de Mercado Pago.

**Desarrollado con ❤️ por UTN Wizards - 2025**

*"Pagos seguros, pruebas sin límites"* 💳✨

