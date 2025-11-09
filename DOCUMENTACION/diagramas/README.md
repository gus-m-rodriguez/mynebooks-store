# 📊 Diagramas del Proyecto MyneBooks Store

Esta carpeta contiene los diagramas del sistema en formato **PlantUML** (`.puml`).

## 📋 Diagramas Disponibles

### Diagramas de Casos de Uso

El sistema está dividido en **8 diagramas** separados, uno por cada paquete funcional:

1. **`01_gestion_catalogo.puml`** - Gestión de Catálogo
   - UC-01: Navegar catálogo
   - UC-02: Ver detalles de producto
   - UC-03: Buscar productos
   - UC-04: Filtrar productos
   - **Actores**: Visitante, Cliente

2. **`02_autenticacion_registro.puml`** - Autenticación y Registro
   - UC-05: Registrarse
   - UC-06: Iniciar sesión
   - UC-07: Cerrar sesión
   - UC-08: Recuperar contraseña
   - UC-09: Restablecer contraseña
   - UC-10: Cambiar contraseña
   - **Actores**: Visitante, Cliente

3. **`03_gestion_carrito.puml`** - Gestión de Carrito
   - UC-11: Agregar producto al carrito
   - UC-12: Modificar cantidad en carrito
   - UC-13: Eliminar producto del carrito
   - UC-14: Vaciar carrito
   - UC-15: Ver carrito
   - **Actores**: Cliente

4. **`04_proceso_compra.puml`** - Proceso de Compra
   - UC-16: Crear orden de compra
   - UC-17: Iniciar proceso de pago
   - UC-18: Completar pago en Mercado Pago
   - UC-19: Guardar carrito para más tarde
   - UC-20: Ver estado de pago
   - **Actores**: Cliente, Mercado Pago

5. **`05_gestion_ordenes.puml`** - Gestión de Órdenes
   - UC-21: Ver mis órdenes
   - UC-22: Ver detalle de orden
   - UC-23: Cancelar orden (usuario)
   - UC-24: Reintentar pago de orden pendiente
   - **Actores**: Cliente

6. **`06_gestion_perfil.puml`** - Gestión de Perfil
   - UC-25: Ver perfil
   - UC-26: Actualizar perfil
   - UC-27: Actualizar dirección de envío
   - **Actores**: Cliente

7. **`07_panel_administrativo.puml`** - Panel Administrativo
   - UC-28: Ver dashboard
   - UC-29 a UC-34: Gestión de Productos
   - UC-35 a UC-38: Gestión de Órdenes
   - UC-39 a UC-43: Gestión de Usuarios
   - UC-44 a UC-46: Gestión de Pagos
   - UC-47 a UC-49: Auditoría
   - **Actores**: Administrador, Super Administrador

8. **`08_sistema_procesamiento.puml`** - Sistema de Procesamiento Automático
   - UC-50: Procesar webhook de Mercado Pago
   - UC-51: Liberar reservas expiradas
   - UC-52: Bloquear cuenta tras 5 intentos fallidos
   - **Actores**: Mercado Pago, Sistema

### Diagramas de Secuencia

Diagramas de secuencia detallados para los casos de uso más relevantes:

1. **`secuencia_01_registro_usuario.puml`** - Registro de Usuario
   - Flujo completo desde formulario hasta autenticación
   - Incluye validaciones, hash de contraseña, JWT, email de bienvenida

2. **`secuencia_02_inicio_sesion.puml`** - Inicio de Sesión con Bloqueo
   - Flujo de autenticación completo
   - Sistema de bloqueo tras 5 intentos fallidos
   - Manejo de cuentas bloqueadas

3. **`secuencia_03_agregar_carrito.puml`** - Agregar Producto al Carrito
   - Validación de stock disponible
   - Manejo de productos ya en carrito
   - Actualización de cantidades

4. **`secuencia_04_proceso_compra.puml`** - Proceso de Compra Completo
   - Crear orden desde carrito
   - Iniciar pago y reservar stock
   - Integración con Mercado Pago
   - Flujo completo hasta redirección

5. **`secuencia_05_webhook_mercadopago.puml`** - Procesar Webhook de Mercado Pago
   - Validación de firma del webhook
   - Idempotencia (procesamiento único)
   - Manejo de diferentes estados (approved, rejected, pending, cancelled)
   - Actualización de stock y reactivación de carrito

6. **`secuencia_06_liberar_reservas.puml`** - Job Automático: Liberar Reservas Expiradas
   - Proceso automático cada 5 minutos
   - Búsqueda de órdenes expiradas
   - Liberación de stock reservado
   - Reactivación de carritos

7. **`secuencia_07_recuperar_password.puml`** - Recuperar Contraseña
   - Solicitud de recuperación
   - Generación y envío de token por email
   - Restablecimiento de contraseña con token

8. **`secuencia_08_crear_producto_admin.puml`** - Crear Producto (Administrador)
   - Validación de permisos
   - Subida de imagen a AWS S3
   - Creación de producto en base de datos
   - Auditoría de operaciones

## 🛠️ Cómo Visualizar los Diagramas

### Opción 1: PlantUML Online (Recomendado para visualización rápida)

1. Ve a [http://www.plantuml.com/plantuml/uml/](http://www.plantuml.com/plantuml/uml/)
2. Abre el archivo `.puml` en un editor de texto
3. Copia todo el contenido
4. Pégalo en el editor de PlantUML Online
5. El diagrama se generará automáticamente
6. Puedes descargarlo como PNG, SVG o PDF

### Opción 2: VS Code con Extensión PlantUML

1. Instala la extensión **"PlantUML"** en VS Code
2. Abre el archivo `.puml`
3. Presiona `Alt + D` (o `Cmd + D` en Mac) para previsualizar
4. O haz clic derecho → "Preview PlantUML Diagram"

### Opción 3: IntelliJ IDEA / PyCharm

1. Instala el plugin **"PlantUML integration"**
2. Abre el archivo `.puml`
3. El diagrama se renderiza automáticamente
4. Puedes exportarlo desde el menú del plugin

### Opción 4: PlantUML Local (Java requerido)

1. **Instalar Java** (si no lo tienes):
   - Descarga desde [https://www.java.com/](https://www.java.com/)

2. **Descargar PlantUML JAR**:
   ```bash
   # Opción A: Descargar directamente
   wget http://sourceforge.net/projects/plantuml/files/plantuml.jar/download -O plantuml.jar
   
   # Opción B: Con npm
   npm install -g node-plantuml
   ```

3. **Generar diagramas**:
   ```bash
   # Generar todos los diagramas
   java -jar plantuml.jar *.puml
   
   # O generar uno específico
   java -jar plantuml.jar 01_gestion_catalogo.puml
   
   # Con npm (si instalaste node-plantuml)
   puml generate *.puml
   ```

4. Se generarán archivos `.png` para cada diagrama en la misma carpeta

### Opción 5: Docker (Sin instalar Java)

```bash
# Generar todos los diagramas
docker run --rm -v "$PWD:/work" plantuml/plantuml *.puml

# O generar uno específico
docker run --rm -v "$PWD:/work" plantuml/plantuml 01_gestion_catalogo.puml
```

## 📝 Estructura de los Diagramas

### Actores del Sistema

- **Visitante**: Usuario no autenticado que puede navegar el catálogo
- **Cliente**: Usuario autenticado que puede comprar y gestionar su cuenta
- **Administrador**: Usuario con permisos específicos para gestionar el sistema
- **Super Administrador**: Usuario con acceso total al sistema (solo puede haber uno)
- **Mercado Pago**: Sistema externo de pagos que envía webhooks
- **Sistema**: Jobs automáticos del backend (procesos en segundo plano)

### Organización de los Diagramas

Cada diagrama es independiente y se enfoca en un área funcional específica:
- Más fácil de leer y mantener
- Puede visualizarse individualmente
- Incluye solo los actores relevantes
- Tiene notas explicativas específicas del área

## 🎨 Convenciones del Diagrama

- **Colores**: Cada actor tiene un color distintivo
- **Flechas sólidas**: Relación de uso (actor → caso de uso)
- **Flechas punteadas**: Relaciones <<include>> y <<extend>>
- **Notas**: Explicaciones adicionales sobre casos de uso específicos

## 📚 Referencias

- **PlantUML Official**: [https://plantuml.com/](https://plantuml.com/)
- **PlantUML Syntax Guide**: [https://plantuml.com/guide](https://plantuml.com/guide)
- **Use Case Diagrams**: [https://plantuml.com/use-case-diagram](https://plantuml.com/use-case-diagram)

## 🔄 Actualizar el Diagrama

Si necesitas actualizar el diagrama:

1. Edita el archivo `.puml` con un editor de texto
2. Sigue la sintaxis de PlantUML
3. Verifica que compile sin errores
4. Regenera la imagen si es necesario

## 📄 Licencia

Estos diagramas son parte del Proyecto Integrador de **UTN Wizards** y están sujetos a la misma licencia académica del proyecto.

---

**Desarrollado con ❤️ por UTN Wizards - 2025**

*"Diagramas claros, código limpio"* 📊✨

