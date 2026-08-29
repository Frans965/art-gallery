const API_BASE = '/api/artworks';
const VOTED_KEY = 'artGalleryVoted';

// ===== Vote localStorage helpers =====
function getVotedIds() {
  try {
    return JSON.parse(localStorage.getItem(VOTED_KEY)) || [];
  } catch {
    return [];
  }
}

function hasVoted(id) {
  return getVotedIds().includes(id);
}

function markVoted(id) {
  const ids = getVotedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(VOTED_KEY, JSON.stringify(ids));
  }
}

// ===== API helpers =====
async function fetchArtworks(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.sort) query.set('sort', params.sort);

  const res = await fetch(`${API_BASE}?${query}`);
  if (!res.ok) throw new Error('Failed to load artworks');
  return res.json();
}

async function fetchArtwork(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Artwork not found');
  return res.json();
}

async function voteArtwork(id) {
  const res = await fetch(`${API_BASE}/${id}/vote`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Vote failed');
  return res.json();
}

async function deleteArtwork(id, passcode) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Delete failed');
  return data;
}

async function uploadArtwork(formData) {
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}

// ===== SVG icon =====
const heartIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

// ===== Gallery Page (index.html) =====
function initGallery() {
  const grid = document.getElementById('gallery-grid');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const sortSelect = document.getElementById('sort-select');

  if (!grid) return;

  let debounceTimer;

  async function loadGallery() {
    grid.innerHTML = `
      <div class="state-message">
        <div class="spinner"></div>
        <p>Loading artworks...</p>
      </div>`;

    try {
      const artworks = await fetchArtworks({
        search: searchInput.value.trim(),
        category: categoryFilter.value,
        sort: sortSelect.value,
      });

      if (artworks.length === 0) {
        grid.innerHTML = `
          <div class="state-message">
            <h3>No artworks found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>`;
        return;
      }

      grid.innerHTML = artworks
        .map(
          (art) => `
        <article class="art-card" data-id="${art._id}">
          <img class="art-card-image" src="${art.imageUrl}" alt="${art.title}" loading="lazy">
          <div class="art-card-body">
            <h3 class="art-card-title">${escapeHtml(art.title)}</h3>
            <div class="art-card-meta">
              <span>by ${escapeHtml(art.creatorName)}</span>
              <span class="vote-badge">${heartIcon} ${art.votes}</span>
            </div>
            <span class="art-card-category">${escapeHtml(art.category)}</span>
          </div>
        </article>`
        )
        .join('');

      grid.querySelectorAll('.art-card').forEach((card) => {
        card.addEventListener('click', () => {
          window.location.href = `detail.html?id=${card.dataset.id}`;
        });
      });
    } catch {
      grid.innerHTML = `
        <div class="state-message">
          <h3>Failed to load gallery</h3>
          <p>Please check your connection and try again.</p>
        </div>`;
    }
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadGallery, 300);
  });

  categoryFilter.addEventListener('change', loadGallery);
  sortSelect.addEventListener('change', loadGallery);

  loadGallery();
}

// ===== Detail Page (detail.html) =====
function initDetail() {
  const container = document.getElementById('detail-container');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    container.innerHTML = `<div class="state-message"><h3>No artwork selected</h3><p><a href="index.html">Back to gallery</a></p></div>`;
    return;
  }

  async function loadDetail() {
    container.innerHTML = `<div class="state-message"><div class="spinner"></div><p>Loading...</p></div>`;

    try {
      const art = await fetchArtwork(id);
      const voted = hasVoted(id);

      container.innerHTML = `
        <a href="index.html" class="back-link">&larr; Back to Gallery</a>
        <div class="detail-layout">
          <div class="detail-image-wrap">
            <img class="detail-image" src="${art.imageUrl}" alt="${escapeHtml(art.title)}">
          </div>
          <div class="detail-info">
            <h1>${escapeHtml(art.title)}</h1>
            <p class="detail-creator">by ${escapeHtml(art.creatorName)}</p>
            <span class="detail-category">${escapeHtml(art.category)}</span>
            <p class="detail-description">${escapeHtml(art.description || 'No description provided.')}</p>
            <div class="vote-section">
              <span class="vote-count">${heartIcon} <span id="vote-count">${art.votes}</span> votes</span>
              <button id="vote-btn" class="btn ${voted ? 'btn-voted' : 'btn-primary'}" ${voted ? 'disabled' : ''}>
                ${voted ? 'Already Voted' : 'Vote for this Artwork'}
              </button>
              <button id="delete-btn" class="btn btn-danger" type="button">Delete Artwork</button>
            </div>
          </div>
        </div>`;

      if (!voted) {
        document.getElementById('vote-btn').addEventListener('click', async () => {
          const btn = document.getElementById('vote-btn');
          btn.disabled = true;
          btn.textContent = 'Voting...';

          try {
            const updated = await voteArtwork(id);
            markVoted(id);
            document.getElementById('vote-count').textContent = updated.votes;
            btn.textContent = 'Already Voted';
            btn.className = 'btn btn-voted';
          } catch {
            btn.disabled = false;
            btn.textContent = 'Vote for this Artwork';
            alert('Failed to vote. Please try again.');
          }
        });
      }

      document.getElementById('delete-btn').addEventListener('click', async () => {
        const passcode = prompt('Enter passcode to delete this artwork:');
        if (passcode === null) return;

        const deleteBtn = document.getElementById('delete-btn');
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';

        try {
          await deleteArtwork(id, passcode);
          alert('Artwork deleted successfully.');
          window.location.href = 'index.html';
        } catch (err) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete Artwork';
          alert(err.message || 'Failed to delete artwork.');
        }
      });
    } catch {
      container.innerHTML = `
        <div class="state-message">
          <h3>Artwork not found</h3>
          <p><a href="index.html">Back to gallery</a></p>
        </div>`;
    }
  }

  loadDetail();
}

// ===== Upload Page (upload.html) =====
function initUpload() {
  const form = document.getElementById('upload-form');
  if (!form) return;

  const alertBox = document.getElementById('alert-box');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.innerHTML = '';

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    const formData = new FormData(form);

    try {
      const artwork = await uploadArtwork(formData);
      alertBox.innerHTML = `<div class="alert alert-success">"${escapeHtml(artwork.title)}" uploaded successfully!</div>`;
      form.reset();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload Artwork';
    }
  });
}

// ===== Utility =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Init on DOM ready =====
document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  initDetail();
  initUpload();
});
