const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const Pino = require('pino');
const chalk = require('chalk');

let sock = null;
let ioInstance = null;

async function initWaBot(io) {
  ioInstance = io;
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  
  sock = makeWASocket({
    version: [2, 3000, 1015901307],
    auth: state,
    printQRInTerminal: false,
    logger: Pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop'),
    getMessage: async () => undefined
  });
  
  async function requestPairingCode(phoneNumber) {
    if (!sock) return null;
    
    let formattedNumber = phoneNumber.toString().replace(/[^0-9]/g, '');
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '62' + formattedNumber.substring(1);
    }
    if (!formattedNumber.startsWith('62')) {
      formattedNumber = '62' + formattedNumber;
    }
    
    try {
      const code = await sock.requestPairingCode(formattedNumber);
      console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.bold.green('🌿 PAIRING CODE:'));
      console.log(chalk.yellow.bold(`   ${code}`));
      console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      return code;
    } catch (err) {
      console.log(chalk.red('Gagal generate pairing code:', err.message));
      throw err;
    }
  }
  
  sock.ev.on('connection.update', async (update) => {
    const { connection } = update;
    
    if (connection === 'open') {
      console.log(chalk.green('✅ WhatsApp Connected!'));
      ioInstance.emit('status', { connected: true, message: 'Bot siap! Pilih mode spam.' });
      await loadChannels();
    }
    
    if (connection === 'close') {
      console.log(chalk.red('❌ Disconnected, reconnecting...'));
      ioInstance.emit('status', { connected: false, message: 'Disconnected, pairing ulang' });
      setTimeout(() => initWaBot(ioInstance), 5000);
    }
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  async function loadChannels() {
    try {
      const chats = await sock.groupFetchAllParticipating();
      let channelList = [];
      
      for (const [id, chat] of Object.entries(chats || {})) {
        if (id.includes('@newsletter')) {
          channelList.push({
            id: id,
            name: chat.subject || chat.name || 'WhatsApp Channel'
          });
        }
      }
      
      if (channelList.length === 0) {
        channelList = [{ id: 'none', name: '⚠️ Belum join channel, join dulu ya!' }];
      }
      
      ioInstance.emit('channels-list', channelList);
      return channelList;
    } catch (e) {
      console.log('Gagal load channel:', e.message);
      return [];
    }
  }
  
  async function sendReaction(channelId, emoji) {
    if (!sock || !channelId || channelId === 'none') return false;
    
    try {
      const messages = await sock.loadMessages(channelId, 5);
      if (messages && messages.length > 0) {
        let targetMessage = null;
        for (const msg of messages) {
          if (!msg.key?.fromMe && msg.key?.id) {
            targetMessage = msg;
            break;
          }
        }
        
        if (targetMessage) {
          await sock.sendMessage(channelId, {
            react: { text: emoji, key: targetMessage.key }
          });
          return true;
        }
      }
    } catch (err) {
      console.log(`Gagal kirim reaction: ${err.message}`);
    }
    return false;
  }
  
  return { requestPairingCode, sendReaction, loadChannels };
}

module.exports = { initWaBot };