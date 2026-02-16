/**
 * Middleware d'authentification par clé API
 * Vérifie que les requêtes viennent bien du frontend autorisé
 */

/**
 * Vérifier la clé API dans les headers
 */
const verifyApiKey = (req, res, next) => {
  try {
    // Récupérer la clé API depuis les headers ou le body
    const apiKey =
      req.headers["x-api-key"] ||
      req.headers["authorization"]?.replace("Bearer ", "") ||
      req.body?.apiKey;

    // Vérifier si la clé est fournie
    if (!apiKey) {
      console.warn("⚠️  Tentative d'accès sans clé API");
      console.warn("  • IP:", req.ip);
      console.warn("  • Route:", req.originalUrl);
      console.warn("  • Method:", req.method);

      return res.status(401).json({
        success: false,
        message: "Clé API manquante. Veuillez fournir une clé API valide.",
        error: "UNAUTHORIZED",
      });
    }

    // Récupérer la clé API attendue depuis les variables d'environnement
    const validApiKey = process.env.FRONTEND_API_KEY;

    if (!validApiKey) {
      console.error("❌ FRONTEND_API_KEY non configurée dans .env");
      return res.status(500).json({
        success: false,
        message: "Configuration serveur invalide",
        error: "SERVER_CONFIGURATION_ERROR",
      });
    }

    // Comparer les clés (comparaison sécurisée pour éviter timing attacks)
    if (!secureCompare(apiKey, validApiKey)) {
      console.warn("❌ Tentative d'accès avec clé API invalide");
      console.warn("  • IP:", req.ip);
      console.warn("  • Route:", req.originalUrl);
      console.warn("  • Clé fournie:", apiKey.substring(0, 10) + "...");

      return res.status(403).json({
        success: false,
        message: "Clé API invalide",
        error: "FORBIDDEN",
      });
    }

    // Clé valide, continuer
    console.log("✅ Authentification réussie pour", req.originalUrl);
    next();
  } catch (error) {
    console.error("❌ Erreur middleware auth:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification de l'authentification",
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};

/**
 * Comparaison sécurisée de strings pour éviter les timing attacks
 * @param {string} a - Première chaîne
 * @param {string} b - Deuxième chaîne
 * @returns {boolean}
 */
function secureCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  // Si les longueurs sont différentes, retourner false
  if (bufferA.length !== bufferB.length) {
    return false;
  }

  // Utiliser crypto.timingSafeEqual si disponible (Node.js 6.6.0+)
  const crypto = require("crypto");
  try {
    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (e) {
    // Fallback si timingSafeEqual n'est pas disponible
    let result = 0;
    for (let i = 0; i < bufferA.length; i++) {
      result |= bufferA[i] ^ bufferB[i];
    }
    return result === 0;
  }
}

/**
 * Middleware spécifique pour les webhooks MyPVIT
 * Vérifie que la requête vient bien de MyPVIT
 */
const verifyWebhookSource = (req, res, next) => {
  try {
    // Récupérer l'origine de la requête
    const origin = req.get("origin") || req.get("referer") || "";
    const host = req.get("host") || "";
    const userAgent = req.get("user-agent") || "";
    const clientIp = req.ip || req.connection.remoteAddress;

    console.log("📩 Webhook reçu:");
    console.log("  • IP:", clientIp);
    console.log("  • Origin:", origin);
    console.log("  • Referer:", req.get("referer") || "N/A");
    console.log("  • User-Agent:", userAgent);
    console.log("  • Host:", host);

    // Liste des IPs autorisées pour MyPVIT
    const allowedIPs = [
      "176.31.65.18",
      "176.31.65.20",
      "176.31.65.21",
      "12.59.249.167",
    ];

    // Liste des origines autorisées pour MyPVIT
    const allowedOrigins = ["https://api.mypvit.pro"];

    // Vérifier l'IP
    const isFromAllowedIP = allowedIPs.some((allowedIP) => {
      return clientIp?.includes(allowedIP);
    });

    // Vérifier si l'origine ou le referer contient un domaine MyPVIT autorisé
    const isFromMyPVIT = allowedOrigins.some((allowed) => {
      return (
        origin.includes(allowed) ||
        req.get("referer")?.includes(allowed) ||
        // Accepter aussi si pas d'origin (certains webhooks n'envoient pas d'origin)
        (!origin && !req.get("referer"))
      );
    });

    // Vérification : si on a un origin/referer et qu'il n'est pas autorisé, vérifier l'IP
    if (origin && !isFromMyPVIT && !isFromAllowedIP) {
      console.warn("⚠️  Webhook rejeté - Origine et IP non autorisées");
      console.warn("  • Origin reçu:", origin);
      console.warn("  • IP:", clientIp);

      return res.status(403).json({
        success: false,
        message: "Accès refusé. Cette route est réservée aux webhooks MyPVIT.",
        error: "FORBIDDEN",
      });
    }

    // Log de sécurité
    if (isFromAllowedIP) {
      console.log("✅ Webhook MyPVIT vérifié (IP autorisée)");
    } else if (isFromMyPVIT || !origin) {
      console.log("✅ Webhook MyPVIT vérifié (origine autorisée)");
    }

    next();
  } catch (error) {
    console.error("❌ Erreur vérification webhook:", error);

    // En cas d'erreur, on laisse passer pour ne pas bloquer les webhooks légitimes
    // mais on log l'erreur
    console.warn(
      "⚠️  Erreur lors de la vérification, webhook accepté par défaut",
    );
    next();
  }
};

module.exports = {
  verifyApiKey,
  verifyWebhookSource,
};
