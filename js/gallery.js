/**
 * WRITERS — Gallery Upload
 * Local art submission (client-side preview only)
 */

document.addEventListener('DOMContentLoaded', () => {
  const uploadInput = document.getElementById('artUpload');
  const uploadCard = document.getElementById('uploadCard');

  if (!uploadInput || !uploadCard) return;

  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Replace the upload card with the uploaded image
      const img = document.createElement('img');
      img.src = event.target.result;
      img.alt = 'Your art';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:12px;';

      // Find first placeholder and replace it
      const placeholders = document.querySelectorAll('.gallery-placeholder');
      if (placeholders.length > 0) {
        const newCard = document.createElement('div');
        newCard.className = 'gallery-upload-card';
        newCard.style.cssText = 'border: none; height: 200px; overflow: hidden;';
        newCard.style.borderRadius = '12px';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = 'position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.7); border: none; color: #fff; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 0.7rem; z-index: 2; display: flex; align-items: center; justify-content: center;';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: relative;';
        wrapper.appendChild(img.cloneNode());
        wrapper.appendChild(closeBtn);

        newCard.appendChild(wrapper);

        closeBtn.addEventListener('click', () => {
          newCard.remove();
          // Recreate placeholder
          const ph = document.createElement('div');
          ph.className = 'gallery-placeholder';
          ph.innerHTML = '<span class="gallery-placeholder-icon">🎨</span><span>Submit your piece</span>';
          document.querySelector('.gallery-grid-community').appendChild(ph);
        });

        placeholders[0].replaceWith(newCard);
      }

      // Reset input
      uploadInput.value = '';
    };
    reader.readAsDataURL(file);
  });
});
