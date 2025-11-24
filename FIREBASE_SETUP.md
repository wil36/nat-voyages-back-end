# 🔥 Configuration Firebase - Guide Détaillé

## ❌ Problème actuel

Votre `.env` contient une **API Key** au lieu d'une **Private Key** :

```env
# ❌ INCORRECT
FIREBASE_PRIVATE_KEY=AIzaSyC4TbP5sHlzzPgBa04NpiaQBnMnDJxfojQ
```

Cette API Key est pour le **frontend** (navigateur), pas pour le **backend** (serveur).

---

## ✅ Solutions

### **Option 1 : Utiliser un fichier JSON (PLUS SIMPLE)**

#### Étape 1 : Télécharger le fichier de clé privée

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com)
2. Sélectionnez **nat-voyage-a37f0**
3. Cliquez sur **⚙️ Paramètres du projet**
4. Onglet **"Comptes de service"**
5. Cliquez **"Générer une nouvelle clé privée"**
6. Un fichier sera téléchargé : `nat-voyage-a37f0-firebase-adminsdk-xxxxx.json`

#### Étape 2 : Placer le fichier dans le projet

```bash
# Renommez le fichier téléchargé
mv ~/Downloads/nat-voyage-a37f0-firebase-adminsdk-*.json firebase-service-account.json

# Déplacez-le à la racine du projet
mv firebase-service-account.json /Users/apple/Desktop/Projets\ Dev/Projet\ React/nat-voyages-backend/
```

#### Étape 3 : Modifier la configuration Firebase

Ouvrez `src/config/firebase.config.js` et remplacez tout le contenu par :

```javascript
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let firebaseApp;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Utiliser le fichier JSON directement
    const serviceAccount = require('../../firebase-service-account.json');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('✅ Firebase Admin initialisé avec succès');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  }
};

const app = initializeFirebase();
const db = admin.firestore();

module.exports = { admin, db, app };
```

#### Étape 4 : Tester

```bash
node test-firebase-connection.js
```

---

### **Option 2 : Utiliser les variables d'environnement**

Si vous préférez ne pas avoir de fichier JSON dans le projet.

#### Étape 1 : Ouvrir le fichier JSON téléchargé

Le fichier contient quelque chose comme :

```json
{
  "type": "service_account",
  "project_id": "nat-voyage-a37f0",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@nat-voyage-a37f0.iam.gserviceaccount.com",
  ...
}
```

#### Étape 2 : Copier les bonnes valeurs dans .env

Ouvrez votre `.env` et remplacez les lignes Firebase par :

```env
# Firebase Admin (CORRECT)
FIREBASE_PROJECT_ID=nat-voyage-a37f0
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nat-voyage-a37f0.iam.gserviceaccount.com
```

⚠️ **IMPORTANT** :
- Copiez la valeur COMPLÈTE de `private_key` du JSON
- Elle doit commencer par `"-----BEGIN PRIVATE KEY-----\n`
- Elle doit finir par `\n-----END PRIVATE KEY-----\n"`
- Gardez les guillemets doubles autour
- Gardez les `\n` (ne les remplacez pas)

#### Exemple de .env correct :

```env
FIREBASE_PROJECT_ID=nat-voyage-a37f0
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7xz...(très longue clé)...5Qw==\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abcd@nat-voyage-a37f0.iam.gserviceaccount.com
```

#### Étape 3 : Tester

```bash
node test-firebase-connection.js
```

---

## 🔍 Différences entre API Key et Private Key

| Type | Utilisation | Format | Où l'utiliser |
|------|-------------|--------|---------------|
| **API Key** | Frontend (navigateur) | `AIzaSyC4TbP5...` | React, Vue, Angular |
| **Private Key** | Backend (serveur) | `-----BEGIN PRIVATE KEY-----\n...` | Node.js, Python, Java |

**Votre cas** :
- ✅ Les variables `REACT_APP_FIREBASE_*` sont pour votre frontend React (correctes)
- ❌ La variable `FIREBASE_PRIVATE_KEY` doit contenir une Private Key, pas une API Key

---

## 📝 Commandes utiles

### Tester la connexion Firebase
```bash
node test-firebase-connection.js
```

### Vérifier que le fichier JSON existe
```bash
ls -la firebase-service-account.json
```

### Voir le contenu du .env (sans afficher les secrets)
```bash
cat .env | grep FIREBASE_PROJECT_ID
```

---

## ✅ Résultat attendu

Après la configuration correcte, vous devriez voir :

```
🔥 Test de connexion Firebase...

📋 Variables d'environnement:
  - FIREBASE_PROJECT_ID: ✅
  - FIREBASE_PRIVATE_KEY: ✅
  - FIREBASE_CLIENT_EMAIL: ✅

🔧 Initialisation Firebase:
  - Project ID: nat-voyage-a37f0
  - Status: ✅ Initialisé

💾 Test d'accès Firestore:
  - Écriture: ✅
  - Lecture: ✅
  - Suppression: ✅

✅ ✅ ✅ Connexion Firebase réussie! ✅ ✅ ✅
```

---

## 🆘 Besoin d'aide ?

Si vous voyez encore l'erreur "Invalid PEM formatted message", c'est que :
1. La `FIREBASE_PRIVATE_KEY` n'est toujours pas la bonne
2. Ou elle est mal formatée (guillemets manquants, `\n` remplacés)

**Solution rapide** : Utilisez l'Option 1 (fichier JSON), c'est plus simple !