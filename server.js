const app = require('./src/app');
require('dotenv').config();

/**
 * Serveur principal NAT Voyages Backend
 */

const PORT = process.env.PORT || 5000;

// Démarrer le serveur
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║                                                   ║');
  console.log('║      🚀 NAT VOYAGES BACKEND - API RUNNING 🚀      ║');
  console.log('║                                                   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 Server listening on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💳 MyPVIT Environment: ${process.env.MYPVIT_ENV || 'sandbox'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('');
  console.log('📍 Available endpoints:');
  console.log('   GET  /health                      - Health check');
  console.log('   POST /api/payment/initiate        - Initier un paiement');
  console.log('   GET  /api/payment/status/:id      - Vérifier le statut');
  console.log('   GET  /api/payment/fees            - Calculer les frais');
  console.log('   POST /api/payment/webhook         - Webhook MyPVIT');
  console.log('');
  console.log('✅ Server ready to accept requests');
  console.log('');
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

// Gérer les erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('❌ Exception non capturée:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise non gérée:', promise, 'raison:', reason);
  process.exit(1);
});
