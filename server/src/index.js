require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.STORY_PROTOCOL_API_KEY;

// ▼▼▼ DEBUG KRITIS: Cek status API Key saat startup ▼▼▼
if (!API_KEY || API_KEY === 'YOUR_STORY_PROTOCOL_API_KEY_HERE') {
  console.error("=======================================================================");
  console.error("FATAL ERROR: STORY_PROTOCOL_API_KEY is missing or using placeholder.");
  console.error("Please fill the correct API Key in the server/.env file.");
  console.error("=======================================================================");
} else {
    // Hanya tampilkan 5 karakter pertama untuk keamanan
    console.log(`API Key Loaded: ${API_KEY.substring(0, 5)}...`); 
}
// ▲▲▲ END DEBUG ▲▲▲


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