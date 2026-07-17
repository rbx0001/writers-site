/**
 * WRITERS — Wall of Fame Gallery
 * Images stored in Supabase Storage (REST API, no SDK needed)
 */

(function() {
  'use strict';

  const SUPABASE_URL = 'https://sfaaxdaldgyairpqwxls.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbG…XWZs';

  const STORAGE_BUCKET = 'gallery';
  const GALLERY_FOLDER = 'wall-of-fame/';

  let galleryCache = null;

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.gallery-grid-community');
    if (!grid) return;

    // Load gallery on page load
    loadGallery();

    // Delegate click to file input
    grid.addEventListener('click', (e) => {
      const uploadCard = e.target.closest('#uploadCard');
      if (uploadCard) {
        const input = document.getElementById('artUpload');
        if (input) input.click();
      }
    });

    // Upload handler
    grid.addEventListener('change', (e) => {
      const input = e.target.closest('#artUpload');
      if (!input) return;

      const file = input.files[0];
      if (!file) return;

      const uploadCard = document.getElementById('uploadCard');
      uploadCard.innerHTML = '<span class="upload-icon">⏳</span><span class="upload-text">Uploading...</span>';

      uploadImage(file).then(() => {
        input.value = '';
        uploadCard.innerHTML = `
          <span class="upload-icon">📸</span>
          <span class="upload-text">Submit Your Art</span>
          <input type="file" accept="image/*" id="artUpload" style="display:none" />
        `;
        galleryCache = null;
        loadGallery();
      }).catch((err) => {
        console.error('Upload failed:', err);
        input.value = '';
        uploadCard.innerHTML = `
          <span class="upload-icon">❌</span>
          <span class="upload-text">Upload failed — try again</span>
          <input type="file" accept="image/*" id="artUpload" style="display:none" />
        `;
      });
    });

    async function uploadImage(file) {
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${GALLERY_FOLDER}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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
        const errText = await uploadText();
        throw new Error(`Storage upload failed: ${uploadRes.status} ${errText}`);
      }
    }

    async function loadGallery() {
      try {
        // List all files in the gallery folder
        const res = await fetch(
          `${SUPABASE_URL}/storage/v1/object/list/${STORAGE_BUCKET}?prefix=${GALLERY_FOLDER}&limit=100&sortBy=created_at&sortOrder=desc`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );

        if (!res.ok) {
          if (res.status === 404) {
            renderGallery([]);
            return;
          }
          throw new Error(`List failed: ${res.status}`);
        }

        const files = await res.json();
        renderGallery(files || []);
      } catch (err) {
        console.error('Failed to load gallery:', err);
      }
    }

    function renderGallery(files) {
      // Remove old gallery items
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

      // Remove placeholders
      placeholders.forEach(el => el.remove());

      // Add each image
      files.forEach((file) => {
        if (!file.name) return;

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${file.name}`;

        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-item-wrtrs';
        wrapper.style.cssText = 'position: relative; height: 200px; overflow: hidden; border-radius: 12px;';

        const img = document.createElement('img');
        img.src = publicUrl;
        img.alt = 'Wall of Fame art';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block;';
        img.loading = 'lazy';

        wrapper.appendChild(img);

        const uploadCard = document.getElementById('uploadCard');
        uploadCard.insertAdjacentElement('afterend', wrapper);
      });
    }
  });
})();
