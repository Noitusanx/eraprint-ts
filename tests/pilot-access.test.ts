import { afterEach,describe,expect,it } from "vitest";
import { createPilotSession,isPilotEnabled,validatePilotCode,validatePilotSession } from "../src/lib/pilot/access";

const previousEnabled=process.env.ERAPRINT_PILOT_ENABLED;
const previousCode=process.env.ERAPRINT_PILOT_CODE;
afterEach(()=>{if(previousEnabled===undefined)delete process.env.ERAPRINT_PILOT_ENABLED;else process.env.ERAPRINT_PILOT_ENABLED=previousEnabled;if(previousCode===undefined)delete process.env.ERAPRINT_PILOT_CODE;else process.env.ERAPRINT_PILOT_CODE=previousCode;});

describe("pilot access",()=>{
  it("is disabled unless the server-only flag is exactly true",()=>{delete process.env.ERAPRINT_PILOT_ENABLED;expect(isPilotEnabled()).toBe(false);process.env.ERAPRINT_PILOT_ENABLED="false";expect(isPilotEnabled()).toBe(false);process.env.ERAPRINT_PILOT_ENABLED="true";expect(isPilotEnabled()).toBe(true);});
  it("rejects a wrong code and accepts a signed temporary session",()=>{process.env.ERAPRINT_PILOT_ENABLED="true";process.env.ERAPRINT_PILOT_CODE="private-test-code";expect(validatePilotCode("wrong")).toBe(false);expect(validatePilotCode("private-test-code")).toBe(true);const session=createPilotSession();expect(session.value).not.toContain("private-test-code");expect(validatePilotSession(session.value)).toBe(true);expect(validatePilotSession(`${session.value}tampered`)).toBe(false);});
});
