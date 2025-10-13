require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

// --- VALIDASI ENVIRONMENT VARIABLE ---
if (!process.env.STORY_PROTOCOL_API_KEY || process.env.STORY_PROTOCOL_API_KEY === "YOUR_ASSETS_API_KEY_HERE") {
    console.error("\nFATAL ERROR: STORY_PROTOCOL_API_KEY is not set in the .env file.");
    process.exit(1); 
}
if (!process.env.STORYSCAN_API_KEY) {
    console.error("\nFATAL ERROR: STORYSCAN_API_KEY is not set in the .env file. This is required for Royalty Analytics.");
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