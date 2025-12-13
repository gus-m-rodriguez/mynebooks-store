# Guía de Integración - Mercado Pago Checkout Pro

## Resumen

**Checkout Pro** es una solución de pago prediseñada que permite a tus clientes comprar en tu sitio y pagar en un ambiente seguro de Mercado Pago con sus medios de pago guardados.

### Características principales:
- ✅ Integración ágil para web, Android e iOS
- ✅ Experiencia preconstruida con redirección a Mercado Pago
- ✅ Personalización de medios de pago, cuotas y URLs de retorno
- ✅ Tecnología 3DS 2.0 para seguridad
- ✅ Protocolos OWASP y PCI DSS

---

## Requisitos Previos

1. **Cuenta de vendedor** en Mercado Pago
2. **Certificado SSL** (Secure Sockets Layer) para navegación segura

---

## Proceso de Integración (8 Pasos)

### 1. Crear una Aplicación

Las aplicaciones son entidades registradas en Mercado Pago que actúan como identificador único para gestionar la autenticación y autorización.

**Pasos:**
1. Ingresa a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Haz clic en **"Ingresar"** e inicia sesión
3. Accede a **"Tus integraciones"** y haz clic en **"Crear aplicación"**
4. Completa el formulario:
   - Ingresa un **nombre** para tu aplicación (máximo 50 caracteres)
   - Selecciona **"Pagos online"** como tipo de pago
   - Selecciona **"Tienda con desarrollo propio"**
   - Selecciona **"Checkouts"** → **"Checkout Pro"**
5. Confirma y acepta los términos

**Credenciales:**
- Después de crear la aplicación, obtendrás automáticamente:
  - **Public Key** (clave pública para frontend)
  - **Access Token** (clave privada para backend)
- Accede a ellas en: **Tus integraciones > Detalles de aplicación > Pruebas > Credenciales de prueba**

---

### 2. Configurar el Ambiente de Desarrollo

Instala el SDK de Mercado Pago en tu backend según tu lenguaje de programación:

**SDKs disponibles:**
- Node.js
- PHP
- Java
- Python
- Ruby
- C#
- Go

**Instalación ejemplo (Node.js):**
```bash
npm install mercadopago
```

**Instalación ejemplo (PHP):**
```bash
composer require mercadopago/dx-php
```

---

### 3. Crear y Configurar una Preferencia de Pago

Una **preferencia de pago** es un objeto que representa el producto o servicio por el que deseas cobrar.

**Ejemplo en Node.js:**
```javascript
const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({ accessToken: 'YOUR_ACCESS_TOKEN' });
const preference = new Preference(client);

preference.create({
  body: {
    items: [
      {
        title: 'Mi producto',
        quantity: 1,
        unit_price: 2000
      }
    ],
  }
})
.then(console.log)
.catch(console.log);
```

**Ejemplo en PHP:**
```php
<?php
$client = new PreferenceClient();
$preference = $client->create([
  "items"=> array(
    array(
      "title" => "Mi producto",
      "quantity" => 1,
      "unit_price" => 2000
    )
  )
]);

echo $preference
?>
```

**Ejemplo en Python:**
```python
preference_data = {
  items: [
    {
      title: 'Mi producto',
      unit_price: 75.56,
      quantity: 1
    }
  ]
}
preference_response = sdk.preference.create(preference_data)
preference = preference_response[:response]

# Obtener el ID de la preferencia
preference_id = preference['id']
```

**Importante:** Guarda el **ID de la preferencia** que recibes en la respuesta, lo necesitarás para el frontend.

---

### 4. Configurar URLs de Retorno

Configura las URLs a las que el comprador será redirigido después del pago:

```javascript
preference.create({
  body: {
    items: [...],
    back_urls: {
      success: "https://tusitio.com/success",
      pending: "https://tusitio.com/pending",
      failure: "https://tusitio.com/failure"
    },
    auto_return: "approved" // Redirige automáticamente cuando el pago es aprobado
  }
})
```

---

### 5. Agregar el SDK al Frontend e Inicializar el Checkout

#### 5.1. Incluir el SDK en HTML

Agrega el script antes de `</body>`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mi Integración con Checkout Pro</title>
</head>
<body>
  <!-- Contenido de tu página -->
  
  <script src="https://sdk.mercadopago.com/js/v2"></script>
  
  <script>
    // Tu código JavaScript irá aquí
  </script>
</body>
</html>
```

#### 5.2. Inicializar el Checkout

```javascript
<script src="https://sdk.mercadopago.com/js/v2"></script>
<script>
  // Configura tu clave pública del Mercado Pago
  const publicKey = "YOUR_PUBLIC_KEY";
  // Configura el ID de preferencia que recibes de tu backend
  const preferenceId = "YOUR_PREFERENCE_ID";

  // Inicializa el SDK del Mercado Pago
  const mp = new MercadoPago(publicKey);

  // Crea el botón de pago
  const bricksBuilder = mp.bricks();
  const renderWalletBrick = async (bricksBuilder) => {
    await bricksBuilder.create("wallet", "walletBrick_container", {
      initialization: {
        preferenceId: preferenceId,
      }
    });
  };

  renderWalletBrick(bricksBuilder);
</script>
```

#### 5.3. Crear Contenedor HTML

```html
<!-- Container para el botón de pago -->
<div id="walletBrick_container"></div>
```

El SDK renderizará automáticamente un botón que redirigirá al comprador al formulario de pago de Mercado Pago.

---

### 6. Configurar Notificaciones de Pago

Configura webhooks o IPN para recibir notificaciones en tiempo real sobre los eventos de pago:

```javascript
preference.create({
  body: {
    items: [...],
    notification_url: "https://tusitio.com/webhook"
  }
})
```

**Tipos de notificaciones:**
- **Webhooks**: Notificaciones HTTP POST a tu servidor
- **IPN**: Instant Payment Notification (método legacy)

---

### 7. Probar la Integración

#### Obtener Cuenta de Prueba Comprador

1. Ve a **Tus integraciones** en Mercado Pago Developers
2. Selecciona tu aplicación
3. Ve a **"Datos de integración"** → **"Cuentas de prueba"**
4. Selecciona **"Comprador"** para ver:
   - User ID
   - Usuario
   - Contraseña

#### Realizar Compras de Prueba

Utiliza las credenciales de prueba para simular pagos y validar el funcionamiento.

**Tarjetas de prueba:**
- Consulta las tarjetas de prueba disponibles en la documentación según tu país.

---

### 8. Salir a Producción

1. Obtén tus **credenciales de producción** en:
   - **Tus integraciones > Detalles de aplicación > Producción > Credenciales de producción**

2. Reemplaza las credenciales de prueba con las de producción en tu código

3. Verifica que tu sitio tenga certificado SSL activo

4. Realiza pruebas finales con pagos reales de bajo monto

---

## Configuraciones Adicionales

### Excluir Medios de Pago

```javascript
preference.create({
  body: {
    items: [...],
    payment_methods: {
      excluded_payment_methods: [
        { id: "master" }
      ],
      excluded_payment_types: [
        { id: "ticket" }
      ],
      installments: 12 // Número máximo de cuotas
    }
  }
})
```

### Configurar Reembolsos y Cancelaciones

Consulta la documentación para implementar:
- Reembolsos totales
- Reembolsos parciales
- Cancelaciones

### Restringir Compras a Usuarios Registrados

Configura la preferencia para que solo usuarios con cuenta de Mercado Pago puedan pagar.

### Crear Preferencia para Múltiples Ítems

```javascript
items: [
  {
    title: 'Producto 1',
    quantity: 2,
    unit_price: 100
  },
  {
    title: 'Producto 2',
    quantity: 1,
    unit_price: 200
  }
]
```

### Mostrar Valor de Envío

```javascript
shipments: {
  cost: 20,
  free_shipping: false
}
```

---

## Referencias y Recursos

### Documentación Oficial
- **Resumen:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/overview
- **Crear aplicación:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/create-application
- **Crear preferencia:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/create-payment-preference
- **SDK Frontend:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/web-integration/add-frontend-sdk

### APIs y SDKs
- **Referencia API:** https://www.mercadopago.com.ar/developers/es/reference
- **Bibliotecas SDK:** https://www.mercadopago.com.ar/developers/es/docs/sdks-library

### Soporte
- **Estado Mercado Pago:** Verifica el estado del servicio
- **Soporte técnico:** Contacta al equipo de soporte
- **Comunidad Discord:** Únete a la comunidad de desarrolladores

---

## Flujo de Pago Completo

1. **Cliente selecciona producto** en tu sitio
2. **Cliente hace clic en "Pagar con Mercado Pago"**
3. **Redirección a Mercado Pago** (entorno seguro)
4. **Cliente elige medio de pago** (con cuenta o como invitado)
5. **Cliente completa el pago**
6. **Redirección de vuelta a tu sitio** (según URLs configuradas)
7. **Notificación webhook** a tu servidor con el estado del pago

---

## Seguridad

- ✅ Protocolos **OWASP** y **PCI DSS**
- ✅ Tecnología **3DS 2.0** para autenticación
- ✅ Verificación de identidad de compradores
- ✅ Reconocimiento facial con **FaceAuth**

---

## Notas Importantes

- El medio de pago **"Dinero en cuenta"** no puede ser excluido
- Las credenciales de prueba solo funcionan en ambiente de sandbox
- Siempre valida las notificaciones de pago en tu backend
- Mantén tus credenciales seguras y nunca las expongas en el frontend (excepto la Public Key)

---

**Última actualización:** Enero 2025
