// /public/js/search.js

const API_KEY = window.API_KEY;

const bannedWords = ['cock', 'ass', 'cunt', 'slavery', 'NSFS', 'nazi', 'fuck', 'shit', 'bitch', 'slur']; // Add more or load from file/db


const searchInput = document.getElementById('searchInput');
const tagCloud = document.getElementById('tagCloud');
const cardResults = document.getElementById('cardResults');
const resultsCount = document.getElementById('resultsCount');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const backToTopBtn = document.getElementById('backToTopBtn');
const refreshBtn = document.getElementById('refreshBtn');

window.searchResults = []; // 🔒 stores the current search result set


async function createTagCloud() {
  const tagCloud = document.getElementById('tagCloud');
  if (!tagCloud) {
    console.warn('❌ tagCloud element not found!');
    return;
  }
  console.log('✅ Creating tag cloud...');

  tagCloud.innerHTML = '';
  
  const tagRow = document.createElement('div');
  tagRow.classList.add('tag-row');

  try {
    const res = await fetch('/api/tag-stats');
    const allTags = await res.json();

    // Pick 15 random tags
    const shuffled = allTags.sort(() => 0.5 - Math.random());
    const selectedTags = shuffled.slice(0, 15);

    selectedTags.forEach(entry => {
      const tag = entry.tag;
      const btn = document.createElement('button');
      btn.textContent = tag;
      btn.classList.add('tag-button');
      btn.addEventListener('click', () => {
        tagSearchInput.value = tag;
        searchCustomTags(tag);
      });
      tagRow.appendChild(btn);
    });
  } catch (err) {
    console.error('❌ Failed to load random tags:', err);
  }


  tagCloud.appendChild(tagRow);

  const rarityTags = [
    { label: 'IR', query: 'rarity:\"illustration rare\"' },
    { label: 'SIR', query: 'rarity:\"special illustration rare\"' },
    { label: 'UR', query: 'rarity:\"ultra rare\"' }
  ];
  

  const rarityRow = document.createElement('div');
  rarityRow.classList.add('rarity-row');

  rarityTags.forEach(({ label, query }) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.classList.add('rarity-button');
    btn.addEventListener('click', () => {
      searchInput.value = label;
      searchCards(query);
    });
    rarityRow.appendChild(btn);
  });
    const chaseBtn = document.createElement('button');
    chaseBtn.textContent = '🎯 Chase';
    chaseBtn.style.backgroundColor = '#4e5052';
    chaseBtn.style.color = 'white';
    chaseBtn.style.border = '1px solid white';
    chaseBtn.style.marginLeft = '0.5rem';
    chaseBtn.style.fontWeight = 'bold';

    chaseBtn.addEventListener('click', () => {
      tagSearchInput.value = 'chase';
      searchCustomTags('chase');
    });

    rarityRow.appendChild(chaseBtn);

  const showAllBtn = document.createElement('button');
  showAllBtn.textContent = '🧩 Show All Tagged Cards';
  showAllBtn.addEventListener('click', () => {
    tagSearchInput.value = '#all';
    resultsCount.textContent = 'Loading...';
    resultsCount.classList.remove('hidden');
    fetch('/all-tagged-cards')
      .then(res => res.json())
      .then(cardIds => {
        if (cardIds.length === 0) {
          cardResults.innerHTML = '<p>No tagged cards found.</p>';
          document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
          return;
        }
        const cardPromises = cardIds.map(async (id) => {
          const res = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`, {
            headers: { 'X-Api-Key': API_KEY }
          });
          const data = await res.json();
          return data.data;
        });
        return Promise.all(cardPromises);
      })
      .then(cards => {
        if (cards) showCards(cards);
      })
      .catch(err => {
        console.error('Error fetching tagged cards:', err);
        cardResults.innerHTML = '<p>Error loading tagged cards.</p>';
        document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
      });
  });
  rarityRow.appendChild(showAllBtn);

  tagCloud.appendChild(rarityRow);
}








function initSearchPage() {
  console.log('🔍 Initializing search page...');

  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const val = searchInput.value.trim();
    if (val) {
      trackEvent('pokemon_search', {
        query: val
      });
      searchCards(val);
    }
  });


  document.getElementById('tagSearchBtn')?.addEventListener('click', () => {
    const val = tagSearchInput.value.trim();
    if (val) {
      trackEvent('tag_search', {
        query: val
      });
      searchCustomTags(val);
    }
  });

  refreshBtn?.addEventListener('click', () => location.reload());

  backToTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  tagSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const tag = tagSearchInput.value.trim();
      if (tag !== '') searchCustomTags(tag);
    }
  });
  
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query !== '') searchCards(query);
    }
  });

  const queryTagList = document.getElementById('queryTagList');
  const queryPreview = document.getElementById('queryPreview');
  const runQueryBtn = document.getElementById('runQueryBtn');
  const modeInputs = document.getElementsByName('queryMode');

  let selectedTags = new Set();

  function updatePreview() {
    const mode = [...modeInputs].find(r => r.checked).value;
    const tags = Array.from(selectedTags);
    queryPreview.textContent = tags.join(` ${mode} `) || 'No tags selected.';
  }

  function toggleTag(tag) {
    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
    } else {
      selectedTags.add(tag);
    }
    updatePreview();
    renderQueryButtons();
  }

    function renderQueryButtons() {
      queryTagList.innerHTML = '';

      const rarities = ['#IR', '#SIR', '#UR'];
      const tags = ['full art', 'pretty', 'colorful', 'chase'];

      // Rarity Row
      const rarityRow = document.createElement('div');
      rarityRow.style.marginBottom = '0.5rem';
      rarities.forEach(tag => {
        const btn = document.createElement('button');
        btn.textContent = tag;
        btn.className = selectedTags.has(tag) ? 'tag-button selected' : 'tag-button';
        btn.style.margin = '0.25rem';
        btn.addEventListener('click', () => toggleTag(tag));
        rarityRow.appendChild(btn);
      });
      queryTagList.appendChild(rarityRow);

      // Tag Row
      tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.textContent = tag;
        btn.className = selectedTags.has(tag) ? 'tag-button selected' : 'tag-button';
        btn.style.margin = '0.25rem';
        btn.addEventListener('click', () => toggleTag(tag));
        queryTagList.appendChild(btn);
      });
    }


  renderQueryButtons();
  updatePreview();

  runQueryBtn?.addEventListener('click', () => {
    const tags = Array.from(selectedTags);
    const mode = [...modeInputs].find(r => r.checked).value;

    if (tags.length === 0) return;

    tagSearchInput.value = tags.join(mode === 'AND' ? ' and ' : ',');
    searchCustomTags(tagSearchInput.value);
  });


}


async function loadRandomCards() {
  const cardResults = document.getElementById('cardResults');
  if (!cardResults) return;

  // First, ensure no old header
  document.getElementById('featuredHeader')?.remove();

  // Create new header
  const header = document.createElement('h3');
  header.id = 'featuredHeader';
  header.textContent = '🌟 Featured Cards';
  header.style.marginTop = '1rem';
  header.style.textAlign = 'center';

  // Insert before cardResults
  cardResults.parentNode.insertBefore(header, cardResults);


  try {
    // Step 1: get total card count
    const countRes = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=1', {
      headers: { 'X-Api-Key': API_KEY }
    });
    const countData = await countRes.json();
    const totalCards = countData.totalCount || 10000;

    // Step 2: pick a random page that would have 5 cards
    const pageSize = 5;
    const totalPages = Math.floor(totalCards / pageSize);
    const randomPage = Math.floor(Math.random() * totalPages) + 1;

    // Step 3: fetch a random page
    const res = await fetch(`https://api.pokemontcg.io/v2/cards?pageSize=${pageSize}&page=${randomPage}`, {
      headers: { 'X-Api-Key': API_KEY }
    });

    const data = await res.json();
    if (!data?.data?.length) {
      cardResults.innerHTML = '<p>⚠️ Could not load featured cards.</p>';
      document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
      return;
    }

    // Add header
    const header = document.createElement('h3');
    header.id = 'featuredHeader'; // ✅ unique identifier
    header.textContent = '🌟 Featured Cards';
    header.style.marginTop = '1rem';
    header.style.textAlign = 'center';
    cardResults.before(header);

    showCards(data.data, false);
  } catch (err) {
    console.error('Failed to load random cards:', err);
    cardResults.innerHTML = '<p>⚠️ Failed to load featured cards.</p>';
    document.getElementById('featuredHeader')?.remove(); // remove "🌟 Featured Cards" if present
  }
}



// Ensure the tag cloud is built on page load

document.addEventListener('DOMContentLoaded', () => {
  console.log('📌 DOM loaded in search.js');


  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const val = searchInput.value.trim();
    if (val) {
      trackEvent('search_click', { tag: 'Pokemon API Search' });
      searchCards(val);
    }
  });

  document.getElementById('tagSearchBtn')?.addEventListener('click', () => {
    const val = tagSearchInput.value.trim();
    if (val) {
      trackEvent('search_click', { tag: 'Tag Search' });
      searchCustomTags(val);
    }
  });



  createTagCloud();
  initSearchPage(); // ✅ Add this call
  loadApprovedTags(); 
  loadRandomCards();
});

// 👇 Make them available to inline handlers (fallback support)
window.searchCards = searchCards;
window.searchCustomTags = searchCustomTags;

// 👇 Make them available to other modules like script.js
//export { searchCards, searchCustomTags };
