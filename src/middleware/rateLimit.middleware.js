const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting pour protéger l'API
 */

// Rate limit général pour toutes les routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requêtes par IP
  message: {
    success: false,
    message: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit strict pour les paiements
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 tentatives de paiement
  message: {
    success: false,
    message: 'Trop de tentatives de paiement. Veuillez réessayer dans 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit pour les webhooks (plus permissif)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Max 50 webhooks par minute
  message: {
    success: false,
    message: 'Trop de webhooks reçus.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  paymentLimiter,
  webhookLimiter,
};
