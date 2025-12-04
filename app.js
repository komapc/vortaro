// Version
const VERSION = '1.0.0';

// Dictionary data
let dictionary = {};
let allEntries = [];
let metadata = null;
let currentDirection = 'io-eo'; // 'io-eo' or 'eo-io'

// Touch/swipe handling
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// Filters state
const activeFilters = {
    sources: new Set()
};
const availableSources = new Set();

// Load dictionary data
async function loadDictionary() {
    try {
        const response = await fetch('dictionary.json');
        const data = await response.json();

        // Extract and store metadata
        metadata = data.metadata || null;
        delete data.metadata;
        dictionary = data;

        // Create searchable entries array with bidirectional support and source info
        allEntries = Object.entries(dictionary).map(([idoWord, entryData]) => ({
            ido: idoWord,
            esperanto: entryData.esperanto_words || [],
            morfologio: entryData.morfologio || [],
            sources: entryData.sources || []
        }));

        // Update word count
        const totalEntries = metadata?.total_unique_ido_words || allEntries.length;
        document.getElementById('wordCount').textContent = `${totalEntries.toLocaleString()} vorti`;

        // Initialize filters
        initializeFilters();

        // Show empty state
        showEmptyState();
    } catch (error) {
        console.error('Error loading dictionary:', error);
        document.getElementById('results').innerHTML =
            '<div class="no-results">Error loading dictionary. Please try again later.</div>';
    }
}

// Search function
function search(query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
        showEmptyState();
        return;
    }

    // Search based on current direction
    let results = allEntries.filter(entry => {
        if (currentDirection === 'io-eo') {
            // Ido → Esperanto: search only in Ido words
            return entry.ido.toLowerCase().includes(searchTerm);
        } else {
            // Esperanto → Ido: search only in Esperanto translations
            return entry.esperanto.some(eoWord => eoWord.toLowerCase().includes(searchTerm));
        }
    });

    // Apply source filters
    results = applyFilters(results);

    displayResults(results, searchTerm);
}

// Display search results
function displayResults(results, searchTerm) {
    const resultsContainer = document.getElementById('results');
    const searchInfo = document.getElementById('searchInfo');

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">Nula rezulti por "' + searchTerm + '"</div>';
        searchInfo.textContent = '0 rezulti';
        return;
    }

    searchInfo.textContent = `${results.length} rezulto${results.length !== 1 ? 'i' : ''}`;

    const html = results.map(entry => {
        // Generate source badges with links
        const sourceBadges = entry.sources && entry.sources.length > 0
            ? entry.sources.map(source => {
                const badgeClass = getBadgeClass(source);
                const badgeText = getBadgeText(source);
                const url = getSourceUrl(source, entry.ido, entry.esperanto[0]);

                // Create appropriate tooltip text
                let tooltipText = source;
                if (source === 'fr_wiktionary_meaning') {
                    tooltipText = 'Serchar en Franca Wiktionary (via-traduko)';
                } else if (source === 'en_wiktionary_meaning') {
                    tooltipText = 'Serchar en Angla Wiktionary (via-traduko)';
                } else if (source.includes('_meaning')) {
                    tooltipText = `Serchar en ${source} (via-traduko)`;
                } else if (url) {
                    tooltipText = `Vidar ${source} en nova fenestro`;
                }

                if (url) {
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-badge ${badgeClass}" title="${tooltipText}">${badgeText}</a>`;
                } else {
                    return `<span class="source-badge ${badgeClass}" title="${tooltipText}">${badgeText}</span>`;
                }
            }).join(' ')
            : '';

        if (currentDirection === 'io-eo') {
            // Ido → Esperanto
            return `
                <div class="result-item">
                    <div class="source-word">${highlightMatch(entry.ido, searchTerm)}</div>
                    <div class="target-words">
                        → ${entry.esperanto.map(word => word).join(', ') || '<em>nula traduko</em>'}
                    </div>
                    ${generatePosBadges(entry.morfologio)}
                    ${sourceBadges ? `<div class="sources">${sourceBadges}</div>` : ''}
                    ${entry.morfologio.length > 0 ?
                    `<div class="morfologio">Morfologio: ${entry.morfologio.join(' + ')}</div>` :
                    ''
                }
                </div>
            `;
        } else {
            // Esperanto → Ido
            return `
                <div class="result-item">
                    <div class="target-words">
                        ${entry.esperanto.map(word => highlightMatch(word, searchTerm)).join(', ')}
                    </div>
                    <div class="source-word">
                        → ${entry.ido}
                    </div>
                    ${generatePosBadges(entry.morfologio)}
                    ${sourceBadges ? `<div class="sources">${sourceBadges}</div>` : ''}
                    ${entry.morfologio.length > 0 ?
                    `<div class="morfologio">Morfologio: ${entry.morfologio.join(' + ')}</div>` :
                    ''
                }
                </div>
            `;
        }
    }).join('');

    resultsContainer.innerHTML = html;
}

// Initialize filters
function initializeFilters() {
    // Extract all available sources from dictionary
    allEntries.forEach(entry => {
        entry.sources.forEach(source => {
            availableSources.add(source);
        });
    });

    // Populate source filter checkboxes
    populateSourceFilters();

    // Add event listeners
    setupFilterEventListeners();
}

// Populate source filter checkboxes
function populateSourceFilters() {
    const sourceFiltersContainer = document.getElementById('sourceFilters');

    // Define source display info
    const sourceInfo = {
        'io_wiktionary': { icon: '📕', label: 'Ido Wiktionary' },
        'eo_wiktionary': { icon: '📗', label: 'Esperanto Wiktionary' },
        'fr_wiktionary': { icon: '🇫🇷', label: 'French Wiktionary' },
        'fr_wiktionary_meaning': { icon: '🇫🇷', label: 'French Wiktionary (via)' },
        'en_wiktionary_meaning': { icon: '🇬🇧', label: 'English Wiktionary (via)' },
        'io_wikipedia': { icon: '📚', label: 'Ido Wikipedia' },
        'whitelist': { icon: '✅', label: 'Whitelist' },
        'wiki': { icon: '📚', label: 'Wikipedia' },
        'WIKI': { icon: '📚', label: 'Wikipedia' }
    };

    // Sort sources for consistent display
    const sortedSources = Array.from(availableSources).sort();

    sourceFiltersContainer.innerHTML = sortedSources.map(source => {
        const info = sourceInfo[source] || { icon: '📄', label: source };
        return `
            <div class="filter-option">
                <input type="checkbox" 
                       class="filter-checkbox" 
                       id="source-${source}" 
                       value="${source}"
                       data-filter-type="source">
                <label for="source-${source}" class="filter-label">
                    <span class="source-icon">${info.icon}</span>
                    ${info.label}
                </label>
            </div>
        `;
    }).join('');
}

// Apply active filters to results
function applyFilters(results) {
    if (activeFilters.sources.size === 0) {
        return results; // No source filters active
    }

    return results.filter(entry => {
        // Check if entry has any of the selected sources
        return entry.sources.some(source => activeFilters.sources.has(source));
    });
}

// Toggle filters panel
function toggleFiltersPanel() {
    const toggle = document.getElementById('filtersToggle');
    const panel = document.getElementById('filtersPanel');
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

    toggle.setAttribute('aria-expanded', !isExpanded);
    panel.setAttribute('aria-hidden', isExpanded);
}

// Handle filter change
function handleFilterChange(event) {
    const checkbox = event.target;
    const filterType = checkbox.dataset.filterType;
    const value = checkbox.value;

    if (filterType === 'source') {
        if (checkbox.checked) {
            activeFilters.sources.add(value);
        } else {
            activeFilters.sources.delete(value);
        }
    }

    // Update filter count display
    updateFilterCount();

    // Re-run search with current query
    const searchInput = document.getElementById('searchInput');
    if (searchInput.value.trim()) {
        search(searchInput.value);
    }
}

// Clear all filters
function clearAllFilters() {
    activeFilters.sources.clear();

    // Uncheck all checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Update display
    updateFilterCount();

    // Re-run search
    const searchInput = document.getElementById('searchInput');
    if (searchInput.value.trim()) {
        search(searchInput.value);
    }
}

// Update filter count badge
function updateFilterCount() {
    const countElement = document.getElementById('filtersCount');
    const totalActive = activeFilters.sources.size;

    if (totalActive > 0) {
        countElement.textContent = totalActive;
    } else {
        countElement.textContent = '';
    }
}

// Setup filter event listeners
function setupFilterEventListeners() {
    // Filters toggle
    document.getElementById('filtersToggle').addEventListener('click', toggleFiltersPanel);

    // Clear filters button
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);

    // Filter checkboxes (using event delegation)
    document.getElementById('sourceFilters').addEventListener('change', handleFilterChange);
}

// Generate part of speech badges
function generatePosBadges(morfologio) {
    if (!morfologio || morfologio.length === 0) {
        return '';
    }

    const posBadges = morfologio.map(morph => {
        const pos = extractPartOfSpeech(morph);
        if (pos) {
            const posClass = getPartOfSpeechClass(pos);
            const posText = getPartOfSpeechText(pos);
            return `<span class="pos-badge ${posClass}" title="${pos}">${posText}</span>`;
        }
        return '';
    }).filter(badge => badge).join(' ');

    return posBadges ? `<div class="pos-badges">${posBadges}</div>` : '';
}

// Extract part of speech from morfologio string
function extractPartOfSpeech(morph) {
    // Common patterns in morfologio: "o__n" (noun), "ar__v" (verb), "a__adj" (adjective), etc.
    if (morph.includes('__n') || morph.includes('o__')) {
        return 'noun';
    }
    if (morph.includes('__v') || morph.includes('ar__') || morph.includes('ir__') || morph.includes('or__')) {
        return 'verb';
    }
    if (morph.includes('__adj') || morph.includes('a__')) {
        return 'adjective';
    }
    if (morph.includes('__adv') || morph.includes('e__')) {
        return 'adverb';
    }
    if (morph.includes('__prep')) {
        return 'preposition';
    }
    if (morph.includes('__conj')) {
        return 'conjunction';
    }
    if (morph.includes('__pron')) {
        return 'pronoun';
    }
    if (morph.includes('__interj')) {
        return 'interjection';
    }
    return null;
}

// Get CSS class for part of speech
function getPartOfSpeechClass(pos) {
    const posMap = {
        'noun': 'pos-noun',
        'verb': 'pos-verb',
        'adjective': 'pos-adj',
        'adverb': 'pos-adv',
        'preposition': 'pos-prep',
        'conjunction': 'pos-conj',
        'pronoun': 'pos-pron',
        'interjection': 'pos-interj'
    };
    return posMap[pos] || 'pos-badge';
}

// Get display text for part of speech
function getPartOfSpeechText(pos) {
    const posMap = {
        'noun': 'n',
        'verb': 'v',
        'adjective': 'adj',
        'adverb': 'adv',
        'preposition': 'prep',
        'conjunction': 'conj',
        'pronoun': 'pron',
        'interjection': 'interj'
    };
    return posMap[pos] || pos;
}

// Get badge CSS class for source
function getBadgeClass(source) {
    if (source.includes('fr_wiktionary') || source.includes('pivot_fr')) { return 'badge-fr'; }
    if (source.includes('en_wiktionary') || source.includes('pivot_en')) { return 'badge-en'; }
    if (source.includes('io_wiktionary') || source === 'wikt_io' || source === 'IO') { return 'badge-io'; }
    if (source.includes('eo_wiktionary') || source === 'wikt_eo') { return 'badge-eo'; }
    if (source.includes('io_wikipedia') || source.includes('wikipedia') || source === 'wiki' || source === 'WIKI') { return 'badge-wiki'; }
    return 'badge-default';
}

// Get badge display text for source
function getBadgeText(source) {
    if (source === 'fr_wiktionary_meaning') { return '🇫🇷 FR🔍'; }
    if (source === 'en_wiktionary_meaning') { return '🇬🇧 EN🔍'; }
    if (source.includes('fr_wiktionary') || source.includes('pivot_fr')) { return '🇫🇷 FR'; }
    if (source.includes('en_wiktionary') || source.includes('pivot_en')) { return '🇬🇧 EN'; }
    if (source.includes('io_wiktionary') || source === 'wikt_io' || source === 'IO') { return '📕 IO'; }
    if (source.includes('eo_wiktionary') || source === 'wikt_eo') { return '📗 EO'; }
    if (source.includes('io_wikipedia') || source.includes('wikipedia') || source === 'wiki' || source === 'WIKI') { return '📚 WIKI'; }
    return source.substring(0, 8);
}

// Get source URL for linking
function getSourceUrl(source, idoWord, esperantoWord) {
    // Encode words for URLs
    const encodeWord = (word) => encodeURIComponent(word || '');

    // Ido Wiktionary
    if (source.includes('io_wiktionary') || source === 'wikt_io' || source === 'IO') {
        return `https://io.wiktionary.org/wiki/${encodeWord(idoWord)}`;
    }

    // Esperanto Wiktionary
    if (source.includes('eo_wiktionary') || source === 'wikt_eo') {
        return esperantoWord
            ? `https://eo.wiktionary.org/wiki/${encodeWord(esperantoWord)}`
            : null;
    }

    // Ido Wikipedia
    if (source.includes('io_wikipedia') || source.includes('wikipedia') || source === 'wiki' || source === 'WIKI') {
        // Capitalize first letter for Wikipedia
        const capitalizedWord = idoWord.charAt(0).toUpperCase() + idoWord.slice(1);
        return `https://io.wikipedia.org/wiki/${encodeWord(capitalizedWord)}`;
    }

    // French Wiktionary (direct entries)
    if (source.includes('fr_wiktionary') && !source.includes('_meaning')) {
        return `https://fr.wiktionary.org/wiki/${encodeWord(idoWord)}`;
    }

    // French Wiktionary (pivot translations via meaning)
    if (source === 'fr_wiktionary_meaning' || source.includes('pivot_fr')) {
        // Link to search for the Ido word in French Wiktionary
        return `https://fr.wiktionary.org/wiki/Spécial:Recherche/${encodeWord(idoWord)}`;
    }

    // English Wiktionary (direct entries)
    if (source.includes('en_wiktionary') && !source.includes('_meaning')) {
        return `https://en.wiktionary.org/wiki/${encodeWord(idoWord)}`;
    }

    // English Wiktionary (pivot translations via meaning)
    if (source === 'en_wiktionary_meaning' || source.includes('pivot_en')) {
        // Link to search for the Ido word in English Wiktionary
        return `https://en.wiktionary.org/wiki/Special:Search/${encodeWord(idoWord)}`;
    }

    // No URL available for this source
    return null;
}

// Highlight matching text
function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 2px 1px; border-radius: 2px;">$1</mark>');
}

// Show empty state
function showEmptyState() {
    const resultsContainer = document.getElementById('results');
    const searchInfo = document.getElementById('searchInfo');

    searchInfo.textContent = '';
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <p>Komencez skribar por serchar en la vortaro...</p>
        </div>
    `;
}

// Toggle translation direction
function toggleDirection() {
    currentDirection = currentDirection === 'io-eo' ? 'eo-io' : 'io-eo';

    // Update button
    const toggleBtn = document.getElementById('directionToggle');
    const toggleText = toggleBtn.querySelector('.toggle-text');
    toggleBtn.setAttribute('data-direction', currentDirection);
    toggleText.textContent = currentDirection === 'io-eo' ? 'Ido → Esperanto' : 'Esperanto → Ido';

    // Update placeholder
    const searchInput = document.getElementById('searchInput');
    searchInput.placeholder = currentDirection === 'io-eo'
        ? 'Serchez en Ido...'
        : 'Serchez en Esperanto...';

    // Update URL hash with new direction
    const query = searchInput.value.trim();
    if (query) {
        window.history.replaceState(null, '', `#${currentDirection}:${encodeURIComponent(query)}`);
    }

    // Re-run search if there's a query
    if (query) {
        search(searchInput.value);
    }
}

// Show random word
function showRandomWord() {
    if (allEntries.length === 0) {
        return;
    }

    // Get filtered entries if filters are active
    let availableEntries = allEntries;
    if (activeFilters.sources.size > 0) {
        availableEntries = applyFilters(allEntries);
    }

    if (availableEntries.length === 0) {
        document.getElementById('results').innerHTML = '<div class="no-results">Nula vorti kun ca filtri</div>';
        document.getElementById('searchInfo').textContent = '0 rezulti';
        return;
    }

    // Pick random entry from available (filtered) entries
    const randomIndex = Math.floor(Math.random() * availableEntries.length);
    const randomEntry = availableEntries[randomIndex];

    // Set search input to random word
    const searchInput = document.getElementById('searchInput');
    const randomWord = currentDirection === 'io-eo' ? randomEntry.ido :
        (randomEntry.esperanto[0] || randomEntry.ido);
    searchInput.value = randomWord;

    // Update URL hash with direction
    window.history.replaceState(null, '', `#${currentDirection}:${encodeURIComponent(randomWord)}`);

    // Trigger search
    search(randomWord);
}

// Show about modal with metadata
function showAboutModal() {
    const modal = document.getElementById('aboutModal');
    const modalBody = document.getElementById('modalBody');

    if (metadata) {
        const lastUpdate = new Date(metadata.last_updated).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const sourceStats = metadata.source_stats || {};
        const totalSources = Object.values(sourceStats).reduce((a, b) => a + b, 0);

        modalBody.innerHTML = `
            <h3>📚 Informo pri la Vortaro</h3>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Tota vorti:</strong> ${(metadata.total_unique_ido_words || 0).toLocaleString()}
                </div>
                <div class="info-item">
                    <strong>Latest actualizuro:</strong> ${lastUpdate}
                </div>
                <div class="info-item">
                    <strong>Tota traduki:</strong> ${totalSources.toLocaleString()}
                </div>
            </div>
            
            <h3>🔨 Quale ol kreesis</h3>
            <p>Ca vortaro automatale extraktesis e kompilesis de multa fonti per la <strong>ONE BIG BIDIX</strong> pipelino:</p>
            
            <h4>📊 Fonti di traduki</h4>
            <ul>
                ${sourceStats.io_wiktionary ? `<li>📕 <strong>Ido Wiktionary:</strong> ${sourceStats.io_wiktionary.toLocaleString()} traduki</li>` : ''}
                ${sourceStats.io_wikipedia ? `<li>📚 <strong>Ido Wikipedia:</strong> ${sourceStats.io_wikipedia.toLocaleString()} vorti</li>` : ''}
                ${sourceStats.fr_wiktionary_via ? `<li>🇫🇷 <strong>Franca Wiktionary</strong> (via): ${sourceStats.fr_wiktionary_via.toLocaleString()} traduki</li>` : ''}
                ${sourceStats.eo_wiktionary ? `<li>📗 <strong>Esperanto Wiktionary:</strong> ${sourceStats.eo_wiktionary.toLocaleString()} traduki</li>` : ''}
            </ul>
            
            <h4>🌍 Quo esas "via" traduko?</h4>
            <p>"Via" traduko uzas interjacanta linguo (komente Franca o Angla) por krear traduki inter Ido e Esperanto kande rekta traduki ne disponesas.</p>
            <p><strong>Exemplo:</strong> Se ni savas Ido→Franca e Franca→Esperanto, ni povas infercar Ido→Esperanto <em>via</em> Franca.</p>
            
            <h3>⚖️ Licenco e Fonti</h3>
            <p>La datumi en ca vortaro venas de diversa fonti kun diversa licenco:</p>
            <ul>
                <li><strong>Wiktionary datumi:</strong> <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">CC BY-SA 3.0</a></li>
                <li><strong>Wikipedia datumi:</strong> <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">CC BY-SA 3.0</a></li>
                <li><strong>Ca softwaro:</strong> Libera e apertkoda</li>
            </ul>
            <p><small>Atribuciono mustas donesez a <a href="https://io.wiktionary.org" target="_blank">Ido Wiktionary</a>, <a href="https://eo.wiktionary.org" target="_blank">Esperanto Wiktionary</a>, <a href="https://io.wikipedia.org" target="_blank">Ido Wikipedia</a>, e <a href="https://fr.wiktionary.org" target="_blank">Franca Wiktionary</a>.</small></p>
            
            <h3>🛠️ Utensili & Projekto</h3>
            <p>La vortaro extraktesas per <a href="https://github.com/komapc/ido-esperanto-extractor" target="_blank">ido-esperanto-extractor</a>, qua procesas Wiktionary-dumps e Wikipedia-datumi por krear kompleta dulingva vortari.</p>
            
            <p><strong>Relatanta projekti:</strong></p>
            <ul>
                <li><a href="https://github.com/komapc/ido-epo-translator" target="_blank">ido-epo-translator</a> - Kompleta traduk-sistemo</li>
                <li><a href="https://github.com/komapc/apertium-ido-epo" target="_blank">apertium-ido-epo</a> - Apertium linguo-paro</li>
            </ul>
        `;
    } else {
        modalBody.innerHTML = `
            <p>Vortaro-metadatumi ne disponesas.</p>
            <p>Ca vortaro provizas dudireciona serchado inter Ido e Esperanto vorti.</p>
        `;
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('aboutModal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Update URL hash with direction and query
    if (query) {
        window.history.replaceState(null, '', `#${currentDirection}:${encodeURIComponent(query)}`);
    } else {
        window.history.replaceState(null, '', window.location.pathname);
    }

    search(e.target.value);
});

// Direction toggle
document.getElementById('directionToggle').addEventListener('click', toggleDirection);
document.getElementById('directionToggle').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDirection();
    }
});

// Random word button
document.getElementById('randomBtn').addEventListener('click', showRandomWord);
document.getElementById('randomBtn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showRandomWord();
    }
});

// About modal
document.getElementById('infoButton').addEventListener('click', showAboutModal);
document.getElementById('closeModal').addEventListener('click', closeModal);

// Keyboard support for modal buttons
document.getElementById('infoButton').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showAboutModal();
    }
});
document.getElementById('closeModal').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        closeModal();
    }
});

// Close modal on outside click
document.getElementById('aboutModal').addEventListener('click', (e) => {
    if (e.target.id === 'aboutModal') {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Swipe detection functions
function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    handleSwipe();
}

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 50;

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
            // Swipe right - switch to Ido → Esperanto
            if (currentDirection !== 'io-eo') {
                toggleDirection();
            }
        } else {
            // Swipe left - switch to Esperanto → Ido
            if (currentDirection !== 'eo-io') {
                toggleDirection();
            }
        }
    }
}

// Initialize PullToRefresh
function initializePullToRefresh() {
    if (typeof PullToRefresh !== 'undefined') {
        PullToRefresh.init({
            mainElement: '#results',
            onRefresh() {
                return loadDictionary();
            },
            instructionsPullToRefresh: 'Tirez por aktualizar',
            instructionsReleaseToRefresh: 'Liberez por aktualizar',
            instructionsRefreshing: 'Aktualizante...',
            distThreshold: 60,
            distMax: 80,
            distReload: 50,
            bodyOffset: 20,
            iconArrow: '↓',
            iconRefreshing: '↻',
            shouldPullToRefresh() {
                return !window.scrollY;
            }
        });
    }
}

// Add touch event listeners for swipe detection
document.addEventListener('touchstart', handleTouchStart, { passive: true });
document.addEventListener('touchend', handleTouchEnd, { passive: true });

// Parse URL hash to extract direction and query
function parseHash(hash) {
    if (!hash) {
        return { direction: null, query: '' };
    }

    // Check if hash contains direction (format: "io-eo:word" or "eo-io:word")
    const colonIndex = hash.indexOf(':');
    if (colonIndex > 0) {
        const direction = hash.substring(0, colonIndex);
        const query = decodeURIComponent(hash.substring(colonIndex + 1));

        // Validate direction
        if (direction === 'io-eo' || direction === 'eo-io') {
            return { direction, query };
        }
    }

    // Fallback: treat entire hash as query (backward compatibility)
    return { direction: null, query: decodeURIComponent(hash) };
}

// Handle URL hash on page load
function handleInitialHash() {
    const hash = window.location.hash.slice(1); // Remove the '#'
    if (hash) {
        const { direction, query } = parseHash(hash);
        const searchInput = document.getElementById('searchInput');

        // Set direction if specified
        if (direction && direction !== currentDirection) {
            currentDirection = direction;
            const toggleBtn = document.getElementById('directionToggle');
            const toggleText = toggleBtn.querySelector('.toggle-text');
            toggleBtn.setAttribute('data-direction', currentDirection);
            toggleText.textContent = currentDirection === 'io-eo' ? 'Ido → Esperanto' : 'Esperanto → Ido';
            searchInput.placeholder = currentDirection === 'io-eo'
                ? 'Serchez en Ido...'
                : 'Serchez en Esperanto...';
        }

        searchInput.value = query;
        search(query);
    }
}

// Handle hash changes (browser back/forward)
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    const { direction, query } = parseHash(hash);
    const searchInput = document.getElementById('searchInput');

    // Update direction if specified and different
    if (direction && direction !== currentDirection) {
        currentDirection = direction;
        const toggleBtn = document.getElementById('directionToggle');
        const toggleText = toggleBtn.querySelector('.toggle-text');
        toggleBtn.setAttribute('data-direction', currentDirection);
        toggleText.textContent = currentDirection === 'io-eo' ? 'Ido → Esperanto' : 'Esperanto → Ido';
        searchInput.placeholder = currentDirection === 'io-eo'
            ? 'Serchez en Ido...'
            : 'Serchez en Esperanto...';
    }

    // Only update if different from current value
    if (searchInput.value !== query) {
        searchInput.value = query;
        if (query) {
            search(query);
        } else {
            showEmptyState();
        }
    }
});

// Initialize version display
function initializeVersion() {
    const versionElement = document.getElementById('version');
    if (versionElement) {
        versionElement.textContent = `v${VERSION}`;
    }
}

// Initialize
loadDictionary().then(() => {
    // Initialize PullToRefresh after dictionary is loaded
    initializePullToRefresh();

    // Handle initial URL hash
    handleInitialHash();

    // Initialize version display
    initializeVersion();
});

