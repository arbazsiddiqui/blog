// Slop Corner: things built when the weekly limits are about to reset and there are tokens
// left. Each entry is a playable page under /slop-corner/, with a short preview clip in
// public/slop-corner/previews/<preview>.{mp4,webm,webp}.
export const SLOP_TAGLINE = 'When the weeklies are about to reset and you still have tokens left.';

export interface SlopItem {
  href: string;
  title: string;
  medium: string;
  sentence: string;
  preview: string;
  alt: string;
  links?: { label: string; url: string }[];
}

export const SLOP: SlopItem[] = [
  {
    href: '/slop-corner/kerb-appeal/',
    title: 'Kerb Appeal',
    medium: 'Three browser games, one street',
    sentence:
      'A tilt-shift toy British street with three games on it: park on it, patrol it, walk the children across it. Built in three.js on WebGPU, with every sound synthesised in the browser.',
    preview: 'kerb-appeal',
    alt: 'The Kerb Appeal hub page: three game cards on a hand-drawn map of one terraced street',
  },
  {
    href: '/slop-corner/tight-spot/',
    title: 'Tight Spot',
    medium: 'Parking puzzle game',
    sentence:
      'Twenty-four handmade streets of parallel parking with an examiner in the passenger seat. Traffic lights, cyclists, hills and wet roads, par counted in moves, and a roguelite shift for later.',
    preview: 'tight-spot',
    alt: 'A red learner car reversing into a gap between parked toy cars on a tilt-shift street',
    links: [{ label: 'How to play', url: '/slop-corner/tight-spot/how-to-play/' }],
  },
  {
    href: '/slop-corner/double-yellow/',
    title: 'Double Yellow',
    medium: 'Route-planning puzzle game',
    sentence:
      'You are a traffic warden and every driver is on a countdown. Plan the route, write the tickets and be gone before they get back. Twenty-seven handmade levels, each checked by a solver.',
    preview: 'double-yellow',
    alt: 'A traffic warden on a toy street with countdown tags over parked cars and a route preview',
    links: [{ label: 'How to play', url: '/slop-corner/double-yellow/how-to-play/' }],
  },
  {
    href: '/slop-corner/lollipop/',
    title: 'Lollipop',
    medium: 'One-button timing game',
    sentence:
      'The school crossing patrol, as a game. Hold to step out and stop the traffic, let go to let it flow. A term of handmade school days with buses, a traffic island and ambulances you must never stop.',
    preview: 'lollipop',
    alt: 'The lollipop lady holding up her sign while children cross a toy street outside a primary school',
    links: [{ label: 'How to play', url: '/slop-corner/lollipop/how-to-play/' }],
  },
];
