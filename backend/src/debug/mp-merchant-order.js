import { getMpAccessToken } from "../config.js";

/**
 * Endpoint temporal de debug para buscar merchant orders por preference_id
 * 
 * Útil para verificar qué merchant orders están asociados a una preferencia
 * y obtener los payment_ids asociados.
 */
export async function mpMerchantOrderByPreference(req, res) {
  try {
    // Usar getMpAccessToken() para obtener el token correcto según MP_MODE
    const accessToken = getMpAccessToken();
    const preferenceId = req.query.preference_id;

    if (!preferenceId) {
      return res.status(400).json({ 
        error: "Missing query param: preference_id",
        usage: "GET /debug/mp-merchant-order?preference_id=YOUR_PREFERENCE_ID"
      });
    }

    console.log("[mpMerchantOrderByPreference] Buscando merchant orders para preference_id:", preferenceId);

    const url = `https://api.mercadopago.com/merchant_orders/search?preference_id=${encodeURIComponent(preferenceId)}`;

    const response = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${accessToken}` 
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[mpMerchantOrderByPreference] Error en respuesta de MP:", data);
      return res.status(response.status).json({
        error: "MP merchant_orders/search failed",
        status: response.status,
        detail: data,
      });
    }

    console.log("[mpMerchantOrderByPreference] ✅ Merchant orders encontrados:", {
      preference_id: preferenceId,
      results_count: data?.elements?.length ?? 0,
    });

    // Devolver lo más útil para debug
    return res.status(200).json({
      preference_id: preferenceId,
      results_count: data?.elements?.length ?? 0,
      elements: data?.elements ?? data, // por si MP cambia el shape
    });
  } catch (error) {
    console.error("[mpMerchantOrderByPreference] ❌ Error:", error);
    return res.status(500).json({
      error: "MP merchant_orders/search failed",
      detail: String(error),
      message: error.message,
    });
  }
}

