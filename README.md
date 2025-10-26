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
1. Loads dictionary JSON data (~14,500 entries) from the extractor
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

The dictionary data is **automatically generated** by the extractor pipeline and accessed via symlink.

### How It Works

**Zero-copy architecture:**
- `dictionary.json` → symlink to `../extractor/output/vortaro.json`
- No duplication, no manual copying
- Automatically stays current when extractor runs
- Single source of truth

**Data Source:** The extractor processes multiple sources:
- **Ido Wiktionary** - Direct IO→EO translations
- **Ido Wikipedia** - Entries from Wikipedia language links 📚
- **French Wiktionary (pivot)** - Via French intermediate language 🇫🇷
- **Esperanto Wiktionary** - Reverse EO→IO translations

### What is Pivot Translation?

Pivot translation uses an intermediate language (like French or English) to create translations between Ido and Esperanto when direct translations aren't available.

**Example:** If we know that:
- Ido "hundo" → French "chien"
- French "chien" → Esperanto "hundo"

Then we can infer: Ido "hundo" → Esperanto "hundo" through the French "pivot"

### Statistics

Current dictionary (~14,500 words):
- **Total unique Ido words:** 14,481
- **Sources:** IO Wiktionary, Wikipedia, FR pivot, EO Wiktionary
- **Format:** Optimized for web display with morphology and source tracking

The dictionary **automatically updates** when the extractor pipeline runs.

## Development

This is a static site with no dependencies:

```bash
# Clone the repository
git clone https://github.com/komapc/vortaro.git
cd vortaro

# Open in browser
open index.html
```

### Updating the Dictionary

**For GitHub Pages deployment:** The dictionary is committed as a regular file (GitHub Pages cannot resolve symlinks outside the repo).

**For local development:** You can use a symlink to auto-update from extractor:

```bash
# Replace file with symlink (local only)
cd vortaro
rm dictionary.json
ln -s ../extractor/output/vortaro.json dictionary.json

# Now updates automatically when extractor runs
cd ../extractor
python3 scripts/build_one_big_bidix_json.py  # Regenerates vortaro.json
cd ../vortaro
# dictionary.json automatically points to latest data ✨
```

**For deployment:** Copy the actual file:
```bash
cd vortaro
rm dictionary.json
cp ../extractor/output/vortaro.json dictionary.json
git add dictionary.json
git commit -m "update: refresh dictionary data"
git push origin main
```

**Architecture Benefits:**
- ✅ **No Python in vortaro** - Pure HTML/CSS/JS static site
- ✅ **Single source of truth** - Extractor generates, vortaro displays
- ✅ **Clean separation** - Extractor = data processing, Vortaro = display
- ✅ **Flexible** - Symlink for dev, real file for deployment

## File Structure

```
vortaro/
├── index.html           # Main HTML file
├── style.css            # Styling
├── app.js               # Search functionality
├── dictionary.json      # Dictionary data (real file for deployment, can be symlink locally)
├── favicon.png          # Favicon (PNG format for browser compatibility)
├── favicon.svg          # Favicon (SVG format for modern browsers)
└── README.md            # This file
```

**Note:** 
- **Deployed version:** `dictionary.json` is a regular file (GitHub Pages requirement)
- **Local development:** Can be a symlink to `../extractor/output/vortaro.json` for auto-updates

## Related Projects

- **[ido-epo-translator](https://github.com/komapc/ido-epo-translator)** - Full Apertium-powered translator with text and URL translation
- **[ido-esperanto-extractor](https://github.com/komapc/ido-esperanto-extractor)** - Dictionary extraction pipeline
- **[apertium-ido-epo](https://github.com/komapc/apertium-ido-epo)** - Apertium language pair

## License

Dictionary data is extracted from Wiktionary and Wikipedia, which are licensed under Creative Commons licenses. See individual sources for details.

