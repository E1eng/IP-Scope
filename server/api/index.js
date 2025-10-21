// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration - allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Import routes
const routes = require('../src/routes');

// Mount routes at /api
app.use('/api', routes);

// Root health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'IPScope API Server', 
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;
