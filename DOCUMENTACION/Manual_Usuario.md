# Manual de Usuario - MyneBooks Store

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Navegación y Búsqueda](#navegación-y-búsqueda)
4. [Gestión de Cuenta](#gestión-de-cuenta)
5. [Catálogo de Productos](#catálogo-de-productos)
6. [Carrito de Compras](#carrito-de-compras)
7. [Proceso de Compra](#proceso-de-compra)
8. [Gestión de Órdenes](#gestión-de-órdenes)
9. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

**MyneBooks Store** es una plataforma de comercio electrónico especializada en la venta de libros. Este manual te guiará paso a paso para utilizar todas las funcionalidades disponibles en el sistema.

### Características Principales
- Catálogo completo de libros con búsqueda avanzada
- Carrito de compras intuitivo
- Proceso de pago seguro con Mercado Pago
- Seguimiento de órdenes en tiempo real
- Gestión de perfil personal

---

## Acceso al Sistema

### Registro de Usuario

1. **Acceder a la página de registro**
   - Haz clic en el botón **"Registrarse"** ubicado en la esquina superior derecha del navegador
   - O accede directamente a `/register`

2. **Completar el formulario de registro**
   - **Nombre**: Ingresa tu nombre (mínimo 3 caracteres)
   - **Apellido**: Ingresa tu apellido (mínimo 2 caracteres)
   - **Correo Electrónico**: Ingresa un email válido y único
   - **Contraseña**: Debe cumplir con los siguientes requisitos:
     - Mínimo 8 caracteres
     - Al menos una letra mayúscula (A-Z)
     - Al menos una letra minúscula (a-z)
     - Al menos un número (0-9)
     - Al menos un símbolo (!@#$%^&*...)
     - Ejemplo válido: `MiPassword123!`
   - **Confirmar Contraseña**: Repite la contraseña ingresada

3. **Completar el registro**
   - Haz clic en el botón **"Registrarse"**
   - Si todos los datos son válidos, serás redirigido automáticamente a la página principal

### Inicio de Sesión

1. **Acceder a la página de inicio de sesión**
   - Haz clic en el botón **"Iniciar Sesión"** ubicado en la esquina superior derecha
   - O accede directamente a `/login`

2. **Ingresar credenciales**
   - **Correo Electrónico**: Ingresa el email con el que te registraste
   - **Contraseña**: Ingresa tu contraseña

3. **Iniciar sesión**
   - Haz clic en el botón **"Iniciar Sesión"**
   - Si las credenciales son correctas, serás redirigido a la página principal

**Nota de Seguridad**: Después de 5 intentos fallidos de inicio de sesión, tu cuenta será bloqueada temporalmente por seguridad.

### Recuperación de Contraseña

Si olvidaste tu contraseña, puedes recuperarla siguiendo estos pasos:

1. **Solicitar restablecimiento**
   - En la página de inicio de sesión, haz clic en **"¿Olvidaste tu contraseña?"**
   - O accede directamente a `/forgot-password`
   - Ingresa tu correo electrónico registrado
   - Haz clic en **"Enviar Enlace de Recuperación"**

2. **Recibir el email**
   - Revisa tu bandeja de entrada (y la carpeta de spam)
   - Recibirás un email con un enlace de recuperación
   - El enlace expira en 1 hora

3. **Restablecer contraseña**
   - Haz clic en el enlace del email
   - Serás redirigido a la página de restablecimiento
   - Ingresa tu nueva contraseña (debe cumplir los mismos requisitos que al registrarte)
   - Confirma tu nueva contraseña
   - Haz clic en **"Restablecer Contraseña"**

4. **Iniciar sesión**
   - Una vez restablecida, puedes iniciar sesión con tu nueva contraseña

---

## Navegación y Búsqueda

### Barra de Navegación

La barra de navegación superior incluye:

- **Logo/Inicio**: Haz clic para volver a la página principal
- **Buscador**: Campo de búsqueda central para encontrar productos
- **Enlaces de navegación**:
  - **Ver Catálogo Completo**: Acceso a todos los productos
  - **Destacados**: Productos destacados y recomendados
  - **Novedades**: Últimos productos agregados
  - **Promociones**: Productos con descuentos especiales

### Búsqueda de Productos

1. **Búsqueda rápida**
   - Utiliza el campo de búsqueda en la barra superior
   - Ingresa el título, autor o palabras clave del libro
   - Presiona **Enter** o haz clic en el ícono de búsqueda
   - Si hay un solo resultado, serás redirigido directamente al detalle del producto
   - Si hay múltiples resultados, verás una lista de productos

2. **Búsqueda avanzada con filtros**
   - Accede al catálogo completo (`/catalogo` o `/productos`)
   - Utiliza los filtros en el panel lateral:
     - **Categoría**: Filtra por categoría del libro
     - **Autor**: Filtra por nombre del autor
     - **Precio Mínimo**: Establece un precio mínimo
     - **Precio Máximo**: Establece un precio máximo
   - **Ordenar por**:
     - Más relevantes
     - Título (A-Z)
     - Título (Z-A)
     - Precio (Menor a Mayor)
     - Precio (Mayor a Menor)

---

## Gestión de Cuenta

### Acceder al Perfil

1. Una vez iniciada la sesión, haz clic en tu **nombre** en la barra superior
2. O accede directamente a `/perfil`

### Editar Información Personal

1. En la sección **"Información Personal"**, haz clic en el botón **"Editar"**
2. Modifica los siguientes campos:
   - **Nombre**: Tu nombre
   - **Apellido**: Tu apellido
   - **Correo Electrónico**: Tu email (debe ser único)
   - **Dirección de Envío**: Dirección completa para recibir pedidos (opcional pero recomendado)
3. Haz clic en **"Guardar Cambios"** para confirmar

### Cambiar Contraseña

1. En la sección **"Cambiar Contraseña"**, haz clic en el botón **"Cambiar Contraseña"**
2. Completa el formulario:
   - **Contraseña Actual**: Ingresa tu contraseña actual
   - **Nueva Contraseña**: Debe cumplir los requisitos de seguridad
   - **Confirmar Nueva Contraseña**: Repite la nueva contraseña
3. Haz clic en **"Cambiar Contraseña"** para confirmar

### Eliminar Cuenta

**⚠️ ADVERTENCIA**: Esta acción es permanente e irreversible.

1. En la sección **"Eliminar Cuenta"**, haz clic en el botón **"Eliminar Cuenta"**
2. Se abrirá un modal de confirmación
3. Lee cuidadosamente la información sobre lo que se eliminará:
   - Tu cuenta y todos tus datos personales
   - Tu historial de órdenes
   - Todos los datos asociados a tu cuenta
4. Si estás seguro, haz clic en **"Sí, Eliminar Cuenta"**

### Cerrar Sesión

1. Haz clic en el botón **"Salir"** en la barra superior
2. Serás redirigido a la página principal y tu sesión se cerrará

---

## Catálogo de Productos

### Ver Catálogo Completo

1. Haz clic en **"Ver Catálogo Completo"** en la barra de navegación
2. O accede directamente a `/catalogo`
3. Verás todos los productos disponibles con paginación (12 productos por página)

### Secciones Especiales

#### Destacados (`/destacados`)
- Muestra una combinación de productos en promoción, novedades y productos aleatorios
- Ideal para descubrir nuevos títulos

#### Novedades (`/novedades`)
- Muestra los productos más recientes agregados al catálogo
- Ordenados por fecha de creación (más recientes primero)

#### Promociones (`/promociones`)
- Muestra productos con precio promocional (descuentos)
- Los precios promocionales se muestran destacados

### Ver Detalle de un Producto

1. Haz clic en cualquier producto del catálogo
2. En la página de detalle verás:
   - **Imagen del producto**: Portada del libro
   - **Título**: Nombre completo del libro
   - **Autor**: Nombre del autor
   - **Categoría**: Categoría del libro
   - **Precio**: Precio regular
   - **Precio Promocional**: Si aplica (mostrado en rojo)
   - **Stock Disponible**: Cantidad de unidades disponibles
   - **Descripción**: Descripción detallada del producto
   - **Selector de Cantidad**: Para elegir cuántas unidades deseas
   - **Botón "Agregar al Carrito"**: Para agregar el producto al carrito

3. **Agregar al carrito**:
   - Selecciona la cantidad deseada (no puede exceder el stock disponible)
   - Haz clic en **"Agregar al Carrito"**
   - Verás una confirmación y el contador del carrito se actualizará

---

## Carrito de Compras

### Acceder al Carrito

1. Haz clic en el ícono del **carrito** 🛒 en la barra superior
2. O accede directamente a `/carrito`
3. Verás todos los productos que has agregado

### Gestionar Productos en el Carrito

#### Ver Productos
- Cada producto muestra:
  - Imagen del producto
  - Título y autor
  - Precio unitario (o precio promocional si aplica)
  - Cantidad seleccionada
  - Subtotal (precio × cantidad)
  - Botones para modificar cantidad o eliminar

#### Modificar Cantidad
- Utiliza los botones **+** y **-** para aumentar o disminuir la cantidad
- La cantidad no puede exceder el stock disponible
- Si un producto queda sin stock, se mostrará en gris y será eliminado automáticamente al proceder con la compra

#### Eliminar Producto
- Haz clic en el ícono de **eliminar** (🗑️) para quitar un producto del carrito

#### Resumen del Pedido
En el panel derecho verás:
- **Subtotal**: Suma de todos los productos
- **Envío**: Se calcula en el checkout
- **Total**: Precio total estimado

### Acciones Disponibles

1. **Proceder al Checkout**
   - Haz clic en **"Proceder al Checkout"**
   - Serás redirigido a la página de checkout para completar la compra

2. **Dejar para más tarde**
   - Haz clic en **"Dejar para más tarde"**
   - El carrito se guardará como una orden pendiente
   - Podrás encontrarlo en **"Mis Órdenes"** → **"Más tarde"**
   - Útil si quieres continuar comprando después

3. **Continuar Comprando**
   - Haz clic en **"Continuar Comprando"**
   - Volverás al catálogo para seguir agregando productos

4. **Vaciar Carrito**
   - Haz clic en **"Vaciar Carrito"**
   - Se eliminarán todos los productos del carrito
   - Esta acción requiere confirmación

### Productos Sin Stock

- Si un producto en tu carrito queda sin stock disponible, se mostrará en gris
- Estos productos serán eliminados automáticamente al proceder con el checkout o al guardar para más tarde
- Verás una advertencia indicando cuántos productos sin stock hay en tu carrito

---

## Proceso de Compra

### Checkout

1. **Acceder al checkout**
   - Desde el carrito, haz clic en **"Proceder al Checkout"**
   - O accede directamente a `/checkout` (si tienes productos en el carrito)

2. **Revisar el pedido**
   - Verifica los productos y cantidades
   - Revisa el resumen de precios:
     - Subtotal
     - Envío (si aplica)
     - Total

3. **Dirección de envío**
   - Si ya tienes una dirección guardada en tu perfil, se mostrará automáticamente
   - Puedes modificarla si es necesario
   - La dirección debe tener al menos 10 caracteres
   - **Importante**: La dirección es obligatoria para proceder con el pago

4. **Crear orden**
   - Haz clic en **"Confirmar y Pagar"**
   - Se creará una orden en estado "pendiente"
   - El carrito se vaciará automáticamente
   - Serás redirigido a Mercado Pago para completar el pago

### Pago con Mercado Pago

1. **Redirección a Mercado Pago**
   - Al confirmar el checkout, serás redirigido automáticamente a Mercado Pago
   - El stock de los productos se reserva temporalmente (15 minutos)

2. **Completar el pago**
   - En Mercado Pago, elige tu método de pago preferido:
     - Tarjeta de crédito/débito
     - Transferencia bancaria
     - Dinero en cuenta de Mercado Pago
   - Completa los datos requeridos según el método elegido
   - Confirma el pago

3. **Resultado del pago**
   - **Pago Aprobado**: Serás redirigido a la página de éxito
   - **Pago Pendiente**: Serás redirigido a la página de pendiente (para transferencias bancarias)
   - **Pago Rechazado**: Serás redirigido a la página de fallo

### Estados del Pago

#### Pago Exitoso (`/ordenes/:id/success`)
- Verás un mensaje de confirmación
- Recibirás un email de confirmación (si está configurado)
- La orden quedará en estado "pagado"
- Podrás ver el detalle de tu orden

#### Pago Pendiente (`/ordenes/:id/pending`)
- Para pagos por transferencia bancaria
- La orden quedará en estado "en_pago"
- Debes completar la transferencia según las instrucciones
- Una vez procesado el pago, la orden cambiará a "pagado"

#### Pago Rechazado (`/ordenes/:id/failure`)
- El pago fue rechazado (sin fondos, tarjeta inválida, etc.)
- El stock reservado se liberará automáticamente
- Puedes intentar pagar nuevamente desde "Mis Órdenes"

### Reserva de Stock

- Al iniciar el proceso de pago, el stock se reserva por **15 minutos**
- Si no completas el pago en ese tiempo, la reserva expira y el stock se libera
- Si el pago es rechazado, el stock se libera inmediatamente
- Si el pago es exitoso, el stock se descuenta definitivamente

---

## Gestión de Órdenes

### Acceder a Mis Órdenes

1. Haz clic en **"Mis Órdenes"** en la barra superior
2. O accede directamente a `/ordenes`
3. Verás tus órdenes agrupadas en tres secciones:

### Secciones de Órdenes

#### Más Tarde (`/ordenes?grupo=mas_tarde`)
- Órdenes en estado "pendiente"
- Son órdenes que guardaste para más tarde o que aún no has pagado
- Puedes hacer clic en una orden para ver el detalle y proceder al pago

#### En Camino (`/ordenes?grupo=en_camino`)
- Órdenes en estado "en_envio"
- Son órdenes que ya fueron pagadas y están siendo enviadas
- Puedes hacer seguimiento del estado

#### Historial (`/ordenes?grupo=historial`)
- Órdenes completadas, entregadas o canceladas
- Incluye:
  - Órdenes entregadas
  - Órdenes canceladas
  - Órdenes con errores

### Ver Detalle de una Orden

1. Haz clic en cualquier orden de la lista
2. O accede directamente a `/ordenes/:id`
3. Verás la información completa:
   - **Número de orden**: ID único de la orden
   - **Fecha de creación**: Cuándo se creó la orden
   - **Estado**: Estado actual de la orden
   - **Dirección de envío**: Dirección donde se enviará
   - **Productos**: Lista de productos con cantidades y precios
   - **Resumen de precios**: Subtotal, envío y total
   - **Información de pago**: Estado del pago y detalles

### Estados de las Órdenes

- **Pendiente**: Orden creada, esperando pago
- **En Pago**: Proceso de pago iniciado, stock reservado
- **Pagado**: Pago exitoso, orden confirmada
- **En Envío**: Orden enviada al comprador
- **Entregada**: Orden entregada exitosamente
- **Cancelado**: Orden cancelada (por usuario o administrador)
- **Rechazado**: Pago rechazado por Mercado Pago
- **Error**: Error en el proceso (requiere atención del administrador)

### Acciones Disponibles

#### Pagar una Orden Pendiente
1. Desde "Más Tarde", selecciona una orden pendiente
2. Haz clic en **"Pagar Ahora"** (si está disponible)
3. Serás redirigido a Mercado Pago para completar el pago

#### Cancelar una Orden
- Las órdenes pendientes pueden cancelarse (si el sistema lo permite)
- Las órdenes ya pagadas deben cancelarse contactando al administrador

---

## Preguntas Frecuentes

### ¿Cómo sé si un producto está disponible?
- En la página de detalle del producto, verás el **"Stock Disponible"**
- Si el stock es 0, el producto no está disponible
- En el catálogo, los productos sin stock pueden mostrarse pero no podrás agregarlos al carrito

### ¿Puedo modificar una orden después de crearla?
- Las órdenes pendientes pueden cancelarse y volver a crearse
- Las órdenes ya pagadas no pueden modificarse
- Contacta al administrador si necesitas hacer cambios a una orden pagada

### ¿Qué pasa si mi pago es rechazado?
- El stock reservado se libera automáticamente
- Puedes intentar pagar nuevamente desde "Mis Órdenes"
- La orden permanecerá en estado "rechazado" en tu historial

### ¿Cuánto tiempo tengo para completar el pago?
- Tienes **15 minutos** desde que inicias el proceso de pago
- Si no completas el pago en ese tiempo, la reserva de stock expira
- Puedes crear una nueva orden y volver a intentar

### ¿Cómo actualizo mi dirección de envío?
1. Ve a tu **Perfil** (`/perfil`)
2. Haz clic en **"Editar"** en la sección "Información Personal"
3. Modifica el campo "Dirección de Envío"
4. Guarda los cambios

### ¿Recibiré confirmación por email?
- Sí, recibirás un email cuando:
  - Tu orden sea pagada exitosamente
  - El estado de tu orden cambie (si está configurado)
- Revisa tu bandeja de entrada y la carpeta de spam

### ¿Puedo guardar productos para comprar después?
- Sí, puedes usar la función **"Dejar para más tarde"** en el carrito
- Esto crea una orden pendiente que puedes pagar más tarde
- Encuéntrala en "Mis Órdenes" → "Más tarde"

### ¿Qué métodos de pago aceptan?
- El sistema utiliza **Mercado Pago** como procesador de pagos
- Acepta:
  - Tarjetas de crédito y débito
  - Transferencias bancarias
  - Dinero en cuenta de Mercado Pago

### ¿Cómo contacto con soporte?
- Si tienes problemas, contacta al administrador del sistema
- Revisa los logs de tu cuenta en "Mis Órdenes" para ver el estado de tus pedidos

---

## Consejos y Mejores Prácticas

1. **Mantén tu perfil actualizado**: Asegúrate de tener una dirección de envío válida guardada
2. **Revisa el stock**: Antes de agregar productos al carrito, verifica que haya stock disponible
3. **Completa el pago rápidamente**: Tienes 15 minutos para completar el pago antes de que expire la reserva
4. **Guarda para más tarde**: Si no estás listo para comprar, usa "Dejar para más tarde" en lugar de cerrar la sesión
5. **Revisa tus órdenes**: Mantén un seguimiento de tus órdenes en "Mis Órdenes"
6. **Contraseña segura**: Usa una contraseña fuerte y única para proteger tu cuenta

---

**Última actualización**: 2025

Para más información o soporte, contacta al administrador del sistema.

