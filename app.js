// Dictionary data
let dictionary = {};
let allEntries = [];
let metadata = null;
let currentDirection = 'io-eo'; // 'io-eo' or 'eo-io'

// Load dictionary data
async function loadDictionary() {
    try {
        const response = await fetch('dictionary_with_wikipedia.json');
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
        document.getElementById('wordCount').textContent = `${totalEntries.toLocaleString()} words`;
        
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
    const results = allEntries.filter(entry => {
        if (currentDirection === 'io-eo') {
            // Ido → Esperanto: search only in Ido words
            return entry.ido.toLowerCase().includes(searchTerm);
        } else {
            // Esperanto → Ido: search only in Esperanto translations
            return entry.esperanto.some(eoWord => eoWord.toLowerCase().includes(searchTerm));
        }
    });
    
    displayResults(results, searchTerm);
}

// Display search results
function displayResults(results, searchTerm) {
    const resultsContainer = document.getElementById('results');
    const searchInfo = document.getElementById('searchInfo');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No results found for "' + searchTerm + '"</div>';
        searchInfo.textContent = '0 results';
        return;
    }
    
    searchInfo.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
    
    const html = results.map(entry => {
        // Generate source badges
        const sourceBadges = entry.sources && entry.sources.length > 0
            ? entry.sources.map(source => {
                const badgeClass = getBadgeClass(source);
                const badgeText = getBadgeText(source);
                return `<span class="source-badge ${badgeClass}" title="${source}">${badgeText}</span>`;
            }).join(' ')
            : '';
        
        if (currentDirection === 'io-eo') {
            // Ido → Esperanto
            return `
                <div class="result-item">
                    <div class="source-word">${highlightMatch(entry.ido, searchTerm)}</div>
                    <div class="target-words">
                        → ${entry.esperanto.map(word => word).join(', ') || '<em>no translation</em>'}
                    </div>
                    ${sourceBadges ? `<div class="sources">${sourceBadges}</div>` : ''}
                    ${entry.morfologio.length > 0 ? 
                        `<div class="morfologio">Morphology: ${entry.morfologio.join(' + ')}</div>` : 
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
                    ${sourceBadges ? `<div class="sources">${sourceBadges}</div>` : ''}
                    ${entry.morfologio.length > 0 ? 
                        `<div class="morfologio">Morphology: ${entry.morfologio.join(' + ')}</div>` : 
                        ''
                    }
                </div>
            `;
        }
    }).join('');
    
    resultsContainer.innerHTML = html;
}

// Get badge CSS class for source
function getBadgeClass(source) {
    if (source.includes('fr_wiktionary') || source.includes('pivot_fr')) return 'badge-fr';
    if (source.includes('en_wiktionary') || source.includes('pivot_en')) return 'badge-en';
    if (source.includes('io_wiktionary') || source === 'wikt_io') return 'badge-io';
    if (source.includes('eo_wiktionary') || source === 'wikt_eo') return 'badge-eo';
    if (source.includes('io_wikipedia') || source.includes('wikipedia') || source === 'wiki') return 'badge-wiki';
    return 'badge-default';
}

// Get badge display text for source
function getBadgeText(source) {
    if (source.includes('fr_wiktionary') || source.includes('pivot_fr')) return '🇫🇷 FR';
    if (source.includes('en_wiktionary') || source.includes('pivot_en')) return '🇬🇧 EN';
    if (source.includes('io_wiktionary') || source === 'wikt_io') return '📕 IO';
    if (source.includes('eo_wiktionary') || source === 'wikt_eo') return '📗 EO';
    if (source.includes('io_wikipedia') || source.includes('wikipedia') || source === 'wiki') return '📚 WIKI';
    return source.substring(0, 8);
}

// Highlight matching text
function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 2px 4px; border-radius: 3px;">$1</mark>');
}

// Show empty state
function showEmptyState() {
    const resultsContainer = document.getElementById('results');
    const searchInfo = document.getElementById('searchInfo');
    
    searchInfo.textContent = '';
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <p>Start typing to search the dictionary...</p>
        </div>
    `;
}

// Switch translation direction
function switchDirection(direction) {
    currentDirection = direction;
    
    // Update button states
    document.querySelectorAll('.direction-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-direction="${direction}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Update placeholder
    const searchInput = document.getElementById('searchInput');
    searchInput.placeholder = direction === 'io-eo' 
        ? 'Search Ido words...' 
        : 'Search Esperanto words...';
    
    // Re-run search if there's a query
    if (searchInput.value.trim()) {
        search(searchInput.value);
    }
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
            <h3>📚 Dictionary Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Total Words:</strong> ${(metadata.total_unique_ido_words || 0).toLocaleString()}
                </div>
                <div class="info-item">
                    <strong>Last Updated:</strong> ${lastUpdate}
                </div>
                <div class="info-item">
                    <strong>Total Translations:</strong> ${totalSources.toLocaleString()}
                </div>
            </div>
            
            <h3>🔨 How It Was Built</h3>
            <p>This dictionary was automatically extracted and compiled from multiple sources using the <strong>ONE BIG BIDIX</strong> pipeline:</p>
            
            <h4>📊 Translation Sources</h4>
            <ul>
                ${sourceStats.io_wiktionary ? `<li>📕 <strong>Ido Wiktionary:</strong> ${sourceStats.io_wiktionary.toLocaleString()} translations</li>` : ''}
                ${sourceStats.fr_wiktionary_meaning ? `<li>🇫🇷 <strong>French Wiktionary</strong> (pivot): ${sourceStats.fr_wiktionary_meaning.toLocaleString()} translations</li>` : ''}
                ${sourceStats.eo_wiktionary ? `<li>📗 <strong>Esperanto Wiktionary:</strong> ${sourceStats.eo_wiktionary.toLocaleString()} translations</li>` : ''}
            </ul>
            
            <h4>🌍 What is Pivot Translation?</h4>
            <p>Pivot translation uses an intermediate language (like French or English) to create translations between Ido and Esperanto when direct translations aren't available.</p>
            <p><strong>Example:</strong> If we know Ido→French and French→Esperanto, we can infer Ido→Esperanto through the French "pivot".</p>
            
            ${metadata.conversion_info ? `
                <h4>✨ Special Features</h4>
                <ul>
                    ${metadata.conversion_info.includes_french_pivot ? '<li>🇫🇷 Includes French pivot translations</li>' : ''}
                    ${metadata.conversion_info.includes_english_pivot ? '<li>🇬🇧 Includes English pivot translations</li>' : ''}
                    ${metadata.conversion_info.includes_wikipedia ? '<li>📚 Includes Wikipedia language links</li>' : ''}
                    ${metadata.conversion_info.includes_wiktionary ? '<li>📖 Includes Wiktionary data</li>' : ''}
                </ul>
            ` : ''}
            
            <h3>🛠️ Tools & Project</h3>
            <p>The dictionary is extracted using the <a href="https://github.com/komapc/ido-esperanto-extractor" target="_blank">ido-esperanto-extractor</a> pipeline, which processes Wiktionary dumps and Wikipedia data to create comprehensive bilingual dictionaries.</p>
            
            <p><strong>Related Projects:</strong></p>
            <ul>
                <li><a href="https://github.com/komapc/ido-epo-translator" target="_blank">ido-epo-translator</a> - Full machine translation system</li>
                <li><a href="https://github.com/komapc/apertium-ido-epo" target="_blank">apertium-ido-epo</a> - Apertium language pair</li>
            </ul>
        `;
    } else {
        modalBody.innerHTML = `
            <p>Dictionary metadata not available.</p>
            <p>This dictionary provides bidirectional lookup between Ido and Esperanto words.</p>
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
    search(e.target.value);
});

// Direction switcher
document.getElementById('idoToEoBtn').addEventListener('click', () => switchDirection('io-eo'));
document.getElementById('eoToIdoBtn').addEventListener('click', () => switchDirection('eo-io'));

// Keyboard support for direction buttons
document.getElementById('idoToEoBtn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchDirection('io-eo');
    }
});
document.getElementById('eoToIdoBtn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchDirection('eo-io');
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

// Initialize
loadDictionary();

