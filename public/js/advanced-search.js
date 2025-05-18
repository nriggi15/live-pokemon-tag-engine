// public/js/advanced-search.js
let currentPage = 1;
let isLoading = false;
let lastQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  const resultsContainer = document.getElementById('results-container');
  

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
      fetchCards(query);
    }, 300);
  });

    async function fetchCards(query) {
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

        const res = await fetch(`/adv-search?${params.toString()}`);
        const data = await res.json();
//console.log(`🎨 Page ${page}:`, data.data.length, 'cards loaded');

        resultsContainer.innerHTML = '';

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
          localStorage.setItem('lastSearchURL', window.location.href);
          window.location.href = `/card/${card.id}`;
        });

        resultsContainer.appendChild(cardEl);
      });

      if (data.cards.length < 50) {
        isLoading = true; // stop further loads
      } else {
        isLoading = false; // allow next page
      }

//console.log('🎨 Found artists:', [...artistSet]);

      } catch (err) {
        console.error('❌ Error fetching cards:', err);
      }
    }



document.getElementById('filterBtn').addEventListener('click', () => {
  const panel = document.getElementById('filterPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// Trigger new search when any filter changes
document.querySelectorAll('input[name="cardType"], #formatSelect, #typeSelect')
  .forEach(el => el.addEventListener('change', () => {
    const query = document.getElementById('searchInput').value.trim();
    fetchCards(query);
  }));



document.querySelectorAll(
  'input[name="cardType"], #formatSelect, #typeSelect, #raritySelect, #setSelect, #artistSelect'
).forEach(el => {
  el.addEventListener('change', () => {
    const query = document.getElementById('searchInput').value.trim();
    fetchCards(query);
  });
});

document.getElementById('sortSelect').addEventListener('change', () => {
  const query = document.getElementById('searchInput').value.trim();
  fetchCards(query);
});

});

window.addEventListener('scroll', () => {
  const scrollPos = window.scrollY + window.innerHeight;
  const docHeight = document.body.offsetHeight;

  if (scrollPos >= docHeight - 300 && !isLoading) {
    console.log('🔄 Loading next page...');
    isLoading = true;
    currentPage++;
    fetchCards(lastQuery, true); // append = true
  }
});

