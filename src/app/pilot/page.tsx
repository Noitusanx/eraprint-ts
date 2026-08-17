import { cookies } from "next/headers";import { notFound } from "next/navigation";
import { PilotAccess } from "@/components/pilot-access";import { PilotClient } from "@/components/pilot-client";import { isPilotEnabled,PILOT_COOKIE,validatePilotSession } from "@/lib/pilot/access";
export const dynamic="force-dynamic";
export default async function PilotPage(){if(!isPilotEnabled())notFound();const allowed=validatePilotSession((await cookies()).get(PILOT_COOKIE)?.value);return allowed?<PilotClient/>:<PilotAccess/>;}
