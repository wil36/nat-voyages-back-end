const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { validatePayment } = require('../middleware/validation.middleware');
const {
  verifyApiKey,
  verifyWebhookSource,
} = require("../middlewares/auth.middleware");

/**
 * Routes pour les paiements MyPVIT
 * Base: /api/payment
 */

// ========================================
// Routes protégées par clé API (appelées par le frontend)
// ========================================

// Initier un paiement - PROTÉGÉ
router.post('/initiate', verifyApiKey, paymentController.initiatePayment);

// Vérifier le statut d'un paiement - PROTÉGÉ
router.get('/status/:transactionId', verifyApiKey, paymentController.checkPaymentStatus);

// Calculer les frais - PROTÉGÉ
router.get('/fees', verifyApiKey, paymentController.calculateFees);

// Renouveler la clé secrète MyPVIT - PROTÉGÉ
router.post('/renew-secret', verifyApiKey, paymentController.renewSecret);

// ========================================
// Routes webhooks (appelées par MyPVIT) - PAS DE CLÉ API
// ========================================

// Webhook MyPVIT pour notifications de paiement
router.post('/webhook', verifyWebhookSource, paymentController.handleWebhook);

// Recevoir le token MyPVIT (callback automatique)
router.post(
  "/receive-token",
  verifyWebhookSource,
  paymentController.receiveToken
);

module.exports = router;
