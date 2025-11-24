# 🚀 NAT Voyages Backend API

Backend Express.js pour gérer les paiements MyPVIT et les réservations de NAT Voyages.

## 📋 Fonctionnalités

- ✅ Intégration complète avec MyPVIT (paiement mobile)
- ✅ Gestion des transactions sécurisées
- ✅ Webhooks pour confirmation de paiement
- ✅ Intégration Firebase Admin
- ✅ Rate limiting serveur
- ✅ Validation des données
- ✅ Logs détaillés

## 🛠️ Installation

### 1. Installer les dépendances

```bash
cd nat-voyages-backend
npm install
```

### 2. Configurer les variables d'environnement

Copier `.env.example` vers `.env`:

```bash
cp .env.example .env
```

Puis éditer `.env` avec vos valeurs:

```env
# Environnement
NODE_ENV=development
PORT=5000

# Firebase Admin (à récupérer depuis Firebase Console)
FIREBASE_PROJECT_ID=nat-voyage-a37f0
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nat-voyage-a37f0.iam.gserviceaccount.com

# MyPVIT (à obtenir depuis votre compte MyPVIT)
MYPVIT_ENV=sandbox
MYPVIT_BASE_URL=https://api.mypvit.pro/v2
MYPVIT_CODE_URL=VOTRE_CODE_URL
MYPVIT_SECRET_KEY=sk_test_xxxxxxxxxxxxx
MYPVIT_ACCOUNT_CODE=ACC_TEST_001
MYPVIT_PASSWORD=votre_mot_de_passe
MYPVIT_CALLBACK_URL_CODE=VOTRE_CALLBACK_CODE

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 3. Obtenir les credentials Firebase Admin

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner votre projet `nat-voyage-a37f0`
3. Aller dans **Project Settings** > **Service Accounts**
4. Cliquer sur **Generate new private key**
5. Télécharger le fichier JSON
6. Copier les valeurs dans `.env`:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (garder les `\n`)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### 4. Configurer MyPVIT

1. Créer un compte sur [MyPVIT](https://mypvit.pro)
2. Créer un compte d'opération (test ou production)
3. Récupérer:
   - Code URL du compte
   - Clé secrète (secret key)
   - Code du compte d'opération
   - Mot de passe du compte
4. Configurer une URL de callback (webhook) dans l'espace marchand

## 🚀 Démarrage

### Mode développement (avec auto-reload)

```bash
npm run dev
```

### Mode production

```bash
npm start
```

Le serveur démarre sur `http://localhost:5000`

## 📍 Endpoints API

### Health Check

```http
GET /health
```

Vérifie que le serveur est en ligne.

**Réponse:**
```json
{
  "success": true,
  "message": "NAT Voyages API is running",
  "environment": "development",
  "timestamp": "2025-01-04T10:30:00.000Z"
}
```

### Initier un paiement

```http
POST /api/payment/initiate
Content-Type: application/json

{
  "reservationId": "RES123456",
  "amount": 15000,
  "phoneNumber": "+24177123456",
  "passagers": [
    {
      "nom": "Doe",
      "prenom": "John",
      "classe": "Economie"
    }
  ],
  "voyageInfo": {
    "voyageId": "VOY123",
    "date": "2025-01-10"
  }
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Paiement initié avec succès",
  "data": {
    "transactionId": "PAY240420250001",
    "firestoreId": "abc123def456",
    "status": "PENDING",
    "amount": 15000
  }
}
```

### Vérifier le statut d'un paiement

```http
GET /api/payment/status/:transactionId
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "status": "SUCCESS",
    "transactionId": "PAY240420250001",
    "amount": 15000,
    "operator": "MOOV_MONEY",
    "timestamp": "2025-01-04T10:35:00.000Z"
  }
}
```

### Calculer les frais

```http
GET /api/payment/fees?amount=15000
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "fees": 300,
    "total": 15300,
    "breakdown": {
      "amount": 15000,
      "transactionFee": 250,
      "serviceFee": 50
    }
  }
}
```

### Webhook MyPVIT (interne)

```http
POST /api/payment/webhook
Content-Type: application/json

{
  "transactionId": "PAY240420250001",
  "merchantReferenceId": "NAT1234567",
  "status": "SUCCESS",
  "amount": 15000,
  "operator": "MOOV_MONEY"
}
```

## 🔐 Sécurité

### Rate Limiting

- **Général**: 100 requêtes / 15 minutes par IP
- **Paiements**: 5 tentatives / 10 minutes par IP
- **Webhooks**: 50 webhooks / minute

### Validation

Toutes les données sont validées avec `express-validator`:
- Montant minimum: 500 XAF
- Format téléphone: `+241XXXXXXXX` ou `XXXXXXXX`
- Champs requis: `reservationId`, `amount`, `phoneNumber`

### CORS

Seul le frontend configuré (`FRONTEND_URL`) peut accéder à l'API.

### Headers sécurisés

Helmet.js applique les bonnes pratiques de sécurité HTTP.

## 📊 Collections Firestore

### `payment_transactions`

```javascript
{
  reservationId: "RES123456",
  transactionId: "PAY240420250001",
  merchantReferenceId: "NAT1234567",
  amount: 15000,
  phoneNumber: "+24177123456",
  status: "SUCCESS", // PENDING, SUCCESS, FAILED, AMBIGUOUS
  passagers: [...],
  voyageInfo: {...},
  operator: "MOOV_MONEY",
  createdAt: "2025-01-04T10:30:00.000Z",
  updatedAt: "2025-01-04T10:35:00.000Z",
  webhookReceivedAt: "2025-01-04T10:35:00.000Z"
}
```

## 🔄 Flux de paiement

1. **Client** initie une réservation sur le frontend
2. **Frontend** envoie `POST /api/payment/initiate`
3. **Backend** crée la transaction dans Firestore
4. **Backend** appelle MyPVIT pour initier le paiement
5. **MyPVIT** envoie un push notification au client
6. **Client** confirme sur son téléphone
7. **MyPVIT** envoie webhook au backend
8. **Backend** met à jour la transaction dans Firestore
9. **Backend** marque les ventes comme payées
10. **Frontend** peut vérifier le statut avec `GET /api/payment/status/:id`

## 🧪 Tests

### Test en mode sandbox

MyPVIT fournit des montants de test:

- **≤ 1000 XAF**: Transaction réussie
- **> 1000 XAF**: Transaction échouée

Exemple pour tester un succès:

```bash
curl -X POST http://localhost:5000/api/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "TEST_001",
    "amount": 500,
    "phoneNumber": "+24177123456",
    "passagers": [],
    "voyageInfo": {}
  }'
```

### Health check

```bash
curl http://localhost:5000/health
```

## 📝 Logs

Les logs sont affichés dans la console:

```
🎫 Nouvelle demande de paiement: { reservationId: 'RES123', amount: 15000 }
💳 Initiation paiement: 15000 XAF - Ref: NAT123456789
📤 Payload: { amount: 15000, reference: 'NAT123456789', ... }
📥 Réponse MyPVIT: { status: 'PENDING', reference_id: 'PAY...' }
✅ Transaction enregistrée: abc123def456
```

## 🚨 Gestion d'erreurs

Le backend gère automatiquement:

- Clé secrète expirée (renouvellement automatique possible)
- Transactions dupliquées
- Webhooks en double
- Erreurs réseau
- Validation des données

## 📚 Documentation MyPVIT

- [Documentation officielle](https://docs.mypvit.pro/fr/v2/api/)
- [Environnements](https://docs.mypvit.pro/fr/v2/api/renew-secret#environnements)

## 🔧 Troubleshooting

### Le serveur ne démarre pas

Vérifier que toutes les variables d'environnement sont définies:

```bash
node -e "require('dotenv').config(); console.log(process.env.MYPVIT_SECRET_KEY)"
```

### Erreur d'authentification MyPVIT

Renouveler la clé secrète (à implémenter):

```bash
curl -X POST http://localhost:5000/api/payment/renew-secret
```

### Webhook non reçu

1. Vérifier l'URL de callback dans l'espace marchand MyPVIT
2. S'assurer que le serveur est accessible publiquement (utiliser ngrok en dev)
3. Vérifier les logs MyPVIT

### Firestore permission denied

Vérifier que les credentials Firebase Admin sont corrects et que le compte a les droits nécessaires.

## 📦 Structure du projet

```
nat-voyages-backend/
├── src/
│   ├── config/
│   │   ├── firebase.config.js      # Configuration Firebase Admin
│   │   └── mypvit.config.js        # Configuration MyPVIT
│   ├── controllers/
│   │   └── payment.controller.js   # Logique métier paiements
│   ├── middleware/
│   │   ├── rateLimit.middleware.js # Rate limiting
│   │   └── validation.middleware.js # Validation données
│   ├── routes/
│   │   └── payment.routes.js       # Routes API paiement
│   ├── services/
│   │   └── mypvit.service.js       # Service MyPVIT
│   └── app.js                      # Configuration Express
├── .env                            # Variables d'environnement
├── .env.example                    # Exemple de configuration
├── .gitignore                      # Fichiers ignorés par Git
├── package.json                    # Dépendances
├── server.js                       # Point d'entrée
└── README.md                       # Ce fichier
```

## 🤝 Support

Pour toute question:
- Documentation NAT Voyages (interne)
- Support MyPVIT: support@mypvit.pro

---

**Version**: 1.0.0
**Dernière mise à jour**: Janvier 2025
