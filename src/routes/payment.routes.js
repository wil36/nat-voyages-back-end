const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { validatePayment } = require('../middleware/validation.middleware');

/**
 * Routes pour les paiements MyPVIT
 * Base: /api/payment
 */

// Initier un paiement
router.post('/initiate', paymentController.initiatePayment);
// router.post("/initiate", validatePayment, paymentController.initiatePayment);

// Vérifier le statut d'un paiement
router.get('/status/:transactionId', paymentController.checkPaymentStatus);

// Calculer les frais
router.get('/fees', paymentController.calculateFees);

// Webhook MyPVIT (pas de validation car vient de MyPVIT)
router.post('/webhook', paymentController.handleWebhook);

// Renouveler la clé secrète MyPVIT
router.post('/renew-secret', paymentController.renewSecret);

// Recevoir le token MyPVIT
router.post('/receive-token', paymentController.receiveToken);

module.exports = router;
