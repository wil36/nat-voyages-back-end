/**
 * Script de test de connexion Firebase
 * Exécutez avec: node test-firebase-connection.js
 */

require('dotenv').config();
const { db, admin } = require('./src/config/firebase.config');

async function testFirebaseConnection() {
  console.log('\n🔥 Test de connexion Firebase...\n');

  try {
    // Test 1: Vérifier les variables d'environnement
    console.log('📋 Variables d\'environnement:');
    console.log('  - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅' : '❌');
    console.log('  - FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅' : '❌');
    console.log('  - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅' : '❌');

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('Variables d\'environnement Firebase manquantes dans .env');
    }

    // Test 2: Vérifier l'initialisation Firebase
    console.log('\n🔧 Initialisation Firebase:');
    const app = admin.app();
    console.log('  - Project ID:', app.options.projectId);
    console.log('  - Status: ✅ Initialisé');

    // Test 3: Tester l'accès à Firestore
    console.log('\n💾 Test d\'accès Firestore:');

    // Créer un document de test
    const testRef = db.collection('_test').doc('connection_test');
    await testRef.set({
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Test de connexion réussi'
    });
    console.log('  - Écriture: ✅');

    // Lire le document de test
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('  - Lecture: ✅');
      console.log('  - Données:', doc.data());
    }

    // Supprimer le document de test
    await testRef.delete();
    console.log('  - Suppression: ✅');

    // Test 4: Vérifier les collections existantes
    console.log('\n📚 Collections existantes:');
    const collections = await db.listCollections();
    if (collections.length === 0) {
      console.log('  ⚠️  Aucune collection trouvée (normal si nouveau projet)');
    } else {
      collections.forEach(collection => {
        console.log(`  - ${collection.id}`);
      });
    }

    // Test 5: Vérifier les collections requises
    console.log('\n✅ Collections requises par l\'application:');
    const requiredCollections = ['payment_transactions', 'ventes', 'voyages'];

    for (const collectionName of requiredCollections) {
      const snapshot = await db.collection(collectionName).limit(1).get();
      const exists = !snapshot.empty || collections.some(c => c.id === collectionName);
      console.log(`  - ${collectionName}: ${exists ? '✅ Existe' : '⚠️  Sera créée automatiquement'}`);
    }

    console.log('\n✅ ✅ ✅ Connexion Firebase réussie! ✅ ✅ ✅\n');
    console.log('Votre backend est correctement connecté à Firebase.\n');

  } catch (error) {
    console.error('\n❌ Erreur de connexion Firebase:\n');

    if (error.code === 'auth/invalid-credential') {
      console.error('  Problème: Les credentials Firebase sont invalides');
      console.error('  Solution: Vérifiez que FIREBASE_PRIVATE_KEY est correctement copiée depuis le fichier JSON');
    } else if (error.message.includes('FIREBASE_PROJECT_ID')) {
      console.error('  Problème: Project ID manquant ou incorrect');
      console.error('  Solution: Vérifiez FIREBASE_PROJECT_ID dans .env');
    } else {
      console.error('  Message:', error.message);
      console.error('  Code:', error.code);
    }

    console.error('\n📖 Consultez le guide de configuration dans README.md\n');
    process.exit(1);
  }

  process.exit(0);
}

// Exécuter le test
testFirebaseConnection();
