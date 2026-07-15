/**
 * WRITERS — Graffiti Name Generator
 * Type your name, get a tag back.
 * Only shows output after user input.
 */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('tagInput');
  const output = document.getElementById('tagOutput');
  const generateBtn = document.getElementById('generateTag');

  if (!input || !output || !generateBtn) return;

  const prefixes = ['King', 'Lord', 'Lady', 'MC', 'OG', 'Young', 'Big', 'Lil', 'Duke', 'Prince', 'Queen', 'Ace', 'Mega', 'Ultra', 'Phantom', 'Shadow', 'Neon', 'Crypto', 'Pixel', 'Ghost', 'Cyber', 'Void', 'Omega', 'Zero', 'Blaze', 'Vandal', 'Sinner', 'Saint', 'Wreck', 'Riot'];
  const suffixes = ['One', 'Man', 'Boy', 'Girl', 'King', 'Star', 'Rock', 'Soul', 'Rex', 'X', 'Z', 'Crew', 'Unit', 'Squad', 'Killa', 'Writa', 'Tagga', 'Spray', 'Can', 'Art', 'Vibes', 'Nation', 'Movement', 'Vision', 'Zone', 'Ryda', 'Playa', 'Prophet'];

  function generateTag(name) {
    const clean = name.trim().toUpperCase();
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const year = new Date().getFullYear();

    return {
      tag: `${prefix} ${clean} ${suffix}`,
      signature: `${prefix} ${clean} ${suffix} • ${year}`
    };
  }

  function renderOutput(name) {
    if (!name || name.trim() === '') {
      output.innerHTML = '';
      return;
    }
    const result = generateTag(name);
    output.innerHTML = `
      <div class="tag-display">
        <div class="tag-text">${result.tag}</div>
        <div class="tag-sig">${result.signature}</div>
      </div>
    `;
  }

  generateBtn.addEventListener('click', () => renderOutput(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') renderOutput(input.value);
  });

  // No default output — wait for user input
  output.innerHTML = '';
});
