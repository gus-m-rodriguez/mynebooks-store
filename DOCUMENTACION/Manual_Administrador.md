# Manual de Administrador - MyneBooks Store

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Acceso al Panel de Administración](#acceso-al-panel-de-administración)
3. [Sistema de Permisos](#sistema-de-permisos)
4. [Dashboard](#dashboard)
5. [Gestión de Productos](#gestión-de-productos)
6. [Gestión de Órdenes](#gestión-de-órdenes)
7. [Gestión de Usuarios](#gestión-de-usuarios)
8. [Gestión de Pagos](#gestión-de-pagos)
9. [Logs de Auditoría](#logs-de-auditoría)
10. [Procedimientos y Mejores Prácticas](#procedimientos-y-mejores-prácticas)

---

## Introducción

Este manual está dirigido a los administradores del sistema **MyneBooks Store**. Proporciona una guía completa para gestionar todos los aspectos de la plataforma de comercio electrónico.

### Roles Administrativos

El sistema cuenta con dos niveles de administración:

1. **Super Administrador**
   - Acceso completo a todas las funcionalidades
   - Puede gestionar usuarios y permisos
   - No requiere permisos específicos (tiene todos automáticamente)

2. **Administrador**
   - Acceso basado en permisos asignados
   - Puede tener permisos específicos para diferentes áreas
   - Los permisos son asignados por el Super Administrador

### Áreas Administrativas

- **Dashboard**: Vista general con estadísticas
- **Productos**: Gestión del catálogo
- **Órdenes**: Gestión de pedidos
- **Usuarios**: Gestión de usuarios y permisos
- **Ingresos**: Gestión de pagos
- **Auditoría**: Logs del sistema

---

## Acceso al Panel de Administración

### Requisitos Previos

1. **Cuenta de administrador**
   - Debes tener una cuenta con rol "admin" o "super_admin"
   - La cuenta debe estar activa

2. **Permisos asignados** (solo para administradores regulares)
   - El Super Administrador debe haberte asignado al menos un permiso
   - Si eres Super Administrador, tienes acceso automático a todo

### Iniciar Sesión

1. Accede a la página de inicio de sesión (`/login`)
2. Ingresa tus credenciales de administrador
3. Una vez autenticado, verás el enlace **"Administración"** en la barra superior
4. Haz clic en **"Administración"** o accede directamente a `/admin`

### Navegación del Panel

El panel de administración incluye una barra de navegación lateral con las siguientes secciones:

- **📊 Dashboard**: Vista general
- **📦 Productos**: Gestión de productos
- **🛒 Órdenes**: Gestión de órdenes
- **👥 Usuarios**: Gestión de usuarios
- **💰 Ingresos**: Gestión de pagos
- **📋 Auditoría**: Logs del sistema

**Nota**: Solo verás las secciones para las que tienes permisos asignados.

---

## Sistema de Permisos

### Tipos de Permisos

El sistema cuenta con los siguientes permisos:

1. **Dashboard**: Acceso al panel de dashboard administrativo
2. **Productos**: Acceso al panel de gestión de productos
3. **Ordenes**: Acceso al panel de gestión de órdenes
4. **Usuarios**: Acceso al panel de gestión de usuarios
5. **Ingresos**: Acceso al panel de gestión de ingresos y pagos
6. **Auditoria**: Acceso al panel de logs de auditoría

### Asignar Permisos a Usuarios

**Solo el Super Administrador puede asignar permisos.**

1. Accede a **Usuarios** (`/admin/usuarios`)
2. Busca el usuario al que deseas asignar permisos
3. Haz clic en **"Gestionar Permisos"** o **"Editar"**
4. Selecciona los permisos que deseas asignar
5. Guarda los cambios

### Super Administrador

- El Super Administrador tiene **todos los permisos automáticamente**
- No requiere asignación de permisos específicos
- Puede gestionar usuarios, asignar permisos y acceder a todas las áreas
- Solo puede haber un Super Administrador en el sistema

---

## Dashboard

### Acceso

- Haz clic en **"Dashboard"** en la navegación lateral
- O accede directamente a `/admin`

### Información Mostrada

El dashboard muestra estadísticas generales del sistema:

#### Tarjetas de Resumen

1. **Productos**
   - Total de productos
   - Productos sin stock
   - Productos con stock disponible

2. **Órdenes**
   - Total de órdenes
   - Órdenes pendientes
   - Órdenes pagadas
   - Órdenes en envío
   - Órdenes entregadas
   - Órdenes canceladas

3. **Usuarios**
   - Total de usuarios
   - Administradores
   - Clientes

4. **Pagos**
   - Total de pagos
   - Pagos aprobados
   - Pagos pendientes
   - Pagos rechazados

5. **Ingresos**
   - Total de ingresos
   - Ingresos de hoy
   - Ingresos del mes

### Enlaces Rápidos

El dashboard incluye enlaces rápidos a las principales funcionalidades:
- Gestionar Productos
- Gestionar Órdenes
- Gestionar Pagos
- Gestionar Usuarios
- Ver Logs de Auditoría

---

## Gestión de Productos

### Acceso

- Haz clic en **"Productos"** en la navegación lateral
- O accede directamente a `/admin/productos`
- **Requisito**: Permiso "Productos" o ser Super Administrador

### Listar Productos

1. Al acceder a la página, verás una lista de todos los productos
2. Puedes buscar productos usando el campo de búsqueda
3. La lista muestra:
   - Imagen del producto
   - Título
   - Autor
   - Categoría
   - Precio
   - Precio promocional (si aplica)
   - Stock disponible
   - Stock reservado
   - Acciones (Editar/Eliminar)

### Crear un Nuevo Producto

1. Haz clic en el botón **"Nuevo Producto"** o **"+"**
2. Se abrirá un modal con el formulario
3. Completa los siguientes campos:
   - **Título** (requerido): Nombre del libro
   - **Autor** (requerido): Nombre del autor
   - **Categoría** (opcional): Categoría del libro
   - **Precio** (requerido): Precio regular (debe ser mayor a 0)
   - **Precio Promocional** (opcional): Precio con descuento (debe ser menor al precio regular)
   - **Stock** (requerido): Cantidad disponible (mínimo 0)
   - **Descripción** (opcional): Descripción detallada del producto
   - **Imagen**: 
     - Puedes subir una imagen desde tu computadora
     - O ingresar una URL de imagen existente
     - La imagen se almacena en AWS S3

4. Haz clic en **"Crear Producto"**
5. El producto se creará y aparecerá en la lista

### Editar un Producto

1. En la lista de productos, localiza el producto que deseas editar
2. Haz clic en el botón **"Editar"** (ícono de lápiz)
3. Se abrirá el mismo modal con los datos actuales
4. Modifica los campos que necesites
5. Haz clic en **"Guardar Cambios"**

**Nota**: Al editar el stock, ten en cuenta:
- El stock disponible = stock - stock_reserved
- No puedes establecer un stock menor al stock reservado
- Si reduces el stock, los productos en carrito pueden verse afectados

### Eliminar un Producto

**⚠️ ADVERTENCIA**: Esta acción es permanente.

1. En la lista de productos, localiza el producto que deseas eliminar
2. Haz clic en el botón **"Eliminar"** (ícono de basura)
3. Se abrirá un modal de confirmación
4. Confirma la eliminación
5. El producto será eliminado permanentemente

**Consideraciones**:
- Si el producto tiene órdenes asociadas, la eliminación puede estar restringida
- Los productos eliminados no se pueden recuperar

### Subir Imagen de Producto

1. Al crear o editar un producto, en el campo "Imagen"
2. Tienes dos opciones:
   - **Subir archivo**: Haz clic en "Seleccionar archivo" y elige una imagen
     - Formatos soportados: JPG, PNG, GIF
     - Tamaño máximo recomendado: 5MB
   - **URL de imagen**: Ingresa una URL válida de una imagen

3. Si subes un archivo:
   - La imagen se subirá a AWS S3
   - Verás una vista previa una vez subida
   - La URL se completará automáticamente

### Gestión de Stock

#### Ver Stock Disponible
- **Stock Total**: Cantidad total de unidades
- **Stock Reservado**: Unidades reservadas temporalmente (en proceso de pago)
- **Stock Disponible**: Stock Total - Stock Reservado

#### Actualizar Stock
1. Edita el producto
2. Modifica el campo "Stock"
3. Guarda los cambios
4. El stock disponible se actualizará automáticamente

**Importante**:
- No puedes establecer un stock menor al stock reservado
- Si un producto tiene stock_reserved > 0, asegúrate de tener suficiente stock total

### Precios Promocionales

1. Al crear o editar un producto, completa el campo "Precio Promocional"
2. El precio promocional debe ser:
   - Menor al precio regular
   - Mayor o igual a 0
3. Los productos con precio promocional aparecerán en la sección "Promociones"

---

## Gestión de Órdenes

### Acceso

- Haz clic en **"Órdenes"** en la navegación lateral
- O accede directamente a `/admin/ordenes`
- **Requisito**: Permiso "Ordenes" o ser Super Administrador

### Listar Órdenes

1. Al acceder, verás una lista de todas las órdenes
2. Puedes filtrar por estado usando el selector de filtros
3. Puedes buscar órdenes por número de orden o usuario
4. La lista muestra:
   - Número de orden
   - Usuario (nombre y email)
   - Fecha de creación
   - Estado actual
   - Total
   - Acciones (Ver detalle, Actualizar estado)

### Estados de las Órdenes

- **Pendiente**: Orden creada, sin reserva de stock aún
- **En Pago**: Proceso de pago iniciado, stock reservado
- **Pagado**: Pago exitoso, stock descontado
- **En Envío**: Orden enviada al comprador
- **Entregada**: Orden entregada exitosamente
- **Cancelado**: Orden cancelada por el usuario
- **Cancelada Administrador**: Orden cancelada por un administrador
- **Cancelada MP**: Orden cancelada por Mercado Pago
- **Rechazado**: Pago rechazado (sin fondos, etc.)
- **Error**: Error en el proceso, requiere intervención
- **Expirada**: TTL vencido sin pago, stock liberado

### Ver Detalle de una Orden

1. Haz clic en el botón **"Ver"** (ícono de ojo) en la orden deseada
2. O accede directamente a `/admin/ordenes/:id`
3. Verás información completa:
   - Datos del usuario
   - Dirección de envío
   - Productos incluidos
   - Resumen de precios
   - Información de pago
   - Historial de estados

### Actualizar Estado de una Orden

1. En la lista de órdenes, localiza la orden
2. Haz clic en el botón de estado correspondiente:
   - **Marcar como Pagado**: Si el pago fue exitoso pero no se registró automáticamente
   - **Marcar como En Envío**: Cuando envíes la orden
   - **Marcar como Entregada**: Cuando la orden sea entregada
   - **Cancelar**: Para cancelar la orden

3. Se abrirá un modal de confirmación
4. Confirma la acción
5. El estado se actualizará y se registrará en auditoría

**Importante sobre el Stock**:
- Al marcar como "Pagado": Se descuenta el stock definitivamente
- Al cancelar una orden "En Pago": Se libera el stock reservado
- Al cancelar una orden "Pagado": El stock ya fue descontado (no se restaura automáticamente)

### Cancelar una Orden

1. Selecciona la orden que deseas cancelar
2. Haz clic en **"Cancelar"** o **"Marcar como Cancelada"**
3. Selecciona el motivo de cancelación:
   - **Cancelada Administrador**: Cancelada por el administrador
   - **Cancelada MP**: Cancelada por Mercado Pago
4. Confirma la cancelación

**Efectos de la cancelación**:
- Si la orden está "En Pago": Se libera el stock reservado
- Si la orden está "Pagado": El stock ya fue descontado (no se restaura)
- La orden se moverá al historial de canceladas

### Gestionar Órdenes con Error

Si una orden está en estado "Error":

1. Revisa el detalle de la orden
2. Verifica el estado del pago en Mercado Pago
3. Si el pago fue exitoso en MP pero la orden está en error:
   - Actualiza la orden manualmente a "Pagado"
   - El stock se descontará correctamente
4. Si el pago falló:
   - Cancela la orden
   - El stock se liberará

---

## Gestión de Usuarios

### Acceso

- Haz clic en **"Usuarios"** en la navegación lateral
- O accede directamente a `/admin/usuarios`
- **Requisito**: Permiso "Usuarios" o ser Super Administrador

### Listar Usuarios

1. Al acceder, verás una lista de todos los usuarios
2. Puedes buscar usuarios por nombre, email o rol
3. La lista muestra:
   - Nombre completo
   - Email
   - Rol (cliente, admin, super_admin)
   - Estado de la cuenta
   - Permisos asignados (para administradores)
   - Acciones (Editar, Gestionar permisos, Eliminar)

### Ver Detalle de un Usuario

1. Haz clic en el botón **"Ver"** o **"Editar"** en el usuario deseado
2. Verás información completa:
   - Datos personales
   - Dirección de envío
   - Rol y permisos
   - Estado de la cuenta
   - Historial de actividad (si está disponible)

### Crear un Nuevo Usuario Administrador

**Solo el Super Administrador puede crear usuarios administradores.**

1. Haz clic en **"Nuevo Usuario"** o **"+"**
2. Completa el formulario:
   - **Nombre** (requerido)
   - **Apellido** (requerido)
   - **Email** (requerido, debe ser único)
   - **Contraseña** (requerido, debe cumplir requisitos de seguridad)
   - **Rol**: Selecciona "admin" o "super_admin"
3. Si es "admin", asigna los permisos correspondientes
4. Haz clic en **"Crear Usuario"**

### Editar un Usuario

1. Localiza el usuario en la lista
2. Haz clic en **"Editar"**
3. Modifica los campos necesarios:
   - Nombre, apellido, email
   - Dirección de envío
   - Rol (solo Super Admin puede cambiar roles)
4. Guarda los cambios

### Gestionar Permisos de un Usuario

**Solo el Super Administrador puede gestionar permisos.**

1. Localiza el usuario administrador
2. Haz clic en **"Gestionar Permisos"** o **"Editar"**
3. Verás una lista de permisos disponibles:
   - Dashboard
   - Productos
   - Ordenes
   - Usuarios
   - Ingresos
   - Auditoria
4. Selecciona los permisos que deseas asignar
5. Guarda los cambios

**Nota**: El Super Administrador tiene todos los permisos automáticamente y no requiere asignación.

### Cambiar el Rol de un Usuario

**Solo el Super Administrador puede cambiar roles.**

1. Edita el usuario
2. Modifica el campo "Rol"
3. Opciones disponibles:
   - **Cliente**: Usuario regular sin acceso administrativo
   - **Admin**: Administrador con permisos específicos
   - **Super Admin**: Administrador con acceso completo
4. Guarda los cambios

**Importante**: Solo puede haber un Super Administrador en el sistema.

### Bloquear/Desbloquear Usuario

Si un usuario tiene múltiples intentos fallidos de inicio de sesión:

1. La cuenta se bloquea automáticamente después de 5 intentos fallidos
2. Para desbloquear:
   - El sistema puede desbloquear automáticamente después de un tiempo
   - O puedes contactar al Super Administrador para desbloquear manualmente

### Eliminar un Usuario

**⚠️ ADVERTENCIA**: Esta acción es permanente.

1. Localiza el usuario que deseas eliminar
2. Haz clic en **"Eliminar"**
3. Se abrirá un modal de confirmación
4. Confirma la eliminación

**Consideraciones**:
- Si el usuario tiene órdenes asociadas, la eliminación puede estar restringida
- Los datos del usuario se eliminarán permanentemente
- Esta acción se registra en auditoría

---

## Gestión de Pagos

### Acceso

- Haz clic en **"Ingresos"** en la navegación lateral
- O accede directamente a `/admin/pagos`
- **Requisito**: Permiso "Ingresos" o ser Super Administrador

### Listar Pagos

1. Al acceder, verás una lista de todos los pagos
2. Puedes filtrar por estado
3. Puedes buscar pagos por ID de orden o ID de Mercado Pago
4. La lista muestra:
   - ID de pago
   - ID de orden asociada
   - ID de Mercado Pago (mp_id)
   - Estado del pago
   - Monto
   - Fecha de pago
   - Acciones (Ver detalle, Actualizar estado)

### Estados de los Pagos

- **Approved**: Pago aprobado exitosamente
- **Pending**: Pago pendiente (transferencias bancarias)
- **Rejected**: Pago rechazado
- **Cancelled**: Pago cancelado
- **Error**: Error en el procesamiento

### Ver Detalle de un Pago

1. Haz clic en el botón **"Ver"** en el pago deseado
2. Verás información completa:
   - Datos del pago
   - Orden asociada
   - Información de Mercado Pago
   - Historial de estados

### Actualizar Estado de un Pago

Si un pago está en estado incorrecto:

1. Localiza el pago en la lista
2. Haz clic en **"Actualizar Estado"** o **"Sincronizar con MP"**
3. El sistema verificará el estado actual en Mercado Pago
4. El estado se actualizará automáticamente

### Gestionar Pagos con Error

Si un pago está en estado "Error":

1. Revisa el detalle del pago
2. Verifica el estado en Mercado Pago manualmente
3. Si el pago fue exitoso en MP:
   - Actualiza la orden asociada a "Pagado"
   - El stock se descontará correctamente
4. Si el pago falló:
   - Cancela la orden asociada
   - El stock se liberará

### Sincronización con Mercado Pago

El sistema se sincroniza automáticamente con Mercado Pago mediante webhooks. Sin embargo, puedes forzar una sincronización:

1. En el detalle de un pago, haz clic en **"Sincronizar con MP"**
2. El sistema consultará el estado actual en Mercado Pago
3. Actualizará el estado y la orden asociada si es necesario

---

## Logs de Auditoría

### Acceso

- Haz clic en **"Auditoría"** en la navegación lateral
- O accede directamente a `/admin/logs`
- **Requisito**: Permiso "Auditoria" o ser Super Administrador

### Ver Logs

1. Al acceder, verás una lista de eventos registrados
2. Puedes filtrar por tipo de evento o fecha
3. La lista muestra:
   - Tipo de evento
   - Usuario que realizó la acción
   - Fecha y hora
   - Detalles adicionales (si están disponibles)

### Tipos de Eventos Registrados

El sistema registra los siguientes eventos:

- **Autenticación**:
  - `login`: Inicio de sesión
  - `logout`: Cierre de sesión
  - `registro`: Registro de nuevo usuario
  - `solicitud_reset_password`: Solicitud de recuperación de contraseña
  - `password_reseteado`: Contraseña restablecida

- **Productos**:
  - `producto_creado`: Producto creado
  - `producto_actualizado`: Producto modificado
  - `producto_eliminado`: Producto eliminado

- **Órdenes**:
  - `orden_creada`: Orden creada
  - `pago_iniciado`: Proceso de pago iniciado
  - `orden_actualizada`: Estado de orden actualizado
  - `orden_cancelada`: Orden cancelada

- **Pagos**:
  - `pago_creado`: Pago registrado
  - `pago_actualizado`: Estado de pago actualizado
  - `pago_verificado_approved`: Pago verificado como aprobado
  - `pago_verificado_rejected`: Pago verificado como rechazado

- **Usuarios**:
  - `usuario_creado`: Usuario creado
  - `usuario_actualizado`: Usuario modificado
  - `usuario_eliminado`: Usuario eliminado
  - `permisos_asignados`: Permisos asignados a un usuario

### Filtrar Logs

1. Utiliza el selector de filtros para filtrar por tipo de evento
2. Puedes filtrar por fecha usando los controles de fecha
3. Puedes buscar por usuario o texto específico

### Exportar Logs

Si está disponible, puedes exportar los logs:
1. Haz clic en **"Exportar"** o **"Descargar"**
2. Selecciona el formato (CSV, JSON, etc.)
3. Los logs se descargarán

---

## Procedimientos y Mejores Prácticas

### Gestión de Stock

1. **Revisar stock regularmente**
   - Monitorea productos con stock bajo
   - Actualiza el stock cuando recibas nuevos productos
   - Verifica que el stock disponible sea correcto (stock - stock_reserved)

2. **Manejar productos sin stock**
   - Los productos sin stock no se pueden agregar al carrito
   - Considera desactivar temporalmente productos sin stock
   - Actualiza el stock cuando esté disponible nuevamente

3. **Stock reservado**
   - El stock_reserved son unidades temporalmente reservadas durante el proceso de pago
   - Se libera automáticamente si el pago expira o es rechazado
   - Se descuenta del stock total cuando el pago es exitoso

### Gestión de Órdenes

1. **Procesar órdenes pagadas**
   - Revisa regularmente las órdenes en estado "Pagado"
   - Marca como "En Envío" cuando envíes la orden
   - Marca como "Entregada" cuando confirmes la entrega

2. **Manejar órdenes con error**
   - Revisa las órdenes en estado "Error" diariamente
   - Verifica el estado del pago en Mercado Pago
   - Actualiza manualmente si es necesario

3. **Cancelaciones**
   - Solo cancela órdenes cuando sea absolutamente necesario
   - Verifica el estado del stock antes de cancelar
   - Comunica las cancelaciones al cliente

### Gestión de Usuarios

1. **Asignar permisos**
   - Asigna solo los permisos necesarios (principio de menor privilegio)
   - Revisa periódicamente los permisos asignados
   - Elimina permisos cuando ya no sean necesarios

2. **Seguridad**
   - No compartas credenciales de administrador
   - Usa contraseñas seguras
   - Revisa los logs de auditoría regularmente

### Gestión de Pagos

1. **Sincronización**
   - Verifica regularmente los pagos pendientes
   - Sincroniza manualmente si hay discrepancias
   - Contacta a Mercado Pago si hay problemas persistentes

2. **Reconciliación**
   - Compara los ingresos del sistema con los de Mercado Pago
   - Identifica y resuelve discrepancias
   - Mantén registros de reconciliación

### Mantenimiento del Sistema

1. **Revisar logs de auditoría**
   - Revisa los logs regularmente para detectar actividades sospechosas
   - Identifica errores recurrentes
   - Toma acciones correctivas cuando sea necesario

2. **Backup de datos**
   - Asegúrate de que se realicen backups regulares de la base de datos
   - Verifica que los backups sean exitosos
   - Prueba la restauración periódicamente

3. **Actualizaciones**
   - Mantén el sistema actualizado
   - Revisa las actualizaciones de seguridad
   - Prueba las actualizaciones en un entorno de desarrollo antes de producción

### Comunicación con Clientes

1. **Órdenes pendientes**
   - Contacta a clientes con órdenes pendientes por mucho tiempo
   - Ofrece asistencia si hay problemas con el pago

2. **Problemas con órdenes**
   - Responde rápidamente a consultas sobre órdenes
   - Proporciona información clara sobre el estado de las órdenes
   - Resuelve problemas de manera proactiva

### Reportes y Análisis

1. **Estadísticas del dashboard**
   - Revisa las estadísticas regularmente
   - Identifica tendencias y patrones
   - Toma decisiones basadas en datos

2. **Análisis de ventas**
   - Identifica productos más vendidos
   - Analiza categorías populares
   - Ajusta el inventario según la demanda

---

## Solución de Problemas Comunes

### Problema: Producto no se puede eliminar

**Causa**: El producto tiene órdenes asociadas.

**Solución**: 
- Verifica las órdenes asociadas al producto
- Considera desactivar el producto en lugar de eliminarlo
- Si es necesario eliminarlo, primero cancela o completa las órdenes asociadas

### Problema: Orden en estado "Error"

**Causa**: Error en el procesamiento del pago o sincronización con Mercado Pago.

**Solución**:
1. Revisa el detalle de la orden y el pago asociado
2. Verifica el estado en Mercado Pago
3. Si el pago fue exitoso, actualiza la orden manualmente a "Pagado"
4. Si el pago falló, cancela la orden

### Problema: Stock incorrecto

**Causa**: Discrepancia entre stock total y stock reservado.

**Solución**:
1. Verifica las órdenes en estado "En Pago" que puedan tener stock reservado
2. Revisa si hay órdenes expiradas que no liberaron stock
3. Ajusta el stock manualmente si es necesario
4. Considera ejecutar un script de limpieza de reservas expiradas

### Problema: Usuario no puede acceder al panel

**Causa**: 
- No tiene permisos asignados
- Su cuenta está bloqueada
- Su rol no es "admin" o "super_admin"

**Solución**:
1. Verifica el rol del usuario
2. Asigna los permisos necesarios (si eres Super Admin)
3. Verifica que la cuenta no esté bloqueada
4. Contacta al Super Administrador si es necesario

### Problema: Pago no se sincroniza con Mercado Pago

**Causa**: Problema con webhooks o conexión a Mercado Pago.

**Solución**:
1. Verifica la configuración de webhooks en Mercado Pago
2. Sincroniza manualmente el pago desde el panel
3. Verifica los logs de error del sistema
4. Contacta al soporte técnico si el problema persiste

---

## Seguridad y Privacidad

### Protección de Datos

1. **Datos de usuarios**
   - No compartas información de usuarios con terceros
   - Mantén la confidencialidad de las contraseñas
   - Cumple con las regulaciones de protección de datos

2. **Acceso al sistema**
   - Usa contraseñas seguras
   - No compartas credenciales
   - Cierra sesión cuando termines de trabajar

3. **Auditoría**
   - Revisa los logs regularmente
   - Identifica actividades sospechosas
   - Mantén registros de acciones administrativas

### Mejores Prácticas de Seguridad

1. **Principio de menor privilegio**
   - Asigna solo los permisos necesarios
   - No otorgues acceso de Super Admin innecesariamente

2. **Monitoreo**
   - Revisa los logs de auditoría regularmente
   - Identifica intentos de acceso no autorizados
   - Toma acciones correctivas cuando sea necesario

3. **Actualizaciones**
   - Mantén el sistema actualizado
   - Aplica parches de seguridad oportunamente
   - Prueba las actualizaciones antes de producción

---

## Contacto y Soporte

### Soporte Técnico

Si encuentras problemas técnicos:
1. Revisa los logs de auditoría para identificar errores
2. Consulta este manual para procedimientos
3. Contacta al equipo de desarrollo si el problema persiste

### Reportar Problemas

Al reportar un problema, incluye:
- Descripción detallada del problema
- Pasos para reproducirlo
- Capturas de pantalla si es posible
- Información del navegador y sistema operativo
- Logs relevantes (si están disponibles)

---

**Última actualización**: 2025

Este manual se actualiza regularmente. Asegúrate de tener la versión más reciente.

