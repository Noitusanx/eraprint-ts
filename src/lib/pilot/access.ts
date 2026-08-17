import { createHmac, timingSafeEqual } from "node:crypto";

export const PILOT_COOKIE = "eraprint_pilot";
const MAX_AGE_SECONDS = 60 * 60 * 8;

export function isPilotEnabled() { return process.env.ERAPRINT_PILOT_ENABLED === "true"; }
function expectedCode() { return process.env.ERAPRINT_PILOT_CODE ?? ""; }
function safeEqual(left:string,right:string){const a=Buffer.from(left);const b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);}
export function validatePilotCode(candidate:string){const expected=expectedCode();return expected.length>0&&safeEqual(candidate,expected);}
function signature(expiry:string){return createHmac("sha256",expectedCode()).update(`eraprint-pilot:${expiry}`).digest("base64url");}
export function createPilotSession(){const expiry=String(Math.floor(Date.now()/1000)+MAX_AGE_SECONDS);return{value:`${expiry}.${signature(expiry)}`,maxAge:MAX_AGE_SECONDS};}
export function validatePilotSession(value:string|undefined){if(!isPilotEnabled()||!value||!expectedCode())return false;const [expiry,sig,...rest]=value.split(".");if(rest.length||!expiry||!sig||Number(expiry)<=Date.now()/1000)return false;return safeEqual(sig,signature(expiry));}
