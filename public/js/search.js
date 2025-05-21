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
      //searchCards(query);
      window.searchCards(query);
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

    const viewSetsBtn = document.createElement('button');
    viewSetsBtn.id = 'viewSetsBtn';
    viewSetsBtn.textContent = '📦 View All Card Sets';
    viewSetsBtn.classList.add('rarity-button');
    viewSetsBtn.style.marginLeft = '0.5rem';
    rarityRow.appendChild(chaseBtn);
    rarityRow.appendChild(viewSetsBtn);
    tagCloud.appendChild(rarityRow);

    viewSetsBtn.addEventListener('click', async () => {
      const setsPopup = document.getElementById('setsPopup');
      const closeSetsPopup = document.getElementById('closeSetsPopup');
      const setsList = document.getElementById('setsList');

      if (!setsPopup || !setsList || !closeSetsPopup) return;

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

        document.querySelectorAll('.set-logo').forEach(img => {
          img.addEventListener('click', () => {
            const setId = img.dataset.setId;
            if (setId) {
              searchInput.value = setId;
              //searchCards(`set.id:${setId}`);
              window.searchCards(`set.id:${setId}`);
              setsPopup.classList.add('hidden');
            }
          });
        });
      } catch (error) {
        console.error('Error fetching sets:', error);
        setsList.innerHTML = '<li>Error loading sets</li>';
      }

      closeSetsPopup.addEventListener('click', () => {
        setsPopup.classList.add('hidden');
      });

      setsPopup.addEventListener('click', (e) => {
        if (e.target === setsPopup) {
          setsPopup.classList.add('hidden');
        }
      });
    });



}








function initSearchPage() {
  console.log('🔍 Initializing search page...');

  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const val = searchInput.value.trim();
    if (val) {
      trackEvent('pokemon_search', {
        query: val
      });
      //searchCards(val);
      window.searchCards(val);
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
      if (query !== '') window.searchCards(query);
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
      //searchCards(val);
      window.searchCards(val);
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
