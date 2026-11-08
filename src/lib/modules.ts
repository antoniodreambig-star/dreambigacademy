import type { Format, ModuleKey } from './types';

export type { ModuleKey };

/**
 * The Academy is sold as THREE STANDALONE MODULES, not one long program.
 * Each module is its own short course: 24 classroom hours or less, a fee under $500, and nothing is
 * required before or after it. (This is how the Academy fits the Texas short-course exemption,
 * Education Code §132.003. Keep it that way: don't add prerequisites, bundles or a "full program" price.)
 */
export const MODULE_KEYS: ModuleKey[] = ['a', 'b', 'c'];
export const isModule = (v: unknown): v is ModuleKey => v === 'a' || v === 'b' || v === 'c';

export interface ModuleInfo {
  key: ModuleKey;
  letter: string;
  name: string;
  /** One sentence for cards and search results. */
  blurb: string;
  topics: string[];
}

export const MODULES: Record<ModuleKey, ModuleInfo> = {
  a: {
    key: 'a',
    letter: 'A',
    name: 'Audio Engineering Basics',
    blurb: 'How sound works, Pro Tools from scratch, and recording vocals and instruments.',
    topics: ['How sound and signal flow work', 'The Pro Tools interface, editing and arranging', 'Microphones and gain staging', 'Tracking vocals, instruments and MIDI'],
  },
  b: {
    key: 'b',
    letter: 'B',
    name: 'Intermediate Mixing',
    blurb: 'Run a session, then balance, EQ and compress a song into a mix that translates.',
    topics: ['Running a session start to finish', 'Editing and comping takes', 'EQ, compression and effects', 'Balancing and finishing a mix'],
  },
  c: {
    key: 'c',
    letter: 'C',
    name: 'Advanced Studio Techniques',
    blurb: 'Advanced mixing, mastering for release, and a finished portfolio piece.',
    topics: ['Advanced mixing and automation', 'Mastering for streaming and release', 'Working with artists and clients', 'Building a portfolio piece'],
  },
};

/**
 * Which curriculum weeks each module covers. These are the week numbers in the Curriculum tables, which
 * stay numbered across the whole course, so a student's homework and attendance keep their week numbers
 * if they take Module B after Module A.
 *   In person: 8 weekly classes per module.   Online: 4 live sessions per module (each online session
 *   covers two in-person weeks, same as before).
 */
export const MODULE_SPAN: Record<Format, Record<ModuleKey, { first: number; last: number }>> = {
  in_person: { a: { first: 1, last: 8 }, b: { first: 9, last: 16 }, c: { first: 17, last: 24 } },
  online: { a: { first: 1, last: 4 }, b: { first: 5, last: 8 }, c: { first: 9, last: 12 } },
};

/**
 * TWC rule for the short-course exemption: students must get the course description and refund policy in writing
 * at least 14 days before the module starts, and the school may not enroll students or accept applications within
 * 14 days of the start (unless it documents another method). The app enforces the simple version of this.
 */
export const ENROLL_CUTOFF_DAYS = 14;

/** How many classes make up a module. */
export const moduleClasses = (format: Format): number => {
  const s = MODULE_SPAN[format].a;
  return s.last - s.first + 1;
};

/** "Module A: Audio Engineering Basics" */
export const moduleLabel = (m: ModuleKey): string => `Module ${MODULES[m].letter}: ${MODULES[m].name}`;
