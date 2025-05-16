console.log('📊 Leaderboards JS loaded');

const timeFilterButtons = document.querySelectorAll('.time-filter button');
let currentFilter = 'alltime'; // default

timeFilterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    console.log(`🕒 Filter switched to: ${currentFilter}`);
    loadLeaderboards();
  });
});

async function loadLeaderboards() {
  // User-Based Leaderboards
  loadUserLeaderboard('most-tags-submitted', 'mostTagsSubmitted');
  loadUserLeaderboard('most-tags-approved', 'mostTagsApproved');
  loadUserLeaderboard('most-tags-denied', 'mostTagsDenied');
  loadUserLeaderboard('top-approval-rates', 'topApprovalRates');

  // Tag-Based Leaderboards
  loadTagLeaderboard('most-used-tags', 'mostUsedTags');
  loadTagLeaderboard('most-tagged-cards', 'mostTaggedCards');
  loadTagLeaderboard('most-searched-tags', 'mostSearchedTags');
}

async function loadUserLeaderboard(endpoint, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = 'Loading...';

  try {
    const res = await fetch(`/api/leaderboards/${endpoint}?filter=${currentFilter}`);
    const data = await res.json();

    if (!data || data.length === 0) {
      container.innerHTML = 'No data available.';
      return;
    }

    const ul = document.createElement('ul');
    data.slice(0, 5).forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.username || entry.name}: ${entry.value}`;
    ul.appendChild(li);
    });


    container.innerHTML = '';
    container.appendChild(ul);
  } catch (err) {
    console.error(`❌ Failed to load ${endpoint}:`, err);
    container.innerHTML = 'Error loading data.';
  }
}

async function loadTagLeaderboard(endpoint, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = 'Loading...';

  try {
    const res = await fetch(`/api/leaderboards/${endpoint}?filter=${currentFilter}`);
    const data = await res.json();

    if (!data || data.length === 0) {
      container.innerHTML = 'No data available.';
      return;
    }

    const ul = document.createElement('ul');
    data.slice(0, 5).forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.username || entry.name}: ${entry.value}`;
    ul.appendChild(li);
    });


    container.innerHTML = '';
    container.appendChild(ul);
  } catch (err) {
    console.error(`❌ Failed to load ${endpoint}:`, err);
    container.innerHTML = 'Error loading data.';
  }
}

// Initial load
loadLeaderboards();
