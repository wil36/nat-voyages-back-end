const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

/**
 * Configuration Firebase Admin SDK - Version alternative
 * Utilise un fichier JSON de service account au lieu de variables d'environnement
 */

let firebaseApp;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Chercher un fichier de service account dans le projet
    const possiblePaths = [
      path.join(__dirname, '../../firebase-service-account.json'),
      path.join(__dirname, '../../serviceAccountKey.json'),
      path.join(__dirname, '../../firebase-adminsdk.json'),
    ];

    let serviceAccountPath = null;

    // Trouver le premier fichier qui existe
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        serviceAccountPath = filePath;
        break;
      }
    }

    if (serviceAccountPath) {
      console.log('✅ Fichier de service account trouvé:', serviceAccountPath);
      const serviceAccount = require(serviceAccountPath);

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      console.log('✅ Firebase Admin initialisé avec succès (via fichier JSON)');
      console.log('📋 Project ID:', serviceAccount.project_id);
      console.log('📧 Client Email:', serviceAccount.client_email);
    } else {
      // Fallback vers les variables d'environnement
      console.log('⚠️  Aucun fichier de service account trouvé');
      console.log('📝 Tentative avec les variables d\'environnement...');

      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error(
          'Configuration Firebase manquante. Placez un fichier firebase-service-account.json à la racine ou configurez les variables d\'environnement.'
        );
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
    console.error('\n📖 Pour résoudre ce problème:');
    console.error('1. Téléchargez le fichier de clé privée depuis Firebase Console');
    console.error('2. Renommez-le en "firebase-service-account.json"');
    console.error('3. Placez-le à la racine du projet');
    console.error('\nOU\n');
    console.error('1. Copiez le contenu du fichier JSON téléchargé');
    console.error('2. Mettez FIREBASE_PRIVATE_KEY avec la vraie clé privée (commence par -----BEGIN PRIVATE KEY-----)');
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
