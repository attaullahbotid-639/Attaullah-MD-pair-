const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const activeSessions = new Map();

async function generatePairingCode(serverId, phoneNumber) {
  return new Promise(async (resolve, reject) => {
    const sessionDir = path.join(__dirname, `../sessions/${serverId}_${phoneNumber}`);
    let sock = null;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion();

      sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04']
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        
        if (connection === 'open') {
          console.log(`[${serverId}] Connected successfully with ${phoneNumber}`);
          activeSessions.set(`${serverId}_${phoneNumber}`, sock);
        } else if (connection === 'close') {
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
          activeSessions.delete(`${serverId}_${phoneNumber}`);
        }
      });

      await delay(2000);

      if (!sock.authState.creds.registered) {
        const cleanedNumber = phoneNumber.replace(/[^\d]/g, '');
        const code = await sock.requestPairingCode(cleanedNumber);
        
        const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
        resolve(formattedCode);
      } else {
        reject(new Error('Number already registered on this session'));
      }

    } catch (error) {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      reject(error);
    }
  });
}

function getActiveCount(serverId) {
  let count = 0;
  for (let key of activeSessions.keys()) {
    if (key.startsWith(`${serverId}_`)) {
      count++;
    }
  }
  return count;
}

module.exports = {
  generatePairingCode,
  getActiveCount
};
