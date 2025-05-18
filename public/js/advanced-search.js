// public/js/advanced-search.js
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  const resultsContainer = document.getElementById('results-container');

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

        // Card Type filters (checkboxes)
        document.querySelectorAll('input[name="cardType"]:checked').forEach(input => {
        params.append('cardType', input.value);
        });

        // Format dropdown
        const format = document.getElementById('formatSelect').value;
        if (format) params.append('format', format);

        // Type dropdown
        const type = document.getElementById('typeSelect').value;
        if (type) params.append('type', type);

        const res = await fetch(`/adv-search?${params.toString()}`);
        const data = await res.json();

        resultsContainer.innerHTML = '';

        data.cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-preview';
        cardEl.innerHTML = `
            <img src="${card.images.small}" alt="${card.name}" />
            <div class="hover-preview">
            <img src="${card.images.large || card.images.small}" alt="${card.name}" />
            </div>
        `;
        cardEl.addEventListener('click', () => {
            window.location.href = `/card/${card.id}`;
        });
        resultsContainer.appendChild(cardEl);
        });
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

});