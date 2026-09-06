const API_BASE = '/api/artworks';
const VOTED_KEY = 'artGalleryVoted';

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
