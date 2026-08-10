import { QUESTIONS, ERAS, TRAITS } from "../src/lib/data/catalog";
import {
  calculateEraPrint,
  validateCatalog,
} from "../src/lib/scoring/scoring-engine";
import type { Answer } from "../src/lib/scoring/types";

const errors = validateCatalog();
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const cases: Record<string, Answer[]> = {
  romanticSocial: [
    { questionId: "Q01", choiceId: "Q01_A" },
    { questionId: "Q03", choiceId: "Q03_D" },
    { questionId: "Q04", choiceId: "Q04_C" },
    { questionId: "Q11", choiceId: "Q11_A" },
    { questionId: "Q19", choiceId: "Q19_B" },
    { questionId: "Q18", choiceId: "Q18_A" },
    { questionId: "Q20", choiceId: "Q20_C" },
    { questionId: "Q13", choiceId: "Q13_D" },
  ],
  reflectiveImaginative: [
    { questionId: "Q01", choiceId: "Q01_C" },
    { questionId: "Q03", choiceId: "Q03_C" },
    { questionId: "Q04", choiceId: "Q04_B" },
    { questionId: "Q11", choiceId: "Q11_C" },
    { questionId: "Q19", choiceId: "Q19_B" },
    { questionId: "Q12", choiceId: "Q12_D" },
    { questionId: "Q15", choiceId: "Q15_C" },
    { questionId: "Q27", choiceId: "Q27_D" },
  ],
  guardedAssertive: [
    { questionId: "Q01", choiceId: "Q01_B" },
    { questionId: "Q03", choiceId: "Q03_A" },
    { questionId: "Q04", choiceId: "Q04_A" },
    { questionId: "Q11", choiceId: "Q11_B" },
    { questionId: "Q19", choiceId: "Q19_A" },
    { questionId: "Q16", choiceId: "Q16_B" },
    { questionId: "Q28", choiceId: "Q28_A" },
    { questionId: "Q10", choiceId: "Q10_B" },
  ],
};

for (const [name, answers] of Object.entries(cases)) {
  const result = calculateEraPrint(answers);
  const total = result.eraBlend.reduce((sum, era) => sum + era.percentage, 0);
  if (Math.abs(total - 100) > 1) {
    throw new Error(`${name}: era blend total is ${total}`);
  }
  for (const trait of Object.values(result.traitScores)) {
    if (trait.score < 0 || trait.score > 100) {
      throw new Error(`${name}: invalid trait score ${trait.code}=${trait.score}`);
    }
  }

  console.log(
    `${name}: ${result.primaryEra.name} / ${result.secondaryEra.name} / ${result.hiddenEra.name} | clarity ${result.clarity}%`,
  );
}

console.log(
  `Catalog OK: ${TRAITS.length} traits, ${ERAS.length} eras, ${QUESTIONS.length} questions.`,
);
