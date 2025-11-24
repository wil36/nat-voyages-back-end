# ⚡ Quick Start - NAT Voyages Backend

## 🚀 Installation en 5 minutes

### 1. Installer les dépendances

```bash
cd nat-voyages-backend
npm install
```

### 2. Créer le fichier `.env`

```bash
cp .env.example .env
```

### 3. Remplir les variables MyPVIT

Contactez le support MyPVIT ou consultez votre espace marchand pour obtenir:

```env
MYPVIT_CODE_URL=XXXXXXXX          # À obtenir de MyPVIT
MYPVIT_SECRET_KEY=sk_test_xxxxx   # À obtenir de MyPVIT
MYPVIT_ACCOUNT_CODE=ACC_TEST_001  # À obtenir de MyPVIT
MYPVIT_PASSWORD=votre_password    # Mot de passe du compte
MYPVIT_CALLBACK_URL_CODE=CALLBACK # Code pour webhook
```

### 4. Configurer Firebase Admin

#### Option A: Via la Console Firebase (Recommandé)

1. Aller sur https://console.firebase.google.com/
2. Sélectionner **nat-voyage-a37f0**
3. **Project Settings** > **Service Accounts**
4. Cliquer **Generate new private key**
5. Télécharger le JSON
6. Copier dans `.env`:

```env
FIREBASE_PROJECT_ID=nat-voyage-a37f0
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nat-voyage-a37f0.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFA...
...votre clé privée complète ici...
-----END PRIVATE KEY-----"
```

⚠️ **Important**: Gardez les guillemets et les `\n` dans la clé privée!

#### Option B: Avec le fichier JSON (Alternative)

Si vous avez déjà téléchargé `serviceAccountKey.json`:

```bash
# Placer le fichier dans le dossier backend
mv ~/Downloads/nat-voyage-a37f0-firebase-adminsdk-xxxxx.json ./serviceAccountKey.json
```

Puis modifier `src/config/firebase.config.js` pour utiliser le fichier:

```javascript
// Remplacer la section serviceAccount par:
const serviceAccount = require('../../serviceAccountKey.json');
```

### 5. Démarrer le serveur

```bash
npm run dev
```

Vous devriez voir:

```
╔═══════════════════════════════════════════════════╗
║      🚀 NAT VOYAGES BACKEND - API RUNNING 🚀      ║
╚═══════════════════════════════════════════════════╝

📡 Server listening on port: 5000
🌍 Environment: development
💳 MyPVIT Environment: sandbox
✅ Server ready to accept requests
```

## 🧪 Tester l'API

### Test 1: Health Check

```bash
curl http://localhost:5000/health
```

Réponse attendue:
```json
{
  "success": true,
  "message": "NAT Voyages API is running",
  "environment": "development"
}
```

### Test 2: Initier un paiement de test

```bash
curl -X POST http://localhost:5000/api/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "TEST_001",
    "amount": 500,
    "phoneNumber": "+24177123456"
  }'
```

**Montants de test MyPVIT**:
- ≤ 1000 XAF = Succès
- > 1000 XAF = Échec

## 🔧 Problèmes fréquents

### "MYPVIT_CODE_URL is required"

Vous n'avez pas configuré les variables MyPVIT dans `.env`.

**Solution**: Remplir toutes les variables `MYPVIT_*` dans `.env`

### "Firebase Admin initialization failed"

Les credentials Firebase sont invalides.

**Solution**:
1. Vérifier que la clé privée est correctement formatée (avec `\n`)
2. S'assurer que l'email correspond au projet
3. Essayer l'option B avec le fichier JSON

### "Cannot find module"

Les dépendances ne sont pas installées.

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Le serveur démarre mais les requêtes échouent

Le frontend n'est peut-être pas autorisé (CORS).

**Solution**: Vérifier `FRONTEND_URL` dans `.env`:
```env
FRONTEND_URL=http://localhost:3000
```

## 📱 Configurer le webhook MyPVIT (Production)

### En développement local

Utiliser **ngrok** pour exposer votre serveur local:

```bash
# Installer ngrok
brew install ngrok

# Lancer ngrok
ngrok http 5000
```

Vous obtenez une URL publique:
```
https://abc123.ngrok.io → http://localhost:5000
```

Configurer dans MyPVIT:
```
URL Webhook: https://abc123.ngrok.io/api/payment/webhook
```

### En production

Déployer sur un serveur avec SSL et configurer l'URL publique dans MyPVIT.

## 🎯 Prochaines étapes

1. ✅ Tester tous les endpoints
2. ✅ Configurer le webhook avec ngrok
3. ✅ Faire 2 transactions test réussies
4. ✅ Faire 2 transactions test échouées
5. ✅ Passer en production MyPVIT

## 📞 Support

- **MyPVIT**: support@mypvit.pro
- **Documentation**: https://docs.mypvit.pro
- **Firebase**: https://firebase.google.com/support

---

🎉 **Félicitations !** Votre backend est prêt à gérer les paiements !
