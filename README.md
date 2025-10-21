# Vortaro - Ido-Esperanto Dictionary

**Vortaro** (Ido for "dictionary") is a simple, fast, client-side dictionary for looking up Ido and Esperanto words.

**🌐 Live:** https://komapc.github.io/vortaro/

## Features

- 📖 **7,500+ dictionary entries** from Wiktionary
- 🔍 **Instant search** - search Ido or Esperanto words
- 🎨 **Beautiful UI** - clean, modern interface
- ⚡ **Fast** - all data loaded client-side, no backend needed
- 📱 **Responsive** - works on mobile and desktop
- 💾 **Offline-ready** - dictionary data loaded once

## How It Works

This is a **simple static website** that:
1. Loads dictionary JSON data from the extractor
2. Provides instant search through all entries
3. No Apertium translation - just dictionary lookup
4. Pure HTML/CSS/JavaScript - no build step needed

## Dictionary Data

The dictionary data comes from [ido-esperanto-extractor](https://github.com/komapc/ido-esperanto-extractor) which extracts and processes data from:
- Ido Wiktionary
- Esperanto Wiktionary
- Ido Wikipedia
- Wikidata

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
cp path/to/dictionary_merged_enhanced.json dictionary.json
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

