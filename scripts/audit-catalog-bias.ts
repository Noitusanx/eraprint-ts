import { execFileSync } from "node:child_process";
import ts from "typescript";
import { QUESTIONS, SCORING_VERSION } from "../src/lib/data/catalog";
import {
  auditCatalogBias,
  findEraReachability,
} from "../src/lib/scoring/catalog-audit";
import type { QuestionDefinition } from "../src/lib/scoring/types";

function loadQuestionsFromGit(ref: string): QuestionDefinition[] {
  const source = execFileSync("git", ["show", `${ref}:src/lib/data/catalog.ts`], {
    encoding: "utf8",
  });
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const catalogModule = { exports: {} as { QUESTIONS?: QuestionDefinition[] } };
  Function("module", "exports", compiled)(catalogModule, catalogModule.exports);
  if (!catalogModule.exports.QUESTIONS) throw new Error(`No questions found at git ref ${ref}.`);
  return catalogModule.exports.QUESTIONS;
}

const gitRefIndex = process.argv.indexOf("--git-ref");
const gitRef = gitRefIndex >= 0 ? process.argv[gitRefIndex + 1] : null;
if (gitRef) QUESTIONS.splice(0, QUESTIONS.length, ...loadQuestionsFromGit(gitRef));

const runs = Number(process.env.AUDIT_RUNS ?? 20_000);
const audit = auditCatalogBias({ runs });
const reachability13 = findEraReachability(13, 250);
const reachability30 = findEraReachability(30, 250);
const compactReachability = (results: ReturnType<typeof findEraReachability>) =>
  Object.fromEntries(Object.entries(results).map(([era, result]) => [era, {
    reachable: result.reachable,
    primary: result.primary,
    percentage: result.percentage,
  }]));

console.log(JSON.stringify({
  source: gitRef ? `git:${gitRef}` : "working-tree",
  scoringVersion: SCORING_VERSION,
  ...audit,
  reachability: {
    initial13: compactReachability(reachability13),
    full30: compactReachability(reachability30),
  },
}, null, 2));
