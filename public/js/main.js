const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'painting', label: 'Painting' },
  { value: 'digital', label: 'Digital Art' },
  { value: 'photography', label: 'Photography' },
  { value: 'sculpture', label: 'Sculpture' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'mixed-media', label: 'Mixed Media' },
  { value: 'other', label: 'Other' },
];

const heartIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatCategory(value) {
  const match = CATEGORIES.find((c) => c.value === value);
  return match ? match.label : value;
}

function renderArtCard(art, options = {}) {
  const voted = hasVoted(art._id);
  const rank = options.rank ? `<span class="art-card-rank">#${options.rank}</span>` : '';
  const voteBtn = options.showVoteBtn
    ? `<button type="button" class="vote-btn ${voted ? 'voted' : ''}" data-id="${art._id}" aria-label="Vote for ${escapeHtml(art.title)}" ${voted ? 'disabled' : ''}>
         ${heartIcon}
         <span class="vote-btn-count">${art.votes}</span>
       </button>`
    : `<span class="vote-badge">${heartIcon} ${art.votes}</span>`;

  return `
    <article class="art-card" data-id="${art._id}">
      <div class="art-card-media">
        ${rank}
        <img class="art-card-image" src="${art.imageUrl}" alt="${escapeHtml(art.title)}" loading="lazy">
        <div class="art-card-overlay">
          <span class="art-card-category">${escapeHtml(formatCategory(art.category))}</span>
        </div>
      </div>
      <div class="art-card-body">
        <h3 class="art-card-title">${escapeHtml(art.title)}</h3>
        <div class="art-card-meta">
          <span class="art-card-creator">by ${escapeHtml(art.creatorName)}</span>
          ${voteBtn}
        </div>
      </div>
    </article>`;
}

function bindArtCardNavigation(grid) {
  grid.querySelectorAll('.art-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.vote-btn')) return;
      window.location.href = `detail.html?id=${card.dataset.id}`;
    });
  });
}

function bindCardVoteButtons(grid) {
  grid.querySelectorAll('.vote-btn:not(.voted)').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.classList.add('voting');

      try {
        const updated = await voteArtwork(id);
        markVoted(id);
        btn.classList.remove('voting');
        btn.classList.add('voted', 'vote-pulse');
        btn.querySelector('.vote-btn-count').textContent = updated.votes;
        setTimeout(() => btn.classList.remove('vote-pulse'), 600);
      } catch {
        btn.disabled = false;
        btn.classList.remove('voting');
      }
    });
  });
}

function initGalleryBrowse(options = {}) {
  const grid = document.getElementById('gallery-grid');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const sortSelect = document.getElementById('sort-select');
  const resultsCount = document.getElementById('results-count');
  const categoryPills = document.getElementById('category-pills');

  if (!grid) return;

  let debounceTimer;
  const fixedSort = options.fixedSort || null;

  function syncCategoryPills(value) {
    if (!categoryPills) return;
    categoryPills.querySelectorAll('.category-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.category === value);
    });
  }

  async function loadGallery() {
    grid.innerHTML = `
      <div class="state-message">
        <div class="spinner"></div>
        <p>Loading artworks...</p>
      </div>`;

    const category = categoryFilter?.value || 'all';
    const sort = fixedSort || sortSelect?.value || 'newest';

    try {
      const artworks = await fetchArtworks({
        search: searchInput?.value.trim() || '',
        category,
        sort,
      });

      if (resultsCount) {
        resultsCount.textContent = `${artworks.length} artwork${artworks.length === 1 ? '' : 's'}`;
      }

      if (artworks.length === 0) {
        grid.innerHTML = `
          <div class="state-message">
            <h3>No artworks found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>`;
        return;
      }

      grid.innerHTML = artworks
        .map((art, index) =>
          renderArtCard(art, {
            rank: options.showRank ? index + 1 : null,
            showVoteBtn: true,
          })
        )
        .join('');

      bindArtCardNavigation(grid);
      bindCardVoteButtons(grid);
    } catch {
      grid.innerHTML = `
        <div class="state-message">
          <h3>Failed to load gallery</h3>
          <p>Please check your connection and try again.</p>
        </div>`;
    }
  }

  if (categoryPills) {
    categoryPills.innerHTML = CATEGORIES.map(
      (cat) =>
        `<button type="button" class="category-pill${cat.value === 'all' ? ' active' : ''}" data-category="${cat.value}">${cat.label}</button>`
    ).join('');

    categoryPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.category-pill');
      if (!pill) return;
      if (categoryFilter) categoryFilter.value = pill.dataset.category;
      syncCategoryPills(pill.dataset.category);
      loadGallery();
    });
  }

  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadGallery, 300);
  });

  categoryFilter?.addEventListener('change', () => {
    syncCategoryPills(categoryFilter.value);
    loadGallery();
  });

  sortSelect?.addEventListener('change', loadGallery);

  loadGallery();
}

function initHome() {
  const featuredGrid = document.getElementById('featured-grid');
  if (!featuredGrid) return;

  async function loadFeatured() {
    featuredGrid.innerHTML = `<div class="state-message"><div class="spinner"></div></div>`;

    try {
      const artworks = await fetchArtworks({ sort: 'trending' });
      const featured = artworks.slice(0, 3);

      if (featured.length === 0) {
        featuredGrid.innerHTML = `<div class="state-message"><p>No artworks yet. Be the first to upload!</p></div>`;
        return;
      }

      featuredGrid.innerHTML = featured.map((art) => renderArtCard(art)).join('');
      bindArtCardNavigation(featuredGrid);
    } catch {
      featuredGrid.innerHTML = `<div class="state-message"><p>Unable to load featured works.</p></div>`;
    }
  }

  loadFeatured();
}

function initDetail() {
  const container = document.getElementById('detail-container');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    container.innerHTML = `<div class="state-message"><h3>No artwork selected</h3><p><a href="gallery.html">Back to gallery</a></p></div>`;
    return;
  }

  async function loadDetail() {
    container.innerHTML = `<div class="state-message"><div class="spinner"></div><p>Loading...</p></div>`;

    try {
      const art = await fetchArtwork(id);
      const voted = hasVoted(id);

      container.innerHTML = `
        <a href="gallery.html" class="back-link">&larr; Back to Gallery</a>
        <div class="detail-layout">
          <div class="detail-image-wrap">
            <img class="detail-image" src="${art.imageUrl}" alt="${escapeHtml(art.title)}">
          </div>
          <div class="detail-info">
            <span class="detail-category">${escapeHtml(formatCategory(art.category))}</span>
            <h1>${escapeHtml(art.title)}</h1>
            <p class="detail-creator">by ${escapeHtml(art.creatorName)}</p>
            <p class="detail-description">${escapeHtml(art.description || 'No description provided.')}</p>
            <div class="vote-section">
              <button id="vote-btn" class="btn btn-primary vote-action ${voted ? 'btn-voted voted' : ''}" ${voted ? 'disabled' : ''}>
                ${heartIcon}
                <span id="vote-count">${art.votes}</span>
                <span class="vote-label">${voted ? 'Voted' : 'Vote'}</span>
              </button>
              <button id="delete-btn" class="btn btn-danger" type="button">Delete Artwork</button>
            </div>
          </div>
        </div>`;

      if (!voted) {
        document.getElementById('vote-btn').addEventListener('click', async () => {
          const btn = document.getElementById('vote-btn');
          btn.disabled = true;
          btn.classList.add('voting');

          try {
            const updated = await voteArtwork(id);
            markVoted(id);
            document.getElementById('vote-count').textContent = updated.votes;
            btn.classList.remove('voting');
            btn.classList.add('btn-voted', 'voted', 'vote-pulse');
            btn.querySelector('.vote-label').textContent = 'Voted';
            setTimeout(() => btn.classList.remove('vote-pulse'), 600);
          } catch {
            btn.disabled = false;
            btn.classList.remove('voting');
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
          window.location.href = 'gallery.html';
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
          <p><a href="gallery.html">Back to gallery</a></p>
        </div>`;
    }
  }

  loadDetail();
}

function initUpload() {
  const form = document.getElementById('upload-form');
  if (!form) return;

  const alertBox = document.getElementById('alert-box');
  const imageInput = document.getElementById('image');
  const previewWrap = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const removePreviewBtn = document.getElementById('remove-preview');
  let previewUrl = null;

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    if (previewImg) previewImg.src = '';
    if (previewWrap) previewWrap.hidden = true;
    if (previewPlaceholder) previewPlaceholder.hidden = false;
    if (imageInput) imageInput.value = '';
  }

  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) {
      clearPreview();
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    previewImg.src = previewUrl;
    previewWrap.hidden = false;
    previewPlaceholder.hidden = true;
  });

  previewPlaceholder?.addEventListener('click', () => imageInput?.click());

  removePreviewBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    clearPreview();
  });

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
      clearPreview();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload Artwork';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  switch (page) {
    case 'home':
      initHome();
      break;
    case 'gallery':
      initGalleryBrowse();
      break;
    case 'top':
      initGalleryBrowse({ fixedSort: 'trending', showRank: true });
      break;
    case 'detail':
      initDetail();
      break;
    case 'upload':
      initUpload();
      break;
    default:
      break;
  }
});
