require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const HOMEY_BASE = `http://${process.env.HOMEY_IP}/api`;
const HOMEY_TOKEN = process.env.HOMEY_TOKEN;
const VARIABLE_ID = process.env.VARIABLE_ID;
const SPEAKER_VARIABLE_ID = process.env.SPEAKER_VARIABLE_ID;
const FLOW_ID = process.env.FLOW_ID;

const homeyHeaders = {
  Authorization: `Bearer ${HOMEY_TOKEN}`,
  'Content-Type': 'application/json',
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Play a sound: set variable then trigger flow
app.post('/api/play', async (req, res) => {
  const { command, speaker } = req.body;
  if (!command) return res.status(400).json({ error: 'Missing command' });

  try {
    // 1. Set the command variable
    const varResp = await fetch(
      `${HOMEY_BASE}/manager/logic/variable/${VARIABLE_ID}`,
      {
        method: 'PUT',
        headers: homeyHeaders,
        body: JSON.stringify({ value: command }),
      }
    );
    if (!varResp.ok) throw new Error(`Variable update failed (${varResp.status})`);

    // 2. Set the speaker variable
    if (SPEAKER_VARIABLE_ID && speaker) {
      const spkResp = await fetch(
        `${HOMEY_BASE}/manager/logic/variable/${SPEAKER_VARIABLE_ID}`,
        {
          method: 'PUT',
          headers: homeyHeaders,
          body: JSON.stringify({ value: speaker }),
        }
      );
      if (!spkResp.ok) throw new Error(`Speaker variable update failed (${spkResp.status})`);
    }

    // 3. Trigger the flow
    const flowResp = await fetch(
      `${HOMEY_BASE}/manager/flow/flow/${FLOW_ID}/trigger`,
      {
        method: 'POST',
        headers: homeyHeaders,
      }
    );
    if (!flowResp.ok) throw new Error(`Flow trigger failed (${flowResp.status})`);

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/play error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// Proxy: list devices (for speaker selector)
app.get('/api/devices', async (req, res) => {
  try {
    const resp = await fetch(`${HOMEY_BASE}/manager/devices/device/`, {
      headers: { Authorization: `Bearer ${HOMEY_TOKEN}` },
    });
    if (!resp.ok) throw new Error(`Homey responded ${resp.status}`);
    res.json(await resp.json());
  } catch (err) {
    console.error('GET /api/devices error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Sound Party running on http://localhost:${PORT}`);
});
