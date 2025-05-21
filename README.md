# 🔍 Card Search System Overview (script.js vs search.js)

### ✅ script.js (Main Search Logic + Shared Utils)
- `searchCards(query, page = 1)` → Primary Pokémon search (by name, type, filters)
- `searchCustomTags(input)` → Community-powered tag search
- `resetSearchState()` → Clears query + pagination state
- `buildQuery()` → Translates raw input into API query
- `updateResultsCount()` → Updates count display UI
- `showCards()` → Renders cards to the grid
- `loadApprovedTags()` → Loads tag whitelist
- `approvedTagsSet` → Holds approved tag strings
- `renderFavoriteButton()` → Displays "Save to Favorites" logic
- `storeRecentSearch()` / `storeRecentlyViewedCard()` / `loadRecentCards()` → Search + view history tracking
- `applyCardColorTheme()` → Styles links in popup by type color
- `openCardPopup()` → Full detail popup with tagging, price, and collection controls

### ✅ search.js (Search UI Enhancer)
- `createTagCloud()` → Builds tag and rarity cloud for quick searches
- `loadRandomCards()` → Loads "🌟 Featured Cards" carousel on landing
- `initSearchPage()` → Tag button row + manual query system setup
- Event listeners for `searchBtn`, `tagSearchBtn`, enter key, etc.
- Uses `searchCards()` / `searchCustomTags()` from `script.js` via `window.*`

### 🌐 Key Globals (Shared across modules)
- `window.searchCards`, `window.searchCustomTags` → Allow interop across JS files
- `window.searchResults`, `window.currentPopupIndex` → Manage popup navigation state

### 🔐 Environment
- API key stored in `.env` as:```env POKEMON_API_KEY
