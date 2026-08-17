import { QUESTIONS } from "../src/lib/data/catalog";
import {
  ANCHOR_DECISIONS,
  INITIAL_DECISIONS,
  calculateEraPrint,
  getInitialQuestionSequence,
  selectNextAdaptiveQuestion,
  validateInitialGameSequence,
} from "../src/lib/scoring/scoring-engine";
import { TRAIT_CODES, type Answer } from "../src/lib/scoring/types";

type SyntheticPersona = {
  id: string;
  label: string;
  answers: Record<string, string>;
};

type SyntheticDataset = {
  personas: SyntheticPersona[];
};

function parseDataset(input: string): SyntheticDataset {
  const parsed: unknown = JSON.parse(input);
  if (!parsed || typeof parsed !== "object" || !("personas" in parsed) || !Array.isArray(parsed.personas)) {
    throw new Error("Input must contain a personas array.");
  }

  const personas = parsed.personas.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`Persona ${index + 1} must be an object.`);
    const persona = value as Partial<SyntheticPersona>;
    if (typeof persona.id !== "string" || !persona.id) throw new Error(`Persona ${index + 1} is missing an id.`);
    if (typeof persona.label !== "string" || !persona.label) throw new Error(`Persona ${persona.id} is missing a label.`);
    if (!persona.answers || typeof persona.answers !== "object" || Array.isArray(persona.answers)) {
      throw new Error(`Persona ${persona.id} is missing an answer map.`);
    }
    return persona as SyntheticPersona;
  });

  return { personas };
}

function countBy(values: string[]) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]),
  );
}

function round(value: number, places = 6) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function blendMetrics(percentages: number[]) {
  const probabilities = percentages.map((percentage) => percentage / 100).filter((value) => value > 0);
  const entropyBits = -probabilities.reduce((sum, value) => sum + value * Math.log2(value), 0);
  const normalizedEntropy = percentages.length > 1 ? entropyBits / Math.log2(percentages.length) : 0;
  const concentration = probabilities.reduce((sum, value) => sum + value ** 2, 0);
  return { entropyBits, normalizedEntropy, concentration };
}

function replayPersona(persona: SyntheticPersona) {
  const answers: Answer[] = [];
  const anchors = getInitialQuestionSequence();

  while (answers.length < INITIAL_DECISIONS) {
    const question = answers.length < ANCHOR_DECISIONS
      ? anchors[answers.length]
      : selectNextAdaptiveQuestion(answers);
    if (!question) throw new Error(`Production selector stopped early for persona ${persona.id} after ${answers.length} answers.`);

    const choiceId = persona.answers[question.id];
    if (typeof choiceId !== "string") throw new Error(`Persona ${persona.id} has no answer for selected question ${question.id}.`);
    if (!question.choices.some((choice) => choice.id === choiceId)) {
      throw new Error(`Persona ${persona.id} has invalid choice ${choiceId} for selected question ${question.id}.`);
    }

    answers.push({ questionId: question.id, choiceId });
  }

  const sequenceErrors = validateInitialGameSequence(answers);
  if (sequenceErrors.length > 0) throw new Error(`Persona ${persona.id}: ${sequenceErrors[0]}`);

  const result = calculateEraPrint(answers);
  const eraBlend = result.eraBlend.map(({ code, name, percentage }) => ({ code, name, percentage }));

  return {
    id: persona.id,
    label: persona.label,
    selectedQuestionIds: answers.map(({ questionId }) => questionId),
    consumedChoiceIds: answers.map(({ choiceId }) => choiceId),
    publicTraitScores: Object.fromEntries(TRAIT_CODES.map((code) => [code, result.traitScores[code].score])),
    primaryEra: result.primaryEra.code,
    secondaryEra: result.secondaryEra.code,
    hiddenEra: result.hiddenEra.code,
    eraBlend,
  };
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) throw new Error("Expected a synthetic persona dataset on stdin.");

  const dataset = parseDataset(input);
  if (dataset.personas.length === 0) throw new Error("The persona dataset is empty.");

  for (const persona of dataset.personas) {
    for (const { id } of QUESTIONS) {
      if (!(id in persona.answers)) throw new Error(`Persona ${persona.id} is missing ${id} from its complete answer map.`);
    }
  }

  const personas = dataset.personas.map(replayPersona);
  const metrics = personas.map(({ eraBlend }) => blendMetrics(eraBlend.map(({ percentage }) => percentage)));
  const topThreeCombinations = personas.map(({ primaryEra, secondaryEra, hiddenEra }) =>
    [primaryEra, secondaryEra, hiddenEra].sort().join(" + "),
  );

  const report = {
    personaCount: personas.length,
    questionsConsumedPerPersona: INITIAL_DECISIONS,
    personas,
    aggregate: {
      primaryEraDistribution: countBy(personas.map(({ primaryEra }) => primaryEra)),
      secondaryEraDistribution: countBy(personas.map(({ secondaryEra }) => secondaryEra)),
      hiddenEraDistribution: countBy(personas.map(({ hiddenEra }) => hiddenEra)),
      uniquePrimaryErasReached: new Set(personas.map(({ primaryEra }) => primaryEra)).size,
      uniqueTopThreeCombinations: new Set(topThreeCombinations).size,
      averageEraBlendEntropyBits: round(metrics.reduce((sum, item) => sum + item.entropyBits, 0) / metrics.length),
      averageEraBlendNormalizedEntropy: round(metrics.reduce((sum, item) => sum + item.normalizedEntropy, 0) / metrics.length),
      averageEraBlendConcentration: round(metrics.reduce((sum, item) => sum + item.concentration, 0) / metrics.length),
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to run production synthetic batch.");
  process.exitCode = 1;
});
