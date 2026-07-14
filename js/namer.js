/**
 * Graffiti Name Generator
 * Type your name, get a tag back
 */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('tagInput');
  const output = document.getElementById('tagOutput');
  const generateBtn = document.getElementById('generateTag');

  if (!input || !output || !generateBtn) return;

  const prefixes = ['King', 'Lord', 'Lady', 'MC', 'OG', 'Young', 'Big', 'Lil', 'Duke', 'Prince', 'Queen', 'Ace', 'Mega', 'Ultra', 'Phantom', 'Shadow', 'Neon', 'Crypto', 'Pixel', 'Ghost', 'Cyber', 'Void', 'Omega', 'Zero', 'Blaze', 'Vandal', 'Sinner', 'Saint', 'Wreck', 'Riot'];
  const suffixes = ['One', 'Man', 'Boy', 'Girl', 'King', 'Star', 'Rock', 'Soul', 'Rex', 'X', 'Z', 'Crew', 'Unit', 'Squad', 'Killa', 'Writa', 'Tagga', 'Spray', 'Can', 'Art', 'Vibes', 'Nation', 'Movement', 'Vision', 'Zone', 'Ryda', 'Playa', 'Prophet'];
  const graffitiStyles = ['wildstyle', 'bubble', 'block', 'throwie', 'straight', 'burner'];

  function generateTag(name) {
    if (!name || name.trim() === '') return 'TYPE A NAME, WRITER';

    const clean = name.trim().toUpperCase();
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const style = graffitiStyles[Math.floor(Math.random() * graffitiStyles.length)];

    const tag = `${prefix} ${clean} ${suffix}`;
    const year = new Date().getFullYear();
    const styleLabel = style.toUpperCase();

    return {
      tag,
      style: styleLabel,
      signature: `${tag} • ${year}`,
      hash: `#${clean}${Math.floor(Math.random() * 9999)}`
    };
  }

  function renderOutput(name) {
    const result = generateTag(name);
    output.innerHTML = `
      <div class="tag-display">
        <div class="tag-text">${result.tag}</div>
        <div class="tag-meta">
          <span class="tag-style">${result.style}</span>
          <span class="tag-sig">${result.signature}</span>
        </div>
        <div class="tag-hash">${result.hash}</div>
      </div>
    `;
  }

  generateBtn.addEventListener('click', () => renderOutput(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') renderOutput(input.value);
  });

  // Generate one on load
  renderOutput('WRITER');
});
