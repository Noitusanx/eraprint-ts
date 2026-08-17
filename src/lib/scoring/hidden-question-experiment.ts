import { QUESTIONS } from "../data/catalog";
import type { QuestionDefinition } from "./types";

function cloneCatalog(): QuestionDefinition[] {
  return QUESTIONS.map((question) => ({
    ...question,
    choices: question.choices.map((choice) => ({ ...choice, effects: { ...choice.effects } })),
  }));
}

/** The private pilot instrument. Never mutates the production catalog. */
export function getHiddenExperimentQuestions(): QuestionDefinition[] {
  const questions = cloneCatalog();
  const replace = (id: string, update: Partial<QuestionDefinition>) => {
    const question = questions.find((item) => item.id === id);
    if (!question) throw new Error(`Missing experimental question ${id}.`);
    Object.assign(question, update);
  };

  replace("Q03", { type: "SCENARIO", category: "Expression", prompt: "Something you made finally feels finished.", choices: [
    { id: "Q03_A", label: "Keep it just for me.", effects: { REF: 1, SOC: -1, GRD: 1 } },
    { id: "Q03_B", label: "Show one person who will understand.", effects: { SOC: 1, GRD: -1 } },
    { id: "Q03_C", label: "Share it quietly and let it find people.", effects: { SOC: 1, AUT: 1, GRD: -1 } },
    { id: "Q03_D", label: "Turn the reveal into a whole moment.", effects: { SOC: 2, AUT: 1, EMO: 1 } },
  ] });
  replace("Q17", { type: "SCENARIO", category: "Expression", prompt: "An invitation puts you in front of a room.", choices: [
    { id: "Q17_A", label: "Pass. I'd rather contribute quietly.", effects: { SOC: -1, GRD: 1 } },
    { id: "Q17_B", label: "Do it if someone I trust is beside me.", effects: { SOC: 1, GRD: -1 } },
    { id: "Q17_C", label: "Take the moment and make it memorable.", effects: { AUT: 1, SOC: 1, GRD: -1 } },
  ] });
  replace("Q18", { type: "SCENARIO", category: "Expression", prompt: "Something your group made is ready to be revealed.", choices: [
    { id: "Q18_A", label: "Send it quietly and stay behind the scenes.", effects: {} },
    { id: "Q18_B", label: "Help present it with someone else.", effects: {} },
    { id: "Q18_C", label: "Build up to the reveal and make it memorable.", effects: {} },
    { id: "Q18_D", label: "Handle the finishing touches without making a fuss.", effects: {} },
  ] });
  replace("Q29", { category: "Expression", prompt: "You make something you're proud of.", choices: [
    { id: "Q29_A", label: "Keep it to myself.", effects: { SOC: -1, GRD: 1 } },
    { id: "Q29_B", label: "Show one person I trust.", effects: { SOC: 1, GRD: -1 } },
    { id: "Q29_C", label: "Share it and let it have its moment.", effects: { SOC: 2, AUT: 1 } },
    { id: "Q29_D", label: "Keep polishing until it feels ready.", effects: { REF: 2, GRD: 1 } },
  ] });
  return questions;
}

/** @deprecated Diagnostic-script compatibility only. Web code must use the isolated catalog above. */
export function applyHiddenQuestionExperiment() {
  const experimental = getHiddenExperimentQuestions();
  for (const replacement of experimental) {
    const source = QUESTIONS.find((question) => question.id === replacement.id);
    if (source) Object.assign(source, replacement);
  }
}
