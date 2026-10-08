// Single source of truth for project cards. Home and Projects both render from here.
export const WORKS = {
  ozan: {
    href: '/ozan',
    title: 'Ozan-12B',
    medium: 'Open-weights language model',
    sentence:
      'A creative-writing model fine-tuned from Mistral-Nemo with QLoRA and anti-slop DPO, on $40 of GPU. It has the lowest slop score of any 12B measured on EQ-Bench and beats bigger models like Gemma 27B. The weights, the quants, and the full training recipe are public.',
    stat: '#1 trending on Hugging Face · 3K+ downloads',
    alt: "Ozan the storyteller, the model's namesake artwork",
    links: [
      { label: 'Hugging Face', url: 'https://huggingface.co/arbazsiddiqui/Ozan-v1-12B' },
      { label: 'Featherless', url: 'https://featherless.ai/models/arbazsiddiqui/Ozan-v1-12B' },
      { label: 'Training recipe', url: 'https://github.com/arbazsiddiqui/Ozan' },
    ],
  },
  sparse: {
    href: '/sparse',
    title: 'sqlite-sparse',
    medium: 'SQLite extension',
    sentence:
      'Semantic search inside a SQLite file. A learned sparse encoder runs once when a document is inserted and stores weighted words as posting lists in the database, so searching needs no model, no server and no vector database. Copy the file anywhere SQLite runs, including a browser, and the same query works.',
    stat: '3.1 ms at 1M documents · no model at query time',
    alt: 'How sqlite-sparse works: INSERT runs the encoder once per document and stores weighted terms as posting lists; MATCH tokenizes the query, reads weights from the file and scatter-adds over posting lists with no model',
    links: [
      { label: 'Demo', url: '/sqlite-sparse/#demo' },
      { label: 'GitHub', url: 'https://github.com/arbazsiddiqui/sqlite-sparse' },
      { label: 'PyPI', url: 'https://pypi.org/project/sqlite-sparse/' },
    ],
  },
  kev: {
    href: '/kev',
    title: 'kev-0.6b-browser-use',
    medium: 'Browser-agent decision model',
    sentence:
      'A 0.6B model that picks which element on a page to act on, and whether to click, type or select, as probabilities in one forward pass. Fine-tuned from Kev on Mind2Web and WebChain, it is the best open-weights model that runs in a browser, and it plays A Dark Room live on WebGPU.',
    stat: '32.2% Mind2Web step success · runs in the browser',
    alt: 'kev-0.6b-browser-use playing A Dark Room in the browser, with every button it weighed and its confidence',
    links: [
      { label: 'Demo', url: '/kev-browser-use/#demo' },
      { label: 'Hugging Face', url: 'https://huggingface.co/arbazsiddiqui/kev-0.6b-browser-use' },
      { label: 'GitHub', url: 'https://github.com/arbazsiddiqui/kev-browser-use' },
    ],
  },
  garden: {
    href: '/glass-jar-garden',
    title: 'Glass Jar Garden',
    medium: 'Web app, 3D simulation',
    sentence:
      'A terrarium simulator in the browser. Pour the layers, plant real species, add springtails and isopods, seal the jar and watch it live day by day: a water cycle, moss creeping, plants growing, mould when it goes wrong. Built on three.js with a simulation checked against real jars.',
    stat: '90 real species · 26 starter jars · free',
    alt: 'A glass cloche terrarium of nerve plants, moss and a stone, rendered in Glass Jar Garden',
    links: [
      { label: 'Open it', url: 'https://glassjar.garden/' },
      { label: 'Starter jars', url: 'https://glassjar.garden/starter-jars/' },
      { label: 'Guide', url: 'https://glassjar.garden/guide/' },
    ],
  },
  iris: {
    href: '/iris',
    title: 'Iris',
    medium: 'iOS app',
    sentence:
      'A complete cycle-tracking suite. Predictions confirmed from BBT and LH tests the way a clinic would, a PCOS-friendly irregular mode, partner sharing, and two-way Apple Health sync. Every feature is free, in twelve languages, and health data never leaves the phone.',
    stat: '12 languages · 1,000+ downloads a month',
    alt: 'Iris: Period and Cycle Tracker',
    links: [
      { label: 'App Store', url: 'https://apps.apple.com/app/id6761134901' },
      { label: 'Website', url: 'https://www.arbazsiddiqui.me/app/iris/' },
    ],
  },
  mercuro: {
    href: '/mercuro',
    title: 'Mercuro',
    medium: 'iOS and Android game',
    sentence:
      'Calm thermometer logic puzzles. 660 handcrafted levels across eight board sizes, three daily games, and a hint system, all on its own constraint solver and generator. Built natively twice, SwiftUI on iOS and Kotlin with Compose on Android.',
    stat: '5★ · 660 puzzles · featured in gaming newsletters',
    alt: 'Mercuro: fill the heat',
    links: [
      { label: 'App Store', url: 'https://apps.apple.com/app/id6762402072' },
      { label: 'Website', url: 'https://www.arbazsiddiqui.me/app/mercuro/' },
    ],
  },
  footnote: {
    href: '/footnote',
    title: 'The Footnote',
    medium: 'Autonomous media channel',
    sentence:
      'Short history stories researched, scripted, voiced, illustrated, rendered, and published by an automated pipeline. Real archival images scraped off the web instead of AI art, with a vision model judging every frame. No human in the loop.',
    stat: '500K monthly views',
    alt: 'The Footnote channel banner',
    links: [
      { label: 'Instagram', url: 'https://www.instagram.com/thefootnotemedia/' },
      { label: 'YouTube', url: 'https://www.youtube.com/@TheFootnoteMedia' },
      { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61588938916197' },
    ],
  },
  horror: {
    href: '/horror',
    title: 'Animated Horror',
    medium: 'Animated video pipeline',
    sentence:
      'Animated Hindi horror stories. A local model writes the screenplay, image models keep the cast consistent across 25 shots, and Wan 2.2 animates it on rented GPUs. A finished four-minute film costs under a dollar.',
    stat: 'animated films under $1 each',
    alt: 'Andheri Dastak: Hindi horror stories',
    links: [{ label: 'YouTube', url: 'https://www.youtube.com/@AndheriDastak' }],
  },
  irisPipeline: {
    href: '/iris-pipeline',
    title: 'Iris growth pipeline',
    medium: 'Automated distribution',
    sentence:
      'Iris markets itself. The pipeline designs infographic posters, checks each one against a written creative contract, and publishes daily to Instagram and Pinterest. Its App Store listing runs ASO in eleven languages.',
    stat: '100K+ views driving installs',
    alt: "iris: women's health, clearly explained",
    links: [
      { label: 'Instagram', url: 'https://www.instagram.com/iriscycletracker/' },
      { label: 'Pinterest', url: 'https://www.pinterest.com/irisperiodcycletracker/' },
    ],
  },
};
