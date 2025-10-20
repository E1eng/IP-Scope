
// server/src/index.js (baris paling atas)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// opsional: verifikasi (masked)
if (!process.env.STORY_PROTOCOL_API_KEY) {
  console.error('[ENV] STORY_PROTOCOL_API_KEY missing');
} else {
  console.log('[ENV] STORY_PROTOCOL_API_KEY loaded');
}

const express = require('express');
const cors = require('cors');
const routes = require('./routes/index.js');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// mount API under /api
app.use('/api', routes);

// health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
