import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

describe("pilot integration boundaries",()=>{
  it("keeps access validation and the expected code in server modules",()=>{const access=source("src/app/api/pilot/access/route.ts");const client=source("src/components/pilot-access.tsx");expect(access).toContain("validatePilotCode");expect(client).not.toContain("ERAPRINT_PILOT_CODE");expect(client).not.toContain("validatePilotCode");});
  it("persists only to the isolated pilot table",()=>{const route=source("src/app/api/pilot/result/route.ts");expect(route).toContain('.from("pilot_results")');expect(route).not.toContain("eraprint_snapshots");expect(route).not.toContain("game_sessions");expect(route).not.toContain("eraprint_match");expect(route).not.toContain("circle");});
  it("uses the same calculator in web and CLI entrypoints",()=>{expect(source("src/app/api/pilot/result/route.ts")).toContain("calculatePilotEraPrint");expect(source("scripts/hidden-model-pilot.ts")).toContain("calculatePilotEraPrint");});
  it("does not render hidden scores or model internals",()=>{const client=source("src/components/pilot-client.tsx");expect(client).not.toContain("hiddenScores");expect(client).not.toContain("HIDDEN_CHOICE_EFFECTS");expect(client).not.toContain("ERA_HIDDEN_PROFILES");expect(client).not.toContain("PILOT_HIDDEN_WEIGHT");});
  it("stores every requested feedback field",()=>{const feedback=source("src/app/api/pilot/feedback/route.ts");for(const field of ["fit_score","top_three_fit","preferred_era_code","feedback_comment"])expect(feedback).toContain(field);});
});
