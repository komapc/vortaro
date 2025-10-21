# Vortaro - Ido-Esperanto Dictionary

**Vortaro** (Ido for "dictionary") is a simple, fast, client-side dictionary for looking up Ido and Esperanto words.

**🌐 Live:** https://komapc.github.io/vortaro/

## Features

- 📖 **14,900+ dictionary entries** from multiple sources
- 📚 **Wikipedia integration** - 5,300+ entries from Ido Wikipedia
- 🇫🇷 **French pivot translations** - includes data from French Wiktionary
- 🔄 **Single-button direction toggle** - one-click switch between Ido→Esperanto and Esperanto→Ido
- 🎲 **Random word** - discover new words with random selection
- 🏷️ **Clickable source links** - click badges to visit source pages (Wiktionary, Wikipedia, etc.) in new tab
- 🌐 **Ido/Esperanto interface** - UI in Ido language with Esperanto accessibility
- ⚖️ **License information** - clear attribution to Wiktionary and Wikipedia sources (CC BY-SA 3.0)
- 🔍 **Instant search** - search words in either direction
- ℹ️ **Comprehensive metadata** - view detailed information about how the dictionary was built
- 🎨 **Beautiful UI** - clean, modern interface with smooth animations
- ⚡ **Fast** - all data loaded client-side, no backend needed
- 📱 **Responsive** - works on mobile and desktop
- 💾 **Offline-ready** - dictionary data loaded once
- ♿ **Accessible** - full keyboard navigation and ARIA support

## How It Works

This is a **simple static website** that:
1. Loads dictionary JSON data (~7,500 entries) from the extractor
2. Provides instant bidirectional search (Ido⇄Esperanto)
3. Displays comprehensive metadata about dictionary sources
4. No Apertium translation - just dictionary lookup
5. Pure HTML/CSS/JavaScript - no build step needed
6. Client-side only - no server required

### Key Features Explained

**Bidirectional Search:**
- Switch between Ido→Esperanto and Esperanto→Ido modes
- Search is direction-aware for more accurate results
- Real-time filtering as you type

**About Modal:**
- View detailed dictionary statistics
- See source information (Wiktionary dumps, Wikipedia)
- Understand merge statistics and data provenance
- Links to related projects

## Dictionary Data

The dictionary data comes from [ido-esperanto-extractor](https://github.com/komapc/ido-esperanto-extractor) which extracts and processes data from multiple sources:

### Sources
- **Ido Wiktionary** - ~9,338 translations extracted from Ido Wiktionary dump
- **Ido Wikipedia** - ~5,302 entries from Ido Wikipedia language links 📚
- **French Wiktionary (pivot)** - ~1,010 translations via French intermediate language 🇫🇷
- **Esperanto Wiktionary** - ~189 translations from Esperanto Wiktionary

### What is Pivot Translation?
Pivot translation uses an intermediate language (like French or English) to create translations between Ido and Esperanto when direct translations aren't available.

**Example:** If we know that:
- Ido "hundo" → French "chien"
- French "chien" → Esperanto "hundo"

Then we can infer: Ido "hundo" → Esperanto "hundo" through the French "pivot"

### Statistics
- **Total unique Ido words:** ~14,900
- **Total translations:** ~15,800+
- **Source breakdown:**
  - 📕 Ido Wiktionary: 9,338 translations
  - 📚 Ido Wikipedia: 5,302 entries
  - 🇫🇷 French Wiktionary (pivot): 1,010 translations  
  - 📗 Esperanto Wiktionary: 189 translations

The dictionary is automatically updated when new dumps are processed by the extractor.

## Development

This is a static site with no dependencies:

```bash
# Clone the repository
git clone https://github.com/komapc/vortaro.git
cd vortaro

# Open in browser
open index.html
```

To update the dictionary data:
```bash
# Copy latest dictionary from extractor
cp path/to/ido-esperanto-extractor/output/dictionary_merged_enhanced.json dictionary.json

# The dictionary.json file includes:
# - All word entries with Esperanto translations
# - Morphology information where available
# - Metadata about sources and extraction dates
```

## File Structure

```
vortaro/
├── index.html           # Main HTML file
├── style.css            # Styling
├── app.js               # Search functionality
├── dictionary.json      # Dictionary data (2.5MB)
└── README.md           # This file
```

## Related Projects

- **[ido-epo-translator](https://github.com/komapc/ido-epo-translator)** - Full Apertium-powered translator with text and URL translation
- **[ido-esperanto-extractor](https://github.com/komapc/ido-esperanto-extractor)** - Dictionary extraction pipeline
- **[apertium-ido-epo](https://github.com/komapc/apertium-ido-epo)** - Apertium language pair

## License

Dictionary data is extracted from Wiktionary and Wikipedia, which are licensed under Creative Commons licenses. See individual sources for details.

