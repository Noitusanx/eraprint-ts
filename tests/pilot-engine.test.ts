import { describe,expect,it } from "vitest";
import { QUESTIONS } from "../src/lib/data/catalog";
import { HIDDEN_ERA_WEIGHT } from "../src/lib/scoring/hidden-era-model";
import { calculateEraPrint } from "../src/lib/scoring/scoring-engine";
import { calculatePilotEraPrint,calculatePilotEraPrintDiagnostic,getNextPilotQuestion,getPublicPilotQuestion,PILOT_HIDDEN_WEIGHT,PILOT_QUESTION_COUNT,PILOT_QUESTIONS,validatePilotAnswers } from "../src/lib/scoring/pilot-engine";
import type { Answer } from "../src/lib/scoring/types";

function pilotAnswers(){const answers:Answer[]=[];while(answers.length<PILOT_QUESTION_COUNT){const question=getNextPilotQuestion(answers);if(!question)throw new Error("Missing pilot question");answers.push({questionId:question.id,choiceId:question.choices[0].id});}return answers;}

describe("private pilot model",()=>{
  it("keeps production questions untouched while using the PRF pilot instrument",()=>{expect(QUESTIONS.find(q=>q.id==="Q03")?.prompt).toBe("Pick your Friday night.");expect(PILOT_QUESTIONS.find(q=>q.id==="Q03")?.prompt).toBe("Something you made finally feels finished.");expect(PILOT_QUESTIONS.find(q=>q.id==="Q18")?.prompt).toContain("ready to be revealed");});
  it("uses exactly 13 deterministic answers and fixed 10% hidden contribution",()=>{const answers=pilotAnswers();expect(answers).toHaveLength(13);expect(validatePilotAnswers(answers,true)).toEqual([]);expect(PILOT_HIDDEN_WEIGHT).toBe(0.1);expect(HIDDEN_ERA_WEIGHT).toBe(0.1);expect(calculatePilotEraPrint(answers).result.scoringVersion).toContain("hidden-pilot");});
  it("keeps the production calculator on its public-only scoring version",()=>{const answers=pilotAnswers();expect(calculateEraPrint(answers).scoringVersion).not.toContain("hidden-pilot");});
  it("only exposes renderable question content",()=>{const payload=JSON.stringify(getPublicPilotQuestion(PILOT_QUESTIONS[0]));expect(payload).not.toContain("effects");expect(payload).not.toContain('"NAR"');expect(payload).not.toContain('"PRF"');});
  it("returns hidden values only from the internal calculation envelope",()=>{const calculated=calculatePilotEraPrint(pilotAnswers());expect(calculated.hiddenScores).toBeDefined();expect(JSON.stringify(calculated.result)).not.toContain('"NAR"');expect(JSON.stringify(calculated.result)).not.toContain('"PRF"');});
  it("keeps the live calculator fixed at 10% while allowing only the controlled diagnostic weights",()=>{const answers=pilotAnswers();expect(calculatePilotEraPrintDiagnostic(answers,0.1)).toEqual(calculatePilotEraPrint(answers));expect(()=>calculatePilotEraPrintDiagnostic(answers,0.05 as 0)).toThrow("only support hidden weights 0 and 0.1");});
});
