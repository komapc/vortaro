// Dictionary data
let dictionary = {};
let allEntries = [];
let metadata = null;
let currentDirection = 'io-eo'; // 'io-eo' or 'eo-io'

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
                    tooltipText = 'Franca Wiktionary (pivot-traduko)';
                } else if (source.includes('_meaning')) {
                    tooltipText = `${source} (pivot-traduko)`;
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

// Get badge CSS class for source
function getBadgeClass(source) {
    if (source.includes('fr_wiktionary') || source.includes('pivot_fr')) return 'badge-fr';
    if (source.includes('en_wiktionary') || source.includes('pivot_en')) return 'badge-en';
    if (source.includes('io_wiktionary') || source === 'wikt_io' || source === 'IO') return 'badge-io';
    if (source.includes('eo_wiktionary') || source === 'wikt_eo') return 'badge-eo';
    if (source.includes('io_wikipedia') || source.includes('wikipedia') || source === 'wiki' || source === 'WIKI') return 'badge-wiki';
    return 'badge-default';
}

// Get badge display text for source
function getBadgeText(source) {
    if (source === 'fr_wiktionary_meaning') return '🇫🇷 FR*';
    if (source.includes('fr_wiktionary') || source.includes('pivot_fr')) return '🇫🇷 FR';
    if (source.includes('en_wiktionary') || source.includes('pivot_en')) return '🇬🇧 EN';
    if (source.includes('io_wiktionary') || source === 'wikt_io' || source === 'IO') return '📕 IO';
    if (source.includes('eo_wiktionary') || source === 'wikt_eo') return '📗 EO';
    if (source.includes('io_wikipedia') || source.includes('wikipedia') || source === 'wiki' || source === 'WIKI') return '📚 WIKI';
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
    
    // French Wiktionary (direct only, not pivot)
    if (source.includes('fr_wiktionary') && !source.includes('_meaning')) {
        return `https://fr.wiktionary.org/wiki/${encodeWord(idoWord)}`;
    }
    
    // English Wiktionary (direct only, not pivot)
    if (source.includes('en_wiktionary') && !source.includes('_meaning')) {
        return `https://en.wiktionary.org/wiki/${encodeWord(idoWord)}`;
    }
    
    // Pivot translations - no link (we don't have intermediate language word)
    if (source.includes('_meaning') || source.includes('pivot_')) {
        return null;
    }
    
    // No URL available for this source
    return null;
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
    
    // Re-run search if there's a query
    if (searchInput.value.trim()) {
        search(searchInput.value);
    }
}

// Show random word
function showRandomWord() {
    if (allEntries.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * allEntries.length);
    const randomEntry = allEntries[randomIndex];
    
    // Set search input to random word
    const searchInput = document.getElementById('searchInput');
    searchInput.value = currentDirection === 'io-eo' ? randomEntry.ido : 
                        (randomEntry.esperanto[0] || randomEntry.ido);
    
    // Trigger search
    search(searchInput.value);
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
                ${sourceStats.fr_wiktionary_via ? `<li>🇫🇷 <strong>Franca Wiktionary</strong> (pivoto): ${sourceStats.fr_wiktionary_via.toLocaleString()} traduki</li>` : ''}
                ${sourceStats.eo_wiktionary ? `<li>📗 <strong>Esperanto Wiktionary:</strong> ${sourceStats.eo_wiktionary.toLocaleString()} traduki</li>` : ''}
            </ul>
            
            <h4>🌍 Quo esas pivot-traduko?</h4>
            <p>Pivot-traduko uzas interjacanta linguo (komente Franca o Angla) por krear traduki inter Ido e Esperanto kande rekta traduki ne disponesas.</p>
            <p><strong>Exemplo:</strong> Se ni savas Ido→Franca e Franca→Esperanto, ni povas infercar Ido→Esperanto tra la Franca "pivoto".</p>
            
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

// Initialize
loadDictionary();

