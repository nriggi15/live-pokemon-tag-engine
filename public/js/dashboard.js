document.addEventListener('DOMContentLoaded', () => {
    console.log("🧠 dashboard.js is running ✅");

    // ✅ Load user info
        (async () => {
          try {
            const res = await fetch('/api/whoami');
            const data = await res.json();

            document.getElementById('username').textContent = data.username || 'Unknown';
            document.getElementById('userId').textContent = data.userId || 'Unknown';
            document.getElementById('role').textContent = data.role || 'N/A';

            const profileRes = await fetch(`/api/user-profile/${data.userId}`);
            const profile = await profileRes.json();

            document.getElementById('dashboardAvatar').src = profile.avatarUrl || '/images/default-avatar.png';
            document.getElementById('dashboardBio').textContent = profile.bio || 'This user has not written a bio yet.';

                // 🧠 Save initial values
            document.getElementById('editAvatarUrl').value = profile.avatarUrl || '';
            document.getElementById('editBio').value = profile.bio || '';

            const editBtn = document.getElementById('editProfileBtn');
            const controls = document.getElementById('profileEditFields');
            const saveBtn = document.getElementById('saveProfileBtn');
            const cancelBtn = document.getElementById('cancelProfileBtn');
            const successMsg = document.getElementById('saveProfileMsg');

            editBtn.addEventListener('click', () => {
              controls.classList.remove('hidden');
            });

            cancelBtn.addEventListener('click', () => {
              controls.classList.add('hidden');
              successMsg.classList.add('hidden');
              document.getElementById('editAvatarUrl').value = profile.avatarUrl || '';
              document.getElementById('editBio').value = profile.bio || '';
            });

            saveBtn.addEventListener('click', async () => {
              const newAvatar = document.getElementById('editAvatarUrl').value.trim();
              const newBio = document.getElementById('editBio').value.trim();

              try {
                const res = await fetch(`/api/user-profile/${data.userId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ avatarUrl: newAvatar, bio: newBio })
                });

                if (res.ok) {
                  // Update UI immediately
                  document.getElementById('dashboardAvatar').src = newAvatar;
                  document.getElementById('dashboardBio').textContent = newBio || 'This user has not written a bio yet.';
                  successMsg.classList.remove('hidden');
                  controls.classList.add('hidden');
                } else {
                  alert('❌ Failed to save profile.');
                }
              } catch (err) {
                console.error('❌ Error saving profile:', err);
                alert('Error saving profile.');
              }
            });


          } catch (err) {
            console.error('❌ Failed to load user info:', err);
            document.getElementById('username').textContent = 'Error';
            document.getElementById('userId').textContent = 'Error';
            document.getElementById('role').textContent = 'Error';
          }
        })();



      
    // ✅ Load tag submissions table
    const tableBody = document.querySelector('#user-submissions-table tbody');
    if (tableBody) {
      console.log("📄 Tag submission table found — loading data...");
      fetch('/api/user-submissions')
        .then(res => res.json())
        .then(submissions => {
          console.log("📄 Received submissions:", submissions);

                    // 🔢 Compute tag status counts
          const stats = {
            approved: 0,
            denied: 0,
            pending: 0,
            total: submissions.length
          };

          submissions.forEach(sub => {
            const status = sub.status?.toLowerCase();
            if (status === 'approved') stats.approved++;
            else if (status === 'denied') stats.denied++;
            else stats.pending++;
          });

          // 📊 Render progress stats
          const statsList = document.getElementById('statsList');
          statsList.innerHTML = `
            <li>✅ Approved: ${stats.approved}</li>
            <li>❌ Denied: ${stats.denied}</li>
            <li>⏳ Pending: ${stats.pending}</li>
            <li>🧮 Total: ${stats.total}</li>
          `;


          submissions.forEach(sub => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${sub.tag}</td>
              <td>${sub.cardId}</td>
              <td>${sub.status}</td>
              <td>${new Date(sub.createdAt).toLocaleDateString()}</td>
            `;
            tableBody.appendChild(row);
          });
        })
        .catch(err => {
          console.error('Failed to load tag submissions:', err);
        });
    } else {
      console.warn("🚫 Tag submission table not found");
    }
  });
  
  async function loadCollections() {
  const list = document.getElementById('collectionList');
  list.innerHTML = '<li>Loading...</li>';

  try {
    const res = await fetch('/api/collections/me');
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<li>No collections yet.</li>';
      return;
    }

    for (const col of data) {
      const li = document.createElement('li');
      li.innerHTML = `
        <a href="/collections/${col._id}" style="font-weight: bold; text-decoration: none; color: #2b7de9;">
          ${col.name}
        </a> (${col.visibility}) — ${col.cards.length} card${col.cards.length !== 1 ? 's' : ''}
        <button onclick="renameCollection('${col._id}', '${col.name}')">✏ Rename</button>
        <button onclick="toggleVisibility('${col._id}', '${col.visibility}')">🌐 Toggle</button>
        <button onclick="deleteCollection('${col._id}', '${col.name}')">🗑 Delete</button>
      `;


      // ✅ Then run the preview image logic below
      const previewContainer = document.createElement('div');
      previewContainer.style.display = 'flex';
      previewContainer.style.gap = '5px';
      previewContainer.style.marginTop = '0.5rem';

      const previewIds = col.cards.slice(0, 3); // limit to 3

      for (const cardId of previewIds) {
        try {
          const res = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
          const data = await res.json();

          const img = document.createElement('img');
          img.src = data.data?.images?.small || '';
          img.alt = data.data?.name || '';
          img.style.height = '85px';
          img.style.borderRadius = '4px';
          img.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';

          previewContainer.appendChild(img);
        } catch (err) {
          console.warn('❌ Failed to load preview image for card', cardId);
        }
      }

      li.appendChild(previewContainer);
      list.appendChild(li);
    }


  } catch (err) {
    console.error('❌ Failed to load collections:', err);
    list.innerHTML = '<li>Error loading collections.</li>';
  }
}

async function createCollection() {
  const name = prompt('Enter a name for your new collection:');
  if (!name) return;

  try {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || 'Failed to create collection.');

    loadCollections();
  } catch (err) {
    console.error('❌ Failed to create collection:', err);
    alert('Server error');
  }
}

function loadRecentSearches() {
  const list = document.getElementById('recentSearchesList');
  const key = 'recentSearches';
  const searches = JSON.parse(localStorage.getItem(key)) || [];

  if (!searches.length) {
    list.innerHTML = '<li>No recent searches.</li>';
    return;
  }

  list.innerHTML = '';
  searches.forEach(term => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = term;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (term.startsWith('#')) {
        searchCustomTags(term.slice(1));
      } else {
        searchCards(term);
      }
    });
    li.appendChild(link);
    list.appendChild(li);
  });
}


async function renameCollection(id, currentName) {
  const newName = prompt('Rename collection:', currentName);
  if (!newName || newName === currentName) return;

  try {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });

    if (!res.ok) return alert('Failed to rename.');
    loadCollections();
  } catch (err) {
    console.error('❌ Rename failed:', err);
    alert('Server error');
  }
}

async function toggleVisibility(id, current) {
  const newVisibility = current === 'public' ? 'private' : 'public';

  try {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: newVisibility })
    });

    if (!res.ok) return alert('Failed to toggle visibility.');
    loadCollections();
  } catch (err) {
    console.error('❌ Toggle failed:', err);
    alert('Server error');
  }
}

async function deleteCollection(id, name) {
  const confirmed = confirm(`Are you sure you want to delete "${name}"?\nThis action is irreversible.`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) return alert('Failed to delete collection.');
    loadCollections();
  } catch (err) {
    console.error('❌ Delete failed:', err);
    alert('Server error');
  }
}

async function loadFavoriteSearches() {
  const list = document.getElementById('favoriteSearchesList');
  list.innerHTML = '<li>Loading...</li>';

  try {
    const res = await fetch('/api/favorites');
    const favorites = await res.json();

    if (!favorites.length) {
      list.innerHTML = '<li>No favorite searches yet.</li>';
      return;
    }

    list.innerHTML = '';
    favorites.forEach(fav => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = fav.term;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (fav.type === 'tag') {
          searchCustomTags(fav.term.replace(/^#/, ''));
        } else {
          searchCards(fav.term);
        }
      });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '❌';
      removeBtn.style.marginLeft = '8px';
      removeBtn.style.fontSize = '0.8rem';
      removeBtn.addEventListener('click', async () => {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term: fav.term, type: fav.type })
        });
        loadFavoriteSearches();
      });

      li.appendChild(link);
      li.appendChild(removeBtn);
      list.appendChild(li);
    });
  } catch (err) {
    console.error('❌ Failed to load favorites:', err);
    list.innerHTML = '<li>Error loading favorites.</li>';
  }
}


document.getElementById('createCollectionBtn')?.addEventListener('click', createCollection);

// Load collections on page load
loadCollections();
loadRecentSearches();
loadFavoriteSearches();


