require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

// --- VALIDASI ENVIRONMENT VARIABLE ---
// Pastikan API Key sudah di-set di file .env
if (!process.env.STORY_PROTOCOL_API_KEY || process.env.STORY_PROTOCOL_API_KEY === "YOUR_STORY_PROTOCOL_API_KEY_HERE") {
    console.error("\nFATAL ERROR: STORY_PROTOCOL_API_KEY is not set in the .env file.");
    console.error("Please create a .env file in the /server directory, copy the contents of .env.example, and add your actual API key.");
    process.exit(1); // Menghentikan server jika API key tidak ada
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