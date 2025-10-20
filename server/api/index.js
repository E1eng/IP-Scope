// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const routes = require('../src/routes');

// Use routes
app.use('/api', routes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'IPScope API Server', 
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;
