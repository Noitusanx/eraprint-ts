import { NextResponse } from "next/server";
import { PUBLIC_ANCHOR_QUESTION_IDS, PUBLIC_QUESTIONS, type PublicQuestion } from "@/lib/data/public-catalog";
import type { RefinementQuestionTree } from "@/lib/living/refinement-prefetch";
import { ANCHOR_DECISIONS, INITIAL_DECISIONS, selectNextAdaptiveQuestion, validateInitialGameSequence } from "@/lib/scoring/scoring-engine";
import type { Answer } from "@/lib/scoring/types";

function buildInitialQuestionTree(
  answers: Answer[],
  question: PublicQuestion | null,
  depth = 4,
): RefinementQuestionTree {
  if (!question || depth <= 0) return {};
  return Object.fromEntries(question.choices.map((choice) => {
    const updated = [...answers, { questionId: question.id, choiceId: choice.id }];
    const next = updated.length < PUBLIC_ANCHOR_QUESTION_IDS.length
      ? PUBLIC_QUESTIONS.find((candidate) => candidate.id === PUBLIC_ANCHOR_QUESTION_IDS[updated.length]) ?? null
      : selectNextAdaptiveQuestion(updated);
    const publicNext = next
      ? PUBLIC_QUESTIONS.find((candidate) => candidate.id === next.id) ?? null
      : null;
    return [choice.id, {
      question: publicNext,
      nextByChoice: buildInitialQuestionTree(updated, publicNext, depth - 1),
    }];
  }));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { answers?: Answer[] };
    const answers = body.answers ?? [];

    if (!Array.isArray(answers) || answers.length >= INITIAL_DECISIONS) {
      return NextResponse.json(
        { error: `Adaptive selection expects 0-${INITIAL_DECISIONS - 1} valid answers.` },
        { status: 400 },
      );
    }

    const sequenceErrors = answers.length >= ANCHOR_DECISIONS
      ? validateInitialGameSequence(answers)
      : answers.flatMap((answer, index) => {
          const expected = PUBLIC_ANCHOR_QUESTION_IDS[index];
          const question = PUBLIC_QUESTIONS.find((candidate) => candidate.id === expected);
          return answer.questionId === expected && question?.choices.some((choice) => choice.id === answer.choiceId)
            ? []
            : [`Invalid anchor answer at position ${index + 1}.`];
        });
    if (sequenceErrors.length > 0) {
      return NextResponse.json(
        { error: sequenceErrors[0] },
        { status: 400 },
      );
    }

    const next = answers.length < PUBLIC_ANCHOR_QUESTION_IDS.length
      ? PUBLIC_QUESTIONS.find((candidate) => candidate.id === PUBLIC_ANCHOR_QUESTION_IDS[answers.length]) ?? null
      : selectNextAdaptiveQuestion(answers);
    const question = next
      ? PUBLIC_QUESTIONS.find((candidate) => candidate.id === next.id) ?? null
      : null;
    return NextResponse.json({
      question,
      nextByChoice: buildInitialQuestionTree(answers, question),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to select next question.",
      },
      { status: 400 },
    );
  }
}
