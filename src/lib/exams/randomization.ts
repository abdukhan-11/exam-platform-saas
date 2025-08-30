/**
 * Deterministic randomization utilities for exam delivery.
 * Uses a seeded PRNG to ensure stable shuffles per (examId, studentId).
 */

export type SeededRandomFn = () => number;

/**
 * Convert an arbitrary string into a 32-bit integer seed.
 */
export function hashStringToSeed(input: string): number {
  let hash = 2166136261 >>> 0; // FNV-1a starting offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG based on a 32-bit integer seed.
 * Returns a function that produces numbers in [0, 1).
 */
export function createMulberry32(seed: number): SeededRandomFn {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded RNG from an arbitrary string seed.
 */
export function createSeededRng(seedString: string): SeededRandomFn {
  return createMulberry32(hashStringToSeed(seedString));
}

/**
 * In-place Fisher–Yates shuffle using a provided RNG.
 */
export function shuffleInPlace<T>(array: T[], rng: SeededRandomFn): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
}

/**
 * Return a shuffled copy of the array using the provided RNG.
 */
export function shuffledCopy<T>(array: T[], rng: SeededRandomFn): T[] {
  const copy = array.slice();
  shuffleInPlace(copy, rng);
  return copy;
}

/**
 * Shuffle a JSON string of MCQ options deterministically.
 * The options JSON is expected to be an array of objects with at least { text, isCorrect? }.
 * Returns a new JSON string with shuffled order. If parsing fails, the original JSON is returned.
 */
export function shuffleOptionsJson(optionsJson: string, seed: string): string {
  try {
    const options = JSON.parse(optionsJson);
    if (!Array.isArray(options)) return optionsJson;
    const rng = createSeededRng(seed);
    const copy = options.slice();
    shuffleInPlace(copy, rng);
    return JSON.stringify(copy);
  } catch {
    return optionsJson;
  }
}

/**
 * Build a stable seed from examId and studentId.
 */
export function buildStudentExamSeed(examId: string, studentId: string): string {
  return `${examId}::${studentId}`;
}


