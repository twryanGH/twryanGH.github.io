// Fetch sunrise/sunset times for the visitor's location
(async function () {
  const el = document.getElementById('sunrise-info');

  try {
    // Get approximate location from IP
    const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
    const { latitude, longitude, city } = geo;

    // Get sunrise/sunset from Sunrise-Sunset API
    const url = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`;
    const data = await fetch(url).then(r => r.json());

    if (data.status !== 'OK') throw new Error('API error');

    const fmt = iso => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    el.innerHTML = `
      <p style="margin-bottom:.75rem;opacity:.6;font-size:.8rem">${city || 'Your location'} &mdash; today</p>
      <div class="sun-times">
        <span><span class="label">Sunrise</span><span class="time">${fmt(data.results.sunrise)}</span></span>
        <span><span class="label">Solar Noon</span><span class="time">${fmt(data.results.solar_noon)}</span></span>
        <span><span class="label">Sunset</span><span class="time">${fmt(data.results.sunset)}</span></span>
        <span><span class="label">Day Length</span><span class="time">${(data.results.day_length / 3600).toFixed(1)}h</span></span>
      </div>
    `;
  } catch {
    el.innerHTML = '<p style="opacity:.5">Could not load sunrise data</p>';
  }
})();

// ── Guestbook ─────────────────────────────
const API_URL = 'https://yza5ludi73.execute-api.us-east-1.amazonaws.com/Prod/guestbook';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderEntries(entries) {
  const container = document.getElementById('guestbook-entries');
  if (!entries.length) {
    container.innerHTML = '<p style="opacity:.5;text-align:center">No entries yet — be the first!</p>';
    return;
  }
  container.innerHTML = entries.map(e => {
    const labelsHtml = e.photoLabels && e.photoLabels.length
      ? `<p class="gb-labels">&#129302; AI saw: ${e.photoLabels.map(l => escapeHtml(l)).join(', ')}</p>`
      : '';
    return `
      <div class="gb-entry">
        <div class="gb-header">
          <span class="gb-name">${escapeHtml(e.name)}</span>
          <span class="gb-date">${new Date(e.timestamp * 1000).toLocaleDateString()}</span>
        </div>
        <p class="gb-msg">${escapeHtml(e.message)}</p>
        ${labelsHtml}
      </div>
    `;
  }).join('');
}

async function loadEntries() {
  try {
    const res = await fetch(API_URL);
    const entries = await res.json();
    renderEntries(entries);
  } catch {
    document.getElementById('guestbook-entries').innerHTML =
      '<p style="opacity:.5;text-align:center">Could not load guestbook</p>';
  }
}

document.getElementById('guestbook-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const nameInput = document.getElementById('gb-name');
  const msgInput = document.getElementById('gb-message');
  const photoInput = document.getElementById('gb-photo');
  const previewEl = document.getElementById('photo-preview');

  btn.disabled = true;
  btn.textContent = 'Posting…';

  try {
    const payload = { name: nameInput.value, message: msgInput.value };

    // Read photo as base64 if one was selected
    if (photoInput.files.length > 0) {
      btn.textContent = 'Analyzing photo…';
      payload.image = await readFileAsBase64(photoInput.files[0]);
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Post failed');

    const result = await res.json();

    // Show what Rekognition found
    if (result.photoLabels && result.photoLabels.length) {
      previewEl.innerHTML = `&#9989; AI identified: <strong>${result.photoLabels.join(', ')}</strong>`;
    }

    nameInput.value = '';
    msgInput.value = '';
    photoInput.value = '';
    await loadEntries();
  } catch {
    alert('Could not post your entry. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Post';
  }
});

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

loadEntries();
