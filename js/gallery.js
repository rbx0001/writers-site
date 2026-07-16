/**
 * WRITERS — Wall of Fame Gallery
 * Client-side upload with localStorage persistence
 */

const GALLERY_KEY = 'writers_wall_of_fame';

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('artUpload');
  const uploadCard = document.getElementById('uploadCard');
  const grid = document.querySelector('.gallery-grid-community');

  if (!uploadInput || !uploadCard || !grid) return;

  // Load saved images on page load
  loadGallery();

  // Upload handler
  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      saveImage(dataUrl);
      addImageToGrid(dataUrl);
      uploadInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  function saveImage(dataUrl) {
    const saved = getSavedImages();
    saved.unshift(dataUrl);
    // Keep max 50 images to avoid localStorage quota issues
    if (saved.length > 50) saved.pop();
    localStorage.setItem(GALLERY_KEY, JSON.stringify(saved));
  }

  function getSavedImages() {
    try {
      const raw = localStorage.getItem(GALLERY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addImageToGrid(dataUrl) {
    // Remove all placeholders first
    document.querySelectorAll('.gallery-placeholder').forEach(el => el.remove());

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; height: 200px; overflow: hidden;';
    wrapper.style.borderRadius = '12px';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Wall of Fame art';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.7); border: none; color: #fff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 0.7rem; z-index: 2; display: flex; align-items: center; justify-content: center; line-height: 1;';
    closeBtn.title = 'Remove';

    wrapper.appendChild(img);
    wrapper.appendChild(closeBtn);

    closeBtn.addEventListener('click', () => {
      wrapper.remove();
      removeImageFromStorage(dataUrl);
      // If no images left, show placeholders
      if (getSavedImages().length === 0) {
        addPlaceholders();
      }
    });

    // Insert after the upload card
    uploadCard.insertAdjacentElement('afterend', wrapper);
  }

  function removeImageFromStorage(dataUrl) {
    const saved = getSavedImages().filter(s => s !== dataUrl);
    localStorage.setItem(GALLERY_KEY, JSON.stringify(saved));
  }

  function addPlaceholders() {
    const placeholderTexts = [
      'First submission goes here',
      'First submission goes here',
      'First submission goes here',
      'First submission goes here',
      'First submission goes here',
    ];
    placeholderTexts.forEach(text => {
      const ph = document.createElement('div');
      ph.className = 'gallery-placeholder';
      ph.innerHTML = `<span class="gallery-placeholder-icon">🎨</span><span>${text}</span>`;
      grid.appendChild(ph);
    });
  }

  function loadGallery() {
    const saved = getSavedImages();
    if (saved.length === 0) return;

    // Remove placeholders
    document.querySelectorAll('.gallery-placeholder').forEach(el => el.remove());

    // Add each saved image
    saved.forEach(dataUrl => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: relative; height: 200px; overflow: hidden;';
      wrapper.style.borderRadius = '12px';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'Wall of Fame art';
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block;';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.7); border: none; color: #fff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 0.7rem; z-index: 2; display: flex; align-items: center; justify-content: center; line-height: 1;';
      closeBtn.title = 'Remove';

      wrapper.appendChild(img);
      wrapper.appendChild(closeBtn);

      closeBtn.addEventListener('click', () => {
        wrapper.remove();
        removeImageFromStorage(dataUrl);
        if (getSavedImages().length === 0) {
          addPlaceholders();
        }
      });

      uploadCard.insertAdjacentElement('afterend', wrapper);
    });
  }
});
