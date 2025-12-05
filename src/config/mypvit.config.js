require('dotenv').config();

/**
 * Configuration MyPVIT
 * Centralise toutes les configurations pour l'API de paiement
 */

const MYPVIT_CONFIG = {
  // Environnement (sandbox ou production)
  environment: process.env.MYPVIT_ENV || "sandbox",

  // URL de base de l'API
  baseURL: process.env.MYPVIT_BASE_URL || "https://api.mypvit.pro/v2",

  // Code URL du compte d'opération
  codeURL: process.env.MYPVIT_CODE_URL,

  // Code pour le endpoint de paiement
  paymentCode: process.env.MYPVIT_PAYMENT_CODE,

  // Clé secrète pour l'authentification
  secretKey: process.env.MYPVIT_SECRET_KEY,

  // Code du compte d'opération
  accountCode: process.env.MYPVIT_ACCOUNT_CODE,

  // Mot de passe du compte (pour renouvellement de secret)
  password: process.env.MYPVIT_PASSWORD,

  // Code URL pour les callbacks
  callbackURLCode: process.env.MYPVIT_CALLBACK_URL_CODE,

  //Code Url pour le renew token
  renewTokenCodeURL: process.env.MYPVIT_RENEW_TOKEN_CODE_URL,

  // Paramètres de paiement
  agentName: process.env.MYPVIT_AGENT_NAME || "NAT-VOYAGE",
  serviceType: process.env.MYPVIT_SERVICE_TYPE || "RESTFUL",
  transactionType: process.env.MYPVIT_TRANSACTION_TYPE || "PAYMENT",
  ownerCharge: process.env.MYPVIT_OWNER_CHARGE || "CUSTOMER",
  operatorOwnerCharge: process.env.MYPVIT_OPERATOR_OWNER_CHARGE || "MERCHANT",
  freeInfo: process.env.MYPVIT_FREE_INFO || "Paiement NAT-VOYAGE",

  // Timeout pour les requêtes (en ms)
  timeout: 30000,

  // Montants
  minAmount: 500, // Minimum 500 XAF
  maxAmount: 10000000, // Maximum 10M XAF

  // Headers par défaut
  getHeaders() {
    return {
      "X-Secret": this.secretKey,
      "Content-Type": "application/json",
      "X-Callback-MediaType": "application/json",
    };
  },

  // Construire l'URL complète
  getEndpointURL(operation) {
    return `${this.baseURL}/${this.codeURL}/${operation}`;
  },

  // Valider la configuration
  validate() {
    const required = ["codeURL", "secretKey", "accountCode", "callbackURLCode"];

    const missing = required.filter((key) => !this[key]);

    if (missing.length > 0) {
      throw new Error(
        `Configuration MyPVIT incomplète. Variables manquantes: ${missing.join(
          ", "
        )}`
      );
    }

    console.log("✅ Configuration MyPVIT validée");
    return true;
  },
};

// Valider au démarrage
try {
  MYPVIT_CONFIG.validate();
} catch (error) {
  console.error('❌ Erreur de configuration MyPVIT:', error.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

module.exports = MYPVIT_CONFIG;
