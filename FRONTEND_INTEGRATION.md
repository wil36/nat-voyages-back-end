# 🔗 Intégration Frontend - Backend

Guide pour connecter le frontend React avec le backend Express.js

## 📝 Vue d'ensemble

Le frontend appelle le backend pour :
1. Initier les paiements via MyPVIT
2. Vérifier le statut des transactions
3. Calculer les frais de paiement

## 🔧 Configuration Frontend

### 1. Ajouter l'URL du backend dans `.env`

Dans `nat-voyages-client/.env`:

```env
# Ajouter cette ligne
REACT_APP_BACKEND_URL=http://localhost:5000
```

### 2. Créer un service API de paiement

Créer `src/services/payment.service.js`:

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

class PaymentService {
  /**
   * Initier un paiement
   */
  async initiatePayment(paymentData) {
    try {
      const response = await axios.post(
        `${API_URL}/api/payment/initiate`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Erreur initiation paiement:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(transactionId) {
    try {
      const response = await axios.get(
        `${API_URL}/api/payment/status/${transactionId}`
      );

      return response.data;
    } catch (error) {
      console.error('Erreur vérification statut:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Calculer les frais
   */
  async calculateFees(amount) {
    try {
      const response = await axios.get(
        `${API_URL}/api/payment/fees?amount=${amount}`
      );

      return response.data;
    } catch (error) {
      console.error('Erreur calcul frais:', error);
      throw error.response?.data || error;
    }
  }
}

export default new PaymentService();
```

## 🎫 Modifier DetailVoyage.js

### Importer le service

```javascript
import paymentService from '../services/payment.service';
```

### Modifier handleTicketSubmit

Remplacer la section de transaction par:

```javascript
const handleTicketSubmit = async (e) => {
  e.preventDefault();

  // Rate limiting...
  // Validation...

  setIsSubmitting(true);

  try {
    // 1. Créer les ventes dans Firestore (comme avant)
    const result = await runTransaction(db, async (transaction) => {
      // ... votre code de transaction existant ...
      // Retourner les ventes créées
      return { ventes };
    });

    console.log('✅ Ventes créées:', result.ventes.length);

    // 2. Générer un ID de réservation unique
    const reservationId = Date.now().toString() +
                          Math.random().toString(36).substring(7);

    // 3. Marquer les ventes avec cet ID de réservation
    const batch = db.batch();
    result.ventes.forEach((vente) => {
      const venteRef = db.collection('ventes').doc(vente.id);
      batch.update(venteRef, {
        reservationId,
        status: 'En attente', // Pas encore payé
        paymentPending: true,
      });
    });
    await batch.commit();

    // 4. Initier le paiement via le backend
    const paymentResult = await paymentService.initiatePayment({
      reservationId,
      amount: montantTotal,
      phoneNumber: reservationForm.passagers[0].telephone,
      passagers: reservationForm.passagers.map(p => ({
        nom: p.nom,
        prenom: p.prenom,
        classe: p.classe,
        type_passager: p.type_passager,
      })),
      voyageInfo: {
        voyageId: location.state.voyageId,
        libelle: voyage?.libelle_bateau,
        date: voyage?.date_voyage,
        typeVoyage: reservationForm.type_voyage,
      },
    });

    console.log('💳 Paiement initié:', paymentResult);

    // 5. Informer l'utilisateur
    alert(
      `✅ Demande de paiement envoyée!\n\n` +
      `📱 Vérifiez votre téléphone pour confirmer le paiement.\n` +
      `💰 Montant: ${montantTotal.toLocaleString()} FCFA\n` +
      `📞 Numéro: ${reservationForm.passagers[0].telephone}\n\n` +
      `Référence: ${paymentResult.data.transactionId}\n\n` +
      `Vous recevrez vos billets une fois le paiement confirmé.`
    );

    // 6. Surveiller le statut du paiement
    const transactionId = paymentResult.data.transactionId;
    checkPaymentStatusPeriodically(transactionId, result.ventes);

    // Réinitialiser le formulaire
    resetForm();

    // Fermer le modal
    closeModal();

  } catch (error) {
    console.error('❌ Erreur:', error);

    alert(
      `❌ Erreur lors de la réservation\n\n` +
      `${error.message || 'Une erreur est survenue'}\n\n` +
      `Veuillez réessayer.`
    );
  } finally {
    setIsSubmitting(false);
  }
};
```

### Ajouter la fonction de surveillance

```javascript
/**
 * Vérifier périodiquement le statut du paiement
 */
const checkPaymentStatusPeriodically = (transactionId, ventes) => {
  let attempts = 0;
  const maxAttempts = 30; // 30 tentatives = 5 minutes

  const interval = setInterval(async () => {
    attempts++;

    try {
      const statusResult = await paymentService.checkPaymentStatus(transactionId);

      console.log(`🔍 Statut paiement (tentative ${attempts}):`, statusResult.data.status);

      if (statusResult.data.status === 'SUCCESS') {
        clearInterval(interval);

        // Générer les billets PDF
        await genererFactureMultiPassagers(ventes);

        alert(
          `🎉 Paiement confirmé!\n\n` +
          `Vos billets ont été générés.\n` +
          `Téléchargement en cours...`
        );
      }

      if (statusResult.data.status === 'FAILED') {
        clearInterval(interval);

        alert(
          `❌ Paiement échoué\n\n` +
          `La transaction n'a pas pu être complétée.\n` +
          `Vos places ont été libérées.\n\n` +
          `Veuillez réessayer.`
        );
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);

        alert(
          `⏱️ Délai d'attente dépassé\n\n` +
          `Le paiement est toujours en cours.\n\n` +
          `Référence: ${transactionId}\n\n` +
          `Vous recevrez vos billets par email une fois le paiement confirmé.`
        );
      }
    } catch (error) {
      console.error('Erreur vérification statut:', error);
    }
  }, 10000); // Vérifier toutes les 10 secondes
};
```

## 💰 Afficher les frais avant paiement

Dans le modal de réservation, ajouter:

```javascript
const [fees, setFees] = useState(null);

// Calculer les frais quand le montant change
useEffect(() => {
  if (montantTotal > 0) {
    paymentService.calculateFees(montantTotal)
      .then(result => setFees(result.data))
      .catch(err => console.error('Erreur frais:', err));
  }
}, [montantTotal]);
```

Afficher dans le JSX:

```jsx
<div className="card bg-primary text-white">
  <div className="card-body">
    <h6 className="card-title">Montant à payer</h6>
    <h4 className="mb-0">
      {montantTotal.toLocaleString()} FCFA
    </h4>
    {fees && (
      <small className="text-white-50">
        + {fees.fees} FCFA de frais = {fees.total} FCFA
      </small>
    )}
  </div>
</div>
```

## 🔄 Flux complet

```
1. Utilisateur remplit le formulaire
        ↓
2. Frontend crée les ventes dans Firestore (status: "En attente")
        ↓
3. Frontend appelle backend /api/payment/initiate
        ↓
4. Backend appelle MyPVIT pour initier le paiement
        ↓
5. MyPVIT envoie notification push au téléphone du client
        ↓
6. Client confirme le paiement sur son téléphone
        ↓
7. MyPVIT envoie webhook au backend
        ↓
8. Backend met à jour Firestore (status: "Payer")
        ↓
9. Frontend vérifie périodiquement le statut
        ↓
10. Frontend génère les billets PDF
```

## 📱 Gestion des états de paiement

Ajouter un état pour suivre le paiement:

```javascript
const [paymentStatus, setPaymentStatus] = useState(null);

// États possibles:
// null = Pas de paiement en cours
// 'initiating' = Initiation du paiement
// 'pending' = En attente de confirmation
// 'success' = Paiement confirmé
// 'failed' = Paiement échoué
```

Afficher dans le modal:

```jsx
{paymentStatus === 'pending' && (
  <div className="alert alert-info">
    <div className="spinner-border spinner-border-sm mr-2"></div>
    En attente de confirmation du paiement...
  </div>
)}
```

## 🧪 Tester l'intégration

### 1. Démarrer le backend

```bash
cd nat-voyages-backend
npm run dev
```

### 2. Démarrer le frontend

```bash
cd nat-voyages-client
npm start
```

### 3. Faire une réservation test

1. Ouvrir http://localhost:3000
2. Sélectionner un voyage
3. Remplir le formulaire avec un montant ≤ 1000 XAF (test)
4. Vérifier dans la console les logs
5. Observer le webhook dans les logs du backend

## 🐛 Debug

Activer les logs détaillés:

```javascript
// Dans payment.service.js
axios.interceptors.request.use(request => {
  console.log('📤 Request:', request);
  return request;
});

axios.interceptors.response.use(response => {
  console.log('📥 Response:', response);
  return response;
});
```

## 🚀 Déploiement

### Backend (Heroku, Railway, Render)

1. Déployer le backend sur un service cloud
2. Obtenir l'URL publique (ex: `https://nat-voyages-api.herokuapp.com`)
3. Configurer les variables d'environnement sur le service
4. Configurer l'URL webhook dans MyPVIT

### Frontend

Mettre à jour `.env.production`:

```env
REACT_APP_BACKEND_URL=https://nat-voyages-api.herokuapp.com
```

---

✅ **L'intégration est terminée !** Vous pouvez maintenant accepter des paiements mobiles.
