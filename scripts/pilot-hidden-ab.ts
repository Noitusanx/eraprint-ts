import {
  PILOT_HIDDEN_WEIGHT,
  PILOT_QUESTION_COUNT,
  PILOT_QUESTIONS,
  calculatePilotEraPrint,
  calculatePilotEraPrintDiagnostic,
  getNextPilotQuestion,
} from "../src/lib/scoring/pilot-engine";
import { HIDDEN_ERA_CODES, TRAIT_CODES, type Answer, type EraPrintResult } from "../src/lib/scoring/types";

type SyntheticPersona = {
  id: string;
  label: string;
  answers: Record<string, string>;
};

function parsePersonas(input: string): SyntheticPersona[] {
  const parsed: unknown = JSON.parse(input);
  if (!parsed || typeof parsed !== "object" || !("personas" in parsed) || !Array.isArray(parsed.personas)) {
    throw new Error("Input must contain a personas array.");
  }
  return parsed.personas.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`Persona ${index + 1} must be an object.`);
    const persona = value as Partial<SyntheticPersona>;
    if (typeof persona.id !== "string" || !persona.id) throw new Error(`Persona ${index + 1} is missing an id.`);
    if (typeof persona.label !== "string" || !persona.label) throw new Error(`Persona ${persona.id} is missing a label.`);
    if (!persona.answers || typeof persona.answers !== "object" || Array.isArray(persona.answers)) {
      throw new Error(`Persona ${persona.id} is missing an answer map.`);
    }
    return persona as SyntheticPersona;
  });
}

function summarizeResult(result: EraPrintResult) {
  return {
    primaryEra: result.primaryEra.code,
    secondaryEra: result.secondaryEra.code,
    hiddenEra: result.hiddenEra.code,
    eraBlend: result.eraBlend.map(({ code, name, percentage }) => ({ code, name, percentage })),
  };
}

function topThree(result: EraPrintResult) {
  return [result.primaryEra.code, result.secondaryEra.code, result.hiddenEra.code];
}

function countBy(values: string[]) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]),
  );
}

function replayPersona(persona: SyntheticPersona) {
  const answers: Answer[] = [];
  while (answers.length < PILOT_QUESTION_COUNT) {
    const question = getNextPilotQuestion(answers);
    if (!question) throw new Error(`Pilot selector stopped early for persona ${persona.id} after ${answers.length} answers.`);
    const choiceId = persona.answers[question.id];
    if (typeof choiceId !== "string") throw new Error(`Persona ${persona.id} has no answer for selected question ${question.id}.`);
    if (!question.choices.some((choice) => choice.id === choiceId)) {
      throw new Error(`Persona ${persona.id} has invalid choice ${choiceId} for selected question ${question.id}.`);
    }
    answers.push({ questionId: question.id, choiceId });
  }

  const control = calculatePilotEraPrintDiagnostic(answers, 0);
  const experimental = calculatePilotEraPrint(answers);
  const publicTraitScores = Object.fromEntries(TRAIT_CODES.map((code) => [code, experimental.result.traitScores[code].score]));
  const hiddenScores = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, experimental.hiddenScores[code].score]));
  const controlPublicScores = Object.fromEntries(TRAIT_CODES.map((code) => [code, control.result.traitScores[code].score]));
  const controlHiddenScores = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, control.hiddenScores[code].score]));
  if (JSON.stringify(publicTraitScores) !== JSON.stringify(controlPublicScores)) throw new Error(`Public scores differ between branches for persona ${persona.id}.`);
  if (JSON.stringify(hiddenScores) !== JSON.stringify(controlHiddenScores)) throw new Error(`Hidden scores differ between branches for persona ${persona.id}.`);

  const controlTopThree = topThree(control.result);
  const experimentalTopThree = topThree(experimental.result);
  return {
    id: persona.id,
    label: persona.label,
    selectedQuestionIds: answers.map(({ questionId }) => questionId),
    consumedChoiceIds: answers.map(({ choiceId }) => choiceId),
    publicTraitScores,
    hiddenScores,
    control0: summarizeResult(control.result),
    experimental10: summarizeResult(experimental.result),
    primaryChanged: control.result.primaryEra.code !== experimental.result.primaryEra.code,
    topThreeChanged: JSON.stringify(controlTopThree) !== JSON.stringify(experimentalTopThree),
  };
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) throw new Error("Expected a synthetic persona dataset on stdin.");
  if (PILOT_HIDDEN_WEIGHT !== 0.1) throw new Error("The live pilot hidden contribution is no longer 10%.");

  const personasInput = parsePersonas(input);
  if (personasInput.length === 0) throw new Error("The persona dataset is empty.");
  for (const persona of personasInput) {
    for (const { id } of PILOT_QUESTIONS) {
      if (!(id in persona.answers)) throw new Error(`Persona ${persona.id} is missing ${id} from its complete answer map.`);
    }
  }

  const personas = personasInput.map(replayPersona);
  const controlPrimary = personas.map(({ control0 }) => control0.primaryEra);
  const experimentalPrimary = personas.map(({ experimental10 }) => experimental10.primaryEra);
  const controlCombinations = personas.map(({ control0 }) =>
    [control0.primaryEra, control0.secondaryEra, control0.hiddenEra].sort().join(" + "),
  );
  const experimentalCombinations = personas.map(({ experimental10 }) =>
    [experimental10.primaryEra, experimental10.secondaryEra, experimental10.hiddenEra].sort().join(" + "),
  );

  const report = {
    personaCount: personas.length,
    questionsConsumedPerPersona: PILOT_QUESTION_COUNT,
    hiddenContributions: { control0: 0, experimental10: PILOT_HIDDEN_WEIGHT },
    personas,
    aggregate: {
      primaryChanges: personas.filter(({ primaryChanged }) => primaryChanged).length,
      exactTopThreeOrderingChanges: personas.filter(({ topThreeChanged }) => topThreeChanged).length,
      primaryDistribution0: countBy(controlPrimary),
      primaryDistribution10: countBy(experimentalPrimary),
      uniquePrimaryEras0: new Set(controlPrimary).size,
      uniquePrimaryEras10: new Set(experimentalPrimary).size,
      uniqueTopThreeCombinations0: new Set(controlCombinations).size,
      uniqueTopThreeCombinations10: new Set(experimentalCombinations).size,
    },
    diffs: personas.map(({ id, control0, experimental10 }) => ({
      id,
      control0: [control0.primaryEra, control0.secondaryEra, control0.hiddenEra].join(" → "),
      experimental10: [experimental10.primaryEra, experimental10.secondaryEra, experimental10.hiddenEra].join(" → "),
    })),
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to run hidden-layer A/B diagnostic.");
  process.exitCode = 1;
});
