/**
 * WRITERS — Wall of Fame Gallery
 * Images stored in Supabase Storage (REST API, no SDK needed)
 *
 * Uses a shared index.json manifest. Each upload updates the manifest
 * (RLS now allows anon key to upsert in wall-of-fame/).
 *
 * Anti-spam:
 *   - Honeypot field (hidden from humans, bots fill it)
 *   - Rate limiting: 1 upload per 60 seconds per browser
 *   - File type validation (images only)
 *   - File size limit (5MB)
 *   - Caption length limit (120 chars)
 */

(function() {
  'use strict';

  const SUPABASE_URL = 'https://sfaaxdaldgyairpqwxls.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYWF4ZGFsZGd5YWlycHF3eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjgyNTIsImV4cCI6MjA5OTc0NDI1Mn0.tWMzH_12ZY44MUd9Ju69D_JUfH6CamiVNvH20qiXWZs';

  const STORAGE_BUCKET = 'gallery';
  const GALLERY_FOLDER = 'wall-of-fame/';
  const MANIFEST_FILE = GALLERY_FOLDER + 'index.json';

  // 🔒 Anti-spam
  const UPLOAD_COOLDOWN_MS = 60 * 1000;
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_CAPTION_LENGTH = 120;

  let pendingCaption = '';

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.gallery-grid-community');
    if (!grid) return;

    loadGallery();

    // Click upload card → open file picker (unless clicking caption controls)
    grid.addEventListener('click', (e) => {
      const uploadCard = e.target.closest('#uploadCard');
      if (uploadCard && !e.target.closest('#captionInput') && !e.target.closest('#captionToggle')) {
        document.getElementById('artUpload')?.click();
      }
    });

    // Toggle caption input
    grid.addEventListener('click', (e) => {
      const toggle = e.target.closest('#captionToggle');
      if (toggle) {
        e.stopPropagation();
        const field = document.getElementById('captionInput');
        if (field) field.style.display = field.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Track caption as user types
    grid.addEventListener('input', (e) => {
      const field = e.target.closest('#captionInput');
      if (field) {
        pendingCaption = field.value.trim();
      }
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
      uploadCard.innerHTML = '<span class="upload-icon">⏳</span><span class="upload-text">Uploading...</span>';

      uploadImage(file)
        .then(() => {
          input.value = '';
          pendingCaption = '';
          localStorage.setItem('wrtrs_last_upload', Date.now().toString());
          resetUploadCard(uploadCard);
          loadGallery();
        })
        .catch((err) => {
          console.error('Upload failed:', err);
          input.value = '';
          uploadCard.innerHTML = `
            <span class="upload-icon">❌</span>
            <span class="upload-text">Upload failed — try again</span>
            <input type="file" accept="image/*" id="artUpload" style="display:none" />
          `;
        });
    });

    // 🔒 Anti-spam checks
    function checkSpam(file) {
      // Honeypot
      const honeypot = document.getElementById('honeypotField');
      if (honeypot && honeypot.value.trim() !== '') {
        console.warn('Honeypot triggered');
        return 'Security check triggered. If human, try again.';
      }
      // File type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return 'Only JPEG, PNG, GIF, and WebP images allowed.';
      }
      // File size
      if (file.size > MAX_FILE_SIZE) {
        return `Image too large (max 5MB). Yours is ${(file.size / 1024 / 1024).toFixed(1)}MB.`;
      }
      // Rate limit
      const lastUpload = localStorage.getItem('wrtrs_last_upload');
      if (lastUpload) {
        const elapsed = Date.now() - parseInt(lastUpload, 10);
        if (elapsed < UPLOAD_COOLDOWN_MS) {
          const waitSeconds = Math.ceil((UPLOAD_COOLDOWN_MS - elapsed) / 1000);
          return `Please wait ${waitSeconds}s before uploading again.`;
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

      // 1. Upload the image
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

      // 2. Update the shared manifest
      const manifest = await fetchManifest();
      manifest.unshift({
        url: publicUrl,
        created_at: new Date().toISOString(),
        caption: pendingCaption || '',
      });

      const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${MANIFEST_FILE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: manifestBlob,
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
      // Remove old items
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

        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-item-wrtrs';
        wrapper.style.cssText = 'position: relative; height: 200px; overflow: hidden; border-radius: 12px;';

        const img = document.createElement('img');
        img.src = url;
        img.alt = caption || 'Wall of Fame art';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block;';
        img.loading = 'lazy';

        wrapper.appendChild(img);

        if (caption) {
          const capEl = document.createElement('div');
          capEl.textContent = caption;
          capEl.style.cssText = `
            position: absolute; bottom: 0; left: 0; right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            color: #fff; padding: 24px 10px 8px; font-size: 0.75rem;
            line-height: 1.3; opacity: 0; transition: opacity 0.2s;
            pointer-events: none;
          `;
          wrapper.appendChild(capEl);
          wrapper.addEventListener('mouseenter', () => { capEl.style.opacity = '1'; });
          wrapper.addEventListener('mouseleave', () => { capEl.style.opacity = '0'; });
        }

        wrapper.addEventListener('click', () => openLightbox(url, caption));

        const uploadCard = document.getElementById('uploadCard');
        uploadCard.insertAdjacentElement('afterend', wrapper);
      });
    }
  });

  // 🖼️ Lightbox
  let activeLightbox = null;

  function openLightbox(src, caption) {
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
      max-width: 90vw; max-height: 80vh;
      border-radius: 8px;
      box-shadow: 0 0 40px rgba(0,0,0,0.5);
      object-fit: contain;
      cursor: default;
    `;
    overlay.appendChild(img);

    if (caption) {
      const capEl = document.createElement('p');
      capEl.textContent = caption;
      capEl.style.cssText = `
        color: rgba(255,255,255,0.7); margin-top: 16px;
        font-size: 0.9rem; text-align: center;
        max-width: 600px; line-height: 1.5;
        cursor: default;
      `;
      overlay.appendChild(capEl);
    }

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
