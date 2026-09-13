// The one Person entity for the whole site. Every page's JSON-LD points at the same
// @id so search and answer engines resolve author, profile and homepage to one person
// instead of eleven look-alikes. About embeds the full record; other pages use the ref.
import { SITE } from './site';

export const PERSON_ID = `${SITE.url}/#person`;

export const PERSON_REF = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Arbaz Siddiqui',
  url: SITE.url,
};

export const PERSON_FULL = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Arbaz Siddiqui',
  alternateName: 'arbazsiddiqui',
  url: SITE.url,
  image: `${SITE.url}/og/arbaz-siddiqui.jpg`,
  description:
    'Software engineer with ten years in distributed systems, now building AI infrastructure and shipping products with it: an open 12B language model, a SQLite extension for semantic search, iOS apps, and autonomous media pipelines.',
  jobTitle: 'Principal Software Engineer',
  worksFor: { '@type': 'Organization', name: 'Turnip', url: 'https://zaps.design/' },
  hasOccupation: { '@type': 'Occupation', name: 'Software Engineer' },
  address: { '@type': 'PostalAddress', addressCountry: 'IN' },
  email: `mailto:${SITE.email}`,
  sameAs: [
    SITE.github,
    SITE.huggingface,
    SITE.linkedin,
    SITE.substack,
    'https://stackoverflow.com/users/5182824/arbaz-siddiqui',
  ],
  knowsAbout: [
    'AI infrastructure', 'distributed systems', 'LLM fine-tuning', 'RAG',
    'learned sparse retrieval', 'SQLite', 'Kubernetes', 'Go', 'Node.js', 'Kafka',
    'MQTT', 'WebSockets', 'RTMP', 'FFmpeg', 'live streaming', 'real-time systems',
    'Redis', 'Postgres', 'Neo4j', 'Elasticsearch', 'Docker', 'content automation',
    'cryptocurrency exchanges', 'blockchain', 'trading engines', 'DeFi',
  ],
};
