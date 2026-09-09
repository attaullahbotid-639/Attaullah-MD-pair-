const express = require('express');
const path = require('path');
const { generatePairingCode, getActiveCount } = require('./lib/serverManager');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Active Server Status Endpoint
app.get('/active', (req, res) => {
  try {
    const { server } = req.query;
    if (!server) {
      return res.status(400).json({ error: 'Server ID required' });
    }

    const count = getActiveCount(server);
    const limit = 50;

    res.json({
      count,
      limit,
      error: false
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Pair Code Generation Endpoint
app.get('/code', async (req, res) => {
  try {
    const { server, number } = req.query;

    if (!server || !number) {
      return res.status(400).json({ error: 'Server and phone number are required' });
    }

    const cleanedNumber = number.replace(/[^\d]/g, '');
    if (cleanedNumber.length < 10 || cleanedNumber.length > 15) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const code = await generatePairingCode(server, cleanedNumber);
    res.json({ code });
  } catch (err) {
    console.error('Error generating code:', err);
    res.status(500).json({ error: err.message || 'Failed to generate code' });
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ATTAULLAH-MD Server running on port ${PORT}`));
