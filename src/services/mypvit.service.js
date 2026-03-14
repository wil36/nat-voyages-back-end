const axios = require('axios');
const crypto = require('crypto');
const MYPVIT_CONFIG = require('../config/mypvit.config');

/**
 * Service MyPVIT
 * Gère toutes les interactions avec l'API MyPVIT
 */

class MyPVITService {
  constructor() {
    this.config = MYPVIT_CONFIG;
    this.axios = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.getHeaders(),
    });
  }

  /**
   * Générer une référence unique pour une transaction
   * Format: MAX 15 caractères
   */
  generateReference(prefix = 'NAT') {
    const timestamp = Date.now().toString().slice(-8);
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`.substring(0, 15);
  }

  /**
   * Renouveler la clé secrète MyPVIT
   * Requête POST synchrone qui attend la réponse avant de continuer
   * @param {string} phoneNumber - Numéro de téléphone pour déterminer l'environnement (TEST, AIRTEL_MONEY, MOOV_MONEY)
   */
  async renewSecret(phoneNumber = null) {
    try {
      // Déterminer l'environnement selon le numéro de téléphone
      const paymentEnv = this.config.getPaymentEnvironment(phoneNumber);
      const accountCode = this.config.getAccountCodeByPhone(phoneNumber);
      const codeURL = this.config.getCodeURLByPhone(phoneNumber);

      console.log('\n' + '='.repeat(60));
      console.log('RENOUVELLEMENT DE LA CLÉ SECRÈTE MYPVIT');
      console.log('='.repeat(60));
      console.log('⏰ Timestamp:', new Date().toLocaleString('fr-FR'));
      console.log('📱 Numéro de téléphone:', phoneNumber || 'Non fourni');
      console.log('🌍 Environnement de paiement:', paymentEnv);
      console.log('');

      // URL complète pour renouveler le secret
      const renewURL = `https://api.mypvit.pro/${codeURL}/renew-secret`;

      console.log('📡 URL:', renewURL);
      console.log('📦 Paramètres:');
      console.log('  • operationAccountCode:', accountCode);
      console.log("  • receptionUrlCode:", this.config.renewTokenCodeURL);
      console.log("  • password:", "********");
      console.log("");

      // Créer les paramètres au format x-www-form-urlencoded
      const params = new URLSearchParams({
        operationAccountCode: accountCode,
        receptionUrlCode: this.config.renewTokenCodeURL,
        password: this.config.password,
      });

      console.log('📤 Envoi de la requête POST...');

      // Faire la requête POST avec les bons headers (AWAIT - Bloquant)
      const response = await axios.post(
        renewURL,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'X-Secret': this.config.secretKey,
          },
          timeout: this.config.timeout,
        }
      );

      console.log('📥 Réponse reçue de MyPVIT:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('');

      // Vérifier la réponse
      if (response.data ) {
        console.log("✅ Clé secrète renouvelée avec succès !");
        console.log(`⏱️  Expire dans: ${response.data.expires_in || "N/A"}s`);
        console.log('='.repeat(60) + "\n");

        return {
          success: true,
          secret: response.data.secret,
          expiresIn: response.data.expires_in,
          paymentEnvironment: paymentEnv,
          accountCode: accountCode,
          message: "Clé secrète renouvelée avec succès",
        };
      }

      throw new Error('Réponse invalide du serveur - Clé secrète manquante');
    } catch (error) {
      console.error('\n' + '='.repeat(60));
      console.error('ERREUR RENOUVELLEMENT SECRET');
      console.error('Message:', error.message);

      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }

      console.error('='.repeat(60) + '\n');

      throw error;
    }
  }

  /**
   * Initier un paiement REST
   * @param {Object} paymentData
   * @param {number} paymentData.amount - Montant en XAF
   * @param {string} paymentData.phoneNumber - Numéro du client (détermine l'environnement: TEST, AIRTEL_MONEY, MOOV_MONEY)
   * @param {string} paymentData.reference - Référence unique (optionnel)
   * @param {string} paymentData.operatorCode - Code opérateur (optionnel, déduit du numéro si non fourni)
   * @param {string} paymentData.secretKey - Clé secrète MyPVIT
   * @param {Object} paymentData.metadata - Données supplémentaires
   */
  async initiatePayment(paymentData) {
    try {
      const {
        amount = 500,
        phoneNumber = "",
        reference = this.generateReference(),
        secretKey = this.config.secretKey,
        metadata = {},
      } = paymentData;

      // Déterminer l'environnement selon le numéro de téléphone
      const paymentEnv = this.config.getPaymentEnvironment(phoneNumber);
      const accountCode = this.config.getAccountCodeByPhone(phoneNumber);
      const operatorCode = paymentData.operatorCode || this.config.getOperatorCodeByPhone(phoneNumber);
      const paymentCode = this.config.getPaymentCodeByPhone(phoneNumber);

      console.log("\n" + "=".repeat(60));
      console.log("INITIATION PAIEMENT MYPVIT");
      console.log("=".repeat(60));
      console.log("  • Montant           :", `${amount} XAF`);
      console.log("  • Téléphone         :", phoneNumber);
      console.log("  • Référence         :", reference);
      console.log("  • Environnement     :", paymentEnv);
      console.log("  • Compte            :", accountCode);
      console.log("  • Opérateur         :", operatorCode);
      console.log("");

      // Endpoint complet avec le code de paiement selon l'environnement
      const paymentURL = `${this.config.baseURL.replace("/v2", "")}/v2/${paymentCode}/rest`;

      const payload = {
        agent: this.config.agentName || "NAT-VOYAGE",
        amount: parseInt(amount),
        product: "NAT-VOYAGE",
        reference: reference,
        service: this.config.serviceType,
        callback_url_code: this.config.callbackURLCode,
        customer_account_number: (phoneNumber || "").replace(/\s+/g, ""),
        merchant_operation_account_code: accountCode,
        transaction_type: this.config.transactionType,
        owner_charge: this.config.ownerCharge,
        operator_owner_charge: this.config.operatorOwnerCharge,
        free_info: reference,
        operator_code: operatorCode,
      };

      console.log("📤 Payload:", JSON.stringify(payload, null, 2));
      console.log("📡 URL:", paymentURL);
      console.log("");

      const response = await axios.post(paymentURL, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-Secret": secretKey,
          "X-Callback-MediaType": "application/json",
        },
        timeout: this.config.timeout,
      });

      console.log("📥 Réponse MyPVIT:");
      console.log(JSON.stringify(response.data, null, 2));
      console.log("");

      if (
        response.data &&
        (response.data.status_code === "200" ||
          response.data.status === "PENDING")
      ) {
        console.log("✅ Paiement initié avec succès");
        console.log("=".repeat(60) + "\n");

        return {
          success: true,
          status: response.data.status,
          transactionId: response.data.reference_id,
          merchantReferenceId: response.data.merchant_reference_id,
          operator: response.data.operator,
          paymentEnvironment: paymentEnv,
          accountCode: accountCode,
          message: response.data.message || "Paiement initié avec succès",
        };
      }

      // Si le statut est FAILED
      if (response.data && response.data.status === "FAILED") {
        console.log("❌ Paiement échoué");
        console.log("=".repeat(60) + "\n");

        throw new Error(response.data.message || "Le paiement a échoué");
      }

      throw new Error(response.data?.message || "Erreur lors de l'initiation");
    } catch (error) {
      console.error('\n' + '='.repeat(60));
      console.error('ERREUR INITIATION PAIEMENT');
      console.error('Message:', error.message);

      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", JSON.stringify(error.response.data, null, 2));

        const { status, data } = error.response;

        // Afficher les messages de validation détaillés
        if (data.messages && Array.isArray(data.messages)) {
          console.error("\n📋 Messages de validation MyPVIT:");
          data.messages.forEach((msg, index) => {
            console.error(`  ${index + 1}. ${msg}`);
          });
        }

        if (status === 422) {
          const errorMessages =
            data.messages?.join(", ") ||
            "Contraintes de validation non respectées";
          throw new Error(`Erreur de validation MyPVIT: ${errorMessages}`);
        }

        if (status === 401) {
          throw new Error(
            data.message +
              "Clé secrète expirée ou invalide. Veuillez renouveler la clé."
          );
        }

        if (status === 403) {
          throw new Error(data.message);
        }

        if (status === 400) {
          throw new Error(data.message || "Données de paiement invalides");
        }
      }

      console.error('='.repeat(60) + '\n');
      throw error;
    }
  }

  /**
   * Vérifier le statut d'une transaction
   * @param {string} referenceId - ID de la transaction MyPVIT
   */
  async checkTransactionStatus(referenceId) {
    try {
      console.log(`🔍 Vérification statut transaction: ${referenceId}`);

      const response = await this.axios.get(
        this.config.getEndpointURL('status'),
        {
          params: {
            reference_id: referenceId,
          },
        }
      );

      console.log('📥 Statut:', response.data);

      return {
        success: true,
        status: response.data.status,
        transactionId: response.data.reference_id,
        amount: response.data.amount,
        operator: response.data.operator,
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Calculer les frais de transaction
   * @param {number} amount - Montant
   */
  async calculateFees(amount) {
    try {
      const response = await this.axios.get(
        this.config.getEndpointURL('fees'),
        {
          params: {
            amount: parseInt(amount),
          },
        }
      );

      return {
        success: true,
        fees: response.data.fees,
        total: response.data.total_amount,
        breakdown: response.data.breakdown,
      };
    } catch (error) {
      console.error('❌ Erreur calcul frais:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Vérifier la balance du compte
   */
  async checkBalance() {
    try {
      const response = await this.axios.get(
        this.config.getEndpointURL('balance')
      );

      return {
        success: true,
        balance: response.data.balance,
        currency: response.data.currency,
      };
    } catch (error) {
      console.error('❌ Erreur vérification balance:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new MyPVITService();
