# 🔧 Guía de Configuración - Mercado Pago MCP Server

Esta guía te ayudará a configurar el servidor MCP (Model Context Protocol) de Mercado Pago en Cursor para acceder a la documentación y herramientas de integración directamente desde tu IDE.

## 📋 Requisitos Previos

1. **Cursor instalado** (versión 1 o superior)
2. **Cuenta de Mercado Pago** con una aplicación creada
3. **Access Token** de Mercado Pago (de prueba o producción)

---

## 🔑 Paso 1: Obtener tu Access Token de Mercado Pago

### 1.1 Acceder a Mercado Pago Developers

1. Ve a [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Inicia sesión con tu cuenta de Mercado Pago

### 1.2 Acceder a tus credenciales

1. Haz clic en **"Tus integraciones"** (esquina superior derecha)
2. Selecciona tu aplicación o crea una nueva si no tienes
3. Ve a **"Detalles de aplicación"**

### 1.3 Obtener el Access Token

**Para pruebas (Sandbox):**
- Ve a **"Pruebas"** → **"Credenciales de prueba"**
- Copia el **Access Token** (formato: `TEST-xxxxxxxxxxxxx-xxxxxx-...`)

**Para producción:**
- Ve a **"Producción"** → **"Credenciales de producción"**
- Copia el **Access Token** (formato: `APP_USR-xxxxxxxxxxxxx-xxxxxx-...`)

⚠️ **Recomendación**: Para desarrollo, usa siempre las credenciales de **prueba (TEST)**.

---

## ⚙️ Paso 2: Configurar el MCP Server en Cursor

### 2.1 Editar el archivo de configuración

1. Abre el archivo `.cursor/mcp.json` en la raíz de tu proyecto
2. Reemplaza `<TU_ACCESS_TOKEN_AQUI>` con tu Access Token real

**Ejemplo de configuración:**

```json
{
  "mcpServers": {
    "mercadopago-mcp-server": {
      "url": "https://mcp.mercadopago.com/mcp",
      "headers": {
        "Authorization": "Bearer TEST-1234567890-123456-abcdefghijklmnopqrstuvwxyz-123456-abcdefghijklmnopqrstuvwxyz"
      }
    }
  }
}
```

### 2.2 Verificar la configuración

1. Guarda el archivo `mcp.json`
2. Reinicia Cursor o recarga la configuración de MCP
3. Ve a **Cursor Settings** → **Tools & Integrations** → **MCP Servers**
4. Deberías ver **"mercadopago-mcp-server"** como disponible

---

## ✅ Paso 3: Probar la Conexión

### 3.1 Probar con una consulta simple

Abre el chat de Cursor y prueba con este prompt:

```
Busca en la documentación de Mercado Pago cómo integrar Checkout Pro
```

El asistente debería usar el MCP Server para buscar en la documentación oficial.

### 3.2 Verificar que funciona

Si el MCP está configurado correctamente, deberías ver:
- ✅ Respuestas basadas en la documentación oficial de Mercado Pago
- ✅ Código de ejemplo relevante
- ✅ Referencias a endpoints y APIs específicos

---

## 🛠️ Herramientas Disponibles en el MCP Server

El servidor MCP de Mercado Pago ofrece las siguientes herramientas:

### `search-documentation`
Busca información en la documentación oficial de Mercado Pago.

**Parámetros:**
- `query` (string, requerido): Término a buscar
- `language` (string, requerido): Idioma de búsqueda (`es`, `en`, `pt`)
- `siteId` (string, opcional): ID del país (MLA, MLB, MLM, etc.)
- `limit` (number, opcional): Número máximo de resultados
- `offset` (number, opcional): Número de resultados a omitir

**Ejemplo de uso:**
```
Busca en la documentación de Mercado Pago información sobre webhooks
```

---

## 💡 Casos de Uso

### 1. Buscar documentación desde tu IDE

Puedes preguntar al asistente sobre cualquier tema relacionado con Mercado Pago y obtendrá información actualizada de la documentación oficial.

**Ejemplos:**
- "¿Cómo configuro webhooks en Mercado Pago?"
- "Muéstrame ejemplos de código para crear una preferencia de pago"
- "¿Qué medios de pago están disponibles en Argentina?"

### 2. Generar código de integración

El MCP Server puede ayudarte a generar código basado en las mejores prácticas de Mercado Pago.

**Ejemplo:**
```
Implementa la integración de Checkout Pro en mi proyecto. 
Consulta la documentación del MCP Server de Mercado Pago para cualquier detalle de implementación.
```

### 3. Obtener información de tarjetas de prueba

```
Busca en la documentación de Mercado Pago información sobre tarjetas de prueba
```

---

## 🔒 Seguridad

### ⚠️ Importante: Protege tu Access Token

- **NUNCA** commits el archivo `mcp.json` con tu token real al repositorio
- El archivo `.cursor/mcp.json` ya está en `.gitignore` por defecto
- Si necesitas compartir la configuración, usa variables de entorno o un archivo `.env.local`

### Usar variables de entorno (Opcional)

Si prefieres no tener el token directamente en el archivo JSON, puedes usar variables de entorno:

1. Crea un archivo `.env.local` en la raíz del proyecto:
```env
MP_MCP_ACCESS_TOKEN=TEST-tu-token-aqui
```

2. Actualiza `mcp.json` para usar la variable (requiere configuración adicional en Cursor)

---

## 🐛 Solución de Problemas

### El MCP Server no aparece en Cursor

**Solución:**
1. Verifica que el archivo `.cursor/mcp.json` existe y tiene formato JSON válido
2. Verifica que el Access Token está correctamente formateado (debe empezar con `TEST-` o `APP_USR-`)
3. Reinicia Cursor completamente
4. Verifica la configuración en **Cursor Settings** → **Tools & Integrations**

### Error: "Invalid or missing token"

**Posibles causas:**
- El token ha expirado
- El token está mal formateado
- Falta el prefijo "Bearer " en el header

**Solución:**
1. Verifica que el token incluye el prefijo completo (ej: `TEST-123...`)
2. Obtén un nuevo token desde Mercado Pago Developers
3. Asegúrate de que el formato en `mcp.json` es: `"Bearer TU_TOKEN_AQUI"`

### El servidor queda en "Loading Tools"

**Solución:**
1. Verifica tu conexión a internet
2. Verifica que la URL del servidor es correcta: `https://mcp.mercadopago.com/mcp`
3. Verifica que el token tiene los permisos necesarios
4. Intenta con un token de prueba nuevo

---

## 📚 Recursos Adicionales

- **Documentación oficial del MCP Server**: [https://www.mercadopago.com.ar/developers/es/docs/mcp-server/overview](https://www.mercadopago.com.ar/developers/es/docs/mcp-server/overview)
- **Documentación de Mercado Pago Developers**: [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
- **Guía de integración Checkout Pro**: Ver `GUIA_INTEGRACION_CHECKOUT_PRO.md` en este proyecto

---

## 🔄 Actualizar el Token

Si necesitas actualizar tu Access Token:

1. Obtén el nuevo token desde Mercado Pago Developers
2. Edita `.cursor/mcp.json`
3. Reemplaza el token antiguo con el nuevo
4. Guarda el archivo
5. Reinicia Cursor o recarga la configuración MCP

---

## ✅ Checklist de Configuración

- [ ] Cuenta de Mercado Pago creada
- [ ] Aplicación creada en Mercado Pago Developers
- [ ] Access Token obtenido (de prueba o producción)
- [ ] Archivo `.cursor/mcp.json` creado y configurado
- [ ] Token agregado al archivo de configuración
- [ ] Cursor reiniciado
- [ ] MCP Server visible en la configuración de Cursor
- [ ] Prueba de conexión exitosa con una consulta

---

**Última actualización:** Diciembre 2024
