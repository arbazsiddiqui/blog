// Single source of truth for project cards. Home and Projects both render from here.
export const WORKS = {
  ozan: {
    href: '/ozan',
    title: 'Ozan-12B',
    medium: 'Open-weights language model, 2026',
    sentence:
      'A creative-writing model fine-tuned from Mistral-Nemo with QLoRA and anti-slop DPO, on $40 of GPU. It has the lowest slop score of any 12B measured on EQ-Bench and beats bigger models like Gemma 27B. The weights, the quants, and the full training recipe are public.',
    stat: '#1 trending on Hugging Face · 2.3K downloads in month one',
    alt: "Ozan the storyteller, the model's namesake artwork",
    links: [
      { label: 'Hugging Face', url: 'https://huggingface.co/arbazsiddiqui/Ozan-v1-12B' },
      { label: 'Training recipe', url: 'https://github.com/arbazsiddiqui/Ozan' },
    ],
  },
  iris: {
    href: '/iris',
    title: 'Iris',
    medium: 'iOS app, 2026',
    sentence:
      'A complete cycle-tracking suite. Predictions, the symptothermal method with BBT and LH tests, a PCOS-friendly irregular mode, partner sharing, and two-way Apple Health sync. Every feature is free, in twelve languages, and health data never leaves the phone.',
    stat: '4.9★ · 12 languages · 1,000+ downloads',
    alt: 'Iris: Period and Cycle Tracker',
    links: [{ label: 'App Store', url: 'https://apps.apple.com/app/id6761134901' }],
  },
  mercuro: {
    href: '/mercuro',
    title: 'Mercuro',
    medium: 'iOS and Android game, 2026',
    sentence:
      'Calm thermometer logic puzzles. 660 handcrafted levels across eight board sizes, three seeded dailies, and hints that explain the logic, all on its own constraint solver and generator. Built natively twice, SwiftUI on iOS and Kotlin with Compose on Android.',
    stat: '5★ · 660 puzzles · iOS live, Android soon',
    alt: 'Mercuro: fill the heat',
    links: [{ label: 'App Store', url: 'https://apps.apple.com/app/id6762402072' }],
  },
  footnote: {
    href: '/footnote',
    title: 'The Footnote',
    medium: 'Autonomous media channel, 2026',
    sentence:
      'Short history stories researched, scripted, voiced, illustrated, rendered, and published by software twice a day. Real archival images instead of AI art, with a vision model judging every frame. No human in the loop.',
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
    medium: 'Animated video pipeline, 2026',
    sentence:
      'Animated Hindi horror stories. A local model writes the screenplay, image models keep the cast consistent across 25 shots, and Wan 2.2 animates it on rented GPUs. A finished four-minute film costs under a dollar.',
    stat: 'animated films under $1 each',
    alt: 'Andheri Dastak: Hindi horror stories',
    links: [{ label: 'YouTube', url: 'https://www.youtube.com/@AndheriDastak' }],
  },
  irisPipeline: {
    href: '/iris-pipeline',
    title: 'Iris growth pipeline',
    medium: 'Automated distribution, 2026',
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
