# NAT Voyages Backend API

Backend Express.js pour gérer les paiements MyPVIT et les réservations de NAT Voyages.

## Fonctionnalités

- Intégration complète avec MyPVIT (Airtel Money, Moov Money, Test)
- Token MyPVIT par opérateur — un document Firebase distinct par opérateur
- Renouvellement automatique du token via callback Firebase (onSnapshot)
- Webhooks pour confirmation de paiement en temps réel
- Intégration Firebase Admin (Firestore)
- Rate limiting par route
- Authentification par clé API (frontend)
- Validation des données entrantes
- Logs détaillés

## Structure du projet

```
nat-voyages-backend/
├── src/
│   ├── config/
│   │   ├── firebase.config.js       # Initialisation Firebase Admin
│   │   └── mypvit.config.js         # Config MyPVIT (URLs, codes, mapping opérateurs)
│   ├── controllers/
│   │   └── payment.controller.js    # Logique métier : initiation, webhook, receive-token
│   ├── middleware/
│   │   ├── auth.middleware.js        # Vérification clé API frontend + source webhook
│   │   ├── rateLimit.middleware.js   # Rate limiting général / paiement / webhook
│   │   └── validation.middleware.js  # Validation des données de paiement
│   ├── routes/
│   │   └── payment.routes.js        # Définition des routes /api/payment
│   ├── services/
│   │   └── mypvit.service.js        # Appels HTTP vers l'API MyPVIT
│   └── app.js                       # Configuration Express (CORS, Helmet, routes)
├── server.js                        # Point d'entrée
├── .env                             # Variables d'environnement (non versionné)
├── .env.example                     # Modèle de configuration
└── package.json
```

## Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer `.env` avec les valeurs appropriées (voir section Variables d'environnement ci-dessous).

### 3. Démarrage

```bash
# Développement (auto-reload)
npm run dev

# Production
npm start
```

Le serveur démarre sur le port défini par `PORT` (défaut : 5001).

## Variables d'environnement

```env
# Environnement
NODE_ENV=production          # production | sandbox

PORT=5001

# Firebase Admin
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@projet.iam.gserviceaccount.com

# MyPVIT — Production
MYPVIT_ENV=production        # production | sandbox
MYPVIT_BASE_URL=https://api.mypvit.pro/v2
MYPVIT_CODE_URL=...          # Code URL compte production (Airtel + Moov)
MYPVIT_CODE_URL_TEST=...     # Code URL compte test
MYPVIT_PAYMENT_CODE=...      # Code endpoint paiement production
MYPVIT_PAYMENT_CODE_TEST=... # Code endpoint paiement test
MYPVIT_SECRET_KEY=...        # Clé secrète initiale (avant premier renouvellement)
MYPVIT_ACCOUNT_CODE_MOOV_MONEY=ACC_...
MYPVIT_ACCOUNT_CODE_AIRTEL_MONEY=ACC_...
MYPVIT_ACCOUNT_CODE_TEST=ACC_...
MYPVIT_PASSWORD=...
MYPVIT_CALLBACK_URL_CODE=...     # Code URL pour les webhooks de paiement
MYPVIT_RENEW_TOKEN_CODE_URL=...  # Code URL pour le callback receive-token

# Paramètres de paiement
MYPVIT_AGENT_NAME=NAT-VOYAGE
MYPVIT_SERVICE_TYPE=RESTFUL
MYPVIT_TRANSACTION_TYPE=PAYMENT
MYPVIT_OWNER_CHARGE=CUSTOMER
MYPVIT_OPERATOR_OWNER_CHARGE=MERCHANT

# Frontend
FRONTEND_URL=http://localhost:3000,https://natvoyage.org
FRONTEND_API_KEY=...         # Clé API que le frontend envoie dans X-Api-Key
```

## Endpoints API

### Health Check

```
GET /health
```

Vérifie que le serveur est en ligne.

---

### Initier un paiement

```
POST /api/payment/initiate
Headers: X-Api-Key: <FRONTEND_API_KEY>
         Content-Type: application/json
```

```json
{
  "reservationId": "1772507190862G6LMS",
  "amount": 10000,
  "phoneNumber": "066123456",
  "operatorCode": "MOOV_MONEY"
}
```

**Réponse succès :**
```json
{
  "success": true,
  "message": "Paiement initié avec succès",
  "data": {
    "transactionId": "REF_...",
    "merchantReferenceId": "NAT...",
    "firestoreId": "abc123",
    "status": "PENDING",
    "amount": 10000
  }
}
```

L'opérateur est déduit automatiquement du numéro de téléphone :
- Préfixes `074`, `076`, `077` → Airtel Money
- Préfixes `062`, `066` → Moov Money
- Environnement `sandbox` → Test (quel que soit le numéro)

---

### Vérifier le statut d'un paiement

```
GET /api/payment/status/:transactionId
Headers: X-Api-Key: <FRONTEND_API_KEY>
```

---

### Calculer les frais

```
GET /api/payment/fees?amount=10000
Headers: X-Api-Key: <FRONTEND_API_KEY>
```

---

### Renouveler la clé secrète MyPVIT (manuel)

```
POST /api/payment/renew-secret
Headers: X-Api-Key: <FRONTEND_API_KEY>
```

---

### Webhook MyPVIT (appelé par MyPVIT)

```
POST /api/payment/webhook
```

Reçoit les confirmations de paiement de MyPVIT. Réservé à MyPVIT (vérification IP/origine).

---

### Receive Token (appelé par MyPVIT)

```
POST /api/payment/receive-token
```

Reçoit le nouveau token après un `renew-secret`. Le token est stocké dans le document Firebase correspondant à l'opérateur (`operation_account_code` utilisé pour identifier Airtel ou Moov).

## Collections Firestore

### `settings`

| Document | Contenu |
|----------|---------|
| `my_pvit_token_airtel` | Token secret MyPVIT pour Airtel Money |
| `my_pvit_token_moov` | Token secret MyPVIT pour Moov Money |
| `my_pvit_token_test` | Token secret MyPVIT pour l'environnement test |

Structure de chaque document :
```json
{
  "secret": "MR_...",
  "expires_in": 86400,
  "operation_account_code": "ACC_...",
  "expiration_date": "2026-03-10T05:00:00.000Z",
  "created_at": "2026-03-09T05:00:00.000Z",
  "updated_at": "2026-03-09T05:00:00.000Z",
  "status": "Active"
}
```

### `payment_transactions`

```json
{
  "reservationId": "1772507190862G6LMS",
  "transactionId": "REF_...",
  "merchantReferenceId": "NAT...",
  "amount": 10000,
  "phoneNumber": "066123456",
  "operator": "MOOV_MONEY",
  "status": "PENDING",
  "createdAt": "2026-03-09T05:00:00.000Z",
  "updatedAt": "2026-03-09T05:00:00.000Z"
}
```

### `ventes`

Mise à jour automatique lors des événements de paiement :
- `transaction_mypvit_id` — ID de transaction MyPVIT
- `transaction_status` — Statut brut MyPVIT (`PENDING`, `SUCCESS`, `FAILED`)
- `status` — Statut vente (`Payer`, `Echouer`, `Annuler`)

## Flux de paiement complet

```
Frontend
  │
  ├─ POST /api/payment/initiate
  │
Backend
  ├─ 1. Lit le token depuis Firebase (my_pvit_token_moov ou _airtel)
  ├─ 2. Si expiré/absent → appelle MyPVIT renew-secret
  │       └─ MyPVIT rappelle POST /api/payment/receive-token
  │              └─ Token stocké dans le bon document Firebase
  │              └─ onSnapshot détecte le changement → résout la Promise
  ├─ 3. Appelle MyPVIT REST avec le token valide
  ├─ 4. Sauvegarde la transaction dans Firestore
  ├─ 5. Met à jour la vente avec transaction_mypvit_id
  │
MyPVIT
  └─ Envoie une notification push au client
  └─ Client confirme sur son téléphone
  └─ MyPVIT appelle POST /api/payment/webhook
        └─ Backend met à jour vente → status "Payer" ou "Echouer"
```

## Sécurité

### Authentification frontend

Toutes les routes `/api/payment/*` (sauf `/webhook` et `/receive-token`) exigent le header :
```
X-Api-Key: <FRONTEND_API_KEY>
```
ou
```
Authorization: Bearer <FRONTEND_API_KEY>
```

### Vérification webhook

Les endpoints `/webhook` et `/receive-token` vérifient que la requête vient de MyPVIT via :
- IP autorisées : `176.31.65.18`, `176.31.65.20`, `176.31.65.21`, `12.59.249.167`
- Origine autorisée : `https://api.mypvit.pro`

### Rate Limiting

| Route | Limite |
|-------|--------|
| Toutes les routes `/api/` | 100 req / 15 min par IP |
| `POST /api/payment/initiate` | 5 req / 10 min par IP |
| `POST /api/payment/webhook` | 50 req / min |

### CORS

Seules les origines définies dans `FRONTEND_URL` sont acceptées.

## Tests en mode sandbox

Passer `NODE_ENV=sandbox` dans le `.env` — toutes les transactions utilisent alors le compte test (`my_pvit_token_test`) quel que soit le numéro de téléphone.

Selon la doc MyPVIT, pour valider l'intégration il faut effectuer :
- 2 transactions réussies avec un montant ≤ 1 000 XAF
- 2 transactions échouées avec un montant > 1 000 XAF

Pour exposer le serveur local aux callbacks MyPVIT en développement :
```bash
npx cloudflared tunnel --url http://localhost:5001
# ou
npx localtunnel --port 5001
```

## Troubleshooting

**`Authentication failed` lors d'un paiement**
Le token Firebase est expiré ou invalide. Le renouvellement automatique devrait se déclencher. Vérifier les logs pour le message `onSnapshot`.

**`Invalid time value`**
Le document Firebase du token existe mais le champ `expiration_date` est absent ou corrompu (peut arriver après un renouvellement échoué). Le code détecte ce cas et déclenche un renouvellement.

**Timeout renouvellement token (60s)**
MyPVIT n'a pas appelé `/receive-token` dans les 60 secondes. Vérifier que l'URL de callback `MYPVIT_RENEW_TOKEN_CODE_URL` pointe vers une URL publiquement accessible.

**`The operation account secret key field must only contain letters, numbers, dashes, and underscores`**
Le `secretKey` passé à MyPVIT est invalide. Vérifier que Firebase contient un token valide dans le bon document (`my_pvit_token_moov` ou `my_pvit_token_airtel`).

**Paiement Moov passe dans le compte test**
Si `MYPVIT_ENV=sandbox`, la fonction `getPaymentEnvironment()` retourne `"TEST"` pour **tous** les numéros, y compris Moov. C'est le comportement voulu en mode sandbox. En production, vérifier que `MYPVIT_ENV=production` dans le `.env` du serveur.

## Bugs connus et points d'amélioration

> Revue effectuée le 14 mars 2026

### Bugs

| # | Fichier | Description | Priorité | Statut |
|---|---------|-------------|----------|--------|
| 1 | `src/config/mypvit.config.js:79` | `MYPVIT_ENV=sandbox` force tous les opérateurs en TEST — les numéros Moov/Airtel passent dans le compte test | **Critique** | Comportement voulu en sandbox. S'assurer que `MYPVIT_ENV=production` sur le serveur |
| 2 | `src/controllers/payment.controller.js:372` | Le webhook cherchait `transaction_mypvit_id` dans `payment_transactions` mais le champ s'appelle `transactionId` | **Haut** | ✅ Corrigé |
| 3 | `src/controllers/payment.controller.js:165` | La clé secrète (`secretKey`) était loggée en clair dans la console | **Haut** | ✅ Corrigé |
| 4 | `src/controllers/payment.controller.js:419-448` | Double batch write en cas de paiement SUCCESS (le statut était écrit deux fois de suite) | Moyen | ✅ Corrigé |
| 5 | `src/controllers/payment.controller.js:358` | Attente `setTimeout` dans le webhook — réduit de 10s à 3s | Moyen | ✅ Réduit |
| 6 | `src/config/mypvit.config.js:88` | Préfixes opérateurs trop courts (ex: `"74"`, `"60"`) pouvaient causer de faux matches | **Haut** | ✅ Corrigé |

### Code mort

- ~~`markReservationAsPaid()` dans `payment.controller.js`~~ — ✅ Supprimé

### Style / maintenance

- ~~Les logs utilisent des répétitions d'emojis (`'❌'.repeat(40)`)~~ — ✅ Remplacé par `'='.repeat(60)`

## Support

- Support MyPVIT : support@mypvit.pro
- Documentation MyPVIT : https://docs.mypvit.pro/fr/intro/getting-started

---

**Version** : 2.0.0
**Dernière mise à jour** : Mars 2026
