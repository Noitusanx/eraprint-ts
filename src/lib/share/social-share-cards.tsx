import type { PublicCircleResult } from "@/lib/circle/types";
import { matchTraitName } from "@/lib/match/era-match-copy";
import type { PublicEraMatchResult } from "@/lib/match/types";

const ink = "#17131d";
const muted = "#746d7c";
const accent = "#8c4e6d";
const line = "rgba(35,28,43,.13)";
const surface = "rgba(255,255,255,.68)";

function Brand({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", width: 16, height: 16, borderRadius: 99, background: accent }} />
        <div style={{ display: "flex", fontFamily: "serif", fontSize: 32, fontWeight: 700 }}>EraPrint</div>
      </div>
      <div style={{ display: "flex", padding: "11px 17px", border: `1px solid ${line}`, borderRadius: 99, color: muted, fontSize: 14, fontWeight: 800, letterSpacing: 3 }}>
        {label}
      </div>
    </div>
  );
}

function Footer({ copy }: { copy: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", paddingTop: 30, borderTop: `1px solid ${line}` }}>
      <div style={{ display: "flex", color: muted, fontSize: 16 }}>See what your EraPrints reveal.</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ display: "flex", color: muted, fontSize: 14 }}>{copy}</div>
        <div style={{ display: "flex", marginTop: 6, fontFamily: "serif", fontSize: 18 }}>Find your era story</div>
      </div>
    </div>
  );
}

const shellStyle = {
  width: "100%",
  height: "100%",
  position: "relative" as const,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column" as const,
  padding: "78px 78px 72px",
  color: ink,
  fontFamily: "sans-serif",
};

export function EraMatchShareCard({ result, viewerSide }: { result: PublicEraMatchResult; viewerSide: "A" | "B" | null }) {
  const profile = (side: "A" | "B", archetype: string, eraName: string) => (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "30px 32px", border: `1px solid ${line}`, borderRadius: 28, background: surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: side === "A" ? "#8c4e6d" : "#426b80", fontSize: 14, fontWeight: 800, letterSpacing: 3 }}>
        PROFILE {side}{viewerSide === side ? " · YOU" : ""}
      </div>
      <div style={{ display: "flex", marginTop: 18, fontFamily: "serif", fontSize: archetype.length > 22 ? 35 : 41, lineHeight: 1.05 }}>{archetype}</div>
      <div style={{ display: "flex", marginTop: 16, color: muted, fontSize: 20 }}>{eraName}</div>
    </div>
  );

  return (
    <div style={{ ...shellStyle, background: "linear-gradient(150deg,#fbf7f3 0%,#ead7df 52%,#d9e7eb 100%)" }}>
      <div style={{ position: "absolute", top: -180, right: -130, display: "flex", width: 570, height: 570, borderRadius: 999, background: "rgba(140,78,109,.08)" }} />
      <div style={{ position: "absolute", bottom: 120, left: -180, display: "flex", width: 500, height: 500, borderRadius: 999, background: "rgba(39,75,95,.08)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
        <Brand label="ERAMATCH" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 120, textAlign: "center" }}>
          <div style={{ display: "flex", color: muted, fontSize: 16, fontWeight: 800, letterSpacing: 5 }}>PROFILE SIMILARITY</div>
          <div style={{ display: "flex", marginTop: 24, fontFamily: "serif", fontSize: 190, lineHeight: .9, letterSpacing: -10 }}>{Math.round(result.matchScore)}%</div>
          <div style={{ display: "flex", marginTop: 30, maxWidth: 820, fontFamily: "serif", fontSize: 47, lineHeight: 1.08 }}>{result.profileA.archetype} × {result.profileB.archetype}</div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 75 }}>
          {profile("A", result.profileA.archetype, result.profileA.primaryEra.name)}
          {profile("B", result.profileB.archetype, result.profileB.primaryEra.name)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 34, padding: "34px 36px", border: `1px solid ${line}`, borderRadius: 30, background: surface }}>
          <div style={{ display: "flex", color: muted, fontSize: 14, fontWeight: 800, letterSpacing: 4 }}>SHARED ERA</div>
          <div style={{ display: "flex", marginTop: 14, fontFamily: "serif", fontSize: 54 }}>{result.sharedEra.name}</div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
          {result.mostInSync.slice(0, 2).map((trait) => (
            <div key={trait.code} style={{ flex: 1, display: "flex", flexDirection: "column", padding: "26px 28px", borderTop: `1px solid ${line}` }}>
              <div style={{ display: "flex", color: muted, fontSize: 13, fontWeight: 800, letterSpacing: 3 }}>IN SYNC</div>
              <div style={{ display: "flex", marginTop: 12, fontFamily: "serif", fontSize: 31 }}>{matchTraitName(trait.code)}</div>
              <div style={{ display: "flex", marginTop: 9, color: accent, fontSize: 22, fontWeight: 800 }}>{Math.round(trait.similarity)}% similar</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 24, padding: "21px 28px", borderRadius: 20, background: "rgba(255,255,255,.35)", color: muted, fontSize: 17 }}>
          One contrast: {matchTraitName(result.biggestContrast.code)} · {Math.round(result.biggestContrast.difference)} points apart
        </div>
        <Footer copy="Compare your EraPrints" />
      </div>
    </div>
  );
}

export function CircleShareCard({ result, viewerMemberIndex }: { result: PublicCircleResult; viewerMemberIndex: number | null }) {
  const shownMembers = result.members.slice(0, 7);
  return (
    <div style={{ ...shellStyle, background: "linear-gradient(150deg,#f8f4ef 0%,#e7dce5 48%,#d9e8e5 100%)" }}>
      <div style={{ position: "absolute", top: -180, right: -120, display: "flex", width: 580, height: 580, borderRadius: 999, background: "rgba(140,78,109,.08)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
        <Brand label="CIRCLE" />
        <div style={{ display: "flex", flexDirection: "column", marginTop: 120 }}>
          <div style={{ display: "flex", color: accent, fontSize: 16, fontWeight: 800, letterSpacing: 5 }}>{result.memberCount} ERAPRINTS TOGETHER</div>
          <div style={{ display: "flex", marginTop: 25, maxWidth: 900, fontFamily: "serif", fontSize: 73, lineHeight: 1.02, letterSpacing: -3 }}>{result.primaryEra.name} × {result.secondaryEra.name}</div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 70 }}>
          {[{ label: "PRIMARY ERA", era: result.primaryEra }, { label: "SECONDARY ERA", era: result.secondaryEra }].map(({ label, era }) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", padding: "31px 32px", border: `1px solid ${line}`, borderRadius: 28, background: surface }}>
              <div style={{ display: "flex", color: muted, fontSize: 13, fontWeight: 800, letterSpacing: 3 }}>{label}</div>
              <div style={{ display: "flex", marginTop: 15, fontFamily: "serif", fontSize: 39 }}>{era.name}</div>
              <div style={{ display: "flex", marginTop: 12, color: accent, fontSize: 22, fontWeight: 800 }}>{era.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, padding: "29px 32px", border: `1px solid ${line}`, borderRadius: 26, background: surface }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: muted, fontSize: 13, fontWeight: 800, letterSpacing: 3 }}>STRONGEST SHARED SIGNAL</div>
            <div style={{ display: "flex", marginTop: 12, fontFamily: "serif", fontSize: 38 }}>{matchTraitName(result.strongestSignals[0].code)}</div>
          </div>
          <div style={{ display: "flex", color: accent, fontFamily: "serif", fontSize: 48 }}>{Math.round(result.strongestSignals[0].score)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 45 }}>
          <div style={{ display: "flex", color: muted, fontSize: 14, fontWeight: 800, letterSpacing: 4 }}>MEET THE CIRCLE</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 16, borderTop: `1px solid ${line}` }}>
            {shownMembers.map((member, index) => (
              <div key={`${member.snapshotId}-${index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 4px", borderBottom: `1px solid ${line}` }}>
                <div style={{ display: "flex", minWidth: 0, fontSize: 22, fontWeight: 750 }}>{member.displayName || `Profile ${index + 1}`}{viewerMemberIndex === index + 1 ? " (You)" : ""}</div>
                <div style={{ display: "flex", marginLeft: 20, color: muted, fontFamily: "serif", fontSize: 21 }}>{member.primaryEra.name}</div>
              </div>
            ))}
          </div>
          {result.members.length > shownMembers.length && <div style={{ display: "flex", marginTop: 13, color: muted, fontSize: 16 }}>+{result.members.length - shownMembers.length} more members</div>}
        </div>
        <Footer copy="Bring your Circle together" />
      </div>
    </div>
  );
}
