const myPVITService = require('../services/mypvit.service');
const { db } = require('../config/firebase.config');
const MYPVIT_CONFIG = require('../config/mypvit.config');

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
        operatorCode, // Par défaut Orange
        reference,
        metadata = {},
      } = req.body;

      console.log("\n" + "🎫".repeat(40));
      console.log("NOUVELLE DEMANDE DE PAIEMENT");
      console.log("🎫".repeat(40));
      console.log("  • Reservation ID    :", reservationId);
      console.log("  • Amount            :", `${amount} XAF`);
      console.log("  • Phone             :", phoneNumber);
      console.log("  • Operator          :", operatorCode);
      console.log(
        "  • Timestamp         :",
        new Date().toLocaleString("fr-FR")
      );
      console.log("");

      // ========================================
      // ÉTAPE 1 : Récupérer et vérifier le token depuis Firebase
      // ========================================
      const tokenDocId = MYPVIT_CONFIG.getTokenDocId(phoneNumber);
      console.log(`🔍 Récupération du token depuis Firebase (${tokenDocId})...`);
      const tokenRef = db.collection("settings").doc(tokenDocId);
      const tokenDoc = await tokenRef.get();

      let secretKey;
      let needsRenewal = false;

      if (!tokenDoc.exists) {
        console.log("⚠️  Token non trouvé dans Firebase");
        needsRenewal = true;
      } else {
        const tokenData = tokenDoc.data();
        const expirationDate = new Date(tokenData.expiration_date);
        const now = new Date();

        console.log("📅 Date actuelle     :", now.toISOString());
        console.log("📅 Date expiration   :", expirationDate.toISOString());

        if (expirationDate < now) {
          console.log("⏰ Token expiré !");
          needsRenewal = true;
        } else {
          console.log("✅ Token valide");
          secretKey = tokenData.secret;
        }
      }

      // ========================================
      // ÉTAPE 2 : Renouveler le token si nécessaire
      // ========================================
      if (needsRenewal) {
        console.log("\n🔄 Renouvellement du token nécessaire...");

        // Marquer le token comme expiré dans Firebase
        await tokenRef.set(
          {
            status: "Expired",
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );

        console.log("📝 Statut mis à jour: Expired");
        console.log("📤 Lancement de la requête de renouvellement...");

        // Lancer la requête de renouvellement avec le numéro de téléphone
        // pour déterminer l'environnement (TEST, AIRTEL_MONEY, MOOV_MONEY)
        myPVITService.renewSecret(phoneNumber).catch((err) => {
          console.error("❌ Erreur renouvellement:", err.message);
        });

        console.log("⏳ Attente du callback MyPVIT...");
        console.log("👂 Écoute en temps réel des changements Firebase...");

        // Créer une Promise qui résout quand le token est reçu
        secretKey = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            unsubscribe();
            reject(
              new Error(
                "Timeout: Le callback MyPVIT n'a pas répondu dans les 60 secondes"
              )
            );
          }, 60000); // 60 secondes

          // Écouter les changements en temps réel sur le document
          const unsubscribe = tokenRef.onSnapshot(
            (snapshot) => {
              if (snapshot.exists) {
                const tokenData = snapshot.data();

                console.log(
                  `📊 Changement détecté - Statut: ${tokenData.status || "N/A"}`
                );

                if (tokenData.status === "Active" && tokenData.secret) {
                  console.log("✅ Token reçu via callback en temps réel !");
                  clearTimeout(timeout);
                  unsubscribe();
                  resolve(tokenData.secret);
                }
              }
            },
            (error) => {
              console.error("❌ Erreur listener Firestore:", error);
              clearTimeout(timeout);
              unsubscribe();
              reject(error);
            }
          );
        }).catch((error) => {
          console.error("❌", error.message);
          return res.status(500).json({
            success: false,
            message:
              "Timeout lors du renouvellement du token. Veuillez réessayer.",
            error: "TOKEN_RENEWAL_TIMEOUT",
          });
        });

        if (!secretKey) {
          // Si on arrive ici c'est qu'il y a eu timeout
          return res.status(500).json({
            success: false,
            message:
              "Timeout lors du renouvellement du token. Veuillez réessayer.",
            error: "TOKEN_RENEWAL_TIMEOUT",
          });
        }

        console.log("✅ Token récupéré depuis Firebase après callback");
        console.log("🔑 Secret:", secretKey);
      }

      // ========================================
      // ÉTAPE 3 : Initier le paiement avec MyPVIT
      // ========================================
      console.log("\n💳 Initiation du paiement avec MyPVIT...");

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

      const transactionRef = await db.collection("payment_transactions").add({
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

      console.log("✅ Transaction sauvegardée:", transactionRef.id);

      // ========================================
      // ÉTAPE 5 : Mettre à jour la vente avec le transaction ID MyPVIT
      // ========================================

      console.log("📝 Mise à jour de la vente avec transaction_mypvit_id...");

      const ventesSnapshot = await db
        .collection("ventes")
        .where("reservationId", "==", reservationId)
        .get();

      if (!ventesSnapshot.empty) {
        const venteDoc = ventesSnapshot.docs[0];
        await venteDoc.ref.update({
          transaction_mypvit_id: paymentResult.transactionId,
          transaction_status: paymentResult.status,
          updatedAt: new Date().toISOString(),
        });

        console.log(
          `✅ Vente ${reservationId} mise à jour avec transaction_mypvit_id: ${paymentResult.transactionId}`
        );
      } else {
        console.warn(
          `⚠️  Vente non trouvée pour reservationId: ${reservationId}`
        );
      }

      console.log("🎫".repeat(40) + "\n");

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
      console.error("❌ Erreur initiation paiement:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Erreur lors de l'initiation du paiement",
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

      console.log("🔍 Vérification statut:", transactionId);

      // Vérifier le statut avec MyPVIT
      const statusResult = await myPVITService.checkTransactionStatus(
        transactionId
      );

      // Mettre à jour dans Firestore
      const transactionQuery = await db
        .collection("payment_transactions")
        .where("transactionId", "==", transactionId)
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
      console.error("❌ Erreur vérification statut:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Erreur lors de la vérification du statut",
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
          message: "Montant requis",
        });
      }

      const fees = await myPVITService.calculateFees(amount);

      res.status(200).json({
        success: true,
        data: fees,
      });
    } catch (error) {
      console.error("❌ Erreur calcul frais:", error);

      res.status(500).json({
        success: false,
        message: error.message || "Erreur lors du calcul des frais",
      });
    }
  }

  /**
   * Webhook - Recevoir les notifications de paiement de MyPVIT
   * POST /api/payment/webhook
   */
  async handleWebhook(req, res) {
    try {
      console.log("\n" + "=".repeat(80));
      console.log("📩 WEBHOOK REÇU DE MYPVIT");
      console.log("=".repeat(80));
      console.log(
        "⏰ Timestamp:",
        new Date().toLocaleString("fr-FR", { timeZone: "Africa/Libreville" })
      );
      console.log("📦 Données complètes:", JSON.stringify(req.body, null, 2));
      console.log("=".repeat(80) + "\n");

      const {
        transactionId,
        merchantReferenceId,
        status,
        amount,
        operator,
        code,
      } = req.body;

       console.log(
         "⏳ Attente de 10 secondes avant mise à jour de la vente..."
       );
       await new Promise((resolve) => setTimeout(resolve, 10000));

       // Affichage détaillé des tokens
       console.log("🔑 TOKENS EXTRAITS:");
       console.log("  • Transaction ID    :", transactionId || "N/A");
       console.log("  • Merchant Ref      :", merchantReferenceId || "N/A");
       console.log("  • Status            :", status || "N/A");
       console.log("  • Amount            :", amount ? `${amount} XAF` : "N/A");
       console.log("  • Operator          :", operator || "N/A");
       console.log("");

       // Mettre à jour la transaction dans payment_transactions
       const transactionQuery = await db
         .collection("payment_transactions")
         .where("transaction_mypvit_id", "==", transactionId)
         .limit(1)
         .get();

       if (!transactionQuery.empty) {
         const transactionDoc = transactionQuery.docs[0];
         await transactionDoc.ref.update({
           status,
           operator,
           webhookReceivedAt: new Date().toISOString(),
           updatedAt: new Date().toISOString(),
         });
         console.log(
           `✅ Transaction ${transactionId} mise à jour dans payment_transactions`
         );
       }

       // Trouver et mettre à jour les ventes via transaction_mypvit_id
       console.log(
         `🔍 Recherche des ventes avec transaction_mypvit_id: ${transactionId}`
       );

       const ventesQuery = await db
         .collection("ventes")
         .where("transaction_mypvit_id", "==", transactionId)
         .limit(1)
         .get();

      if (ventesQuery.empty) {
        console.warn(
          "⚠️  Aucune vente trouvée pour transaction_mypvit_id:",
          transactionId
        );
        // Répondre quand même avec succès pour éviter les retries
        return res.status(200).json({
          responseCode: code,
          transactionId: transactionId,
        });
      }

      console.log(`📦 ${ventesQuery.size} vente(s) trouvée(s)`);

      // Mettre à jour toutes les ventes avec le nouveau statut
      const batch = db.batch();

      ventesQuery.forEach((doc) => {
        batch.update(doc.ref, {
          status: status == "SUCCESS" ? "Payer" : "Echouer",
          transaction_status: status,
          paymentConfirmedAt: new Date().toISOString(),
          webhookReceivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      console.log(
        `✅ ${ventesQuery.size} vente(s) mise(s) à jour avec status: ${status}`
      );

      // Si paiement réussi, marquer les ventes comme payées
      if (status === "SUCCESS") {
        console.log(
          '💰 Paiement réussi ! Marquage des ventes comme "Payer"...'
        );
        const payBatch = db.batch();

        ventesQuery.forEach((doc) => {
          payBatch.update(doc.ref, {
            status: "Payer",
            paymentConfirmedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });

        await payBatch.commit();
        console.log(
          `✅ ${ventesQuery.size} vente(s) marquée(s) comme payée(s)`
        );
      }

      // Si paiement échoué, marquer les ventes comme annulées et libérer les places
      if (status === "FAILED") {
        console.log(
          "❌ Paiement échoué ! Annulation des ventes et libération des places..."
        );

        // Récupérer le reservationId depuis la première vente
        const firstVente = ventesQuery.docs[0].data();
        const reservationId = firstVente.reservationId;

        if (reservationId) {
          await PaymentController.releaseReservation(reservationId);
        }
      }

      console.log("\n" + "✅".repeat(40));
      console.log("WEBHOOK TRAITÉ AVEC SUCCÈS");
      console.log("✅".repeat(40) + "\n");

      // Répondre à MyPVIT avec accusé de réception
      return res.status(200).json({
        responseCode: code,
        transactionId: transactionId,
      });
    } catch (error) {
      console.error("❌ Erreur traitement webhook:", error);

      // Répondre quand même avec succès pour éviter les retries infinis
      res.status(200).json({
        success: true,
        message: "Webhook reçu",
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
        .collection("ventes")
        .where("reservationId", "==", reservationId)
        .get();

      // Mettre à jour chaque vente
      const batch = db.batch();

      ventesQuery.forEach((doc) => {
        batch.update(doc.ref, {
          status: "Payer",
          paymentConfirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();

      console.log(`✅ ${ventesQuery.size} vente(s) marquée(s) comme payée(s)`);
    } catch (error) {
      console.error("❌ Erreur marquage ventes:", error);
      throw error;
    }
  }

  /**
   * Libérer les places d'une réservation échouée
   * @static
   */
  static async releaseReservation(reservationId) {
    try {
      // Récupérer les ventes
      const ventesQuery = await db
        .collection("ventes")
        .where("reservationId", "==", reservationId)
        .get();

      if (ventesQuery.empty) {
        console.log("Aucune vente à libérer");
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

        if (vente.classe === "Economie") {
          voyagesPlaces[voyageId].Economie++;
        } else if (vente.classe === "VIP") {
          voyagesPlaces[voyageId].VIP++;
        }
      });

      // Libérer les places dans chaque voyage
      const batch = db.batch();

      for (const [voyageId, places] of Object.entries(voyagesPlaces)) {
        const voyageRef = db.collection("voyages").doc(voyageId);
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
          status: "Annuler",
          cancelledAt: new Date().toISOString(),
          cancelReason: "Paiement échoué",
        });
      });

      await batch.commit();

      console.log(`✅ Places libérées pour la réservation ${reservationId}`);
    } catch (error) {
      console.error("❌ Erreur libération places:", error);
      throw error;
    }
  }

  /**
   * Renouveler la clé secrète MyPVIT
   * POST /api/payment/renew-secret
   */
  async renewSecret(req, res) {
    try {
      console.log("\n🔐 Demande de renouvellement de clé secrète MyPVIT");

      // Appeler le service MyPVIT et ATTENDRE la réponse
      const result = await myPVITService.renewSecret();

      // Après avoir reçu la réponse, on continue
      console.log("✅ Secret renouvelé, envoi de la réponse au client");

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          expiresIn: result.expiresIn,
          renewedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Erreur renouvellement secret:", error);

      res.status(500).json({
        success: false,
        message:
          error.message || "Erreur lors du renouvellement de la clé secrète",
      });
    }
  }

  /**
   * Recevoir et stocker le token MyPVITT
   * POST /api/payment/receive-token
   */
  async receiveToken(req, res) {
    try {
      console.log("\n" + "🔑".repeat(40));
      console.log("RÉCEPTION DU TOKEN MYPVIT");
      console.log("🔑".repeat(40));
      console.log("⏰ Timestamp:", new Date().toLocaleString("fr-FR"));
      console.log("📦 Données reçues:", JSON.stringify(req.body, null, 2));
      console.log("");

      // Supporter les deux formats de MyPVIT
      const operation_account_code =
        req.body.operation_account_code ||
        req.body.merchant_operation_account_code;
      const secret = req.body.secret || req.body.secret_key;
      const expires_in = req.body.expires_in;

      // Validation des données
      if (!operation_account_code || !secret || !expires_in) {
        console.error("❌ Données manquantes dans la requête");
        console.error("Reçu:", { operation_account_code, secret, expires_in });
        return res.status(400).json({
          success: false,
          message:
            "Données manquantes: operation_account_code (ou merchant_operation_account_code), secret (ou secret_key) et expires_in sont requis",
        });
      }

      // Calculer les dates
      const now = new Date();
      const expirationDate = new Date(now.getTime() + expires_in * 1000); // expires_in en secondes

      console.log("📅 Calcul des dates:");
      console.log("  • Date actuelle    :", now.toISOString());
      console.log("  • Expire dans (s)  :", expires_in);
      console.log("  • Date expiration  :", expirationDate.toISOString());
      console.log("");

      // Préparer les données à stocker
      const tokenData = {
        secret: secret,
        expires_in: expires_in,
        operation_account_code: operation_account_code,
        created_at: now.toISOString(),
        expiration_date: expirationDate.toISOString(),
        updated_at: now.toISOString(),
        status: "Active",
      };

      // Déterminer le bon document Firebase selon le compte opérateur
      const tokenDocId = MYPVIT_CONFIG.getTokenDocIdByAccountCode(operation_account_code);
      console.log(`📂 Document cible: ${tokenDocId}`);

      // Référence au document dans Firestore
      const settingsRef = db.collection("settings").doc(tokenDocId);

      // Vérifier si le document existe
      const docSnapshot = await settingsRef.get();

      if (docSnapshot.exists) {
        console.log("📝 Document existant trouvé, mise à jour...");
        await settingsRef.update({
          ...tokenData,
          updated_at: now.toISOString(),
        });
        console.log("✅ Document mis à jour avec succès");
      } else {
        console.log("🆕 Création d'un nouveau document...");
        await settingsRef.set(tokenData);
        console.log("✅ Document créé avec succès");
      }

      console.log("");
      console.log("💾 Données stockées dans Firestore:");
      console.log("  • Collection       : settings");
      console.log("  • Document ID      :", tokenDocId);
      console.log("  • Secret           : " + secret.substring(0, 10) + "...");
      console.log("  • Account Code     :", operation_account_code);
      console.log("  • Expires In       :", expires_in + "s");
      console.log("  • Created At       :", tokenData.created_at);
      console.log("  • Expiration Date  :", tokenData.expiration_date);
      console.log("");
      console.log("✅".repeat(40) + "\n");

      res.status(200).json({
        success: true,
        message: "Token reçu et stocké avec succès",
        data: {
          operation_account_code: operation_account_code,
          expires_in: expires_in,
          created_at: tokenData.created_at,
          expiration_date: tokenData.expiration_date,
        },
      });
    } catch (error) {
      console.error("\n" + "❌".repeat(40));
      console.error("ERREUR RÉCEPTION TOKEN");
      console.error("❌".repeat(40));
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
      console.error("❌".repeat(40) + "\n");

      res.status(500).json({
        success: false,
        message: error.message || "Erreur lors de la réception du token",
      });
    }
  }
}

module.exports = new PaymentController();
