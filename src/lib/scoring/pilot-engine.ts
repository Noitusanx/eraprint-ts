import { ANCHOR_QUESTION_IDS, SCORING_VERSION } from "../data/catalog";
import { ERAS } from "../data/catalog";
import type { PublicQuestion } from "../data/public-catalog";
import { getHiddenExperimentQuestions } from "./hidden-question-experiment";
import { ERA_HIDDEN_PROFILES, HIDDEN_CHOICE_EFFECTS, HIDDEN_ERA_WEIGHT } from "./hidden-era-model";
import { calculateClarity, calculateEraBlend, selectArchetype, buildFingerprintCode } from "./scoring-engine";
import { HIDDEN_ERA_CODES, TRAIT_CODES, type Answer, type EraPrintResult, type HiddenEraCode, type HiddenEraScore, type QuestionDefinition, type TraitCode, type TraitScore } from "./types";

export const PILOT_QUESTION_COUNT = 13;
export const PILOT_SCORING_VERSION = `${SCORING_VERSION}-hidden-pilot`;
export const PILOT_HIDDEN_WEIGHT = HIDDEN_ERA_WEIGHT;
export const PILOT_QUESTIONS = getHiddenExperimentQuestions();

const clamp = (n: number) => Math.min(100, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const findChoice = (answer: Answer, questions = PILOT_QUESTIONS) => {
  const question = questions.find((q) => q.id === answer.questionId);
  const choice = question?.choices.find((c) => c.id === answer.choiceId);
  if (!question || !choice) throw new Error("Invalid pilot answer.");
  return choice;
};

export function getPublicPilotQuestion(question: QuestionDefinition): PublicQuestion {
  return { id: question.id, type: question.type, category: question.category, prompt: question.prompt,
    choices: question.choices.map(({ id, label, hint }) => ({ id, label, ...(hint ? { hint } : {}) })) };
}

export function calculatePilotTraitScores(answers: Answer[]): Record<TraitCode, TraitScore> {
  const totals = Object.fromEntries(TRAIT_CODES.map((code) => [code, { totalEffect: 0, evidenceCount: 0 }])) as Record<TraitCode, {totalEffect:number;evidenceCount:number}>;
  for (const answer of answers) for (const [raw, effect] of Object.entries(findChoice(answer).effects)) {
    if (!effect) continue; const code = raw as TraitCode; totals[code].totalEffect += effect; totals[code].evidenceCount++;
  }
  return Object.fromEntries(TRAIT_CODES.map((code) => { const t = totals[code]; return [code, { code, score: round1(clamp(50 + 25*t.totalEffect/(t.evidenceCount+3))), evidenceCount:t.evidenceCount, totalEffect:t.totalEffect, reliability:round2(t.evidenceCount/(t.evidenceCount+3)) }]; })) as Record<TraitCode,TraitScore>;
}

export function calculatePilotHiddenScores(answers: Answer[]): Record<HiddenEraCode, HiddenEraScore> {
  const totals = Object.fromEntries(HIDDEN_ERA_CODES.map((code) => [code, { totalEffect: 0, evidenceCount: 0 }])) as Record<HiddenEraCode, {totalEffect:number;evidenceCount:number}>;
  for (const answer of answers) { const choice=findChoice(answer); for (const [raw,effect] of Object.entries(HIDDEN_CHOICE_EFFECTS[choice.id]??{})) { if(!effect)continue; const code=raw as HiddenEraCode; totals[code].totalEffect+=effect; totals[code].evidenceCount++; } }
  return Object.fromEntries(HIDDEN_ERA_CODES.map((code)=>{const t=totals[code]; return [code,{code,score:round1(clamp(50+25*t.totalEffect/(t.evidenceCount+4))),evidenceCount:t.evidenceCount,totalEffect:t.totalEffect,reliability:round2(t.evidenceCount/(t.evidenceCount+4))}];})) as Record<HiddenEraCode,HiddenEraScore>;
}

function hash(input:string){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function nextAdaptive(answers: Answer[]) {
  if (answers.length === ANCHOR_QUESTION_IDS.length && !answers.some((a)=>a.questionId==="Q18")) return PILOT_QUESTIONS.find((q)=>q.id==="Q18")!;
  const used=new Set(answers.map((a)=>a.questionId)); const traits=calculatePilotTraitScores(answers); const top=calculateEraBlend(traits).slice(0,3).map((e)=>e.code); const eras=ERAS.filter((e)=>top.includes(e.code));
  const ranked=PILOT_QUESTIONS.filter((q)=>!used.has(q.id)).map((q)=>({q,score:TRAIT_CODES.reduce((sum,code)=>{const coverage=q.choices.reduce((s,c)=>s+Math.abs(c.effects[code]??0),0);const vals=eras.map((e)=>e.profile[code]);const mean=vals.reduce((a,b)=>a+b,0)/(vals.length||1);const variance=vals.reduce((s,v)=>s+(v-mean)**2,0)/(vals.length||1);return sum+coverage*(variance/625)*(0.55+1-traits[code].reliability);},0)})).sort((a,b)=>b.score-a.score||a.q.id.localeCompare(b.q.id)).slice(0,3);
  return ranked[hash(answers.map((a)=>`${a.questionId}:${a.choiceId}`).join("|"))%ranked.length]?.q??null;
}
export function getNextPilotQuestion(answers: Answer[]) { if(answers.length<ANCHOR_QUESTION_IDS.length)return PILOT_QUESTIONS.find((q)=>q.id===ANCHOR_QUESTION_IDS[answers.length])??null; return nextAdaptive(answers); }
export function validatePilotAnswers(answers: Answer[], complete=false): string[] { if(!Array.isArray(answers)||answers.length>(complete?13:12)||(complete&&answers.length!==13))return[complete?"Pilot requires exactly 13 answers.":"Invalid pilot answer count."]; for(let i=0;i<answers.length;i++){const expected=getNextPilotQuestion(answers.slice(0,i));try{findChoice(answers[i]);}catch{return["Invalid pilot answer."];}if(expected?.id!==answers[i].questionId)return[`Invalid pilot sequence at answer ${i+1}.`];}return[]; }

export type PilotCalculation={result:EraPrintResult;hiddenScores:Record<HiddenEraCode,HiddenEraScore>};
function calculatePilotEraPrintAtWeight(answers: Answer[], hiddenWeight: number): PilotCalculation { const errors=validatePilotAnswers(answers,true);if(errors.length)throw new Error(errors[0]);const traitScores=calculatePilotTraitScores(answers);const hiddenScores=calculatePilotHiddenScores(answers);const eraBlend=calculateEraBlend(traitScores,hiddenScores,hiddenWeight);const draft:EraPrintResult={traitScores,eraBlend,primaryEra:eraBlend[0],secondaryEra:eraBlend[1],hiddenEra:eraBlend[2],archetype:selectArchetype(traitScores),clarity:calculateClarity(traitScores),fingerprintCode:"",scoringVersion:PILOT_SCORING_VERSION};return{hiddenScores,result:{...draft,fingerprintCode:buildFingerprintCode(draft)}};}
export function calculatePilotEraPrint(answers: Answer[]): PilotCalculation { return calculatePilotEraPrintAtWeight(answers,PILOT_HIDDEN_WEIGHT); }

/** Developer diagnostics only. The live pilot always uses calculatePilotEraPrint(). */
export function calculatePilotEraPrintDiagnostic(answers: Answer[], hiddenWeight: 0 | 0.1): PilotCalculation {
  if(hiddenWeight!==0&&hiddenWeight!==PILOT_HIDDEN_WEIGHT)throw new Error("Pilot diagnostics only support hidden weights 0 and 0.1.");
  return calculatePilotEraPrintAtWeight(answers,hiddenWeight);
}

// Compile-time/runtime guard against accidental model drift.
if (PILOT_HIDDEN_WEIGHT !== 0.1 || Object.keys(ERA_HIDDEN_PROFILES).length !== 12) throw new Error("Pilot hidden model configuration changed.");
