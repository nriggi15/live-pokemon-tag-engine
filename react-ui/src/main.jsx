import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const parseQuery = (input) => {
  const tokens = input.match(/#\w+|\w+|and|or|not/gi) || [];
  const parsed = [];

  let currentOp = 'AND';
  for (let token of tokens) {
    token = token.toLowerCase();

    if (['and', 'or', 'not'].includes(token)) {
      currentOp = token.toUpperCase();
    } else {
      parsed.push({
        type: token.startsWith('#') ? 'tag' : 'name',
        value: token.replace(/^#/, ''),
        op: currentOp,
      });

      if (currentOp !== 'NOT') currentOp = 'AND';
    }
  }

  return parsed;
};

const SearchBar = () => {
  const [query, setQuery] = useState('');

const handleSearch = async () => {
  const parsed = parseQuery(query);
  const encoded = encodeURIComponent(query);

  const resultsContainer = document.getElementById('results-container');
  const spinner = document.getElementById('loading-spinner');
  const endMessage = document.getElementById('end-of-results');

  resultsContainer.innerHTML = '';
  endMessage.style.display = 'none';
  spinner.style.display = 'block';

  try {
    const res = await fetch(`/api/advanced-tag-search?q=${encoded}`);
    const data = await res.json();

    console.log('🎯 Matching Card IDs:', data.cards);

    spinner.style.display = 'none';

    if (!data.cards.length) {
      endMessage.innerText = '🚫 No matching cards found.';
      endMessage.style.display = 'block';
      return;
    }

    for (const id of data.cards) {
      const cardRes = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`);
      const cardData = await cardRes.json();
      const card = cardData.data;

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
        localStorage.setItem('lastSearchURL', window.location.href);
        window.location.href = `/card/${card.id}`;
      });

      resultsContainer.appendChild(cardEl);
      setTimeout(() => cardEl.classList.add('fade-in'), 10);
    }

    // ✅ If all cards are loaded in one go, show "end of results"
    endMessage.innerText = '✅ End of results.';
    endMessage.style.display = 'block';

  } catch (err) {
    console.error('❌ Error during advanced search:', err);
    spinner.style.display = 'none';
    endMessage.innerText = '❌ Something went wrong.';
    endMessage.style.display = 'block';
  }
};


  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="search-controls">
      <input
        type="text"
        className="search-bar"
        placeholder="Search by #tags and Pokémon names..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyPress}
      />
    </div>
  );
};

const container = document.getElementById('react-test-container');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<SearchBar />);
}
