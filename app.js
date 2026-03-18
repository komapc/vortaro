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

        // Handle both old and new dictionary formats
        if (Array.isArray(data.entries)) {
            // New format: {version, generation_date, statistics, entries: [{lemma, translations, ...}]}
            const stats = data.statistics || {};
            metadata = {
                total_unique_ido_words: stats.total_entries || data.entries.length,
                last_updated: data.generation_date,
                source_stats: stats.original_sources || {}
            };
            allEntries = data.entries.map(entry => ({
                ido: entry.lemma,
                esperanto: (entry.translations || []).filter(t => t.lang === 'eo').map(t => t.term),
                morfologio: entry.morphology?.paradigm ? [entry.morphology.paradigm] : [],
                sources: (entry.source_details || {}).all_sources || []
            }));
        } else {
            // Old format: {metadata, ido_word: {esperanto_words, morfologio, sources}}
            metadata = data.metadata || null;
            delete data.metadata;
            dictionary = data;
            allEntries = Object.entries(dictionary).map(([idoWord, entryData]) => ({
                ido: idoWord,
                esperanto: entryData.esperanto_words || [],
                morfologio: entryData.morfologio || [],
                sources: entryData.sources || []
            }));
        }

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

    const totalMatches = results.length;
    results = results.slice(0, 50);

    displayResults(results, searchTerm, totalMatches);
}

// Display search results
function displayResults(results, searchTerm, totalMatches = results.length) {
    const resultsContainer = document.getElementById('results');
    const searchInfo = document.getElementById('searchInfo');

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">Nula rezulti por "' + searchTerm + '"</div>';
        searchInfo.textContent = '0 rezulti';
        return;
    }

    const truncated = totalMatches > results.length;
    searchInfo.textContent = truncated
        ? `${results.length} de ${totalMatches} rezultoi`
        : `${results.length} rezulto${results.length !== 1 ? 'i' : ''}`;

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

    // Update URL with new direction using pretty paths
    const query = searchInput.value.trim();
    if (query) {
        window.history.replaceState(null, '', `/${currentDirection}/${encodeURIComponent(query)}`);
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

    // Update URL with direction and word using pretty paths
    window.history.replaceState(null, '', `/${currentDirection}/${encodeURIComponent(randomWord)}`);

    // Trigger search
    search(randomWord);
}

// Show about modal with metadata
function showAboutModal(lang = 'io') {
    const modal = document.getElementById('aboutModal');
    const modalBody = document.getElementById('modalBody');

    // Update footer labels based on language
    translateFooter(lang);

    if (!metadata) {
        modalBody.innerHTML = `
            <p>Vortaro-metadatumi ne disponesas.</p>
            <p>Ca vortaro provizas dudireciona serchado inter Ido e Esperanto vorti.</p>
        `;
        modal.style.display = 'flex';
        return;
    }

    const lastUpdate = new Date(metadata.last_updated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const sourceStats = metadata.source_stats || {};
    const totalSources = Object.values(sourceStats).reduce((a, b) => a + b, 0);

    const translations = {
        io: {
            title: '📚 Informo pri la Vortaro',
            stats: 'Statistiko',
            totalWords: 'Tota vorti',
            lastUpdated: 'Maxim recenta aktualigo',
            totalTranslations: 'Tota traduki',
            howCreated: '🔨 Quale ol kreesis',
            pipelineDesc: 'Ca vortaro automatale extraktesis e kompilesis de multa fonti per la <strong>ONE BIG BIDIX</strong>-sistemo:',
            sourcesTitle: '📊 Fonti di traduki',
            viaTitle: '🌍 Quo esas "via"-traduko?',
            viaDesc: '"Via"-traduko uzas interjacanta linguo (komence la Franca o la Angla) por krear traduki inter Ido e Esperanto kande rekta traduki ne disponesas.',
            viaExample: '<strong>Exemplo:</strong> Se ni savas Ido→Franca e Franca→Esperanto, ni povas inferar Ido→Esperanto <em>tra</em> la Franca.',
            licenseTitle: '⚖️ Licenco e Fonti',
            licenseDesc: 'La datumi en ca vortaro venas de diversa fonti kun diversa licenci:',
            attribution: 'Atribuciono devas donesar ad <a href="https://io.wiktionary.org" target="_blank">Ido-Wikivortaro</a>, <a href="https://eo.wiktionary.org" target="_blank">Esperanto-Wikivortaro</a>, <a href="https://io.wikipedia.org" target="_blank">Ido-Wikipedia</a>, e <a href="https://fr.wiktionary.org" target="_blank">Franca Wikivortaro</a>.',
            toolsTitle: '🛠️ Utensili e Projekto',
            toolsDesc: 'La vortaro extraktesas per <a href="https://github.com/komapc/ido-esperanto-extractor" target="_blank">ido-esperanto-extractor</a>, qua procesas Wiktionary-dumps e Wikipedia-datumi.',
            relatedProjects: 'Relatanta projekti:',
            translator: 'Ido-Esperanto-Tradukilo'
        },
        en: {
            title: '📚 About the Dictionary',
            stats: 'Statistics',
            totalWords: 'Total unique words',
            lastUpdated: 'Last updated',
            totalTranslations: 'Total translations',
            howCreated: '🔨 How it was created',
            pipelineDesc: 'This dictionary was automatically extracted and compiled from multiple sources using the <strong>ONE BIG BIDIX</strong> pipeline:',
            sourcesTitle: '📊 Translation Sources',
            viaTitle: '🌍 What is a "via" translation?',
            viaDesc: 'A "via" translation uses an intermediate language (like French or English) to create translations between Ido and Esperanto when direct translations are not available.',
            viaExample: '<strong>Example:</strong> If we know Ido→French and French→Esperanto, we can infer Ido→Esperanto <em>via</em> French.',
            licenseTitle: '⚖️ License and Sources',
            licenseDesc: 'The data in this dictionary comes from various sources with different licenses:',
            attribution: 'Attribution must be given to <a href="https://io.wiktionary.org" target="_blank">Ido Wiktionary</a>, <a href="https://eo.wiktionary.org" target="_blank">Esperanto Wiktionary</a>, <a href="https://io.wikipedia.org" target="_blank">Ido Wikipedia</a>, and <a href="https://fr.wiktionary.org" target="_blank">French Wiktionary</a>.',
            toolsTitle: '🛠️ Tools & Project',
            toolsDesc: 'The dictionary is extracted using <a href="https://github.com/komapc/ido-esperanto-extractor" target="_blank">ido-esperanto-extractor</a>, processing Wiktionary dumps and Wikipedia data.',
            relatedProjects: 'Related projects:',
            translator: 'Ido-Esperanto Translator'
        },
        eo: {
            title: '📚 Pri la Vortaro',
            stats: 'Statistikoj',
            totalWords: 'Totalaj vortoj',
            lastUpdated: 'Laste ĝisdatigita',
            totalTranslations: 'Totalaj tradukoj',
            howCreated: '🔨 Kiel ĝi estis kreita',
            pipelineDesc: 'Ĉi tiu vortaro estis aŭtomate elŝutita kaj kompilita el pluraj fontoj per la <strong>ONE BIG BIDIX</strong> dukto:',
            sourcesTitle: '📊 Traduk-fontoj',
            viaTitle: '🌍 Kio estas "via" traduko?',
            viaDesc: '"Via" traduko uzas interan lingvon (kiel la francan aŭ anglan) por krei tradukojn inter Ido kaj Esperanto kiam rekta traduko ne disponeblas.',
            viaExample: '<strong>Ekzemplo:</strong> Se ni scias Ido→Franca kaj Franca→Esperanto, ni povas dedukti Ido→Esperanto <em>tra</em> la franca.',
            licenseTitle: '⚖️ Permesilo kaj Fontoj',
            licenseDesc: 'La datumoj en ĉi tiu vortaro devenas de diversaj fontoj kun diversaj permesiloj:',
            attribution: 'Atribuite devas esti al <a href="https://io.wiktionary.org" target="_blank">Ido-Vikivortaro</a>, <a href="https://eo.wiktionary.org" target="_blank">Esperanto-Vikivortaro</a>, <a href="https://io.wikipedia.org" target="_blank">Ido-Vikipedio</a>, kaj <a href="https://fr.wiktionary.org" target="_blank">Franca Vikivortaro</a>.',
            toolsTitle: '🛠️ Iloj kaj Projekto',
            toolsDesc: 'La vortaro estas eltirita per <a href="https://github.com/komapc/ido-esperanto-extractor" target="_blank">ido-esperanto-extractor</a>, procesante elŝutojn de Vikivortaro kaj Vikipedio.',
            relatedProjects: 'Rilataj projektoj:',
            translator: 'Ido-Esperanto Tradukilo'
        }
    };

    const t = translations[lang] || translations.io;

    modalBody.innerHTML = `
        <div class="modal-lang-switcher" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: center;">
            <button class="lang-btn ${lang === 'io' ? 'active' : ''}" onclick="showAboutModal('io')" style="cursor: pointer; padding: 5px 10px; border: 1px solid #ccc; border-radius: 4px; background: ${lang === 'io' ? '#1f3f7a' : '#f8f9fa'}; color: ${lang === 'io' ? 'white' : 'black'}">Ido</button>
            <button class="lang-btn ${lang === 'en' ? 'active' : ''}" onclick="showAboutModal('en')" style="cursor: pointer; padding: 5px 10px; border: 1px solid #ccc; border-radius: 4px; background: ${lang === 'en' ? '#1f3f7a' : '#f8f9fa'}; color: ${lang === 'en' ? 'white' : 'black'}">English</button>
            <button class="lang-btn ${lang === 'eo' ? 'active' : ''}" onclick="showAboutModal('eo')" style="cursor: pointer; padding: 5px 10px; border: 1px solid #ccc; border-radius: 4px; background: ${lang === 'eo' ? '#1f3f7a' : '#f8f9fa'}; color: ${lang === 'eo' ? 'white' : 'black'}">Esperanto</button>
        </div>

        <h3>${t.title}</h3>
        <div class="info-grid">
            <div class="info-item">
                <strong>${t.totalWords}:</strong> ${(metadata.total_unique_ido_words || 0).toLocaleString()}
            </div>
            <div class="info-item">
                <strong>${t.lastUpdated}:</strong> ${lastUpdate}
            </div>
            <div class="info-item">
                <strong>${t.totalTranslations}:</strong> ${totalSources.toLocaleString()}
            </div>
        </div>
        
        <h3>${t.howCreated}</h3>
        <p>${t.pipelineDesc}</p>
        
        <h4>${t.sourcesTitle}</h4>
        <ul>
            ${sourceStats.io_wiktionary ? `<li>📕 <strong>Ido-Wikivortaro:</strong> ${sourceStats.io_wiktionary.toLocaleString()}</li>` : ''}
            ${sourceStats.io_wikipedia ? `<li>📚 <strong>Ido-Wikipedia:</strong> ${sourceStats.io_wikipedia.toLocaleString()}</li>` : ''}
            ${sourceStats.fr_wiktionary_via ? `<li>🇫🇷 <strong>Franca Wikivortaro (tra):</strong> ${sourceStats.fr_wiktionary_via.toLocaleString()}</li>` : ''}
            ${sourceStats.eo_wiktionary ? `<li>📗 <strong>Esperanto-Wikivortaro:</strong> ${sourceStats.eo_wiktionary.toLocaleString()}</li>` : ''}
        </ul>
        
        <h4>${t.viaTitle}</h4>
        <p>${t.viaDesc}</p>
        <p>${t.viaExample}</p>
        
        <h3>${t.licenseTitle}</h3>
        <p>${t.licenseDesc}</p>
        <ul>
            <li><strong>Wikivortaro/Wikipedia:</strong> <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">CC BY-SA 3.0</a></li>
            <li><strong>Softwaro:</strong> MIT / Libera kodo</li>
        </ul>
        <p><small>${t.attribution}</small></p>
        
        <h3>${t.toolsTitle}</h3>
        <p>${t.toolsDesc}</p>
        
        <p><strong>${t.relatedProjects}</strong></p>
        <ul>
            <li><a href="https://translator.app" target="_blank"><strong>${t.translator}</strong></a> - Kompleta traduko-sistemo</li>
            <li><a href="https://phonomorph.app" target="_blank"><strong>PhonoMorph</strong></a> - Fonetikala transformi e evoluciono</li>
            <li><a href="https://github.com/komapc/apertium-ido-epo" target="_blank">apertium-ido-epo</a> - Apertium-lingvoparo</li>
        </ul>
    `;

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

// Translate footer labels
function translateFooter(lang) {
    const footer = document.querySelector('footer');
    if (!footer) { return; }

    const translations = {
        io: {
            projects: 'Mea projekti',
            resources: 'Rersursi',
            contact: 'Kontakto',
            about: 'Pri la projekto',
            words: 'vorti',
            code: 'kodo'
        },
        en: {
            projects: 'My projects',
            resources: 'Resources',
            contact: 'Contact',
            about: 'About the project',
            words: 'words',
            code: 'code'
        },
        eo: {
            projects: 'Miaj projektoj',
            resources: 'Rimedoj',
            contact: 'Kontakto',
            about: 'Pri la projekto',
            words: 'vortoj',
            code: 'kodo'
        }
    };

    const t = translations[lang] || translations.io;
    const lines = footer.querySelectorAll('.footer-line');
    
    if (lines.length >= 2) {
        // Line 1: Projects
        lines[0].innerHTML = `
            ${t.projects}: 
            <a href="https://ido-vortaro.pages.dev/">Vortaro</a> (<a href="https://github.com/komapc/vortaro" target="_blank">${t.code}</a>) <span class="footer-separator">·</span>
            <a href="https://ido-tradukilo.pages.dev/">Tradukilo</a> (<a href="https://github.com/komapc/ido-epo-translator" target="_blank">${t.code}</a>) <span class="footer-separator">·</span>
            <a href="https://echodrift.pages.dev/">EchoDrift</a> (<a href="https://github.com/komapc/phonomorph" target="_blank">${t.code}</a>)
        `;

        // Line 2: Resources & Info
        lines[1].innerHTML = `
            ${t.resources}: <a href="https://github.com/apertium" target="_blank">Apertium</a> <span class="footer-separator">·</span> 
            ${t.contact}: <a href="mailto:komapc@gmail.com">komapc@gmail.com</a> <span class="footer-separator">·</span> 
            <button onclick="showAboutModal('${lang}')" style="background:none; border:none; color:white; cursor:pointer; font:inherit; padding:0; font-weight:600;">${t.about}</button>
            <span class="footer-separator">·</span> <span><span id="wordCount">${metadata ? (metadata.total_unique_ido_words || 0).toLocaleString() : '...'}</span> ${t.words}</span>
            <span id="version" class="version-tag">v${VERSION}</span>
        `;
    }
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

    // Update URL with direction and query using pretty paths
    if (query) {
        window.history.replaceState(null, '', `/${currentDirection}/${encodeURIComponent(query)}`);
    } else {
        window.history.replaceState(null, '', '/');
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

// Parse URL to extract direction and query (supports path and hash)
function parseUrl() {
    const pathname = window.location.pathname;
    const hash = window.location.hash.slice(1);

    // 1. Try pretty path: /io-eo/hundo
    const pathMatch = pathname.match(/^\/(io-eo|eo-io)\/(.+)$/);
    if (pathMatch) {
        return { direction: pathMatch[1], query: decodeURIComponent(pathMatch[2]) };
    }

    // 2. Try legacy hash: #io-eo:hundo
    if (hash) {
        const colonIndex = hash.indexOf(':');
        if (colonIndex > 0) {
            const direction = hash.substring(0, colonIndex);
            const query = decodeURIComponent(hash.substring(colonIndex + 1));
            if (direction === 'io-eo' || direction === 'eo-io') {
                return { direction, query };
            }
        }
        return { direction: null, query: decodeURIComponent(hash) };
    }

    return { direction: null, query: '' };
}

// Handle URL on page load
function handleInitialUrl() {
    const { direction, query } = parseUrl();
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

    if (query) {
        searchInput.value = query;
        search(query);
    }
}

// Handle URL changes (browser back/forward)
window.addEventListener('popstate', () => {
    const { direction, query } = parseUrl();
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

    // Handle initial URL (pretty paths or hash)
    handleInitialUrl();

    // Initialize version display
    initializeVersion();
});

