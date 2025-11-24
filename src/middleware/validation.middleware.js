const { body, validationResult } = require('express-validator');

/**
 * Middleware de validation pour les requêtes
 */

// Validation pour l'initiation de paiement
const validatePayment = [
  body('reservationId')
    .notEmpty()
    .withMessage('ID de réservation requis')
    .isString()
    .withMessage('ID de réservation doit être une chaîne'),

  body('amount')
    .notEmpty()
    .withMessage('Montant requis')
    .isNumeric()
    .withMessage('Montant doit être un nombre')
    .custom((value) => value >= 500)
    .withMessage('Montant minimum: 500 XAF'),

  body('phoneNumber')
    .notEmpty()
    .withMessage('Numéro de téléphone requis')
    .matches(/^(\+241)?[0-9]{7,8}$/)
    .withMessage('Format de téléphone invalide (ex: +24177123456 ou 77123456)'),

  body('passagers')
    .optional()
    .isArray()
    .withMessage('Passagers doit être un tableau'),

  // Middleware pour vérifier les erreurs
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: errors.array(),
      });
    }

    next();
  },
];

module.exports = {
  validatePayment,
};
