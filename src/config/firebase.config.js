const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Configuration Firebase Admin SDK
 * Permet l'accès sécurisé à Firestore depuis le backend
 */

let firebaseApp;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Chercher un fichier de service account
    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      // Option 1 : Utiliser le fichier JSON (RECOMMANDÉ)
      console.log('📄 Utilisation du fichier firebase-service-account.json');
      const serviceAccount = require(serviceAccountPath);

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      console.log('✅ Firebase Admin initialisé avec succès (via fichier JSON)');
      console.log('📋 Project ID:', serviceAccount.project_id);
    } else {
      // Option 2 : Fallback vers les variables d'environnement
      console.log('⚠️  Fichier firebase-service-account.json non trouvé');
      console.log('📝 Utilisation des variables d\'environnement...');

      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.error('\n❌ Configuration Firebase manquante !');
        console.error('\n💡 Pour résoudre :');
        console.error('1. Téléchargez le fichier de clé privée depuis Firebase Console');
        console.error('2. Renommez-le en "firebase-service-account.json"');
        console.error('3. Placez-le à la racine du projet');
        console.error('\nVoir le guide : FIX_FIREBASE_NOW.md\n');
        throw new Error('Configuration Firebase manquante');
      }

      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
      };

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      console.log('✅ Firebase Admin initialisé avec succès (via .env)');
    }

    return firebaseApp;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Firebase Admin:', error.message);
    if (error.message.includes('PEM')) {
      console.error('\n💡 La FIREBASE_PRIVATE_KEY dans .env est invalide.');
      console.error('   Elle doit commencer par "-----BEGIN PRIVATE KEY-----"');
      console.error('   Consultez : FIX_FIREBASE_NOW.md pour la solution\n');
    }
    throw error;
  }
};

// Initialiser Firebase
const app = initializeFirebase();
const db = admin.firestore();

module.exports = {
  admin,
  db,
  app,
};
