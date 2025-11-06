// Simple realtime UI script (Improved version)
// Versi ini menampilkan jumlah orang terdeteksi, total deteksi, dan statistik delay/jitter.

const API = {
  data: '/data',
  health: '/health'
};

function qs(id) {
  return document.getElementById(id);
}

async function setStatus() {
  try {
    const res = await fetch(API.health);
    const status = await res.json();
    qs('camera-status').textContent = `Camera: ${status.camera || '-'}`;
    qs('db-status').textContent = `DB: ${status.database || '-'}`;
    qs('model-status').textContent = `Model: ${status.model || '-'}`;
  } catch (e) {
    qs('camera-status').textContent = 'Camera: -';
    qs('db-status').textContent = 'DB: -';
    qs('model-status').textContent = 'Model: -';
  }
}

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function updateUI(payload) {
  if (!payload) return;

  const detections = payload.recent_detections || [];
  const totalDetections = payload.total_detections ?? 0;
  const currentHuman = payload.human_count ?? (detections[0]?.human_count ?? 0);

  // Update jumlah orang yang terdeteksi saat ini
  qs('human-count').textContent = String(currentHuman);

  // Update total deteksi kumulatif
  qs('total-detections').textContent = totalDetections;

  // Hitung delay & jitter rata-rata
  const delays = detections.map(x => Number(x.delay) || 0);
  const jitters = detections.map(x => Number(x.jitter) || 0);
  const avg = arr => arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

  const avgDelay = avg(delays);
  const avgJitter = avg(jitters);
  qs('avg-delay').textContent = `${avgDelay.toFixed(1)} ms`;
  qs('avg-jitter').textContent = `${avgJitter.toFixed(1)} ms`;

  // FPS estimasi dari rata-rata delay
  const fps = avgDelay > 0 ? Math.min(Math.round(1000 / avgDelay), 30) : 0;
  qs('fps').textContent = String(fps);

  // Render tabel deteksi terbaru (maksimal 10 entri)
  const tbody = qs('detections-tbody');
  tbody.innerHTML = '';
  detections.slice(0, 10).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtTime(item.timestamp)}</td>
      <td>${item.status || '-'}</td>
      <td>${(Number(item.delay) || 0).toFixed(1)}</td>
      <td>${(Number(item.jitter) || 0).toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function tick() {
  try {
    const res = await fetch(API.data, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    updateUI(data);
  } catch (e) {
    console.error('Gagal update data:', e.message);
  }
}

function main() {
  setStatus();
  tick();

  // Perbarui data deteksi tiap 2 detik
  setInterval(tick, 2000);

  // Perbarui status sistem tiap 5 detik
  setInterval(setStatus, 5000);
}

document.addEventListener('DOMContentLoaded', main);
