/**
 * WRITERS — Wall of Fame Gallery
 * Images stored in Supabase Storage (REST API, no SDK needed)
 *
 * Uses a shared index.json manifest with upsert support.
 *
 * Anti-spam:
 *   - Honeypot field
 *   - Rate limiting (60s per upload)
 *   - File type validation (images only)
 *   - File size limit (5MB)
 *   - NSFW moderation (client-side via nsfwjs, lazy-loaded only on upload)
 */

(function() {
  'use strict';

  const SUPABASE_URL = 'https://sfaaxdaldgyairpqwxls.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYWF4ZGFsZGd5YWlycHF3eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjgyNTIsImV4cCI6MjA5OTc0NDI1Mn0.tWMzH_12ZY44MUd9Ju69D_JUfH6CamiVNvH20qiXWZs';

  const STORAGE_BUCKET = 'gallery';
  const GALLERY_FOLDER = 'wall-of-fame/';
  const MANIFEST_FILE = GALLERY_FOLDER + 'index.json';

  const UPLOAD_COOLDOWN_MS = 60 * 1000;
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_CAPTION_LENGTH = 120;
  const MAX_ARTIST_LENGTH = 40;
  const NSFW_THRESHOLD = 0.5;

  let pendingCaption = '';
  let pendingArtist = '';
  let pendingMapUrl = '';
  let nsfwModelPromise = null; // null = not loaded yet, promise = loading/loaded

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.gallery-grid-community');
    if (!grid) return;

    loadGallery();

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('#uploadCard');
      if (card && !e.target.closest('.upload-extra-btn') && !e.target.closest('.upload-extra-field')) {
        document.getElementById('artUpload')?.click();
      }
    });

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('#infoToggle');
      if (btn) {
        e.stopPropagation();
        const panel = document.getElementById('infoPanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      }
    });

    grid.addEventListener('input', (e) => {
      const field = e.target.closest('#captionField');
      if (field) pendingCaption = field.value.trim();

      const artist = e.target.closest('#artistField');
      if (artist) {
        if (artist.value.length > MAX_ARTIST_LENGTH) artist.value = artist.value.slice(0, MAX_ARTIST_LENGTH);
        pendingArtist = artist.value.trim();
      }

      const map = e.target.closest('#mapField');
      if (map) pendingMapUrl = map.value.trim();
    });

    // Upload handler
    grid.addEventListener('change', (e) => {
      const input = e.target.closest('#artUpload');
      if (!input?.files?.[0]) return;

      const file = input.files[0];
      const spamError = checkSpam(file);
      if (spamError) {
        input.value = '';
        showStatus(`🚫 ${spamError}`);
        return;
      }

      const uploadCard = document.getElementById('uploadCard');
      uploadCard.innerHTML = '<span class="upload-icon">🔍</span><span class="upload-text">Checking image...</span>';

      startUpload(file, input, uploadCard);
    });

    function startUpload(file, input, uploadCard) {
      doModeration(file)
        .then(() => {
          uploadCard.innerHTML = '<span class="upload-icon">⏳</span><span class="upload-text">Uploading...</span>';
          return uploadImage(file);
        })
        .then(() => {
          input.value = '';
          pendingCaption = '';
          pendingArtist = '';
          pendingMapUrl = '';
          localStorage.setItem('wrtrs_last_upload', Date.now().toString());
          resetUploadCard(uploadCard);
          loadGallery();
        })
        .catch((err) => {
          console.error('Upload failed:', err);
          input.value = '';
          const msg = err.message === 'NSFW_REJECTED'
            ? 'Image rejected — not appropriate content'
            : 'Upload failed — try again';
          uploadCard.innerHTML = `
            <span class="upload-icon">❌</span>
            <span class="upload-text">${msg}</span>
            <input type="file" accept="image/*" id="artUpload" style="display:none" />
          `;
        });
    }

    async function doModeration(file) {
      // Attempt NSFW check — if anything fails, allow the upload
      try {
        // Reset failed promise so we retry
        if (nsfwModelPromise === null) {
          nsfwModelPromise = loadNsfwModelWithTimeout();
        }
        const model = await nsfwModelPromise;

        const blobUrl = URL.createObjectURL(file);
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = blobUrl;
        });

        const predictions = await model.classify(img);
        URL.revokeObjectURL(blobUrl);

        const porn = predictions.find(p => p.className === 'Porn');
        const hentai = predictions.find(p => p.className === 'Hentai');
        if ((porn && porn.probability > NSFW_THRESHOLD) ||
            (hentai && hentai.probability > NSFW_THRESHOLD)) {
          throw new Error('NSFW_REJECTED');
        }
      } catch (err) {
        if (err.message === 'NSFW_REJECTED') throw err;
        // Reset promise so we retry next time
        nsfwModelPromise = null;
        console.warn('NSFW check failed, allowing upload:', err);
      }
    }

    async function loadNsfwModelWithTimeout() {
      // 30s timeout for the full download + model init (~5-10MB total)
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 30000)
      );

      const load = (async () => {
        if (typeof tf === 'undefined') {
          await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
        }
        if (typeof nsfwjs === 'undefined') {
          await loadScript('https://cdn.jsdelivr.net/npm/nsfwjs@4.2.0/dist/nsfwjs.min.js');
        }
        return nsfwjs.load();
      })();

      return Promise.race([load, timeout]);
    }

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    function checkSpam(file) {
      const honeypot = document.getElementById('honeypotField');
      if (honeypot && honeypot.value.trim() !== '') {
        console.warn('Honeypot triggered');
        return 'Security check triggered. If human, try again.';
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return 'Only JPEG, PNG, GIF, and WebP images allowed.';
      }
      if (file.size > MAX_FILE_SIZE) {
        return `Image too large (max 5MB). Yours is ${(file.size / 1024 / 1024).toFixed(1)}MB.`;
      }
      const lastUpload = localStorage.getItem('wrtrs_last_upload');
      if (lastUpload) {
        const elapsed = Date.now() - parseInt(lastUpload, 10);
        if (elapsed < UPLOAD_COOLDOWN_MS) {
          return `Please wait ${Math.ceil((UPLOAD_COOLDOWN_MS - elapsed) / 1000)}s before uploading again.`;
        }
      }
      return null;
    }

    function showStatus(msg) {
      const card = document.getElementById('uploadCard');
      if (!card) return;
      card.innerHTML = `<span class="upload-icon">⚠️</span><span class="upload-text">${msg}</span>`;
      setTimeout(() => resetUploadCard(card), 3000);
    }

    function resetUploadCard(card) {
      if (!card) card = document.getElementById('uploadCard');
      if (!card) return;
      card.innerHTML = `
        <span class="upload-icon">📸</span>
        <span class="upload-text">Submit Your Art</span>
        <input type="file" accept="image/*" id="artUpload" style="display:none" />
      `;
    }

    async function uploadImage(file) {
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${GALLERY_FOLDER}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;

      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filename}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Storage upload failed: ${uploadRes.status} ${errText}`);
      }

      const manifest = await fetchManifest();
      manifest.unshift({
        url: publicUrl,
        created_at: new Date().toISOString(),
        caption: pendingCaption || '',
        artist: pendingArtist || '',
        map_url: pendingMapUrl || '',
      });

      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${MANIFEST_FILE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: blob,
      });
    }

    async function fetchManifest() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${MANIFEST_FILE}`,
          { cache: 'no-cache' }
        );
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }
      } catch (e) {}
      return [];
    }

    async function loadGallery() {
      try {
        const files = await fetchManifest();
        files.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        renderGallery(files);
      } catch (err) {
        console.error('Failed to load gallery:', err);
      }
    }

    function renderGallery(files) {
      grid.querySelectorAll('.gallery-item-wrtrs').forEach(el => el.remove());
      const placeholders = grid.querySelectorAll('.gallery-placeholder');

      if (files.length === 0) {
        if (placeholders.length === 0) {
          for (let i = 0; i < 5; i++) {
            const ph = document.createElement('div');
            ph.className = 'gallery-placeholder';
            ph.innerHTML = '<span class="gallery-placeholder-icon">🎨</span><span>Be the first — submit above</span>';
            grid.appendChild(ph);
          }
        }
        return;
      }

      placeholders.forEach(el => el.remove());

      files.forEach((file) => {
        const url = file.url;
        if (!url) return;

        const caption = file.caption || '';
        const artist = file.artist || '';
        const mapUrl = file.map_url || '';

        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-item-wrtrs';
        wrapper.style.cssText = 'position: relative; height: 200px; overflow: hidden; border-radius: 12px;';

        const img = document.createElement('img');
        img.src = url;
        img.alt = caption || 'Wall of Fame art';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block;';
        img.loading = 'lazy';
        wrapper.appendChild(img);

        if (caption || artist || mapUrl) {
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: absolute; bottom: 0; left: 0; right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.85));
            color: #fff; padding: 28px 10px 8px; font-size: 0.75rem;
            line-height: 1.4; opacity: 0; transition: opacity 0.2s;
            pointer-events: none;
          `;

          if (artist) overlay.innerHTML += `<strong>${escHtml(artist)}</strong><br>`;
          if (caption) overlay.innerHTML += `${escHtml(caption)}<br>`;
          if (mapUrl) overlay.innerHTML += `<span style="opacity:0.6;font-size:0.65rem;">📍 ${escHtml(mapUrl)}</span>`;

          wrapper.appendChild(overlay);
          wrapper.addEventListener('mouseenter', () => { overlay.style.opacity = '1'; });
          wrapper.addEventListener('mouseleave', () => { overlay.style.opacity = '0'; });
        }

        wrapper.addEventListener('click', () => openLightbox(url, caption, artist, mapUrl));

        const uploadCard = document.getElementById('uploadCard');
        uploadCard.insertAdjacentElement('afterend', wrapper);
      });
    }

    function escHtml(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }
  });

  // 🖼️ Lightbox
  let activeLightbox = null;

  function openLightbox(src, caption, artist, mapUrl) {
    closeLightbox();

    const overlay = document.createElement('div');
    overlay.id = 'gallery-lightbox';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.92);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      cursor: pointer; padding: 20px;
      animation: fadeIn 0.2s ease;
    `;

    const img = document.createElement('img');
    img.src = src;
    img.alt = caption || 'Wall of Fame art';
    img.style.cssText = `
      max-width: 90vw; max-height: 75vh;
      border-radius: 8px;
      box-shadow: 0 0 40px rgba(0,0,0,0.5);
      object-fit: contain;
      cursor: default;
    `;
    overlay.appendChild(img);

    const infoArea = document.createElement('div');
    infoArea.style.cssText = `
      margin-top: 16px; text-align: center;
      max-width: 600px; cursor: default;
    `;

    if (artist) {
      const nameEl = document.createElement('p');
      nameEl.textContent = `✍️ ${artist}`;
      nameEl.style.cssText = 'color: #fff; font-size: 1rem; font-weight: 600; margin: 0 0 4px;';
      infoArea.appendChild(nameEl);
    }

    if (caption) {
      const capEl = document.createElement('p');
      capEl.textContent = caption;
      capEl.style.cssText = 'color: rgba(255,255,255,0.7); font-size: 0.9rem; margin: 0 0 4px; line-height: 1.5;';
      infoArea.appendChild(capEl);
    }

    if (mapUrl) {
      const link = document.createElement('a');
      link.href = mapUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = '📍 View on Google Maps';
      link.style.cssText = `
        color: var(--accent, #ff6b35); font-size: 0.8rem;
        text-decoration: none; display: inline-block; margin-top: 4px;
      `;
      link.addEventListener('mouseenter', () => { link.style.textDecoration = 'underline'; });
      link.addEventListener('mouseleave', () => { link.style.textDecoration = 'none'; });
      infoArea.appendChild(link);
    }

    overlay.appendChild(infoArea);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: fixed; top: 20px; right: 24px; z-index: 100000;
      background: none; border: none; color: rgba(255,255,255,0.5);
      font-size: 1.8rem; cursor: pointer; transition: color 0.2s;
    `;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = 'rgba(255,255,255,0.5)'; });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
    overlay.appendChild(closeBtn);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });

    const escHandler = (e) => { if (e.key === 'Escape') closeLightbox(); };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    if (!document.getElementById('lightbox-style')) {
      const style = document.createElement('style');
      style.id = 'lightbox-style';
      style.textContent = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
      document.head.appendChild(style);
    }

    activeLightbox = { overlay, escHandler };
  }

  window.closeLightbox = function() {
    if (!activeLightbox) return;
    document.removeEventListener('keydown', activeLightbox.escHandler);
    activeLightbox.overlay.remove();
    document.body.style.overflow = '';
    activeLightbox = null;
  };
})();
