let currentView = 'grid'; // or 'detail'

document.addEventListener('DOMContentLoaded', () => {
  containerView = document.getElementById('cardContainerView');
  detailView = document.getElementById('cardDetailView');
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
    cardDiv.addEventListener('click', () => openCardDetail(card));
    cardContainer.appendChild(cardDiv);
  });
}

loadSampleCards();

const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('tagSearchInput');

searchBtn.addEventListener('click', () => {
  const term = searchInput.value.trim().toLowerCase();
  if (!term) return;

  if (term.startsWith('#')) {
    searchCustomTags(term.substring(1));
  } else {
    searchByPokemonName(term);
  }
});

async function searchByPokemonName(name) {
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
  cardContainer.innerHTML = '';

  if (!cards || cards.length === 0) {
    cardContainer.innerHTML = '<p>No results found.</p>';
    return;
  }

  cards.forEach(card => {
    const div = document.createElement('div');
    div.className = 'card-preview';
    div.innerHTML = `
      <img src="${card.images.small}" alt="${card.name}" />
      <p>${card.name}</p>
    `;
    div.addEventListener('click', () => openCardDetail({ id: card.id }));
    cardContainer.appendChild(div);
  });

  currentView = 'grid';
  updateView();
}


const tagInput = document.getElementById('tagInput');
const submitTagBtn = document.getElementById('submitTagBtn');

if (submitTagBtn) {
  submitTagBtn.addEventListener('click', async () => {
    const raw = tagInput.value.trim().toLowerCase();
    const tag = raw.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ');

    if (!tag || tag.length > 20) {
      alert('❌ Tag must be 1–20 characters.');
      return;
    }

    try {
      const whoamiRes = await fetch('/api/whoami');
      const whoami = await whoamiRes.json();
      if (!whoami?.userId) {
        alert('🚫 You must be logged in to submit tags.');
        return;
      }

      const cardId = document
        .querySelector('#cardDetailContent p:nth-of-type(2)')
        .textContent.replace('Card Number:', '')
        .trim();

      const res = await fetch(`/api/tag-submissions/${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName: tag })
      });

      const data = await res.json();
      if (res.ok) {
        alert('✅ Tag submitted for review.');
        tagInput.value = '';
        renderTags(cardId);
      } else {
        alert(data.message || '❌ Failed to submit tag.');
      }
    } catch (err) {
      console.error('Tag submission error:', err);
      alert('❌ An error occurred.');
    }
  });
}




//
//
}); // End of DOMLoader
//
//

let containerView;
let detailView;

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
    container.innerHTML = `
      <img src="${fullCard.images.large}" alt="${fullCard.name}" style="max-width: 300px;" />
      <h2>${fullCard.name}</h2>
      <p><strong>Set:</strong> ${fullCard.set.name}</p>
      <p><strong>Card Number:</strong> ${fullCard.number}</p>
      <p><strong>Rarity:</strong> ${fullCard.rarity || 'Unknown'}</p>
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
  tagList.innerHTML = '<li>Loading...</li>';

  fetch(`/api/newtags/${cardId}`)
    .then(res => res.json())
    .then(tags => {
      tagList.innerHTML = '';
      if (!tags.length) {
        tagList.innerHTML = '<li>No tags yet.</li>';
        return;
      }

      tags.forEach(tag => {
        const li = document.createElement('li');
        li.textContent = tag.tag;
        tagList.appendChild(li);
      });
    })
    .catch(err => {
      console.error('❌ Error fetching tags:', err);
      tagList.innerHTML = '<li>Error loading tags.</li>';
    });
}


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

