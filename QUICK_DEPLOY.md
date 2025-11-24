# 🚀 Déploiement Rapide - 5 Minutes

## Étape 1 : Préparer le code

```bash
# Vérifier que tout fonctionne en local
npm install
npm run dev

# Tester l'endpoint health
curl http://localhost:5000/health
```

## Étape 2 : Pousser sur GitHub

```bash
# Initialiser Git
git init
git add .
git commit -m "Backend NAT Voyages prêt pour déploiement"

# Créer un repo sur GitHub : https://github.com/new
# Nom : nat-voyages-backend

# Lier et pousser
git remote add origin https://github.com/VOTRE_USERNAME/nat-voyages-backend.git
git branch -M main
git push -u origin main
```

## Étape 3 : Déployer sur Render

1. **Allez sur** → [render.com](https://render.com)
2. **Connectez-vous** avec GitHub
3. **New +** → **Web Service**
4. **Sélectionnez** votre repo `nat-voyages-backend`
5. **Configurez** :
   - Name: `nat-voyages-backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**

6. **Variables d'environnement** (cliquez Environment) :

```
NODE_ENV=production
PORT=5000
FIREBASE_PROJECT_ID=nat-voyage-a37f0
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nVOTRE_CLE\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nat-voyage-a37f0.iam.gserviceaccount.com
MYPVIT_ENV=sandbox
MYPVIT_BASE_URL=https://api.mypvit.pro/v2
MYPVIT_CODE_URL=VOTRE_CODE
MYPVIT_SECRET_KEY=sk_test_xxxxx
MYPVIT_ACCOUNT_CODE=ACC_TEST_001
MYPVIT_PASSWORD=votre_password
MYPVIT_CALLBACK_URL_CODE=CALLBACK_CODE
FRONTEND_URL=http://localhost:3000
STATIC_ID_AGENT_NAT_VOYAGE=u8Eye0rIVa0gG15xwF8m
STATIC_ID_AGENCE_NAT_VOYAGE=cvnjkcnezjncjekzncjkeznjckez
```

7. **Create Web Service** → Attendez 2-3 minutes

## Étape 4 : Récupérer votre URL

Votre API sera disponible à :
```
https://nat-voyages-backend.onrender.com
```

## Étape 5 : Tester

```bash
# Health check
curl https://nat-voyages-backend.onrender.com/health

# Vous devriez voir :
# {"success":true,"message":"NAT Voyages API is running"...}
```

## Étape 6 : Configurer MyPVIT

1. Allez sur votre dashboard MyPVIT
2. Ajoutez l'URL webhook :
   ```
   https://nat-voyages-backend.onrender.com/api/payment/webhook
   ```

## Étape 7 : Voir les logs en temps réel

Sur Render :
- Cliquez sur votre service
- Onglet **"Logs"**
- Vous verrez tous les tokens s'afficher !

## 🎉 C'est fait !

Votre backend est maintenant :
- ✅ En ligne 24/7
- ✅ Accessible via HTTPS
- ✅ Prêt à recevoir des paiements
- ✅ Logs visibles en temps réel

---

## 📺 Exemple de logs que vous verrez :

```
================================================================================
📩 WEBHOOK REÇU DE MYPVIT
================================================================================
⏰ Timestamp: 18/11/2025 14:30:25
📦 Données complètes: {
  "transactionId": "TXN_MYPVIT_12345",
  "merchantReferenceId": "NAT1699123456789",
  "status": "SUCCESS",
  "amount": 5000,
  "operator": "MOOV_MONEY"
}
================================================================================

🔑 TOKENS EXTRAITS:
  • Transaction ID    : TXN_MYPVIT_12345
  • Merchant Ref      : NAT1699123456789
  • Status            : SUCCESS
  • Amount            : 5000 XAF
  • Operator          : MOOV_MONEY
```

---

Pour plus de détails, consultez [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)