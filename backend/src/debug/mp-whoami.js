import { getMpAccessToken } from "../config.js";

/**
 * Endpoint temporal de debug para verificar qué cuenta de Mercado Pago
 * está asociada al Access Token que se usa para crear preferencias.
 * 
 * PASO 1 - Verificar qué cuenta crea la preferencia (WHO AM I)
 * Objetivo: Confirmar que el token corresponde al Seller Test User esperado (ID: 2974537977)
 */
export async function mpWhoAmI(req, res) {
  try {
    // Usar getMpAccessToken() para obtener el token correcto según MP_MODE
    const accessToken = getMpAccessToken();

    console.log("[mpWhoAmI] Consultando /users/me con token activo...");

    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[mpWhoAmI] Error en respuesta de MP:", data);
      return res.status(response.status).json({
        error: "MP WHOAMI failed",
        status: response.status,
        detail: data,
      });
    }

    console.log("[mpWhoAmI] ✅ Usuario de MP obtenido:", {
      id: data.id,
      email: data.email,
      site_id: data.site_id,
    });

    return res.status(200).json({
      mp_user_id: data.id,
      mp_email: data.email,
      site_id: data.site_id,
      // Información adicional útil para debug
      nickname: data.nickname,
      first_name: data.first_name,
      last_name: data.last_name,
      // Verificar si es el usuario esperado
      is_expected_user: data.id === 2974537977,
      expected_user_id: 2974537977,
    });
  } catch (error) {
    console.error("[mpWhoAmI] ❌ Error:", error);
    return res.status(500).json({
      error: "MP WHOAMI failed",
      detail: String(error),
      message: error.message,
    });
  }
}

