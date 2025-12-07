const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

// Routes
const paymentRoutes = require('./routes/payment.routes');

// Middleware
const { generalLimiter, paymentLimiter, webhookLimiter } = require('./middleware/rateLimit.middleware');

/**
 * Configuration de l'application Express
 */

const app = express();

// ========================================
// MIDDLEWARE SÉCURITÉ
// ========================================

// Helmet pour sécuriser les headers HTTP
app.use(helmet());

// CORS - Autoriser le frontend (localhost + production)
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS: Origine non autorisée: ${origin}`);
      callback(new Error('Non autorisé par CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting général
app.use('/api/', generalLimiter);

// ========================================
// MIDDLEWARE PARSING
// ========================================

// Parser JSON
app.use(bodyParser.json());

// Parser URL-encoded
app.use(bodyParser.urlencoded({ extended: true }));

// Logging des requêtes
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ========================================
// ROUTES
// ========================================

// Route de santé (health check)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NAT Voyages API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Routes paiement avec rate limiting spécifique
app.use('/api/payment/initiate', paymentLimiter);
app.use('/api/payment/webhook', webhookLimiter);
app.use('/api/payment', paymentRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.originalUrl,
  });
});

// ========================================
// GESTION D'ERREURS GLOBALE
// ========================================

app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

module.exports = app;
