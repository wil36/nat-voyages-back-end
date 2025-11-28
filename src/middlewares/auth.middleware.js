/**
 * Middleware d'authentification par clé API
 * Vérifie que les requêtes viennent bien du frontend autorisé
 */

/**
 * Vérifier la clé API dans les headers
 */
const verifyApiKey = (req, res, next) => {
  try {
    // Récupérer la clé API depuis les headers
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    // Vérifier si la clé est fournie
    if (!apiKey) {
      console.warn('⚠️  Tentative d\'accès sans clé API');
      console.warn('  • IP:', req.ip);
      console.warn('  • Route:', req.originalUrl);
      console.warn('  • Method:', req.method);

      return res.status(401).json({
        success: false,
        message: 'Clé API manquante. Veuillez fournir une clé API valide.',
        error: 'UNAUTHORIZED',
      });
    }

    // Récupérer la clé API attendue depuis les variables d'environnement
    const validApiKey = process.env.FRONTEND_API_KEY;

    if (!validApiKey) {
      console.error('❌ FRONTEND_API_KEY non configurée dans .env');
      return res.status(500).json({
        success: false,
        message: 'Configuration serveur invalide',
        error: 'SERVER_CONFIGURATION_ERROR',
      });
    }

    // Comparer les clés (comparaison sécurisée pour éviter timing attacks)
    if (!secureCompare(apiKey, validApiKey)) {
      console.warn('❌ Tentative d\'accès avec clé API invalide');
      console.warn('  • IP:', req.ip);
      console.warn('  • Route:', req.originalUrl);
      console.warn('  • Clé fournie:', apiKey.substring(0, 10) + '...');

      return res.status(403).json({
        success: false,
        message: 'Clé API invalide',
        error: 'FORBIDDEN',
      });
    }

    // Clé valide, continuer
    console.log('✅ Authentification réussie pour', req.originalUrl);
    next();
  } catch (error) {
    console.error('❌ Erreur middleware auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de l\'authentification',
      error: 'INTERNAL_SERVER_ERROR',
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
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  // Si les longueurs sont différentes, retourner false
  if (bufferA.length !== bufferB.length) {
    return false;
  }

  // Utiliser crypto.timingSafeEqual si disponible (Node.js 6.6.0+)
  const crypto = require('crypto');
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
 * Pas besoin de clé API car c'est MyPVIT qui appelle
 */
const verifyWebhookSource = (req, res, next) => {
  // Pour MyPVIT, on peut vérifier d'autres choses comme l'IP ou un secret partagé
  // Pour l'instant on laisse passer (MyPVIT a son propre système de sécurité)
  console.log('📩 Webhook reçu de:', req.ip);
  next();
};

module.exports = {
  verifyApiKey,
  verifyWebhookSource,
};