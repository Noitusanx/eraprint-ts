import { calculatePilotEraPrint } from "../src/lib/scoring/pilot-engine";
import { HIDDEN_ERA_CODES, TRAIT_CODES, type Answer } from "../src/lib/scoring/types";
async function main(){let input="";for await(const chunk of process.stdin)input+=chunk;const answers=JSON.parse(input) as Answer[];const {result,hiddenScores}=calculatePilotEraPrint(answers);console.log(JSON.stringify({answeredCount:answers.length,publicTraitScores:Object.fromEntries(TRAIT_CODES.map(c=>[c,result.traitScores[c].score])),hiddenScores:Object.fromEntries(HIDDEN_ERA_CODES.map(c=>[c,hiddenScores[c].score])),primaryEra:result.primaryEra.code,secondaryEra:result.secondaryEra.code,hiddenEra:result.hiddenEra.code,eraBlend:result.eraBlend.map(({code,name,percentage})=>({code,name,percentage}))},null,2));}
void main();
