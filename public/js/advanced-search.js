// public/js/advanced-search.js
let currentPage = 1;
let isLoading = false;
let lastQuery = '';

document.addEventListener('DOMContentLoaded', () => {
const searchStateJSON = sessionStorage.getItem('searchState');
if (searchStateJSON) {
  const searchState = JSON.parse(searchStateJSON);
  if (searchState.scrollY !== undefined) {
    window.scrollTo(0, searchState.scrollY);
  }
  sessionStorage.removeItem('searchState');
}


  const input = document.getElementById('searchInput');
  const resultsContainer = document.getElementById('results-container');
  document.getElementById('loading-spinner').style.display = 'block';

  

  // Fetch sets and populate setSelect dropdown
  (async function loadSets() {
    try {
      const res = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=250');
      const data = await res.json();
      const select = document.getElementById('setSelect');

      data.data
        .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)) // newest first
        .forEach(set => {
          const option = document.createElement('option');
          option.value = set.name;
          option.textContent = `${set.name} (${set.releaseDate})`;
          select.appendChild(option);
        });

    } catch (err) {
      console.error('❌ Failed to load sets:', err);
    }
  })();

  (async function loadArtists() {
    try {
      const artistSet = new Set();
      const pageSize = 250;

      for (let page = 1; page <= 3; page++) {
        const res = await fetch(`https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=${pageSize}`);
        const data = await res.json();
        data.data.forEach(card => {
          if (card.artist) artistSet.add(card.artist);
        });
      }

      const select = document.getElementById('artistSelect');

      const sortedArtists = [...artistSet].sort((a, b) => a.localeCompare(b));

      if (sortedArtists.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = '⚠️ No artists found';
        opt.disabled = true;
        document.getElementById('artistSelect').appendChild(opt);
      } else {
        sortedArtists.forEach(artist => {
          const option = document.createElement('option');
          option.value = artist;
          option.textContent = artist;
          select.appendChild(option);
        });
      }

  } catch (err) {
    console.error('❌ Failed to load artists:', err);
  }
})();


  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim();
      if (query.length === 0) {
        resultsContainer.innerHTML = '';
        return;
      }
      currentPage = 1;
      fetchCards(query);
      lastQuery = query;

    }, 300);
  });

    async function fetchCards(query, append = false) {
      console.log(`⬇️ Calling fetchCards(${query}, append=${append}) at page ${currentPage}`);
      

      try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);

        // Card Type checkboxes
        document.querySelectorAll('input[name="cardType"]:checked').forEach(input => {
          params.append('cardType', input.value);
        });

        // Format dropdown
        const format = document.getElementById('formatSelect').value;
        if (format) params.append('format', format);

        // Type dropdown
        const type = document.getElementById('typeSelect').value;
        if (type) params.append('type', type);

        // Rarity dropdown
        const rarity = document.getElementById('raritySelect').value;
        if (rarity) params.append('rarity', rarity);

        // Set input
        const set = document.getElementById('setSelect').value;
        if (set) params.append('set', set);

        // Artist input
        const artist = document.getElementById('artistSelect').value;
        const sort = document.getElementById('sortSelect').value;
        if (sort) params.append('sort', sort);

        if (artist) params.append('artist', artist);

        params.append('page', currentPage);
        params.append('pageSize', 50);

        const res = await fetch(`/adv-search?${params.toString()}`);
        const data = await res.json();

        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('end-of-results').style.display = 'none';
        //console.log(`🎨 Page ${page}:`, data.data.length, 'cards loaded');

        if (!append) {
          resultsContainer.innerHTML = '';
        }


        if (sort === 'price') {
          data.cards.sort((a, b) => {
            const aPrices = a.tcgplayer?.prices || {};
            const bPrices = b.tcgplayer?.prices || {};

            const aVal = Object.values(aPrices).find(p => typeof p.market === 'number')?.market || 0;
            const bVal = Object.values(bPrices).find(p => typeof p.market === 'number')?.market || 0;

            return bVal - aVal; // highest price first
          });
        }


        data.cards.forEach(card => {
          const cardEl = document.createElement('div');
          cardEl.className = 'card-preview';
          cardEl.style.position = 'relative'; // absolutely required

          cardEl.innerHTML = `
            <img src="${card.images.small}" alt="${card.name}" />
            <div class="hover-preview">
              <img src="${card.images.large || card.images.small}" alt="${card.name}" />
            </div>
          `;

          // On click, go to the card page
          cardEl.addEventListener('click', () => {
            const lastSearch = window.location.href;
            localStorage.setItem('lastSearchURL', lastSearch);
            window.location.href = `/card/${card.id}?from=${encodeURIComponent(lastSearch)}`;
          });


            // ⬇️ Add this to mirror preview if too close to screen edge
        cardEl.addEventListener('mouseenter', () => {
          const rect = cardEl.getBoundingClientRect();
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;

          // Horizontal overflow check (right edge)
          if (rect.right + 320 > windowWidth) {
            cardEl.classList.add('mirror');
          } else {
            cardEl.classList.remove('mirror');
          }

          // Vertical overflow check (bottom edge)
          if (rect.bottom + 320 > windowHeight) {
            cardEl.classList.add('vertical-flip');
          } else {
            cardEl.classList.remove('vertical-flip');
          }
        });



          resultsContainer.appendChild(cardEl);
          setTimeout(() => cardEl.classList.add('fade-in'), 10); // triggers transition
        });

      isLoading = false;

      if (data.cards.length === 0 && append) {
        console.log('🚫 No more cards to load.');
        isLoading = true; // prevent further fetches
        document.getElementById('end-of-results').style.display = 'block';
      }


      console.log(`🔎 Fetching page ${currentPage} for query "${query}" (append: ${append})`);
      console.log(`📦 Received ${data.cards.length} cards`);

      //console.log('🎨 Found artists:', [...artistSet]);

      
      // Update the browser URL to reflect current filters (for deep linking/backtracking)
      const urlParams = new URLSearchParams(params); // clone params safely
      urlParams.delete('pageSize'); // optional: hide technical params from URL

      const newUrl = `/search?${urlParams.toString()}`;
      history.pushState(null, '', newUrl);



      } catch (err) {
        console.error('❌ Error fetching cards:', err);
        isLoading = false;
      }
    }



document.getElementById('filterBtn').addEventListener('click', () => {
  const panel = document.getElementById('filterPanel');
  console.log('🟢 Filter button clicked. Current display:', panel.style.display);
  panel.classList.toggle('show');
});

// Trigger new search when any filter changes
document.querySelectorAll('input[name="cardType"], #formatSelect, #typeSelect')
  .forEach(el => el.addEventListener('change', () => {
const query = document.getElementById('searchInput').value.trim();
currentPage = 1;
lastQuery = query;
fetchCards(query);

  }));



document.querySelectorAll(
  'input[name="cardType"], #formatSelect, #typeSelect, #raritySelect, #setSelect, #artistSelect'
).forEach(el => {
  el.addEventListener('change', () => {
const query = document.getElementById('searchInput').value.trim();
currentPage = 1;
lastQuery = query;
fetchCards(query);

  });
});

document.getElementById('sortSelect').addEventListener('change', () => {
const query = document.getElementById('searchInput').value.trim();
currentPage = 1;
lastQuery = query;
fetchCards(query);

});

// Initial load
// lastQuery = 'Pikachu';
// fetchCards('Pikachu', false); // Load first page with empty query

// Initial load: check URL for query and filters
const urlParams = new URLSearchParams(window.location.search);
const initialQuery = urlParams.get('q') || '';
const initialSet = urlParams.get('set') || '';
const initialPage = parseInt(urlParams.get('page') || '1', 10);
currentPage = initialPage;
lastQuery = initialQuery;

// Pre-fill dropdowns
document.getElementById('formatSelect').value = urlParams.get('format') || '';
document.getElementById('typeSelect').value = urlParams.get('type') || '';
document.getElementById('raritySelect').value = urlParams.get('rarity') || '';
document.getElementById('setSelect').value = initialSet;
document.getElementById('artistSelect').value = urlParams.get('artist') || '';
document.getElementById('sortSelect').value = urlParams.get('sort') || '';
document.getElementById('searchInput').value = initialQuery;

// Decide what to search by
if (initialQuery) {
  fetchCards(initialQuery, false);
} else if (initialSet) {
  fetchCards('', false); // blank query, but filters (like set) are still applied
} else {
  fetchCards('Pikachu', false);
}


window.addEventListener('scroll', () => {
  const scrollPos = window.scrollY + window.innerHeight;
  const docHeight = document.body.offsetHeight;

  console.log(`📏 Scroll: ${scrollPos} / ${docHeight}`);

  if (scrollPos >= docHeight - 300 && !isLoading) {
    console.log('🔄 Loading next page...');
    isLoading = true;
    currentPage++;
    fetchCards(lastQuery, true); // append = true
  }
});


});