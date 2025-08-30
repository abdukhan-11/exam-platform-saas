import { buildStudentExamSeed, createSeededRng, shuffledCopy, shuffleOptionsJson, hashStringToSeed } from '@/lib/exams/randomization';

describe('randomization utilities', () => {
  test('buildStudentExamSeed is stable', () => {
    expect(buildStudentExamSeed('exam1', 'student1')).toBe('exam1::student1');
  });

  test('createSeededRng produces deterministic sequence for same seed', () => {
    const rng1 = createSeededRng('seed');
    const rng2 = createSeededRng('seed');
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  test('shuffledCopy is deterministic with same seed', () => {
    const seed = 'examA::studentB';
    const rngA = createSeededRng(seed);
    const rngB = createSeededRng(seed);
    const arr = [1, 2, 3, 4, 5, 6];
    expect(shuffledCopy(arr, rngA)).toEqual(shuffledCopy(arr, rngB));
  });

  test('shuffleOptionsJson returns json with stable order for same seed', () => {
    const options = [
      { text: 'A', isCorrect: false },
      { text: 'B', isCorrect: true },
      { text: 'C', isCorrect: false },
      { text: 'D', isCorrect: false },
    ];
    const json = JSON.stringify(options);
    const a = shuffleOptionsJson(json, 'exam1::student1::q1');
    const b = shuffleOptionsJson(json, 'exam1::student1::q1');
    expect(a).toBe(b);
  });

  test('hashStringToSeed yields 32-bit integer', () => {
    const s = hashStringToSeed('abc');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});


