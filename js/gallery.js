/**
 * WRITERS — Wall of Fame Gallery
 * Images stored in Supabase Storage (REST API, no SDK needed)
 *
 * Uses an index.json manifest instead of Supabase's broken list endpoint.
 * Falls back to the list endpoint if available (future-proofing).
 */

(function() {
  'use strict';

  const SUPABASE_URL = 'https://sfaaxdaldgyairpqwxls.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYWF4ZGFsZGd5YWlycHF3eGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjgyNTIsImV4cCI6MjA5OTc0NDI1Mn0.tWMzH_12ZY44MUd9Ju69D_JUfH6CamiVNvH20qiXWZs';

  const STORAGE_BUCKET = 'gallery';
  const GALLERY_FOLDER = 'wall-of-fame/';
  const MANIFEST_FILE = GALLERY_FOLDER + 'index.json';

  let galleryCache = null;

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.gallery-grid-community');
    if (!grid) return;

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

      uploadImage(file).then((filename) => {
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

      // 2. Update the manifest: fetch existing, add new entry, write back
      const manifest = await fetchManifest();
      manifest.unshift({
        name: filename,
        created_at: new Date().toISOString(),
      });

      const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const manifestRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${MANIFEST_FILE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: manifestBlob,
      });

      if (!manifestRes.ok) {
        console.warn('Manifest update warning:', manifestRes.status);
      }

      return filename;
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
      } catch (e) {
        // No manifest yet — first upload
      }
      return [];
    }

    async function loadGallery() {
      try {
        // Try loading the manifest
        let files = [];

        // Try manifest first (our workaround for broken list endpoint)
        const manifest = await fetchManifest();
        if (manifest.length > 0) {
          files = manifest;
        } else {
          // Fallback: try Supabase list endpoint (in case they fix it)
          files = await tryEndpoint();
        }

        renderGallery(files);
      } catch (err) {
        console.error('Failed to load gallery:', err);
      }
    }

    async function tryEndpoint() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/storage/v1/object/list/${STORAGE_BUCKET}?prefix=${GALLERY_FOLDER}&limit=100&sortBy=created_at&sortOrder=desc`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          // Filter out the manifest file from display
          return (data || []).filter(f => f.name && !f.name.endsWith('index.json'));
        }
      } catch (e) {
        // Endpoint unavailable
      }
      return [];
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
        const name = file.name;
        if (!name) return;

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${name}`;

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
