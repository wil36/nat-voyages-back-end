# 🚀 Guide de Déploiement - NAT Voyages Backend

Ce guide vous explique comment déployer votre backend en ligne pour le rendre accessible publiquement.

---

## 📋 Table des matières

1. [Déploiement sur Render.com (Recommandé)](#1-déploiement-sur-rendercom-recommandé)
2. [Déploiement sur Railway](#2-déploiement-sur-railway)
3. [Déploiement sur Heroku](#3-déploiement-sur-heroku)
4. [Configuration après déploiement](#4-configuration-après-déploiement)
5. [Tester votre API en ligne](#5-tester-votre-api-en-ligne)

---

## 1. Déploiement sur Render.com (Recommandé)

### ✅ Avantages
- **Gratuit** pour toujours
- **Logs en temps réel** dans le terminal
- **Déploiement automatique** depuis GitHub
- **Certificat SSL automatique** (HTTPS)
- **Pas de carte bancaire requise**

### 📝 Étapes de déploiement

#### Étape 1.1 : Préparer le dépôt Git

```bash
# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "Initial commit - NAT Voyages Backend"

# Créer un dépôt sur GitHub
# Allez sur github.com → New repository → nat-voyages-backend

# Lier le dépôt distant
git remote add origin https://github.com/VOTRE_USERNAME/nat-voyages-backend.git

# Pousser le code
git branch -M main
git push -u origin main
```

#### Étape 1.2 : Créer un compte Render

1. Allez sur [render.com](https://render.com)
2. Cliquez sur **"Get Started"**
3. Connectez-vous avec votre compte GitHub

#### Étape 1.3 : Créer un Web Service

1. Sur le Dashboard Render, cliquez **"New +"** → **"Web Service"**
2. Connectez votre dépôt GitHub **nat-voyages-backend**
3. Configurez le service :

   | Champ | Valeur |
   |-------|--------|
   | **Name** | `nat-voyages-backend` |
   | **Region** | `Oregon (US West)` ou proche de vous |
   | **Branch** | `main` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | `Free` |

4. Cliquez **"Advanced"** et ajoutez :
   - **Health Check Path** : `/health`

#### Étape 1.4 : Configurer les variables d'environnement

Cliquez sur **"Environment"** et ajoutez toutes ces variables :

```env
NODE_ENV=production
PORT=5000

# Firebase
FIREBASE_PROJECT_ID=nat-voyage-a37f0
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_ICI\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nat-voyage-a37f0.iam.gserviceaccount.com

# MyPVIT
MYPVIT_ENV=sandbox
MYPVIT_BASE_URL=https://api.mypvit.pro/v2
MYPVIT_CODE_URL=VOTRE_CODE
MYPVIT_SECRET_KEY=sk_test_xxxxx
MYPVIT_ACCOUNT_CODE=ACC_TEST_001
MYPVIT_PASSWORD=votre_mot_de_passe
MYPVIT_CALLBACK_URL_CODE=CALLBACK_CODE

# Frontend
FRONTEND_URL=https://votre-frontend.vercel.app

# IDs statiques
STATIC_ID_AGENT_NAT_VOYAGE=u8Eye0rIVa0gG15xwF8m
STATIC_ID_AGENCE_NAT_VOYAGE=cvnjkcnezjncjekzncjkeznjckez
```

⚠️ **Important pour FIREBASE_PRIVATE_KEY** :
- Copiez la clé depuis votre fichier JSON Firebase
- Remplacez les vraies nouvelles lignes par `\n`
- N'ajoutez PAS de guillemets dans Render (Render les ajoute automatiquement)

#### Étape 1.5 : Déployer

1. Cliquez **"Create Web Service"**
2. Render va :
   - Cloner votre dépôt
   - Installer les dépendances (`npm install`)
   - Démarrer le serveur (`npm start`)

3. Attendez la fin du déploiement (2-3 minutes)

#### Étape 1.6 : Récupérer votre URL

Une fois déployé, Render vous donne une URL publique :
```
https://nat-voyages-backend.onrender.com
```

🎉 **Votre API est maintenant en ligne !**

---

## 2. Déploiement sur Railway

### ✅ Avantages
- **$5 gratuits/mois**
- **Très rapide**
- **Base de données intégrées disponibles**

### 📝 Étapes

1. Allez sur [railway.app](https://railway.app)
2. Connectez-vous avec GitHub
3. Cliquez **"New Project"** → **"Deploy from GitHub repo"**
4. Sélectionnez votre dépôt
5. Ajoutez les variables d'environnement (mêmes que Render)
6. Railway détecte automatiquement Node.js et déploie

**URL générée** : `https://nat-voyages-backend.up.railway.app`

---

## 3. Déploiement sur Heroku

### ⚠️ Note
Heroku n'est plus gratuit depuis novembre 2022, mais reste une option stable.

### 📝 Étapes

```bash
# Installer Heroku CLI
npm install -g heroku

# Se connecter
heroku login

# Créer l'app
heroku create nat-voyages-backend

# Ajouter les variables d'environnement
heroku config:set NODE_ENV=production
heroku config:set FIREBASE_PROJECT_ID=nat-voyage-a37f0
# ... (toutes les autres variables)

# Déployer
git push heroku main

# Vérifier les logs
heroku logs --tail
```

**URL** : `https://nat-voyages-backend.herokuapp.com`

---

## 4. Configuration après déploiement

### 4.1 Configurer MyPVIT avec votre URL

1. Connectez-vous à votre compte MyPVIT
2. Allez dans **Configuration** → **Webhooks**
3. Ajoutez l'URL de callback :
   ```
   https://VOTRE_URL.onrender.com/api/payment/webhook
   ```
4. Notez le **Callback URL Code** et mettez-le dans `MYPVIT_CALLBACK_URL_CODE`

### 4.2 Mettre à jour le frontend

Dans votre projet React, changez l'URL de l'API :

```javascript
// src/config/api.js (ou équivalent)
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://nat-voyages-backend.onrender.com'
  : 'http://localhost:5000';

export default API_URL;
```

### 4.3 Mettre à jour CORS

Si votre frontend est sur un autre domaine, ajoutez-le dans `FRONTEND_URL` :

```env
FRONTEND_URL=https://nat-voyages.vercel.app
```

---

## 5. Tester votre API en ligne

### 5.1 Test avec curl

```bash
# Health check
curl https://VOTRE_URL.onrender.com/health

# Résultat attendu :
# {"success":true,"message":"NAT Voyages API is running","environment":"production","timestamp":"..."}
```

### 5.2 Test avec Postman

1. **GET** `https://VOTRE_URL.onrender.com/health`
   - Statut : 200 OK

2. **POST** `https://VOTRE_URL.onrender.com/api/payment/initiate`
   - Headers : `Content-Type: application/json`
   - Body :
     ```json
     {
       "reservationId": "TEST123",
       "amount": 5000,
       "phoneNumber": "+24177123456",
       "passagers": [{"nom": "Test", "prenom": "User"}]
     }
     ```

### 5.3 Vérifier les logs en temps réel

Sur Render :
1. Allez dans votre service
2. Cliquez sur **"Logs"**
3. Vous verrez tous les `console.log()` en temps réel

**Exemple de sortie attendue :**

```
================================================================================
📩 WEBHOOK REÇU DE MYPVIT
================================================================================
⏰ Timestamp: 18/11/2025 14:30:25
📦 Données complètes: {
  "transactionId": "TXN_12345",
  "merchantReferenceId": "NAT1699123456789",
  "status": "SUCCESS",
  "amount": 5000,
  "operator": "MOOV_MONEY"
}
================================================================================

🔑 TOKENS EXTRAITS:
  • Transaction ID    : TXN_12345
  • Merchant Ref      : NAT1699123456789
  • Status            : SUCCESS
  • Amount            : 5000 XAF
  • Operator          : MOOV_MONEY

✅ Transaction TXN_12345 mise à jour: SUCCESS
💰 Paiement réussi ! Marquage des ventes...

✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
WEBHOOK TRAITÉ AVEC SUCCÈS
✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
```

---

## 6. Résolution des problèmes courants

### ❌ Erreur : "Application failed to start"

**Cause** : Port mal configuré

**Solution** :
```javascript
// server.js - Vérifiez que vous utilisez process.env.PORT
const PORT = process.env.PORT || 5000;
```

### ❌ Erreur : "Firebase authentication failed"

**Cause** : FIREBASE_PRIVATE_KEY mal formatée

**Solution** :
1. Dans Render, la clé doit avoir `\n` (backslash-n), pas de vraies nouvelles lignes
2. Format correct : `-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n`

### ❌ Erreur : "CORS blocked"

**Cause** : Frontend URL non configurée

**Solution** :
```env
FRONTEND_URL=https://votre-frontend-url.vercel.app
```

### ❌ Les webhooks ne fonctionnent pas

**Vérifiez** :
1. L'URL webhook dans MyPVIT est correcte
2. Votre service est bien en ligne (pas en veille)
3. Le endpoint `/api/payment/webhook` est accessible publiquement

---

## 7. Surveillance et monitoring

### Logs en temps réel sur Render

```bash
# Ou utilisez Render CLI
npm install -g render-cli
render login
render logs nat-voyages-backend --follow
```

### Uptime monitoring (gratuit)

1. [UptimeRobot](https://uptimerobot.com) - Ping votre `/health` toutes les 5 minutes
2. Vous recevez une alerte email si l'API tombe

---

## 8. Déploiement automatique (CI/CD)

Une fois configuré sur Render :

```bash
# Faire des modifications
# Committer
git add .
git commit -m "Amélioration du logging"

# Pousser sur GitHub
git push origin main

# 🎉 Render redéploie automatiquement !
```

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs sur Render
2. Testez en local d'abord (`npm run dev`)
3. Vérifiez que toutes les variables d'environnement sont configurées
4. Testez le endpoint `/health` en premier

---

## ✅ Checklist finale

- [ ] Code poussé sur GitHub
- [ ] Service créé sur Render
- [ ] Toutes les variables d'environnement configurées
- [ ] `/health` retourne 200 OK
- [ ] Webhook URL configurée dans MyPVIT
- [ ] Frontend mis à jour avec la nouvelle URL
- [ ] Test de paiement complet réussi
- [ ] Logs visibles dans le terminal Render

🎉 **Félicitations ! Votre backend est maintenant en ligne et accessible publiquement !**