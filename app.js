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
