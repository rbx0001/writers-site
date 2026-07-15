/**
 * WRITERS — Graffiti Near Me
 * Uses browser geolocation to search for graffiti nearby.
 * Falls back to a Google Maps search if geolocation is denied.
 */

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('graffitiNearMe');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();

    if (!navigator.geolocation) {
      // No geolocation support — open general search
      window.open('https://www.google.com/maps/search/graffiti/', '_blank');
      return;
    }

    btn.textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const searchUrl = `https://www.google.com/maps/search/graffiti/@${latitude},${longitude},15z`;
        window.open(searchUrl, '_blank');
        btn.textContent = 'Find Graffiti Near Me →';
      },
      () => {
        // Denied or error — fallback to general graffiti search
        window.open('https://www.google.com/maps/search/graffiti/', '_blank');
        btn.textContent = 'Find Graffiti Near Me →';
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
});
