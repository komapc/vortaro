#!/usr/bin/env python3
"""
Merge bidix_big.json (detailed sources) + dictionary_merged_enhanced.json (Wikipedia)
to create the most complete vortaro dictionary.
"""
import json
from collections import defaultdict
from datetime import datetime

def merge_dictionaries(bidix_path, merged_enhanced_path, output_path):
    """
    Merge two dictionary sources:
    1. bidix_big.json: Detailed source tracking (IO, FR, EO)
    2. dictionary_merged_enhanced.json: Wikipedia entries
    
    Strategy:
    - Start with bidix_big (detailed sources)
    - Add Wikipedia-only entries from merged_enhanced  
    - Keep best source tracking
    """
    print("=" * 60)
    print("MERGING DICTIONARIES FOR COMPLETE COVERAGE")
    print("=" * 60)
    
    # Load bidix_big.json
    print(f"\n📖 Loading {bidix_path}...")
    with open(bidix_path, 'r', encoding='utf-8') as f:
        bidix_entries = json.load(f)
    print(f"   Loaded {len(bidix_entries):,} bidix entries")
    
    # Load dictionary_merged_enhanced.json
    print(f"\n📖 Loading {merged_enhanced_path}...")
    with open(merged_enhanced_path, 'r', encoding='utf-8') as f:
        merged_data = json.load(f)
    
    merged_metadata = merged_data.get('metadata', {})
    merged_words = merged_data.get('words', [])
    print(f"   Loaded {len(merged_words):,} merged entries")
    print(f"   Wikipedia integration: {merged_metadata.get('wikipedia_integration', {})}")
    
    # Convert bidix to vortaro format (with detailed sources)
    print("\n🔨 Processing bidix entries...")
    vortaro_dict = {}
    source_stats = defaultdict(int)
    
    for entry in bidix_entries:
        lemma = entry.get('lemma', '')
        if not lemma:
            continue
        
        if lemma not in vortaro_dict:
            vortaro_dict[lemma] = {
                'esperanto_words': [],
                'sources': [],
                'morfologio': []
            }
        
        # Extract translations with sources
        for sense in entry.get('senses', []):
            for translation in sense.get('translations', []):
                if translation.get('lang') == 'eo':
                    eo_term = translation.get('term', '')
                    sources = translation.get('sources', [])
                    
                    if eo_term and eo_term not in vortaro_dict[lemma]['esperanto_words']:
                        vortaro_dict[lemma]['esperanto_words'].append(eo_term)
                    
                    # Track sources
                    for source in sources:
                        if source not in vortaro_dict[lemma]['sources']:
                            vortaro_dict[lemma]['sources'].append(source)
                        source_stats[source] += 1
        
        # Extract morphology
        morph = entry.get('morphology', {})
        if morph and morph.get('paradigm'):
            paradigm = morph.get('paradigm', '')
            if paradigm and paradigm not in vortaro_dict[lemma]['morfologio']:
                vortaro_dict[lemma]['morfologio'].append(paradigm)
        
        # Track provenance sources
        for prov in entry.get('provenance', []):
            source = prov.get('source', '')
            if source and source not in vortaro_dict[lemma]['sources']:
                vortaro_dict[lemma]['sources'].append(source)
    
    bidix_count = len(vortaro_dict)
    print(f"   ✅ Converted {bidix_count:,} words from bidix")
    
    # Add Wikipedia entries that aren't in bidix
    print("\n🔨 Adding Wikipedia entries...")
    wikipedia_added = 0
    wikipedia_skipped = 0
    
    for word_entry in merged_words:
        ido_word = word_entry.get('ido_word', '').strip()
        if not ido_word:
            continue
        
        # If already in bidix, skip (bidix has better source tracking)
        if ido_word in vortaro_dict:
            wikipedia_skipped += 1
            continue
        
        # Add new Wikipedia entry
        esperanto_words = word_entry.get('esperanto_words', [])
        part_of_speech = word_entry.get('part_of_speech', '')
        
        vortaro_dict[ido_word] = {
            'esperanto_words': esperanto_words,
            'sources': ['io_wikipedia'],
            'morfologio': [part_of_speech] if part_of_speech else []
        }
        
        source_stats['io_wikipedia'] += 1
        wikipedia_added += 1
    
    print(f"   ✅ Added {wikipedia_added:,} Wikipedia-only entries")
    print(f"   ⏭️  Skipped {wikipedia_skipped:,} (already in bidix)")
    
    # Create metadata
    output_metadata = {
        'creation_date': datetime.now().isoformat(),
        'source_files': {
            'bidix_big': bidix_path,
            'merged_enhanced': merged_enhanced_path
        },
        'total_unique_ido_words': len(vortaro_dict),
        'from_bidix': bidix_count,
        'from_wikipedia_only': wikipedia_added,
        'source_stats': dict(source_stats),
        'conversion_info': {
            'includes_french_pivot': True,
            'includes_english_pivot': False,
            'includes_wikipedia': True,
            'includes_wiktionary': True
        },
        'original_wikipedia_metadata': merged_metadata.get('wikipedia_integration', {})
    }
    
    # Build output
    output = {'metadata': output_metadata}
    output.update(vortaro_dict)
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ MERGE COMPLETE")
    print("=" * 60)
    print(f"\n📊 Final Statistics:")
    print(f"   Total unique words: {len(vortaro_dict):,}")
    print(f"   From bidix (with sources): {bidix_count:,}")
    print(f"   From Wikipedia only: {wikipedia_added:,}")
    print(f"\n📊 Source Breakdown:")
    for source, count in sorted(source_stats.items(), key=lambda x: x[1], reverse=True):
        print(f"   {source:30s}: {count:,}")
    
    # Write output
    print(f"\n💾 Writing to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    file_size_mb = len(json.dumps(output)) / 1024 / 1024
    print(f"✅ Done! Dictionary size: {file_size_mb:.1f} MB")
    
    return len(vortaro_dict)

if __name__ == '__main__':
    bidix_path = '/home/mark/apertium-ido-epo/tools/extractor/ido-esperanto-extractor/dist/bidix_big.json'
    merged_path = '/home/mark/apertium-ido-epo/tools/extractor/ido-esperanto-extractor/dictionary_merged_enhanced.json'
    output_path = '/home/mark/apertium-dev/vortaro/dictionary_with_wikipedia.json'
    
    total = merge_dictionaries(bidix_path, merged_path, output_path)
    
    print(f"\n🎉 Successfully created dictionary with {total:,} words!")
    print(f"📂 Output: {output_path}")
    print(f"\nNext steps:")
    print(f"  1. Update app.js to load 'dictionary_with_wikipedia.json'")
    print(f"  2. Verify Wikipedia badge (📚 WIKI) works")
    print(f"  3. Test search for Wikipedia entries")

