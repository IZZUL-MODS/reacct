const socket = io();
let selectedEmoji = '🔥';
let isConnected = false;
let currentMode = null;

// Emoji list
const emojis = ['🔥', '❤️', '👍', '😂', '😭', '🥶', '😱', '💀', '✨', '⭐', '💚', '🌿', '🍃', '💎', '👑', '💯', '🔱', '⚡', '🎉', '🤣'];

// Generate emoji grid
const emojiGrid = document.getElementById('emoji-grid');
if (emojiGrid) {
  emojis.forEach(emoji => {
    const div = document.createElement('div');
    div.className = 'emoji-option';
    div.textContent = emoji;
    div.onclick = () => {
      document.querySelectorAll('.emoji-option').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      selectedEmoji = emoji;
    };
    emojiGrid.appendChild(div);
  });
  document.querySelector('.emoji-option')?.classList.add('selected');
}

// ============ PAIRING CODE ============
function requestPairing() {
  const phone = document.getElementById('phone-number').value;
  if (!phone) {
    alert('Masukin nomor dulu! Contoh: 6281234567890');
    return;
  }
  
  document.getElementById('pairing-result').innerHTML = '<div>⏳ Minta kode...</div>';
  document.getElementById('pairing-btn').disabled = true;
  socket.emit('request-pairing', phone);
}

socket.on('pairing-code', (code) => {
  document.getElementById('pairing-result').innerHTML = `
    <div style="background: var(--accent); padding: 1rem; border-radius: 1rem;">
      <strong>🔐 KODE: ${code}</strong><br>
      <small>Masukin ke WhatsApp → ⋮ → Perangkat Tertaut → Tautkan dengan nomor</small>
    </div>
  `;
  document.getElementById('pairing-btn').disabled = false;
});

socket.on('pairing-error', (err) => {
  document.getElementById('pairing-result').innerHTML = `<div style="color: red;">❌ ${err}</div>`;
  document.getElementById('pairing-btn').disabled = false;
});

// ============ STATUS & CHANNELS ============
socket.on('status', (data) => {
  isConnected = data.connected;
  const badge = document.getElementById('status-badge');
  if (badge) {
    badge.innerHTML = data.connected ? '✅ ' + data.message : '❌ ' + data.message;
    badge.style.background = data.connected ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.1)';
    badge.style.padding = '0.5rem 1rem';
    badge.style.borderRadius = '2rem';
    badge.style.display = 'inline-block';
  }
});

socket.on('channels-list', (channels) => {
  const select = document.getElementById('channel-select');
  if (select) {
    select.innerHTML = '<option value="">— Pilih channel —</option>';
    channels.forEach(ch => {
      const option = document.createElement('option');
      option.value = ch.id;
      option.textContent = ch.name;
      select.appendChild(option);
    });
  }
});

// ============ SPAM MODES ============
function getSelectedChannel() {
  const select = document.getElementById('channel-select');
  const channel = select?.value;
  if (!channel || channel === 'none') {
    alert('Pilih channel dulu, anj!');
    return null;
  }
  if (!isConnected) {
    alert('Bot belum konek, pairing dulu!');
    return null;
  }
  return channel;
}

document.getElementById('turbo-btn')?.addEventListener('click', () => {
  const channel = getSelectedChannel();
  if (!channel) return;
  
  document.getElementById('turbo-btn').disabled = true;
  document.getElementById('safe-btn').disabled = true;
  document.getElementById('status-message').innerHTML = '🚀 TURBO MODE AKTIF! Mengirim 50x reaction cepat...';
  document.getElementById('counter').innerHTML = '0 / 50';
  
  socket.emit('start-turbo', { channelId: channel, emoji: selectedEmoji });
});

document.getElementById('safe-btn')?.addEventListener('click', () => {
  const channel = getSelectedChannel();
  if (!channel) return;
  
  document.getElementById('turbo-btn').disabled = true;
  document.getElementById('safe-btn').disabled = true;
  document.getElementById('status-message').innerHTML = '🛡️ SAFE MODE AKTIF! 200x reaction dengan delay aman + cooldown... ~35 menit';
  document.getElementById('counter').innerHTML = '0 / 200';
  
  socket.emit('start-safe', { channelId: channel, emoji: selectedEmoji });
});

document.getElementById('stop-btn')?.addEventListener('click', () => {
  socket.emit('stop-spam');
  document.getElementById('status-message').innerHTML = '⏹️ Spam dihentikan!';
});

// ============ PROGRESS UPDATES ============
socket.on('mode-start', (data) => {
  document.getElementById('counter').innerHTML = `0 / ${data.total}`;
  document.getElementById('progress-bar').style.width = '0%';
  if (data.mode === 'safe') {
    document.getElementById('status-message').innerHTML = `🛡️ Safe mode: 0/${data.total} | Estimasi: ${data.estimatedTime}`;
  } else {
    document.getElementById('status-message').innerHTML = `🚀 Turbo mode: 0/${data.total} | Gas terus!`;
  }
});

socket.on('reaction-update', (data) => {
  const percent = data.progress || (data.count / data.total * 100);
  document.getElementById('counter').innerHTML = `${data.count} / ${data.total}`;
  document.getElementById('progress-bar').style.width = `${percent}%`;
  
  if (currentMode !== 'turbo') {
    document.getElementById('status-message').innerHTML = `Mengirim reaction... ${data.count}/${data.total} (${Math.round(percent)}%)`;
  }
});

socket.on('cooldown-status', (data) => {
  if (data.active) {
    document.getElementById('status-message').innerHTML = data.message;
  } else {
    document.getElementById('status-message').innerHTML = '▶️ Lanjut lagi...';
  }
});

socket.on('spam-complete', (data) => {
  document.getElementById('turbo-btn').disabled = false;
  document.getElementById('safe-btn').disabled = false;
  document.getElementById('status-message').innerHTML = data.message;
  document.getElementById('progress-bar').style.width = '100%';
  
  setTimeout(() => {
    document.getElementById('progress-bar').style.width = '0%';
  }, 3000);
});

socket.on('spam-stopped', () => {
  document.getElementById('turbo-btn').disabled = false;
  document.getElementById('safe-btn').disabled = false;
  document.getElementById('status-message').innerHTML = '⏹️ Spam berhenti manual';
});

socket.on('spam-error', (err) => {
  document.getElementById('turbo-btn').disabled = false;
  document.getElementById('safe-btn').disabled = false;
  document.getElementById('status-message').innerHTML = `❌ ${err}`;
});

// ============ THEME TOGGLE ============
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  if (current === 'dark') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', 'dark');
  }
}

socket.emit('get-status');