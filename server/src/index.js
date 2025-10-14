require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

// --- VALIDASI ENVIRONMENT VARIABLE ---
// STORY_PROTOCOL_API_KEY digunakan untuk Assets API
if (!process.env.STORY_PROTOCOL_API_KEY) {
    console.error("\nFATAL ERROR: STORY_PROTOCOL_API_KEY is not set in the .env file.");
    console.error("Please create a .env file and add your Story Protocol Assets API key.");
    process.exit(1); 
}
// STORYSCAN_API_KEY digunakan untuk Transactions API
if (!process.env.STORYSCAN_API_KEY) {
    console.error("\nFATAL ERROR: STORYSCAN_API_KEY is not set in the .env file.");
    console.error("Please create a .env file and add your Story Protocol Transactions API key.");
    process.exit(1); 
}
// ------------------------------------

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); 
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('IP Asset Search Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});