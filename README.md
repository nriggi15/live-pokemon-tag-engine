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
- `toggleLoadMoreButton()` → Manages visibility of "🔁 Load More" button
- Global dark mode toggle + sidebar behavior
- Tag stats modal with interactive list
- `#surpriseBtn` → Random tag search
- `#filterBtn` → Toggles advanced filter panel

### ✅ search.js (Search UI Enhancer)
- `createTagCloud()` → Builds tag and rarity cloud for quick searches
  - Includes rarity buttons (IR, SIR, UR), Chase button, and dynamically injected `📦 View All Card Sets` button
  - Handles full fetch + render + close logic for the `setsPopup`
- `loadRandomCards()` → Loads "🌟 Featured Cards" carousel on landing
- `initSearchPage()` → Manual tag & name search buttons, Enter key handling, and advanced tag query UI
- `runQueryBtn` → Executes multi-tag queries with AND/OR logic
- Dynamically binds search inputs and buttons
- Manages advanced query preview
- Popup open/close behavior for `setsPopup` handled in `createTagCloud()`

### 🌐 Key Globals (Shared across modules)
- `window.searchCards`, `window.searchCustomTags`, `window.showCards` → Allow interop across files
- `window.searchResults`, `window.currentPopupIndex` → Manage popup card navigation state
- `window.API_KEY` → Injected from `.env` at runtime via EJS

### 🔐 Environment
- API key stored in `.env` as:```env POKEMON_API_KEY

### 🆕 Recent Additions (v1.7 updates)
- `Replaced old "🧩 Show All Tagged Cards" with new 📦 View All Card Sets in tag cloud`
- `Added full setsPopup rendering logic inside createTagCloud() (no longer in script.js)`
- `Removed redundant popup binding from DOMContentLoaded`
- `All tag search, rarity buttons, and card set functionality now scoped cleanly inside search.js`
- `script.js now handles only persistent UI like dark mode, nav, and favorites`