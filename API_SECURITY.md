# Sécurité API - Authentification par clé API

## 🔐 Vue d'ensemble

Toutes les routes de l'API (sauf les webhooks MyPVIT) sont protégées par une **clé API** qui doit être fournie dans chaque requête depuis le frontend.

## 🔑 Clé API

**Clé API (à configurer dans le frontend)** :
```
ce02ae44d81d51ba5a362ad0a85ce63a2742cf0f7c3030383287da557a124074
```

**⚠️ IMPORTANT** : Cette clé doit être stockée dans les variables d'environnement du frontend :
```env
REACT_APP_API_KEY=ce02ae44d81d51ba5a362ad0a85ce63a2742cf0f7c3030383287da557a124074
```

## 📡 Comment envoyer la clé API

### Option 1 : Header `X-API-Key` (recommandé)
```javascript
fetch('http://localhost:5001/api/payment/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'ce02ae44d81d51ba5a362ad0a85ce63a2742cf0f7c3030383287da557a124074'
  },
  body: JSON.stringify({
    reservationId: 'RES123',
    amount: 5000,
    phoneNumber: '237655091353'
  })
});
```

### Option 2 : Header `Authorization` Bearer
```javascript
fetch('http://localhost:5001/api/payment/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ce02ae44d81d51ba5a362ad0a85ce63a2742cf0f7c3030383287da557a124074'
  },
  body: JSON.stringify({
    reservationId: 'RES123',
    amount: 5000,
    phoneNumber: '237655091353'
  })
});
```

### Exemple avec Axios
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5001/api',
  headers: {
    'X-API-Key': process.env.REACT_APP_API_KEY
  }
});

// Utilisation
apiClient.post('/payment/initiate', {
  reservationId: 'RES123',
  amount: 5000,
  phoneNumber: '237655091353'
});
```

## 🛡️ Routes protégées

Ces routes **nécessitent** la clé API :
- `POST /api/payment/initiate` - Initier un paiement
- `GET /api/payment/status/:transactionId` - Vérifier le statut
- `GET /api/payment/fees?amount=5000` - Calculer les frais
- `POST /api/payment/renew-secret` - Renouveler le secret MyPVIT

## 🌐 Routes webhooks (NON protégées)

Ces routes sont appelées par MyPVIT et **ne nécessitent PAS** de clé API :
- `POST /api/payment/webhook` - Notifications de paiement
- `POST /api/payment/receive-token` - Réception du token MyPVIT

## ❌ Erreurs d'authentification

### Clé API manquante (401)
```json
{
  "success": false,
  "message": "Clé API manquante. Veuillez fournir une clé API valide.",
  "error": "UNAUTHORIZED"
}
```

### Clé API invalide (403)
```json
{
  "success": false,
  "message": "Clé API invalide",
  "error": "FORBIDDEN"
}
```

## 🔄 Régénérer la clé API

Pour générer une nouvelle clé API sécurisée :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Puis mettez à jour :
1. `.env` du backend → `FRONTEND_API_KEY=nouvelle_clé`
2. `.env` du frontend → `REACT_APP_API_KEY=nouvelle_clé`
3. Redémarrez les deux serveurs

## 🔒 Bonnes pratiques

1. **Ne jamais commiter la clé** dans Git
2. **Utiliser les variables d'environnement** pour stocker la clé
3. **Régénérer la clé** si elle est compromise
4. **Ne pas exposer la clé** dans le code frontend (elle sera visible dans le bundle)
5. **Utiliser HTTPS en production** pour chiffrer les communications

## 📝 Note de sécurité

Cette clé API protège contre les accès non autorisés basiques. Pour une sécurité renforcée en production, considérez :
- Authentification utilisateur (JWT)
- Rate limiting
- CORS strict
- HTTPS obligatoire
- Rotation automatique des clés
