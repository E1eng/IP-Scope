
// server/src/index.js
// server/src/index.js (paling atas)
require('dotenv').config();

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
