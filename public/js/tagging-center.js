let currentView = 'grid'; // or 'detail'
let searchResults = [];
let currentCardIndex = -1;
let containerView;
let detailView;
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('DOMContentLoaded', () => {
  containerView = document.getElementById('cardContainerView');
  detailView = document.getElementById('cardDetailView');
  //Swipe to move on mobile
  if (detailView) {
    detailView.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
      }
    });

    detailView.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        touchEndX = e.touches[0].clientX;
      }
    }, { passive: false });

    detailView.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        handleSwipe();
      }

      // Double-tap detection
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime;

      if (timeSinceLastTap < 300 && e.touches?.length === 0) {
        e.preventDefault();
        handleFavoriteShortcut();
      }

      lastTapTime = now;
    });
  }

  const toggleBtn = document.getElementById('toggleViewBtn');
  const backBtn = document.getElementById('backToGridBtn');


  toggleBtn.addEventListener('click', () => {
    currentView = currentView === 'grid' ? 'detail' : 'grid';
    updateView();
  });

  backBtn.addEventListener('click', () => {
    currentView = 'grid';
    updateView();
  });

  


  updateView(); // Initialize

  const cardContainer = document.getElementById('cardContainerView');

// Mock function to simulate search results
function loadSampleCards() {
  const sampleCards = [
    { id: 'xy7-54', name: 'Gardevoir', image: 'https://images.pokemontcg.io/xy7/54.png' },
    { id: 'sm12-199', name: 'Charizard & Braixen', image: 'https://images.pokemontcg.io/sm12/199.png' },
    { id: 'sv2-221', name: 'Pikachu', image: 'https://images.pokemontcg.io/sv2/221.png' }
  ];

  cardContainer.innerHTML = ''; // Clear old
  sampleCards.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-preview';
    cardDiv.innerHTML = `
      <img src="${card.image}" alt="${card.name}" />
      <p>${card.name}</p>
    `;
    
    cardDiv.addEventListener('click', () => {
      currentCardIndex = sampleCards.findIndex(c => c.id === card.id);
      openCardDetail(card);
    });


    cardContainer.appendChild(cardDiv);
  });
}


const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('tagSearchInput');

searchBtn.addEventListener('click', () => {
  const term = searchInput.value.trim().toLowerCase();
  if (!term) return;

  taggingCenterSearch(term);
});

//ENTER hit Submit

const tagSearchInput = document.getElementById('tagSearchInput');

if (tagSearchInput && searchBtn) {
  tagSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevents accidental form submit or page reload
      searchBtn.click();
    }
  });
}




async function searchByPokemonName(name) {
  try {
    await fetch('/api/log-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: name.trim() })
    });
  } catch (err) {
    console.error('Failed to log search query:', err);
  }

  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:${name}`);
    const data = await res.json();
    renderCards(data.data);
  } catch (err) {
    console.error('🔴 Error fetching cards:', err);
  }
}

async function searchByCustomTag(tag) {
  try {
    const res = await fetch(`/api/search?tags=${tag}`);
    const cardIds = await res.json();

    const cardData = await Promise.all(
      cardIds.map(async id => {
        const res = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`);
        const json = await res.json();
        return json.data;
      })
    );

    renderCards(cardData);
  } catch (err) {
    console.error('🔴 Error with tag search:', err);
  }
}

function renderCards(cards) {
  document.getElementById('loadingSpinner')?.classList.add('hidden');
  searchResults = cards;
  currentCardIndex = -1;
  cardContainer.innerHTML = '';


  if (!cards || cards.length === 0) {
    cardContainer.innerHTML = '<p>No results found.</p>';
    return;
  }

  cards.forEach(card => {
    const div = document.createElement('div');
    div.className = 'card-preview';
    div.innerHTML = `
      <img src="${card.images.small}" alt="${card.name}" onerror="this.onerror=null;this.src='.../img/placeholder.png';" />
      <p>${card.name}</p>
    `;
    div.addEventListener('click', () => {
      currentCardIndex = cards.findIndex(c => c.id === card.id);
      openCardDetail({ id: card.id });
    });

    cardContainer.appendChild(div);
  });

  currentView = 'grid';
  updateView();
}


const tagInput = document.getElementById('tagInput');
const submitTagBtn = document.getElementById('submitTagBtn');

if (submitTagBtn) {
  submitTagBtn.addEventListener('click', async () => {
    const tagMessage = document.getElementById('tagMessage');
    tagMessage.textContent = '';
    tagMessage.style.color = '#555'; // reset color


    const raw = tagInput.value.trim().toLowerCase();
    const tag = raw.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ');

    if (!tag || tag.length > 20) {
      tagMessage.style.color = '#d9534f';
      tagMessage.textContent = '❌ Tag must be 1–20 characters.';
      return;
    }




    try {
      const whoamiRes = await fetch('/api/whoami');
      const whoami = await whoamiRes.json();
      if (!whoami?.userId) {
        tagMessage.style.color = '#d9534f';
        tagMessage.textContent = '🚫 You must be logged in to submit tags.';
        setTimeout(() => {
          tagMessage.classList.add('fade-out');
          setTimeout(() => {
            tagMessage.textContent = '';
            tagMessage.classList.remove('fade-out');
          }, 600); // match the CSS transition time
        }, 3000);
        return;
      }

      const cardId = document.getElementById('cardId')?.textContent?.trim();

      const res = await fetch(`/api/tag-submissions/${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName: tag })
      });

      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (res.status === 409) {
        tagMessage.style.color = '#d9534f';
        tagMessage.textContent = '⚠️ This tag has already been submitted or approved.';
        setTimeout(() => {
          tagMessage.classList.add('fade-out');
          setTimeout(() => {
            tagMessage.textContent = '';
            tagMessage.classList.remove('fade-out');
          }, 600); // match the CSS transition time
        }, 3000);

      } else if (res.ok) {
        tagMessage.style.color = '#28a745';
        tagMessage.textContent = '✅ Tag submitted for review!';
        setTimeout(() => {
          tagMessage.classList.add('fade-out');
          setTimeout(() => {
            tagMessage.textContent = '';
            tagMessage.classList.remove('fade-out');
          }, 600); // match the CSS transition time
        }, 3000);

        tagInput.value = '';
        renderTags(cardId);
      } else {
        tagMessage.style.color = '#d9534f';
        tagMessage.textContent = data.message || '❌ Failed to submit tag.';
        setTimeout(() => {
          tagMessage.classList.add('fade-out');
          setTimeout(() => {
            tagMessage.textContent = '';
            tagMessage.classList.remove('fade-out');
          }, 600); // match the CSS transition time
        }, 3000);

      }
    } catch (err) {
      console.error('Tag submission error:', err);
      tagMessage.style.color = '#d9534f';
      tagMessage.textContent = '❌ An unexpected error occurred.';
      setTimeout(() => {
        tagMessage.classList.add('fade-out');
        setTimeout(() => {
          tagMessage.textContent = '';
          tagMessage.classList.remove('fade-out');
        }, 600); // match the CSS transition time
      }, 3000);

    }


  });

}

//New Tagging Center Search
async function taggingCenterSearch(term) {
  document.getElementById('loadingSpinner')?.classList.remove('hidden');
  cardContainer.innerHTML = '';

  const { tags, names } = parseCombinedSearch(term);

  const termsToLog = [];
  termsToLog.push(...names.map(n => n.toLowerCase()));
  termsToLog.push(...tags.map(t => t.toLowerCase()));

  for (const t of termsToLog) {
    try {
      await fetch('/api/log-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: t })
      });
    } catch (err) {
      console.error('Failed to log tagging center search term:', t, err);
    }
  }


  let cardsFromAPI = [];
  // Tag-only search fallback
  if (!name && tags.length > 0) {
    try {
      let cardIdSets = [];

      for (const tag of tags) {
        const res = await fetch(`/api/search?tags=${tag}`);
        const cardIds = await res.json();
        cardIdSets.push(new Set(cardIds));
      }

      // AND logic — only keep cards that appear in all tag sets
      const commonIds = [...cardIdSets.reduce((a, b) => {
        return new Set([...a].filter(id => b.has(id)));
      })];

      if (!commonIds.length) {
        document.getElementById('loadingSpinner')?.classList.add('hidden');
        renderCards([]);
        return;
      }


      //
      document.getElementById('loadingSpinner')?.classList.remove('hidden');
      cardContainer.innerHTML = ''; // clear old results
      searchResults = []; // reset global state

      for (const id of commonIds) {
        fetchCardWithTimeout(id, 5000) // 5 second timeout
          .then(card => {
            if (card) {
              searchResults.push(card);
              appendCardToContainer(card);
            }
          })
          .catch(err => console.error(`❌ Failed to load card ${id}:`, err));
      }

      // After all attempts, hide spinner
      Promise.allSettled(commonIds.map(id => fetchCardWithTimeout(id, 5000)))
        .then(() => {
          document.getElementById('loadingSpinner')?.classList.add('hidden');
          if (searchResults.length === 0) {
            cardContainer.innerHTML = '<p>No results found.</p>';
          }
        });

      // Helper to fetch with timeout
      async function fetchCardWithTimeout(id, timeoutMs) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const res = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`, { signal: controller.signal });
          clearTimeout(timeout);
          const data = await res.json();
          return data.data;
        } catch (err) {
          clearTimeout(timeout);
          return null;
        }
      }

      // Helper to append one card to grid
      function appendCardToContainer(card) {
        const div = document.createElement('div');
        div.className = 'card-preview';
        div.innerHTML = `
          <img src="${card.images.small}" alt="${card.name}" onerror="this.onerror=null;this.src='.../img/placeholder.png';" />
          <p>${card.name}</p>
        `;
        div.addEventListener('click', () => {
          currentCardIndex = searchResults.findIndex(c => c.id === card.id);
          openCardDetail({ id: card.id });
        });

        cardContainer.appendChild(div);
      }
      //

    } catch (err) {
      console.error('Tag-only search failed:', err);
      document.getElementById('loadingSpinner')?.classList.add('hidden');

      renderCards([]);
      return;
    }
  }

  // Step 1: Search Pokémon API by name
/*   if (name) {
    try {
      try {
        await fetch('/api/log-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term: name.trim() })
        });
      } catch (err) {
        console.error('Failed to log tagging center name search:', err);
      }
      const pokeRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${name}"`);
      const data = await pokeRes.json();
      console.log('🔍 Name search results:', data.data); // ✅ Add this log
      cardsFromAPI = data.data || [];
    } catch (err) {
      console.error('❌ Pokémon API name search failed:', err);
    }
  } */
  if (names.length > 0) {
    cardsFromAPI = [];

    for (const name of names) {
      try {
        const pokeRes = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${name}"`);
        const data = await pokeRes.json();
        console.log(`🔍 Name search results for "${name}":`, data.data);
        if (data.data?.length) {
          cardsFromAPI.push(...data.data);
        }
      } catch (err) {
        console.error(`❌ Pokémon API name search failed for "${name}":`, err);
      }
    }
  }

  // ✅ FIX: Early return for name-only search (no tags)
  if (!tags.length && cardsFromAPI.length > 0) {
    document.getElementById('loadingSpinner')?.classList.add('hidden');
    renderCards(cardsFromAPI);
    return;
  }


  // Step 2: If no tags provided, just show the cards
  if (!tags.length) {
    renderCards(cardsFromAPI);
    return;
  }

  // Step 3: Filter cards by checking if they have ALL tags in your DB
  try {
    
    console.log('🚀 POSTING to /api/newtags/bulk with:', {
      cardIds: cardsFromAPI.map(c => c.id),
      tags
    });


    const res = await fetch('/api/newtags/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardIds: cardsFromAPI.map(c => c.id),
        tags: tags
      })
    });

    const tagMap = await res.json(); // { cardId: [tags] }

    const filtered = cardsFromAPI.filter(card => {
      const cardTags = tagMap[card.id] || [];
      return tags.every(tag => cardTags.includes(tag));
    });

    renderCards(filtered);
  } catch (err) {
    console.error('❌ Bulk tag filtering failed:', err);
    renderCards([]);
  }

}

const resetBtn = document.getElementById('resetBtn');

resetBtn.addEventListener('click', () => {
  searchInput.value = '';
  cardContainer.innerHTML = '';
  currentCardIndex = -1;
  searchResults = [];
  currentView = 'grid';
  updateView();
});

//Arrow Keys to swipe on keyboard
document.addEventListener('keydown', (e) => {
  //console.log('Key pressed:', e.key, 'Current View:', currentView, 'Current Index:', currentCardIndex);
  if (currentView !== 'detail') return; // only when in detail view

  if (e.key === 'ArrowRight') {
    showNextCard();
    console.log('Key pressed:', e.key, 'Current View:', currentView);

  } else if (e.key === 'ArrowLeft') {
    showPreviousCard();
    console.log('Key pressed:', e.key, 'Current View:', currentView);

  }
});

//Double Tap to add to favorites SPACE BAR
let lastSpaceTime = 0;

document.addEventListener('keydown', (e) => {
  if (currentView !== 'detail') return;
  if (e.code !== 'Space') return;

  const now = Date.now();
  const timeSinceLastSpace = now - lastSpaceTime;

  if (timeSinceLastSpace < 300) {
    e.preventDefault(); // avoid scroll
    handleFavoriteShortcut();
  }

  lastSpaceTime = now;
});


document.getElementById('loadUntaggedBtn').addEventListener('click', loadUntaggedCards);

async function loadUntaggedCards() {
  try {
    const container = document.getElementById('cardContainerView');
    const spinner = document.getElementById('loadingSpinner');
    const detail = document.getElementById('cardDetailView');

    // ✅ Clear the DOM first
    container.innerHTML = '';
    container.classList.remove('hidden');
    detail.classList.add('hidden');
    spinner.classList.remove('hidden');

    // ✅ Fetch only once
    const res = await fetch('/api/untagged-cards');
    const data = await res.json();
    currentCardIndex = 0;
    // ✅ Prevent dupes
    const alreadyRendered = new Set();
    searchResults = data.cards;
    //console.log('🔁 Rendering untagged cards:', data.cards.length, 'cards');

    data.cards.forEach(card => {
      if (alreadyRendered.has(card.id)) return;
      alreadyRendered.add(card.id);

      //console.log('🖼️ Rendering card:', card.id);

      const cardEl = document.createElement('div');
      cardEl.className = 'card-preview';
      cardEl.style.position = 'relative';

      cardEl.innerHTML = `
        <img src="${card.images.small}" alt="${card.name}" />
        <div class="hover-preview">
          <img src="${card.images.large || card.images.small}" alt="${card.name}" />
        </div>
      `;

      cardEl.addEventListener('click', () => {
        openCardDetail({ id: card.id });
      });

      container.appendChild(cardEl);
    });

  } catch (err) {
    console.error('❌ Error loading untagged cards:', err);
  } finally {
    document.getElementById('loadingSpinner').classList.add('hidden');
  }
}





//
//
}); // End of DOMLoader
//
//

function animateCardSlide(direction) {
  if (!detailView) return;

  const className = direction === 'left' ? 'slide-left' : 'slide-right';

  detailView.classList.remove('slide-left', 'slide-right');
  void detailView.offsetWidth; // 🪄 force reflow
  detailView.classList.add(className);

  setTimeout(() => {
    detailView.classList.remove(className);
  }, 300);
}

function handleSwipe() {
  const diffX = touchEndX - touchStartX;
  if (Math.abs(diffX) > 250) {
    if (diffX < 0) {
      showNextCard();
    } else {
      showPreviousCard();
    }
  }
}

//Double Tap to add to favorites SCREEN TAP
let lastTapTime = 0;

function showNextCard() {
  if (!searchResults.length || currentCardIndex === -1) return;
  currentCardIndex = (currentCardIndex + 1) % searchResults.length;

  animateCardSlide('left');
  openCardDetail({ id: searchResults[currentCardIndex].id });
}

function showPreviousCard() {
  if (!searchResults.length || currentCardIndex === -1) return;
  currentCardIndex = (currentCardIndex - 1 + searchResults.length) % searchResults.length;

  animateCardSlide('right');
  openCardDetail({ id: searchResults[currentCardIndex].id });
}



  function updateView() {
    if (currentView === 'grid') {
      containerView.classList.remove('hidden');
      detailView.classList.add('hidden');
    } else {
      containerView.classList.add('hidden');
      detailView.classList.remove('hidden');
    }
  }

async function openCardDetail(card) {
  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards/${card.id}`);
    const data = await res.json();

    const fullCard = data.data;

    const container = document.getElementById('cardDetailContent');
    

    const tagMessage = document.getElementById('tagMessage');
    if (tagMessage) {
      tagMessage.textContent = '';
      tagMessage.style.color = '#555';
    }
    const tagInput = document.getElementById('tagInput');
    if (tagInput) {
      tagInput.value = '';
    }



    container.innerHTML = `
      <img src="${fullCard.images.large}" alt="${fullCard.name}" style="max-width: 300px;" />
      <h2><span id="cardNameText">${fullCard.name}</span></h2>
      <p><strong>Set:</strong> ${fullCard.set.name}</p>
      <p><strong>Card Number:</strong> ${fullCard.number}</p>
      <p><strong>Rarity:</strong> ${fullCard.rarity || 'Unknown'}</p>
      <p id="cardId" class="hidden">${fullCard.id}</p>
    `;

    renderTags(fullCard.id);
    renderCollections(fullCard.id);

    currentView = 'detail';
    updateView();
  } catch (err) {
    console.error('❌ Failed to load card details:', err);
  }
}


function renderTags(cardId) {
  const tagList = document.getElementById('existingTagsList');
  tagList.innerHTML = 'Loading...';

  fetch(`/api/newtags/${cardId}`)
    .then(res => res.json())
    .then(tags => {
      tagList.innerHTML = '';
      if (!tags.length) {
        tagList.innerHTML = '<li>No tags yet.</li>';
        return;
      }

      tags.forEach(tag => {
        const span = document.createElement('span');
        span.textContent = tag.tag;
        span.className = 'tag-bubble';
        tagList.appendChild(span);
      });

    })
    .catch(err => {
      console.error('❌ Error fetching tags:', err);
      tagList.innerHTML = '<li>Error loading tags.</li>';
    });
}

//FETCH Collections if loggedin
function renderCollections(cardId) {
  const container = document.getElementById('collectionCheckboxes');
  container.innerHTML = 'Loading...';

    fetch('/api/collections/me')
    .then(async res => {
        if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
        }
        return res.json();
    })

    .then(collections => {
      container.innerHTML = '';
      const favorites = collections.find(col => col.name.toLowerCase() === 'favorites');
      const isInFavorites = favorites?.cards.includes(cardId);

      const nameSpan = document.getElementById('cardNameText');
      if (nameSpan) {
        if (favorites?.cards.includes(cardId)) {
          nameSpan.innerHTML = `❤️ ${nameSpan.textContent.replace(/^❤️\s*/, '')}`;
        } else {
          nameSpan.innerHTML = nameSpan.textContent.replace(/^❤️\s*/, '');
        }
      }


      if (!collections.length) {
        container.innerHTML = '<p>No collections found.</p>';
        return;
      }

      collections.forEach(col => {
        const wrapper = document.createElement('label');
        wrapper.style.display = 'block';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = col._id;
        checkbox.checked = col.cards.includes(cardId);

        checkbox.addEventListener('change', async () => {
          const url = `/api/collections/${col._id}/${checkbox.checked ? 'add' : 'remove'}/${cardId}`;
          const method = checkbox.checked ? 'POST' : 'DELETE';

          try {
            await fetch(url, { method });
          } catch (err) {
            console.error(`❌ Failed to ${checkbox.checked ? 'add to' : 'remove from'} collection:`, err);
          }
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(document.createTextNode(` ${col.name} (${col.visibility})`));
        container.appendChild(wrapper);
      });
    })
    .catch(err => {
      console.error('❌ Error fetching collections:', err.message);
      container.innerHTML = '<p>You must be logged in to manage collections.</p>';
    });
}






async function handleFavoriteShortcut() {
  try {
    const whoamiRes = await fetch('/api/whoami');
    const whoami = await whoamiRes.json();

    if (!whoami?.userId) {
      showLoginAlert();
      return;
    }

    // ✅ Logged in — move to step 5
    addToFavorites();
  } catch (err) {
    console.error('Error checking login status:', err);
  }
}

function showLoginAlert() {
  const existing = document.getElementById('loginPrompt');
  if (existing) return;

  const alert = document.createElement('div');
  alert.id = 'loginPrompt';
  alert.textContent = 'Log in to add to favorites!';
  alert.style.position = 'fixed';
  alert.style.bottom = '2rem';
  alert.style.left = '50%';
  alert.style.transform = 'translateX(-50%)';
  alert.style.background = '#d9534f';
  alert.style.color = 'white';
  alert.style.padding = '0.75rem 1.5rem';
  alert.style.borderRadius = '6px';
  alert.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
  alert.style.zIndex = '9999';
  alert.style.opacity = '1';
  alert.style.transition = 'opacity 0.4s ease-in-out';

  document.body.appendChild(alert);

  setTimeout(() => {
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 500);
  }, 1200);
}

///POST to 'Favorites' Collection
async function addToFavorites() {
  const cardId = document.getElementById('cardId')?.textContent?.trim();
  if (!cardId) return;

  try {
    const res = await fetch('/api/collections/me');
    const collections = await res.json();

    const favorites = collections.find(c => c.name.toLowerCase() === 'favorites');
    const target = favorites || collections[0]; // fallback to first collection

    if (!target) return;

    const addRes = await fetch(`/api/collections/${target._id}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId })
    });

    if (addRes.ok) {
      showHeartPopup();
    } else {
      console.warn('⚠️ Already in favorites or failed to add');
    }
  } catch (err) {
    console.error('❌ Error adding to favorites:', err);
  }
}

//Show the heart popup
function showHeartPopup() {
  const heart = document.createElement('div');
  heart.textContent = '❤️';
  heart.style.position = 'fixed';
  heart.style.fontSize = '3rem';
  heart.style.left = '50%';
  heart.style.top = '50%';
  heart.style.transform = 'translate(-50%, -50%)';
  heart.style.opacity = '1';
  heart.style.zIndex = '9999';
  heart.style.transition = 'transform 0.6s ease-out, opacity 0.6s ease-out';

  document.body.appendChild(heart);

  // Trigger animation
  requestAnimationFrame(() => {
    heart.style.transform = 'translate(-50%, -70%) scale(1.2)';
    heart.style.opacity = '0';
  });

  setTimeout(() => {
    heart.remove();
  }, 700);
}

//Parse input for AND search
function parseCombinedSearch(query) {
  const parts = query.toLowerCase().split(/\s+and\s+/).map(part => part.trim());

  const tags = parts.filter(p => p.startsWith('#')).map(p => p.slice(1));
  const names = parts.filter(p => !p.startsWith('#'));

  return { tags, names };
}
