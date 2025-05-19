document.addEventListener('DOMContentLoaded', () => {
  // 👇 ALL OF THIS SHOULD BE INSIDE HERE:
  const sidebar = document.getElementById('sidebar');
  const minimizeBtn = document.getElementById('minimizeSidebarBtn');
  const reopenBtn = document.getElementById('reopenSidebarBtn');
  const darkModeBtn = document.getElementById('toggleDarkModeBtn');
  const backToTopBtn = document.getElementById('backToTopBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const tagSearchInput = document.getElementById('tagSearchInput');
  const viewSetsBtn = document.getElementById('viewSetsBtn');
  const setsPopup = document.getElementById('setsPopup');
  const closeSetsPopup = document.getElementById('closeSetsPopup');
  const setsList = document.getElementById('setsList');

  const tagStatsLink = document.getElementById('openTagStats');
  const tagStatsPopup = document.getElementById('tagStatsPopup');
  const tagStatsList = document.getElementById('tagStatsList');
  const closeStatsBtn = tagStatsPopup?.querySelector('.close-button');


  // ✅ Auto-hide sidebar on page load if on mobile
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    const reopenBtn = document.getElementById('reopenSidebarBtn');
    if (sidebar && reopenBtn) {
      sidebar.classList.add('hidden');
      reopenBtn.classList.remove('hidden');
    }
  }


  if (minimizeBtn && sidebar && reopenBtn) {
    minimizeBtn.addEventListener('click', () => {
      sidebar.classList.add('hidden');
      reopenBtn.classList.remove('hidden');
    });

    reopenBtn.addEventListener('click', () => {
      sidebar.classList.remove('hidden');
      reopenBtn.classList.add('hidden');
    });
  }

  if (darkModeBtn) {
    darkModeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
    });
  }

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/logout');
        window.location.href = '/login';
      } catch (err) {
        console.error('Logout failed:', err);
      }
    });
  }
  
  if (tagStatsLink && tagStatsPopup && tagStatsList) {
    tagStatsLink.addEventListener('click', async () => {
      console.log('📊 Tag stats button clicked');
      tagStatsList.innerHTML = '<li>Loading...</li>';
      tagStatsPopup.classList.remove('hidden');
  
      try {
        const res = await fetch('/api/tag-stats');
        const stats = await res.json();
  
        tagStatsList.innerHTML = '';
        if (stats.length === 0) {
          tagStatsList.innerHTML = '<li>No tags found yet.</li>';
        } else {
          stats.forEach(entry => {
            const li = document.createElement('li');
  
            const tagLink = document.createElement('a');
            tagLink.href = '#';
            tagLink.textContent = entry.tag;
            tagLink.addEventListener('click', (e) => {
              e.preventDefault();
              searchInput.value = entry.tag;
              searchCustomTags(entry.tag);
              tagStatsPopup.classList.add('hidden');
            });
  
            const countText = document.createTextNode(` – ${entry.count} card${entry.count > 1 ? 's' : ''}`);
            li.appendChild(tagLink);
            li.appendChild(countText);
            tagStatsList.appendChild(li);
          });
        }
  
      } catch (err) {
        console.error('Error fetching tag stats:', err);
        tagStatsList.innerHTML = '<li>Error loading tag stats.</li>';
      }
    });
  
    tagStatsPopup.addEventListener('click', (e) => {
      if (e.target === tagStatsPopup) {
        tagStatsPopup.classList.add('hidden');
      }
    });
  
    closeStatsBtn?.addEventListener('click', () => {
      tagStatsPopup.classList.add('hidden');
    });
  }
  
  fetch('/api/whoami')
  .then(res => res.json())
  .then(data => {
    const { userId, role } = data;

    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logout-btn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const adminLink = document.getElementById('adminLink');
    const modLink = document.getElementById('modLink');

    if (userId) {
      registerBtn?.classList.add('hidden');
      loginBtn?.classList.add('hidden');
      logoutBtn?.classList.remove('hidden');
      dashboardBtn?.classList.remove('hidden');

      if (role === 'admin') {
        adminLink?.classList.remove('hidden');
        modLink?.classList.remove('hidden');
      } else if (role === 'moderator') {
        modLink?.classList.remove('hidden');
      }

    } else {
      registerBtn?.classList.remove('hidden');
      loginBtn?.classList.remove('hidden');
      logoutBtn?.classList.add('hidden');
      dashboardBtn?.classList.add('hidden');
      adminLink?.classList.add('hidden');
      modLink?.classList.add('hidden');
    }
  })
  .catch(err => {
    console.error('Failed to fetch user role:', err);
  });

  if (viewSetsBtn && setsPopup && closeSetsPopup && setsList) {
    viewSetsBtn.addEventListener('click', async () => {
      console.log('🟢 Sets button clicked');
      setsList.innerHTML = '<li>Loading...</li>';
      setsPopup.classList.remove('hidden');
    
      try {
        const response = await fetch('https://api.pokemontcg.io/v2/sets');
        const data = await response.json();
    
        setsList.innerHTML = ''; // Clear loading text
    
        data.data.forEach(set => {
          const li = document.createElement('li');
          li.classList.add('set-entry');
          li.innerHTML = `
            <h3>${set.name}</h3>
            <p><strong>Series:</strong> ${set.series}</p>
            <p><strong>Set ID:</strong> ${set.id}</p>
            <p><strong>Release Date:</strong> ${set.releaseDate || 'Unknown'}</p>
            <p><strong>Cards:</strong> ${set.printedTotal || '?'} printed / ${set.total} total</p>
            ${set.ptcgoCode ? `<p><strong>PTCGO Code:</strong> ${set.ptcgoCode}</p>` : ''}
            <img src="${set.images.logo}" alt="${set.name} logo"
              class="set-logo"
              data-set-id="${set.id}"
              title="Click to view cards from this set" />
            <hr />
          `;
          setsList.appendChild(li);
        });
    
        // ✅ Bind listeners AFTER the DOM has all logos
        document.querySelectorAll('.set-logo').forEach(img => {
          img.addEventListener('click', () => {
            const setId = img.dataset.setId;
            if (setId) {
              searchInput.value = setId;
              searchCards(`set.id:${setId}`);
              setsPopup.classList.add('hidden');
            }
          });
        });
    
      } catch (error) {
        console.error('Error fetching sets:', error);
        setsList.innerHTML = '<li>Error loading sets</li>';
      }
    });
    
    closeSetsPopup.addEventListener('click', () => {
      setsPopup.classList.add('hidden');
    });
    
    setsPopup.addEventListener('click', (e) => {
      if (e.target === setsPopup) {
        setsPopup.classList.add('hidden');
      }
    });    
  }

  // First load Popup on index
  const popup = document.getElementById("introPopup");
  const closeBtn = document.getElementById("closeIntroPopup");
  const checkbox = document.getElementById("dontShowAgainCheckbox");

  // Show popup if not disabled
  if (!localStorage.getItem("cardverse_intro_hidden")) {
    popup.classList.remove("hidden");
  }

  closeBtn?.addEventListener("click", () => {
    popup.classList.add("hidden");

    if (checkbox.checked) {
      localStorage.setItem("cardverse_intro_hidden", "true");
    }
  });


  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.popup').forEach(popup => {
        if (!popup.classList.contains('hidden')) {
          popup.classList.add('hidden');
        }
      });
    }
  });
  
  const surpriseBtn = document.getElementById('surpriseBtn');

  if (surpriseBtn) {
    surpriseBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/tag-stats');
        const tags = await res.json();
  
        if (!Array.isArray(tags) || tags.length === 0) {
          alert("No tags available for surprise search.");
          return;
        }
  
        const random = tags[Math.floor(Math.random() * tags.length)];
        const tag = random.tag;
        searchInput.value = tag;
        tagSearchInput.value = tag; // ✅ populate the correct search box
        searchCustomTags(tag);
      } catch (err) {
        console.error('Surprise search failed:', err);
        alert("Surprise search failed. Try again later.");
      }
    });
  }
  loadRecentCards();
  const toggleBtn = document.getElementById('toggleDropdownBtn');
  const dropdown = document.getElementById('dropdownContent');

  if (toggleBtn && dropdown) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent immediate close on toggle
      dropdown.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== toggleBtn) {
        dropdown.classList.remove('open');
      }
    });
  }

      fetch('/api/whoami')
        .then(res => res.json())
        .then(data => {
          const role = data.role;
  
          const dashboardBtn = document.getElementById('dashboardBtn');
          const logoutBtn = document.getElementById('logoutBtn');
          const adminLink = document.getElementById('adminLink');
          const modLink = document.getElementById('modLink');
          const registerBtn = document.getElementById('registerBtn');
          const loginBtn = document.getElementById('loginBtn');
  
          if (data.userId) {
            dashboardBtn?.classList.remove('hidden');
            logoutBtn?.classList.remove('hidden');
  
            if (role === 'admin') {
              adminLink?.classList.remove('hidden');
              modLink?.classList.remove('hidden');
            } else if (role === 'moderator') {
              modLink?.classList.remove('hidden');
            }
  
            registerBtn?.classList.add('hidden');
            loginBtn?.classList.add('hidden');

            const myProfileBtn = document.getElementById('myProfileBtn');
            if (myProfileBtn) {
              fetch(`/api/user-profile/${data.userId}`)
                .then(res => res.json())
                .then(profile => {
                  if (profile?.username) {
                    myProfileBtn.href = `/user/${profile.username}`;
                    myProfileBtn.classList.remove('hidden');
                  }
                })
                .catch(() => {
                  myProfileBtn.style.display = 'none';
                });
            }

          }
          else {
            registerBtn?.classList.remove('hidden');
            loginBtn?.classList.remove('hidden');
          }
        })
        .catch(err => {
          console.error('Could not determine user role:', err);
          document.getElementById('registerBtn')?.classList.remove('hidden');
          document.getElementById('loginBtn')?.classList.remove('hidden');
        });
  
      // Safe logout binding
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await fetch('/api/logout');
            location.href = '/login';
          } catch (err) {
            console.error('Logout failed:', err);
          }
        });
      }



      const capturedLogs = [];
    ['log', 'error', 'warn'].forEach(method => {
      const original = console[method];
      console[method] = (...args) => {
        capturedLogs.push(`[${method.toUpperCase()}] ${args.join(' ')}`);
        original.apply(console, args);
      };
    });

    document.getElementById('reportBugBtn').addEventListener('click', () => {
      document.getElementById('bugFormModal').style.display = 'block';
    });

    document.getElementById('submitBug').addEventListener('click', async () => {
      const message = document.getElementById('bugMessage').value;
      const payload = {
        message,
        logs: capturedLogs.slice(-50),
        browserInfo: navigator.userAgent,
        url: window.location.href
      };


      const res = await fetch('/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        document.getElementById('bugSuccessMsg').style.display = 'block';
        setTimeout(() => {
          document.getElementById('bugFormModal').style.display = 'none';
          document.getElementById('bugSuccessMsg').style.display = 'none';
          document.getElementById('bugMessage').value = '';
        }, 2500);
      } else {
        alert('❌ Something went wrong. Please try again later.');
      }
    });


// END DOMCONTENT LOADER
//
//
//

});

  const typeColors = {
  Fire: '#e57373',
  Water: '#2f78ed',
  Lightning: '#fbc02d',
  Grass: '#46a34a',
  Psychic: '#ba68c8',
  Fighting: '#f44336',
  Darkness: '#212121',
  Metal: '#5f6f78',
  Dragon: '#ff9800',
  Fairy: '#f48fb1',
  Colorless: '##9ea2a3',
  Normal: '#9ba1a3',
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function storeRecentlyViewedCard(card) {
  const key = 'recentlyViewedCards';
  let history = JSON.parse(localStorage.getItem(key)) || [];

  // Prevent duplicates by card.id
  history = history.filter(c => c.id !== card.id);
  history.unshift({
    id: card.id,
    name: card.name,
    image: card.images.small
  });

  if (history.length > 5) history = history.slice(0, 5);
  localStorage.setItem(key, JSON.stringify(history));
}


  function getMarketPrice(card) {
  if (!card.tcgplayer || !card.tcgplayer.prices) return 'Not available';

  const prices = card.tcgplayer.prices;
  const lines = [];
  const link = card.tcgplayer.url;

  for (const variant in prices) {
    if (prices[variant].market) {
      const price = prices[variant].market.toFixed(2);
      lines.push(`${capitalize(variant)}: <a href="${link}" target="_blank" rel="noopener">$${price}</a>`);
    }
  }

  return lines.length ? lines.join('<br>') : 'Not available';
}

function storeRecentSearch(term) {
  if (!term || typeof term !== 'string') return;

  const key = 'recentSearches';
  let history = JSON.parse(localStorage.getItem(key)) || [];

  // Prevent duplicates
  history = history.filter(item => item !== term);
  history.unshift(term); // Add to top

  if (history.length > 5) history = history.slice(0, 5);
  localStorage.setItem(key, JSON.stringify(history));
}

function loadRecentCards() {
  const container = document.getElementById('recentCardsList');
  if (!container) return; // 🔒 skip if not on this page
  const key = 'recentlyViewedCards';
  const cards = JSON.parse(localStorage.getItem(key)) || [];

  container.innerHTML = '';

  if (!cards.length) {
    container.innerHTML = '<p style="font-size: 0.85rem; color: #888;">None yet</p>';
    return;
  }

  cards.forEach(card => {
    const div = document.createElement('div');
    div.textContent = card.name;
    div.classList.add('recent-card-name');
    div.style.cursor = 'pointer';
    div.style.marginBottom = '0.25rem';
    div.style.fontSize = '0.9rem';
    
    div.addEventListener('click', async () => {
      try {
        const res = await fetch(`https://api.pokemontcg.io/v2/cards/${card.id}`);
        const data = await res.json();
        openCardPopup(data.data, { mode: 'view' });
      } catch (err) {
        console.error('❌ Failed to reload card:', err);
      }
    });

    container.appendChild(div);
  });
}


async function renderFavoriteButton(term, type) {
  const container = document.getElementById('favoriteSearchControls');
  container.innerHTML = ''; // Clear old content

  let isLoggedIn = false;

  try {
    const res = await fetch('/api/whoami');
    const session = await res.json();
    isLoggedIn = !!session?.userId;
  } catch (err) {
    console.warn('Failed to check login status:', err);
  }

  if (!isLoggedIn) {
    const message = document.createElement('p');
    message.textContent = '🔐 Log in to save your favorite searches!';
    message.style.color = '#555';
    container.appendChild(message);
    return;
  }

  // If logged in, show the button
  const btn = document.createElement('button');
  btn.textContent = `⭐ Save "${term}" to favorites`;
  btn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, type })
      });

      const data = await res.json();
      if (res.ok) {
        btn.textContent = '✅ Saved to favorites!';
        btn.disabled = true;
      } else {
        alert(data.message || 'Could not save.');
      }
    } catch (err) {
      console.error('❌ Failed to save favorite:', err);
      alert('Error saving favorite.');
    }
  });

  container.appendChild(btn);
}



async function searchCards(query, page = 1) {
  storeRecentSearch(query.trim());
  // ✅ Clean logging: log multiple terms if needed
  const input = query.trim().toLowerCase();
  const parts = input.split(/\s+and\s+/).map(part => part.trim());

  for (const part of parts) {
    const cleaned = part.startsWith('#') ? part.slice(1) : part;
    if (cleaned) {
      try {
        await fetch('/api/log-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term: cleaned })
        });
      } catch (err) {
        console.error('Failed to log search term:', cleaned, err);
      }
    }
  }


  resetSearchState();
  tagSearchInput.value = '';
  searchMode = 'pokemon';
  currentQuery = query;
  currentPage = page;
  resultsCount.textContent = 'Loading...';
  renderFavoriteButton(query.trim(), 'text');
  resultsCount.classList.remove('hidden');
  const url = `https://api.pokemontcg.io/v2/cards?q=${buildQuery(query)}&page=${page}&pageSize=250`;
  try {
    const res = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });

    if (!res.ok) {
      const errText = await res.text(); // helpful for debugging
      console.error(`❌ Error from Pokémon API (status ${res.status}):`, errText);
      cardResults.innerHTML = `<p>Error fetching cards (status ${res.status}).</p>`;
      return;
    }

    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      console.error('❌ Failed to parse JSON:', err);
      cardResults.innerHTML = '<p>Invalid response from card API.</p>';
      return;
    }

    showCards(data.data, false);
    toggleLoadMoreButton(data.totalCount > page * 250);
    document.getElementById('backToTopBtn').classList.remove('hidden');

  } catch (err) {
    console.error('Error fetching cards:', err);
    cardResults.innerHTML = '<p>Error loading cards.</p>';
  }
}

async function searchCustomTags(tag) {
  storeRecentSearch(`#${tag.trim().toLowerCase()}`);
  resetSearchState();
  searchInput.value = '';
  searchMode = 'custom';
  document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
  const isTaggingCenter = window.location.pathname.includes('/tagging-center');
  const cardResults = isTaggingCenter
  ? document.getElementById('cardContainerView')
  : document.getElementById('cardResults');

  cardResults.innerHTML = '';
  resultsCount.textContent = 'Loading...';
  renderFavoriteButton(`#${tag.trim()}`, 'tag');

  resultsCount.classList.remove('hidden');
  
  let cardsLoaded = 0;

  try {    
  const modeInputs = document.getElementsByName('queryMode');
  const queryMode = [...modeInputs].find(r => r.checked)?.value?.toUpperCase() || 'AND';

  const inputParts = tag.toLowerCase().split(/\s+(?:and|or)\s+/).map(t => t.trim()).filter(Boolean);


      let rarityFilter = null;
      const rarityMap = {
        '#ir': 'Illustration Rare',
        '#sir': 'Special Illustration Rare',
        '#ur': 'Ultra Rare'
      };

      const realTags = [];
      const fallbackTerms = [];

      inputParts.forEach(t => {
        if (rarityMap[t]) {
          rarityFilter = rarityMap[t];
        } else if (approvedTagsSet.has(t.trim().toLowerCase())) {
          realTags.push(t);
        } else {
          fallbackTerms.push(t);
        }
      });

      console.log('🧪 Input Parts:', inputParts);
      console.log('✅ Approved Tags Set:', [...approvedTagsSet]);
      inputParts.forEach(part => {
        console.log(`Is "${part}" a valid tag?`, approvedTagsSet.has(part));
      });

      if (realTags.length === 0) {
        cardResults.innerHTML = `<p>None of the provided tags are recognized. Try using valid custom tags.</p>`;
        document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
        return;
      }

      const tagQueryParam = realTags.join(',');
/*       const res = await fetch(`/search?tags=${encodeURIComponent(tagQueryParam)}&mode=${queryMode}`);
    const ids = await res.json(); */


    const res = await fetch(`/api/search?tags=${encodeURIComponent(tagQueryParam)}&mode=${queryMode}`);

    const text = await res.text();
    console.log('🔎 Raw /search response:', text);

    let ids;
    try {
      ids = JSON.parse(text);
    } catch (err) {
      console.error('❌ Failed to parse /search response as JSON:', err);
      cardResults.innerHTML = '<p>Server returned invalid data format.</p>';
      return;
    }





    if (ids.length === 0) {
      cardResults.innerHTML = `<p>No cards found for tag: ${tag}</p>`;
      document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
      return;
    }
    cardResults.innerHTML = ''; // clear old results
    document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present

    const batchSize = 10;
    const cardData = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const query = batchIds.map(id => `id:${id}`).join(' OR ');

      try {
        const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}`, {
          headers: { 'X-Api-Key': API_KEY }
        });
        const data = await res.json();
        if (data.data?.length) {
          cardData.push(...data.data);
        }
      } catch (err) {
        console.error(`Failed to fetch batch [${batchIds.join(', ')}]`, err);
      }
    }


      console.log('📦 Card data:', cardData.map(c => `${c.name} → ${c.rarity}`));

      // If fallback terms exist, filter by name match
      let filteredCards = cardData;
      if (fallbackTerms.length > 0) {
        filteredCards = cardData.filter(card =>
          fallbackTerms.every(term =>
            card.name.toLowerCase().includes(term)
          )
        );
      }

      if (rarityFilter) {
        filteredCards = filteredCards.filter(card =>
          card.rarity?.toLowerCase() === rarityFilter.toLowerCase()
        );
      }


      if (filteredCards.length === 0) {
        cardResults.innerHTML = `<p>No cards matched both the tags and fallback keywords.</p>`;
        document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
        return;
      }

      if (isTaggingCenter) {
        cardResults.innerHTML = '';
        let lazyIndex = 0;
        const lazyBatchSize = 10;

        function renderLazyCards() {
          const nextBatch = filteredCards.slice(lazyIndex, lazyIndex + lazyBatchSize);

          nextBatch.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-preview';
            cardDiv.innerHTML = `
              <img src="${card.images.small}" alt="${card.name}" />
              <p>${card.name}</p>
            `;
            cardDiv.addEventListener('click', () => {
              openCardDetail({
                id: card.id,
                name: card.name,
                image: card.images.large || card.images.small
              });
            });
            cardResults.appendChild(cardDiv);
          });

          lazyIndex += lazyBatchSize;
        }

        // Initial load
        renderLazyCards();

        // Infinite Scroll Trigger
        window.addEventListener('scroll', () => {
          if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
            if (lazyIndex < filteredCards.length) {
              renderLazyCards();
            }
          }
        });

      } else {
        showCards(filteredCards, false);
        updateResultsCount(filteredCards.length, false);
        document.getElementById('backToTopBtn')?.classList.remove('hidden');
      }


      document.getElementById('backToTopBtn').classList.remove('hidden');


    document.getElementById('backToTopBtn').classList.remove('hidden');
  } catch (err) {
    console.error('Custom tag search failed:', err);
    cardResults.innerHTML = '<p>Error searching tags.</p>';
    document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
  }
}


//
//
//
//
// openCardPopup goes last, stay above
//
//

async function openCardPopup(card, { mode = 'edit' } = {}) {
  
  trackEvent('card_popup_open', {
    cardId: card.id,
    name: card.name,
    set: card.set?.name || 'unknown',
    rarity: card.rarity || 'unknown'
  });


  storeRecentlyViewedCard(card);

  // 🔁 Remove any existing popup before creating a new one
  const existingPopup = document.querySelector('.popup');
  if (existingPopup) {
    existingPopup.remove();
    document.body.classList.remove('popup-open');
    // Wait briefly to prevent stacked DOM mutations
    await new Promise(r => setTimeout(r, 10));
  }


  
  let cardNumDisplay = 'Unknown';
  let isSecretRare = false;

  if (card.number?.includes('/')) {
    // Use as-is if already formatted (e.g., "239/191")
    cardNumDisplay = card.number;
    const [num, total] = card.number.split('/').map(n => parseInt(n));
    if (!isNaN(num) && !isNaN(total) && num > total) {
      isSecretRare = true;
    }
  } else if (card.number && card.set?.printedTotal) {
    const num = parseInt(card.number);
    const total = card.set.printedTotal;
    cardNumDisplay = `${card.number}/${total}`;
    if (num > total) {
      isSecretRare = true;
    }
  } else if (card.number && card.set?.total) {
    const num = parseInt(card.number);
    const total = card.set.total;
    cardNumDisplay = `${card.number}/${total}`;
    if (num > total) {
      isSecretRare = true;
    }
  }


  document.body.classList.add('popup-open');
  const popup = document.createElement('div');
  popup.className = 'popup'; // ✅ ensures styling is applied



  popup.innerHTML = `
    <div class="popup-content">
      <span class="close-button">&times;</span>
      <br>

      <div style="display: flex; justify-content: center; position: relative;">
        <div style="position: relative; display: inline-block;">
          <img src="${card.images.large}" alt="${card.name}" />
          <button id="shareCardBtn"
            title="Share this card"
            style="position: absolute; bottom: -22px; right: 0; font-size: 0.85rem; padding: 6px 10px; background-color: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
            🔗 Share
          </button>
        </div>
      </div>



        <div style="position: relative;">
          <h2 style="text-align: center; margin-bottom: 0;"><a href="#" class="name-link">${card.name}</a></h2>
          <p style="text-align: center; margin-top: 0;"><strong>Set:</strong> <a href="#" class="set-link">${card.set.name}</a></p>
        </div>

      <p><strong>Card Number:</strong> <span class="${isSecretRare ? 'secret-rare' : ''}">${cardNumDisplay}</span></p>
      <p><strong>Rarity:</strong> ${card.rarity || 'Unknown'}</p>
      <p><strong>Artist:</strong> <a href="#" class="artist-link">${card.artist}</a></p>
      
      <p>
        <strong class="price-label" title="Prices from TCGplayer’s Market data">Market Price:</strong><br>
        <span>${getMarketPrice(card)}</span><br><br>
      </p>

      <div style="margin-top: 1rem;">
        <strong>🛒 Shop:</strong>
        <a id="ebayAffiliateLink" href="#" target="_blank" style="margin-left: 0.5rem;">Search on eBay</a>
        <span style="margin: 0 6px;">|</span>
        <a href="#" target="_blank" style="opacity: 0.6; pointer-events: none; cursor: default;">Find on TCGPlayer</a>
      </div>


      
      <div class="tags-container">
        <h3>Tags:</h3>
        <ul id="card-tags-list"></ul>
        ${mode === 'edit' ? `
          <input type="text" id="tag-input" list="tagSuggestions" placeholder="Enter a tag" />
          <datalist id="tagSuggestions"></datalist>
          <button id="add-tag-button">Add Tag</button>
          <div id="tag-message"></div>
        ` : ''}
      </div>

      <div class="collection-container" style="margin-top: 1.5rem;">
        <h3>➕ Add to Collection</h3>
        <select id="collectionDropdown" style="width: 100%; padding: 8px;">
          <option>Loading...</option>
        </select>
        <button id="addToCollectionBtn" style="margin-top: 0.5rem;">Add</button>
        <div id="collectionAddMsg" style="margin-top: 0.5rem; color: green;"></div>
      </div>


    </div>
  `;

    const isLocal = location.hostname.includes('localhost') || location.hostname.includes('127.0.0.1');

    const baseQuery = `${card.name} ${card.set.name}`;
    const encodedQuery = encodeURIComponent(`https://www.ebay.com/sch/i.html?_nkw=${card.name} ${card.set.name}`);
    const ebayAffiliate = `https://rover.ebay.com/rover/1/5339111116-0-0?mpre=${encodedQuery}`;


    const finalLink = isLocal ? utmSearchUrl : ebayAffiliate;
    popup.querySelector('#ebayAffiliateLink').href = finalLink;

    popup.querySelector('#ebayAffiliateLink').addEventListener('click', () => {
      trackEvent('shop_click', {
        shop: 'ebay',
        card_id: card.id,
        source: 'popup'
      });
    });



  const shareBtn = popup.querySelector('#shareCardBtn');

    if (shareBtn) {
      const shareUrl = `${location.origin}/card/${card.id}`;
      shareBtn.addEventListener('click', async () => {
        trackEvent('card_share', {
          card_id: card.id,
          method: navigator.share ? 'native' : 'copy'
        });

        if (navigator.share) {
          try {
            await navigator.share({
              title: `${card.name} – CardVerse`,
              url: shareUrl
            });
          } catch (err) {
            console.error('Share canceled or failed:', err);
          }
        } else {
          try {
            await navigator.clipboard.writeText(shareUrl);
            shareBtn.textContent = '✅ Link Copied!';
            setTimeout(() => shareBtn.textContent = '🔗 Share', 1500);
          } catch {
            alert('❌ Failed to copy link.');
          }
        }
      });
    }


      // 🎨 Artist click to search
    const artistLink = popup.querySelector('.artist-link');
    if (artistLink) {
      artistLink.addEventListener('click', (e) => {
        e.preventDefault();

        const artistName = card.artist;
        if (!artistName) return;

        // Fill the main search input and trigger search
        searchInput.value = `artist:"${artistName}"`;
        popup.remove(); // close the popup
        document.body.classList.remove('popup-open');
        searchCards(`artist:"${artistName}"`);
      });
    }

    // 🔍 Name click to search
    const nameLink = popup.querySelector('.name-link');
    if (nameLink) {
      nameLink.addEventListener('click', (e) => {
        e.preventDefault();
        searchInput.value = card.name;
        searchMode = 'pokemon';
        popup.remove();
        document.body.classList.remove('popup-open');
        searchCards(card.name);
      });
    }

    // 📦 Set click to search
    const setLink = popup.querySelector('.set-link');
    if (setLink) {
      setLink.addEventListener('click', (e) => {
        e.preventDefault();
        const query = `set.name:"${card.set.name}"`;
        searchInput.value = card.set.name;
        searchMode = 'pokemon';
        popup.remove();
        document.body.classList.remove('popup-open');
        searchCards(query);
      });
    }


  document.body.appendChild(popup);
  // ⬇ Re-query after append, to ensure it's live in the DOM
  const closeBtn = popup.querySelector('.close-button');

  let touchStartX = 0;

  popup.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });

  popup.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].clientX - touchStartX;

    if (Math.abs(diffX) > 50) {
      if (diffX < 0) {
        showNextCard();
      } else {
        showPreviousCard();
      }
    }
  });

  function handleArrowNav(e) {
    if (e.key === 'ArrowRight') showNextCard();
    if (e.key === 'ArrowLeft') showPreviousCard();
  }

  document.addEventListener('keydown', handleArrowNav);



if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    popup.remove();
    document.body.classList.remove('popup-open');
  });
}

popup.addEventListener('click', (e) => {
  if (e.target === popup) {
    popup.remove();
    document.body.classList.remove('popup-open');
    document.removeEventListener('keydown', handleArrowNav); // ✅ clean up
  }
});



  const img = popup.querySelector('img');
  const cardType = Array.isArray(card.types) ? card.types[0] : 'Colorless';
  const typeColor = typeColors[cardType] || '#007bff';  // fallback to blue

  document.querySelectorAll('.popup-content a').forEach(link => {
    link.style.color = typeColor;
  });

  const tagInput = popup.querySelector('#tag-input');
  let tagSuggestionsLoaded = false;

  // Keep tooltip from hiding for a moment on hover over tag
  function setupStickyTooltip(tagWrapper, tooltip) {
    let hideTimeout;
  
    const show = () => {
      clearTimeout(hideTimeout);
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';
    };
  
    const hide = () => {
      hideTimeout = setTimeout(() => {
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';
      }, 300); // 300ms delay before hiding
    };
  
    tagWrapper.addEventListener('mouseenter', show);
    tooltip.addEventListener('mouseenter', show);
    tagWrapper.addEventListener('mouseleave', hide);
    tooltip.addEventListener('mouseleave', hide);
  }
  
  
  if (mode === 'edit' && tagInput) {
  tagInput.addEventListener('input', async () => {
    if (!tagSuggestionsLoaded && tagInput.value.length === 1) {
      try {
        const res = await fetch('/api/tag-stats');
        const stats = await res.json();
        const datalist = popup.querySelector('#tagSuggestions');
  
        if (datalist && Array.isArray(stats)) {
          datalist.innerHTML = '';
          stats.forEach(({ tag }) => {
            const option = document.createElement('option');
            option.value = tag;
            datalist.appendChild(option);
          });
          tagSuggestionsLoaded = true;
        }
      } catch (err) {
        console.error('Failed to load tag suggestions:', err);
      }
    }
  });
}


    const tagsList = popup.querySelector('#card-tags-list');
    if (!tagsList) {
      console.warn('⚠️ #card-tags-list not found in popup');
      return;
    }

  // ✅ Fetch existing tags
    fetch(`/api/newtags/${card.id}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        data.forEach(tag => {
          const tagItem = document.createElement('li');

          // Create clickable tag link
          const tagWrapper = document.createElement('div');
          tagWrapper.classList.add('tag-with-tooltip');

          const tagLink = document.createElement('a');
          tagLink.href = '#';
          tagLink.textContent = tag.tag;
          tagLink.classList.add('tag-search-link');
          tagLink.addEventListener('click', (e) => {
            e.preventDefault();
            tagSearchInput.value = tag.tag;
            popup.remove();
            document.body.classList.remove('popup-open');
            searchCustomTags(tag.tag);
          });

          tagWrapper.appendChild(tagLink);
  
          // Tooltip element
          if (tag.submittedBy?.username) {
            const tooltip = document.createElement('div');
            tooltip.classList.add('tooltip');
            tooltip.innerHTML = `Submitted by: <a href="/user/${tag.submittedBy.username}">${tag.submittedBy.username}</a>`;
            tagWrapper.appendChild(tooltip);
            setupStickyTooltip(tagWrapper, tooltip);
          }
  
          tagItem.appendChild(tagWrapper);
          tagsList.appendChild(tagItem);
        });
      } else {
        tagsList.innerHTML = '<li>No tags available.</li>';
      }

    // After all tags are added
    document.querySelectorAll('.popup-content .tag-search-link').forEach(link => {
      link.style.color = typeColor;
      link.style.textDecoration = 'underline';
    });

    })
    .catch(err => {
      console.error("Error fetching tags:", err);
    });
  
    //
    // Collections
    //
    //

    const collectionDropdown = popup.querySelector('#collectionDropdown');
    const addBtn = popup.querySelector('#addToCollectionBtn');
    const addMsg = popup.querySelector('#collectionAddMsg');

    // 🔄 Load user collections
    try {
      const res = await fetch('/api/collections/me');
      const collections = await res.json();

      collectionDropdown.innerHTML = '';
      if (!collections.length) {
        collectionDropdown.innerHTML = '<option disabled>No collections found</option>';
        addBtn.disabled = true;
      } else {
        collections.forEach(c => {
          const option = document.createElement('option');
          option.value = c._id;
          option.textContent = `${c.name} (${c.visibility})`;
          collectionDropdown.appendChild(option);
        });
      }
    } catch (err) {
      console.error('❌ Failed to load collections in popup:', err);
      collectionDropdown.innerHTML = '<option disabled>Error loading collections</option>';
      addBtn.disabled = true;
    }

    // ➕ Add to collection handler
    addBtn.addEventListener('click', async () => {
      const collectionId = collectionDropdown.value;
      if (!collectionId) return;

      addMsg.textContent = 'Adding...';

      try {
        const res = await fetch(`/api/collections/${collectionId}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: card.id })
        });

        const data = await res.json();

        if (res.ok) {
          addMsg.textContent = '✅ Added to collection!';
        } else {
          addMsg.textContent = data.message || '⚠️ Already added?';
        }
      } catch (err) {
        console.error('❌ Failed to add to collection:', err);
        addMsg.textContent = '❌ Server error.';
      }
    });


    //
    //
  // ✅ Add tag functionality ADD NEW TAG
const addTagButton = popup.querySelector('#add-tag-button');
if (addTagButton) {
  const newAddTagButton = addTagButton.cloneNode(true);
  addTagButton.parentNode.replaceChild(newAddTagButton, addTagButton);

  newAddTagButton.addEventListener('click', async () => {
    let tagName = popup.querySelector('#tag-input')?.value?.trim().toLowerCase();
    const whoami = await fetch('/api/whoami').then(res => res.json());
    const tagMessage = popup.querySelector('#tag-message');
    if (!whoami?.userId) {
      if (tagMessage) tagMessage.textContent = '❌ You must be logged in to submit tags.';
      return;
    }

    tagName = tagName.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();

    if (!tagName) return alert('Please enter a valid tag.');
    if (tagName.length > 20) return alert('Tags must be 20 characters or fewer.');
    if (bannedWords.some(word => tagName.includes(word))) return alert('Inappropriate tags are not allowed.');

    pendingTagName = tagName;
    tagConfirmMessage.textContent = `Please confirm tag entry for card ${card.id}: "${tagName}"`;
    tagConfirmPopup.classList.remove('hidden');
  });
} else {
  console.warn('❌ #add-tag-button not found in popup — skipping tag handler.');
}



  const tagConfirmPopup = document.getElementById('tagConfirmPopup');
  const tagConfirmMessage = document.getElementById('tagConfirmMessage');
  const confirmTagSubmit = document.getElementById('confirmTagSubmit');
  const newConfirmTagSubmit = confirmTagSubmit.cloneNode(true);
  confirmTagSubmit.parentNode.replaceChild(newConfirmTagSubmit, confirmTagSubmit);
  const cancelTagSubmit = document.getElementById('cancelTagSubmit');
  
  let pendingTagName = ''; // Store the tag waiting for confirmation

  




  //Add Tag Confirm/Cancel Popup
  const tagMessage = popup.querySelector('#tag-message');
  newConfirmTagSubmit.addEventListener('click', () => {
    tagConfirmPopup.classList.add('hidden');
    
    trackEvent('tag_submit', {
      card_id: card.id,
      tag: pendingTagName
    });


    fetch(`/api/newtags/${card.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagName: pendingTagName })
    })
      .then(async response => {
        let data = {};
        try {
          data = await response.json();
        } catch {
          // If response wasn't valid JSON, leave data as {}
        }

        if (response.ok) {
          if (tagMessage) tagMessage.textContent = data?.message || '✅ Tag submitted for review!';
          popup.querySelector('#tag-input').value = '';
        } else if (response.status === 409) {
          if (tagMessage) tagMessage.textContent = '⚠️ This tag has already been submitted or approved.';
        } else if (response.status === 401 || response.status === 403) {
          if (tagMessage) tagMessage.textContent = '🚫 Your session has expired. Please log in again.';
        } else {
          if (tagMessage) tagMessage.textContent = data?.message || '❌ Error submitting tag.';
        }
      })
      .catch(err => {
        console.error('Error adding tag:', err);
        if (tagMessage) tagMessage.textContent = 'Something went wrong.';
      });
  });
  
  
  cancelTagSubmit.addEventListener('click', () => {
    tagConfirmPopup.classList.add('hidden');
  });
  


    // ✅ Close behavior
    // THEN safely bind listeners
    popup.querySelector('.close-button')?.addEventListener('click', () => {
      popup.remove();
      document.body.classList.remove('popup-open');
    });
  
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.remove();
        document.body.classList.remove('popup-open');
      }
    });
  }

  //END CARD POPUP

  function showNextCard() {
  if (!window.searchResults?.length) return;
  if (typeof window.currentPopupIndex !== 'number') return;

  window.currentPopupIndex = (window.currentPopupIndex + 1) % window.searchResults.length;
  const nextCard = window.searchResults[window.currentPopupIndex];
  openCardPopup(nextCard, { mode: 'edit' });
}

function showPreviousCard() {
  if (!window.searchResults?.length) return;
  if (typeof window.currentPopupIndex !== 'number') return;

  window.currentPopupIndex = (window.currentPopupIndex - 1 + window.searchResults.length) % window.searchResults.length;
  const prevCard = window.searchResults[window.currentPopupIndex];
  openCardPopup(prevCard, { mode: 'edit' });
}





  window.openCardPopup = openCardPopup;