const myPVITService = require('../services/mypvit.service');
const { db } = require('../config/firebase.config');

/**
 * Controller pour gérer les paiements
 */

class PaymentController {
  /**
   * Initier un paiement pour une réservation
   * POST /api/payment/initiate
   */
  async initiatePayment(req, res) {
    try {
      const {
        reservationId,
        amount,
        phoneNumber,
        operatorCode = 'CMR_ORANGE', // Par défaut Orange
        reference,
        metadata = {},
      } = req.body;

      console.log('\n' + '🎫'.repeat(40));
      console.log('NOUVELLE DEMANDE DE PAIEMENT');
      console.log('🎫'.repeat(40));
      console.log('  • Reservation ID    :', reservationId);
      console.log('  • Amount            :', `${amount} XAF`);
      console.log('  • Phone             :', phoneNumber);
      console.log('  • Operator          :', operatorCode);
      console.log('  • Timestamp         :', new Date().toLocaleString('fr-FR'));
      console.log('');

      // ========================================
      // ÉTAPE 1 : Récupérer et vérifier le token depuis Firebase
      // ========================================
      console.log('🔍 Récupération du token depuis Firebase...');
      const tokenRef = db.collection('settings').doc('my_pvit_secret_token');
      const tokenDoc = await tokenRef.get();

      let secretKey;
      let needsRenewal = false;

      if (!tokenDoc.exists) {
        console.log('⚠️  Token non trouvé dans Firebase');
        needsRenewal = true;
      } else {
        const tokenData = tokenDoc.data();
        const expirationDate = new Date(tokenData.expiration_date);
        const now = new Date();

        console.log('📅 Date actuelle     :', now.toISOString());
        console.log('📅 Date expiration   :', expirationDate.toISOString());

        if (expirationDate < now) {
          console.log('⏰ Token expiré !');
          needsRenewal = true;
        } else {
          console.log('✅ Token valide');
          secretKey = tokenData.secret;
        }
      }

      // ========================================
      // ÉTAPE 2 : Renouveler le token si nécessaire
      // ========================================
      if (needsRenewal) {
        console.log('\n🔄 Renouvellement du token nécessaire...');
        const renewResult = await myPVITService.renewSecret();
        secretKey = renewResult.secret;

        // Stocker le nouveau token dans Firebase
        const now = new Date();
        const expirationDate = new Date(now.getTime() + renewResult.expiresIn * 1000);

        await tokenRef.set({
          secret: secretKey,
          expires_in: renewResult.expiresIn,
          operation_account_code: process.env.MYPVIT_ACCOUNT_CODE,
          created_at: now.toISOString(),
          expiration_date: expirationDate.toISOString(),
          updated_at: now.toISOString(),
        });

        console.log('✅ Token renouvelé et stocké dans Firebase');
      }

      // ========================================
      // ÉTAPE 3 : Initier le paiement avec MyPVIT
      // ========================================
      console.log('\n💳 Initiation du paiement avec MyPVIT...');

      const paymentData = {
        amount,
        phoneNumber,
        reference,
        operatorCode,
        secretKey, // Passer le token récupéré
        metadata: {
          reservationId,
          ...metadata,
        },
      };

      const paymentResult = await myPVITService.initiatePayment(paymentData);

      // ========================================
      // ÉTAPE 4 : Sauvegarder la transaction dans Firestore
      // ========================================
      const transactionRef = await db.collection('payment_transactions').add({
        reservationId,
        transactionId: paymentResult.transactionId,
        merchantReferenceId: paymentResult.merchantReferenceId,
        amount,
        phoneNumber,
        operator: paymentResult.operator || operatorCode,
        status: paymentResult.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log('✅ Transaction sauvegardée:', transactionRef.id);
      console.log('🎫'.repeat(40) + '\n');

      return res.status(200).json({
        success: true,
        message: paymentResult.message,
        data: {
          transactionId: paymentResult.transactionId,
          merchantReferenceId: paymentResult.merchantReferenceId,
          firestoreId: transactionRef.id,
          status: paymentResult.status,
          amount,
        },
      });
    } catch (error) {
      console.error('❌ Erreur initiation paiement:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'initiation du paiement',
      });
    }
  }

  /**
   * Vérifier le statut d'un paiement
   * GET /api/payment/status/:transactionId
   */
  async checkPaymentStatus(req, res) {
    try {
      const { transactionId } = req.params;

      console.log('🔍 Vérification statut:', transactionId);

      // Vérifier le statut avec MyPVIT
      const statusResult = await myPVITService.checkTransactionStatus(transactionId);

      // Mettre à jour dans Firestore
      const transactionQuery = await db
        .collection('payment_transactions')
        .where('transactionId', '==', transactionId)
        .limit(1)
        .get();

      if (!transactionQuery.empty) {
        const docRef = transactionQuery.docs[0].ref;
        await docRef.update({
          status: statusResult.status,
          operator: statusResult.operator,
          updatedAt: new Date().toISOString(),
        });
      }

      res.status(200).json({
        success: true,
        data: statusResult,
      });
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la vérification du statut',
      });
    }
  }

  /**
   * Calculer les frais de paiement
   * GET /api/payment/fees?amount=xxx
   */
  async calculateFees(req, res) {
    try {
      const { amount } = req.query;

      if (!amount) {
        return res.status(400).json({
          success: false,
          message: 'Montant requis',
        });
      }

      const fees = await myPVITService.calculateFees(amount);

      res.status(200).json({
        success: true,
        data: fees,
      });
    } catch (error) {
      console.error('❌ Erreur calcul frais:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du calcul des frais',
      });
    }
  }

  /**
   * Webhook - Recevoir les notifications de paiement de MyPVIT
   * POST /api/payment/webhook
   */
  async handleWebhook(req, res) {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('📩 WEBHOOK REÇU DE MYPVIT');
      console.log('='.repeat(80));
      console.log('⏰ Timestamp:', new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Libreville' }));
      console.log('📦 Données complètes:', JSON.stringify(req.body, null, 2));
      console.log('='.repeat(80) + '\n');

      const {
        transactionId,
        merchantReferenceId,
        status,
        amount,
        operator,
      } = req.body;

      // Affichage détaillé des tokens
      console.log('🔑 TOKENS EXTRAITS:');
      console.log('  • Transaction ID    :', transactionId || 'N/A');
      console.log('  • Merchant Ref      :', merchantReferenceId || 'N/A');
      console.log('  • Status            :', status || 'N/A');
      console.log('  • Amount            :', amount ? `${amount} XAF` : 'N/A');
      console.log('  • Operator          :', operator || 'N/A');
      console.log('');

      // Trouver la transaction dans Firestore
      const transactionQuery = await db
        .collection('payment_transactions')
        .where('transactionId', '==', transactionId)
        .limit(1)
        .get();

      if (transactionQuery.empty) {
        console.warn('⚠️  Transaction introuvable:', transactionId);
        // Répondre quand même avec succès pour éviter les retries
        return res.status(200).json({
          success: true,
          transactionId,
          message: 'Transaction reçue',
        });
      }

      const transactionDoc = transactionQuery.docs[0];
      const transactionData = transactionDoc.data();

      // Mettre à jour le statut
      await transactionDoc.ref.update({
        status,
        operator,
        webhookReceivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Transaction ${transactionId} mise à jour: ${status}`);

      // Si paiement réussi, marquer les ventes comme payées
      if (status === 'SUCCESS') {
        console.log('💰 Paiement réussi ! Marquage des ventes...');
        await this.markReservationAsPaid(transactionData.reservationId);
      }

      // Si paiement échoué, libérer les places
      if (status === 'FAILED') {
        console.log('❌ Paiement échoué ! Libération des places...');
        await this.releaseReservation(transactionData.reservationId);
      }

      console.log('\n' + '✅'.repeat(40));
      console.log('WEBHOOK TRAITÉ AVEC SUCCÈS');
      console.log('✅'.repeat(40) + '\n');

      // Répondre à MyPVIT avec accusé de réception
      res.status(200).json({
        success: true,
        transactionId,
        message: 'Webhook traité avec succès',
      });
    } catch (error) {
      console.error('❌ Erreur traitement webhook:', error);

      // Répondre quand même avec succès pour éviter les retries infinis
      res.status(200).json({
        success: true,
        message: 'Webhook reçu',
      });
    }
  }

  /**
   * Marquer une réservation comme payée
   * @private
   */
  async markReservationAsPaid(reservationId) {
    try {
      // Récupérer les ventes associées
      const ventesQuery = await db
        .collection('ventes')
        .where('reservationId', '==', reservationId)
        .get();

      // Mettre à jour chaque vente
      const batch = db.batch();

      ventesQuery.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'Payer',
          paymentConfirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();

      console.log(`✅ ${ventesQuery.size} vente(s) marquée(s) comme payée(s)`);
    } catch (error) {
      console.error('❌ Erreur marquage ventes:', error);
      throw error;
    }
  }

  /**
   * Libérer les places d'une réservation échouée
   * @private
   */
  async releaseReservation(reservationId) {
    try {
      // Récupérer les ventes
      const ventesQuery = await db
        .collection('ventes')
        .where('reservationId', '==', reservationId)
        .get();

      if (ventesQuery.empty) {
        console.log('Aucune vente à libérer');
        return;
      }

      // Grouper par voyage
      const voyagesPlaces = {};

      ventesQuery.forEach((doc) => {
        const vente = doc.data();
        const voyageId = vente.voyage_reference?.id;

        if (!voyageId) return;

        if (!voyagesPlaces[voyageId]) {
          voyagesPlaces[voyageId] = { Economie: 0, VIP: 0 };
        }

        if (vente.classe === 'Economie') {
          voyagesPlaces[voyageId].Economie++;
        } else if (vente.classe === 'VIP') {
          voyagesPlaces[voyageId].VIP++;
        }
      });

      // Libérer les places dans chaque voyage
      const batch = db.batch();

      for (const [voyageId, places] of Object.entries(voyagesPlaces)) {
        const voyageRef = db.collection('voyages').doc(voyageId);
        const voyageDoc = await voyageRef.get();

        if (voyageDoc.exists) {
          const currentData = voyageDoc.data();

          batch.update(voyageRef, {
            place_prise_eco: Math.max(
              0,
              (currentData.place_prise_eco || 0) - places.Economie
            ),
            place_prise_vip: Math.max(
              0,
              (currentData.place_prise_vip || 0) - places.VIP
            ),
          });
        }
      }

      // Marquer les ventes comme annulées
      ventesQuery.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'Annuler',
          cancelledAt: new Date().toISOString(),
          cancelReason: 'Paiement échoué',
        });
      });

      await batch.commit();

      console.log(`✅ Places libérées pour la réservation ${reservationId}`);
    } catch (error) {
      console.error('❌ Erreur libération places:', error);
      throw error;
    }
  }

  /**
   * Renouveler la clé secrète MyPVIT
   * POST /api/payment/renew-secret
   */
  async renewSecret(req, res) {
    try {
      console.log('\n🔐 Demande de renouvellement de clé secrète MyPVIT');

      // Appeler le service MyPVIT et ATTENDRE la réponse
      const result = await myPVITService.renewSecret();

      // Après avoir reçu la réponse, on continue
      console.log('✅ Secret renouvelé, envoi de la réponse au client');

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiresIn: result.expiresIn,
          renewedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Erreur renouvellement secret:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors du renouvellement de la clé secrète',
      });
    }
  }

  /**
   * Recevoir et stocker le token MyPVIT
   * POST /api/payment/receive-token
   */
  async receiveToken(req, res) {
    try {
      console.log('\n' + '🔑'.repeat(40));
      console.log('RÉCEPTION DU TOKEN MYPVIT');
      console.log('🔑'.repeat(40));
      console.log('⏰ Timestamp:', new Date().toLocaleString('fr-FR'));
      console.log('📦 Données reçues:', JSON.stringify(req.body, null, 2));
      console.log('');

      // Supporter les deux formats de MyPVIT
      const operation_account_code = req.body.operation_account_code || req.body.merchant_operation_account_code;
      const secret = req.body.secret || req.body.secret_key;
      const expires_in = req.body.expires_in;

      // Validation des données
      if (!operation_account_code || !secret || !expires_in) {
        console.error('❌ Données manquantes dans la requête');
        console.error('Reçu:', { operation_account_code, secret, expires_in });
        return res.status(400).json({
          success: false,
          message: 'Données manquantes: operation_account_code (ou merchant_operation_account_code), secret (ou secret_key) et expires_in sont requis',
        });
      }

      // Calculer les dates
      const now = new Date();
      const expirationDate = new Date(now.getTime() + expires_in * 1000); // expires_in en secondes

      console.log('📅 Calcul des dates:');
      console.log('  • Date actuelle    :', now.toISOString());
      console.log('  • Expire dans (s)  :', expires_in);
      console.log('  • Date expiration  :', expirationDate.toISOString());
      console.log('');

      // Préparer les données à stocker
      const tokenData = {
        secret: secret,
        expires_in: expires_in,
        operation_account_code: operation_account_code,
        created_at: now.toISOString(),
        expiration_date: expirationDate.toISOString(),
        updated_at: now.toISOString(),
      };

      // Référence au document dans Firestore
      const settingsRef = db.collection('settings').doc('my_pvit_secret_token');

      // Vérifier si le document existe
      const docSnapshot = await settingsRef.get();

      if (docSnapshot.exists) {
        console.log('📝 Document existant trouvé, mise à jour...');
        await settingsRef.update({
          ...tokenData,
          updated_at: now.toISOString(),
        });
        console.log('✅ Document mis à jour avec succès');
      } else {
        console.log('🆕 Création d\'un nouveau document...');
        await settingsRef.set(tokenData);
        console.log('✅ Document créé avec succès');
      }

      console.log('');
      console.log('💾 Données stockées dans Firestore:');
      console.log('  • Collection       : settings');
      console.log('  • Document ID      : my_pvit_secret_token');
      console.log('  • Secret           : ' + secret.substring(0, 10) + '...');
      console.log('  • Account Code     :', operation_account_code);
      console.log('  • Expires In       :', expires_in + 's');
      console.log('  • Created At       :', tokenData.created_at);
      console.log('  • Expiration Date  :', tokenData.expiration_date);
      console.log('');
      console.log('✅'.repeat(40) + '\n');

      res.status(200).json({
        success: true,
        message: 'Token reçu et stocké avec succès',
        data: {
          operation_account_code: operation_account_code,
          expires_in: expires_in,
          created_at: tokenData.created_at,
          expiration_date: tokenData.expiration_date,
        },
      });
    } catch (error) {
      console.error('\n' + '❌'.repeat(40));
      console.error('ERREUR RÉCEPTION TOKEN');
      console.error('❌'.repeat(40));
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('❌'.repeat(40) + '\n');

      res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la réception du token',
      });
    }
  }
}

module.exports = new PaymentController();
