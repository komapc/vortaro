// Dictionary data
let dictionary = {};
let allEntries = [];

// Load dictionary data
async function loadDictionary() {
    try {
        const response = await fetch('dictionary.json');
        const data = await response.json();
        
        // Remove metadata and get just the entries
        delete data.metadata;
        dictionary = data;
        
        // Create searchable entries array
        allEntries = Object.entries(dictionary).map(([idoWord, data]) => ({
            ido: idoWord,
            esperanto: data.esperanto_words || [],
            morfologio: data.morfologio || []
        }));
        
        // Update word count
        document.getElementById('wordCount').textContent = `${allEntries.length} words`;
        
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
    
    // Search in both Ido and Esperanto
    const results = allEntries.filter(entry => {
        // Match Ido word
        if (entry.ido.toLowerCase().includes(searchTerm)) {
            return true;
        }
        // Match Esperanto translations
        if (entry.esperanto.some(eoWord => eoWord.toLowerCase().includes(searchTerm))) {
            return true;
        }
        return false;
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
    
    const html = results.map(entry => `
        <div class="result-item">
            <div class="ido-word">${highlightMatch(entry.ido, searchTerm)}</div>
            <div class="esperanto-words">
                → ${entry.esperanto.map(word => highlightMatch(word, searchTerm)).join(', ')}
            </div>
            ${entry.morfologio.length > 0 ? 
                `<div class="morfologio">Morphology: ${entry.morfologio.join(' + ')}</div>` : 
                ''
            }
        </div>
    `).join('');
    
    resultsContainer.innerHTML = html;
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

// Event listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    search(e.target.value);
});

// Initialize
loadDictionary();

