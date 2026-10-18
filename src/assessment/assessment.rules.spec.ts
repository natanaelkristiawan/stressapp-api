import { AssessmentDefinitionDto } from './assessment.dto';
import {
  sameAnswers,
  scoreAssessment,
  validateDefinition,
} from './assessment.rules';

/** Creates an explicitly synthetic instrument. Returns six questions with simple boundary-test categories. */
function definition(): AssessmentDefinitionDto {
  return {
    title: 'Synthetic test instrument',
    disclaimer: 'Not a clinical instrument.',
    sourceReference: 'Test fixture only',
    scoringNotes: 'Test-only direct scoring',
    questions: Array.from({ length: 6 }, (_, i) => ({
      id: `q${i + 1}`,
      text: `Question ${i + 1}`,
      reverseScored: false,
      options: [1, 2, 3, 4].map((value) => ({
        value,
        label: `Choice ${value}`,
      })),
    })),
    categories: [
      { id: 'low', label: 'Low', min: 6, max: 9, interpretation: 'Test low' },
      {
        id: 'moderate',
        label: 'Moderate',
        min: 10,
        max: 15,
        interpretation: 'Test moderate',
      },
      {
        id: 'high',
        label: 'High',
        min: 16,
        max: 24,
        interpretation: 'Test high',
      },
    ],
  };
}

describe('assessment scoring boundaries', () => {
  test.each([
    [6, 'low'],
    [9, 'low'],
    [10, 'moderate'],
    [15, 'moderate'],
    [16, 'high'],
    [24, 'high'],
  ])('scores %i using category %s', (total, category) => {
    const instrument = definition();
    let remaining = Number(total) - 6;
    const answers = instrument.questions.map((q) => {
      const addition = Math.min(3, remaining);
      remaining -= addition;
      return { questionId: q.id, value: 1 + addition };
    });
    validateDefinition(instrument);
    expect(scoreAssessment(instrument, answers)).toMatchObject({
      score: total,
      maxScore: 24,
      categoryId: category,
    });
  });

  it('uses the configured reverse direction and rejects incomplete/unknown/duplicate/out-of-range answers', () => {
    const instrument = definition();
    const answers = instrument.questions.map((q) => ({
      questionId: q.id,
      value: 1,
    }));
    instrument.questions[4].reverseScored = true;
    expect(scoreAssessment(instrument, answers).score).toBe(9);
    answers[4].value = 4;
    expect(scoreAssessment(instrument, answers).score).toBe(6);
    for (const invalid of [
      answers.slice(1),
      [...answers.slice(0, 5), answers[0]],
      answers.map((a, i) => (i ? a : { questionId: 'unknown', value: 1 })),
      answers.map((a, i) => (i ? a : { ...a, value: 5 })),
    ])
      expect(() => scoreAssessment(instrument, invalid)).toThrow();
    expect(sameAnswers(answers, [...answers].reverse())).toBe(true);
    expect(
      sameAnswers(
        answers,
        answers.map((a) => ({ ...a, value: 2 })),
      ),
    ).toBe(false);
  });

  it('rejects duplicate question/options and incomplete/overlapping category ranges', () => {
    for (const mutate of [
      (d: AssessmentDefinitionDto) => {
        d.questions[5].id = 'q1';
      },
      (d: AssessmentDefinitionDto) => {
        d.questions[0].options[3].value = 3;
      },
      (d: AssessmentDefinitionDto) => {
        d.categories[2].max = 21;
      },
      (d: AssessmentDefinitionDto) => {
        d.categories[1].min = 9;
      },
      (d: AssessmentDefinitionDto) => {
        d.categories[1].min = 11;
      },
    ]) {
      const instrument = definition();
      mutate(instrument);
      expect(() => validateDefinition(instrument)).toThrow();
    }
  });
});
