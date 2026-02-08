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
  codeURLTest: process.env.MYPVIT_CODE_URL_TEST,

  // Code pour le endpoint de paiement
  paymentCode: process.env.MYPVIT_PAYMENT_CODE,
  paymentCodeTest: process.env.MYPVIT_PAYMENT_CODE_TEST,

  // Clé secrète pour l'authentification
  secretKey: process.env.MYPVIT_SECRET_KEY,

  // Code du compte d'opération
  accountCodeMoovMoney: process.env.MYPVIT_ACCOUNT_CODE_MOOV_MONEY,
  accountCodeAirtelMoney: process.env.MYPVIT_ACCOUNT_CODE_AIRTEL_MONEY,
  accountCodeTest: process.env.MYPVIT_ACCOUNT_CODE_TEST,

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

  /**
   * Déterminer l'environnement de paiement selon le numéro de téléphone
   * @param {string} phoneNumber - Numéro de téléphone du client
   * @returns {string} - 'TEST', 'AIRTEL_MONEY', ou 'MOOV_MONEY'
   */
  getPaymentEnvironment(phoneNumber) {
    if (!phoneNumber) return "TEST";

    // Nettoyer le numéro (enlever espaces, +, etc.)
    const cleanNumber = phoneNumber.replace(/[\s+\-()]/g, "");

    // Vérifier si c'est un numéro de test (sandbox)
    // Les numéros de test commencent généralement par des préfixes spécifiques
    if (this.environment === "sandbox") {
      return "TEST";
    }

    // Préfixes Gabon - Airtel: 074, 076, 077
    // Préfixes Gabon - Moov: 062, 066
    const airtelPrefixes = [
      "24174",
      "24176",
      "24177",
      "074",
      "076",
      "077",
      "74",
      "76",
      "77",
    ];
    const moovPrefixes = ["24162", "24166", "062", "066", "62", "66"];

    // Vérifier Airtel
    for (const prefix of airtelPrefixes) {
      if (cleanNumber.startsWith(prefix)) {
        return "AIRTEL_MONEY";
      }
    }

    // Vérifier Moov
    for (const prefix of moovPrefixes) {
      if (cleanNumber.startsWith(prefix)) {
        return "MOOV_MONEY";
      }
    }

    // Par défaut, utiliser TEST
    return "TEST";
  },

  /**
   * Obtenir le code du compte selon le numéro de téléphone
   * @param {string} phoneNumber - Numéro de téléphone
   * @returns {string} - Code du compte d'opération
   */
  getAccountCodeByPhone(phoneNumber) {
    const env = this.getPaymentEnvironment(phoneNumber);

    switch (env) {
      case "AIRTEL_MONEY":
        return this.accountCodeAirtelMoney;
      case "MOOV_MONEY":
        return this.accountCodeMoovMoney;
      case "TEST":
      default:
        return this.accountCodeTest;
    }
  },

  /**
   * Obtenir le code opérateur selon le numéro de téléphone
   * @param {string} phoneNumber - Numéro de téléphone
   * @returns {string} - Code opérateur MyPVIT
   */
  getOperatorCodeByPhone(phoneNumber) {
    const env = this.getPaymentEnvironment(phoneNumber);

    switch (env) {
      case "AIRTEL_MONEY":
        return "AIRTEL_MONEY";
      case "MOOV_MONEY":
        return "MOOV_MONEY";
      case "TEST":
      default:
        return "AIRTEL_MONEY"; // Opérateur test par défaut
    }
  },

  /**
   * Obtenir le code URL selon l'environnement
   * @param {string} phoneNumber - Numéro de téléphone
   * @returns {string} - Code URL
   */
  getCodeURLByPhone(phoneNumber) {
    const env = this.getPaymentEnvironment(phoneNumber);
    return env === "TEST" ? this.codeURLTest : this.codeURL;
  },

  /**
   * Obtenir le code de paiement selon l'environnement
   * @param {string} phoneNumber - Numéro de téléphone
   * @returns {string} - Code de paiement
   */
  getPaymentCodeByPhone(phoneNumber) {
    const env = this.getPaymentEnvironment(phoneNumber);
    return env === "TEST" ? this.paymentCodeTest : this.paymentCode;
  },

  // Valider la configuration
  validate() {
    const required = ["codeURL", "callbackURLCode"];

    const missing = required.filter((key) => !this[key]);

    if (missing.length > 0) {
      throw new Error(
        `Configuration MyPVIT incomplète. Variables manquantes: ${missing.join(
          ", ",
        )}`,
      );
    }

    console.log("✅ Configuration MyPVIT validée");
    console.log(
      "   Environnements disponibles: TEST, AIRTEL_MONEY, MOOV_MONEY",
    );
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
