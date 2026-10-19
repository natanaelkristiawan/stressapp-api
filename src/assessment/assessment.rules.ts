import { BadRequestException } from '@nestjs/common';
import { AssessmentAnswerDto, AssessmentDefinitionDto } from './assessment.dto';
import { AssessmentResult } from '../entity/member-assessment.entity';

/** Checks relationships beyond DTO field validation. Returns nothing for a complete definition. */
export function validateDefinition(definition: AssessmentDefinitionDto): void {
  const { questions, categories } = definition;
  if (new Set(questions.map((question) => question.id)).size !== 6) {
    throw new BadRequestException('Question IDs must be unique.');
  }
  for (const question of questions) {
    if (
      question.options
        .map((option) => option.value)
        .sort()
        .join(',') !== '1,2,3,4'
    ) {
      throw new BadRequestException(
        'Each question must have values 1, 2, 3, 4 exactly once.',
      );
    }
    if (new Set(question.options.map((option) => option.label)).size !== 4) {
      throw new BadRequestException(
        'Answer labels must be distinct within a question.',
      );
    }
  }
  const orderedCategories = [...categories].sort(
    (firstCategory, secondCategory) => firstCategory.min - secondCategory.min,
  );
  if (
    new Set(categories.map((category) => category.id)).size !== 3 ||
    new Set(categories.map((category) => category.label)).size !== 3 ||
    orderedCategories[0].min !== 6 ||
    orderedCategories[2].max !== 24 ||
    orderedCategories.some(
      (category, index) =>
        category.min > category.max ||
        (index > 0 && category.min !== orderedCategories[index - 1].max + 1),
    )
  ) {
    throw new BadRequestException(
      'Three unique categories must cover 6–24 without gaps or overlaps.',
    );
  }
}

/** Validates all six answer IDs and scores using the immutable instrument. Returns a server-calculated result. */
export function scoreAssessment(
  definition: AssessmentDefinitionDto,
  answers: AssessmentAnswerDto[],
): AssessmentResult {
  if (
    answers.length !== 6 ||
    new Set(answers.map((answer) => answer.questionId)).size !== 6
  ) {
    throw new BadRequestException('Exactly six distinct answers are required.');
  }
  let score = 0;
  for (const question of definition.questions) {
    const answer = answers.find(
      (submittedAnswer) => submittedAnswer.questionId === question.id,
    );
    if (
      !answer ||
      !Number.isInteger(answer.value) ||
      !question.options.some((option) => option.value === answer.value)
    ) {
      throw new BadRequestException(
        'Answer does not belong to this questionnaire.',
      );
    }
    score += question.reverseScored ? 5 - answer.value : answer.value;
  }
  const category = definition.categories.find(
    (resultCategory) =>
      score >= resultCategory.min && score <= resultCategory.max,
  );
  if (!category) {
    throw new BadRequestException('Scoring categories are incomplete.');
  }
  return {
    score,
    maxScore: 24,
    categoryId: category.id,
    category: category.label,
    interpretation: category.interpretation,
  };
}

/** Compares normalized answers for idempotent retries. Returns true only for the same submission. */
export function sameAnswers(
  firstAnswers: AssessmentAnswerDto[],
  secondAnswers: AssessmentAnswerDto[],
): boolean {
  return (
    firstAnswers.length === secondAnswers.length &&
    firstAnswers.every((answer) =>
      secondAnswers.some(
        (otherAnswer) =>
          otherAnswer.questionId === answer.questionId &&
          otherAnswer.value === answer.value,
      ),
    )
  );
}
