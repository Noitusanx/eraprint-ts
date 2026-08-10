import { ImageResponse } from "next/og";
import {
  calculateEraPrint,
  validateInitialGameSequence,
} from "@/lib/scoring/scoring-engine";
import {
  buildResultSummary,
  getDominantTraits,
} from "@/lib/scoring/result-copy";
import type { Answer, EraPrintResult } from "@/lib/scoring/types";
import { fetchSnapshotAsResult } from "@/lib/repositories/eraprint-public-repository";

export const runtime = "nodejs";

type ShareCardData = {
  result: EraPrintResult;
  summary: string;
  dominantTraits: ReturnType<typeof getDominantTraits>;
};

type EraMotif =
  | "country"
  | "spark"
  | "ornament"
  | "blocks"
  | "grid"
  | "dark"
  | "bubbles"
  | "forest"
  | "leaves"
  | "night"
  | "paper"
  | "spotlight";

type EraTheme = {
  background: string;
  surface: string;
  softSurface: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  line: string;
  motif: EraMotif;
};

const DEFAULT_THEME: EraTheme = {
  background: "linear-gradient(150deg, #fbf7f3 0%, #f2e7ec 100%)",
  surface: "rgba(255,255,255,0.72)",
  softSurface: "rgba(255,255,255,0.44)",
  ink: "#17131d",
  muted: "#746d7c",
  accent: "#8c4e6d",
  accent2: "#b9879d",
  line: "rgba(23,19,29,0.12)",
  motif: "ornament",
};

const ERA_THEMES: Record<string, EraTheme> = {
  DEBUT: {
    background:
      "linear-gradient(150deg, #f6f0df 0%, #dfe9d6 52%, #c9ddd6 100%)",
    surface: "rgba(255,255,248,0.76)",
    softSurface: "rgba(255,255,248,0.46)",
    ink: "#20312b",
    muted: "#61716a",
    accent: "#4f7d68",
    accent2: "#b58a4d",
    line: "rgba(32,49,43,0.14)",
    motif: "country",
  },
  FEARLESS: {
    background:
      "linear-gradient(150deg, #fff9e7 0%, #f3dfac 54%, #e8c978 100%)",
    surface: "rgba(255,252,240,0.78)",
    softSurface: "rgba(255,252,240,0.48)",
    ink: "#3a2b14",
    muted: "#7d6a46",
    accent: "#b7832c",
    accent2: "#e4b950",
    line: "rgba(58,43,20,0.14)",
    motif: "spark",
  },
  SPEAK_NOW: {
    background:
      "linear-gradient(150deg, #faf3fc 0%, #e9d8ef 52%, #d7bee4 100%)",
    surface: "rgba(255,250,255,0.76)",
    softSurface: "rgba(255,250,255,0.46)",
    ink: "#281c2e",
    muted: "#75667c",
    accent: "#7d4b8f",
    accent2: "#b987c8",
    line: "rgba(40,28,46,0.14)",
    motif: "ornament",
  },
  RED: {
    background:
      "linear-gradient(150deg, #fff6f2 0%, #ead5cf 48%, #c96a61 100%)",
    surface: "rgba(255,250,247,0.80)",
    softSurface: "rgba(255,247,243,0.50)",
    ink: "#331a1a",
    muted: "#7f6663",
    accent: "#9f2f2f",
    accent2: "#cf6b5f",
    line: "rgba(51,26,26,0.14)",
    motif: "blocks",
  },
  "1989": {
    background:
      "linear-gradient(150deg, #f4fbff 0%, #d8edf4 48%, #a9cfdf 100%)",
    surface: "rgba(250,254,255,0.78)",
    softSurface: "rgba(250,254,255,0.46)",
    ink: "#19303b",
    muted: "#637883",
    accent: "#397f9f",
    accent2: "#75b0c7",
    line: "rgba(25,48,59,0.14)",
    motif: "grid",
  },
  REPUTATION: {
    background:
      "linear-gradient(145deg, #090b0d 0%, #171b1c 52%, #252b28 100%)",
    surface: "rgba(255,255,255,0.075)",
    softSurface: "rgba(255,255,255,0.045)",
    ink: "#f3f0ea",
    muted: "#aaa9a4",
    accent: "#8fa789",
    accent2: "#d4d2ca",
    line: "rgba(255,255,255,0.16)",
    motif: "dark",
  },
  LOVER: {
    background:
      "linear-gradient(150deg, #fff3f7 0%, #f3ddec 42%, #cfe6ef 100%)",
    surface: "rgba(255,255,255,0.72)",
    softSurface: "rgba(255,255,255,0.44)",
    ink: "#302238",
    muted: "#7c6b7f",
    accent: "#c05d8d",
    accent2: "#69a8bd",
    line: "rgba(48,34,56,0.13)",
    motif: "bubbles",
  },
  FOLKLORE: {
    background:
      "linear-gradient(150deg, #f3f3f0 0%, #d8d9d4 55%, #babdb7 100%)",
    surface: "rgba(250,250,247,0.76)",
    softSurface: "rgba(250,250,247,0.44)",
    ink: "#222522",
    muted: "#6f746f",
    accent: "#626d64",
    accent2: "#8d938b",
    line: "rgba(34,37,34,0.14)",
    motif: "forest",
  },
  EVERMORE: {
    background:
      "linear-gradient(150deg, #faf4ea 0%, #dfc8aa 50%, #ad7855 100%)",
    surface: "rgba(255,249,240,0.76)",
    softSurface: "rgba(255,249,240,0.44)",
    ink: "#38261e",
    muted: "#7b675d",
    accent: "#985d3e",
    accent2: "#c29458",
    line: "rgba(56,38,30,0.14)",
    motif: "leaves",
  },
  MIDNIGHTS: {
    background:
      "linear-gradient(145deg, #111729 0%, #1c2850 50%, #334d70 100%)",
    surface: "rgba(255,255,255,0.085)",
    softSurface: "rgba(255,255,255,0.05)",
    ink: "#f4f2ec",
    muted: "#b8bed0",
    accent: "#9fb0d2",
    accent2: "#d0b985",
    line: "rgba(255,255,255,0.16)",
    motif: "night",
  },
  TTPD: {
    background:
      "linear-gradient(150deg, #f4f0e8 0%, #ded8cc 55%, #c6beb2 100%)",
    surface: "rgba(252,249,242,0.80)",
    softSurface: "rgba(252,249,242,0.48)",
    ink: "#24211f",
    muted: "#706b65",
    accent: "#5c5954",
    accent2: "#9b9387",
    line: "rgba(36,33,31,0.16)",
    motif: "paper",
  },
  SHOWGIRL: {
    background:
      "linear-gradient(145deg, #fff1df 0%, #e9aa72 48%, #2e7b80 100%)",
    surface: "rgba(255,248,238,0.78)",
    softSurface: "rgba(255,248,238,0.46)",
    ink: "#2d231d",
    muted: "#79675b",
    accent: "#c65f2d",
    accent2: "#1e7b7f",
    line: "rgba(45,35,29,0.14)",
    motif: "spotlight",
  },
};

async function buildShareCardData(request: Request): Promise<ShareCardData> {
  const body = (await request.json()) as {
    answers?: Answer[];
    snapshotId?: string;
  };

  const hasAnswers = Array.isArray(body.answers) && body.answers.length > 0;
  const hasSnapshotId =
    typeof body.snapshotId === "string" && body.snapshotId.length > 0;

  if (hasAnswers && hasSnapshotId) {
    throw new Error(
      "Share card requires either answers or snapshotId, but not both.",
    );
  }
  if (!hasAnswers && !hasSnapshotId) {
    throw new Error("Share card requires either answers or snapshotId.");
  }

  let result: EraPrintResult;

  if (hasSnapshotId) {
    const fetchedResult = await fetchSnapshotAsResult(body.snapshotId!);
    if (!fetchedResult) {
      throw new Error("Snapshot not found or invalid.");
    }
    result = fetchedResult;
  } else {
    const answers = body.answers!;
    if (answers.length !== 8) {
      throw new Error("Share card requires exactly 8 answers.");
    }

    const sequenceErrors = validateInitialGameSequence(answers);
    if (sequenceErrors.length > 0) {
      throw new Error(sequenceErrors[0]);
    }

    result = calculateEraPrint(answers);
  }

  return {
    result,
    summary: buildResultSummary(result),
    dominantTraits: getDominantTraits(result, 3),
  };
}

function Spark({
  top,
  left,
  size,
  color,
}: {
  top: number;
  left: number;
  size: number;
  color: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        display: "flex",
        transform: "rotate(45deg)",
        borderRadius: 4,
        background: color,
        opacity: 0.42,
      }}
    />
  );
}

function EraBackground({ theme }: { theme: EraTheme }) {
  if (theme.motif === "dark") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: -130,
            right: 70,
            width: 170,
            height: 860,
            display: "flex",
            transform: "rotate(24deg)",
            background: "rgba(255,255,255,0.035)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 120,
            right: 270,
            width: 76,
            height: 660,
            display: "flex",
            transform: "rotate(24deg)",
            background: `${theme.accent}12`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -170,
            left: -120,
            width: 470,
            height: 470,
            display: "flex",
            borderRadius: 80,
            transform: "rotate(18deg)",
            background: "rgba(255,255,255,0.025)",
          }}
        />
      </div>
    );
  }

  if (theme.motif === "night") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: -210,
            right: -130,
            width: 590,
            height: 590,
            display: "flex",
            borderRadius: 999,
            background: "rgba(255,255,255,0.055)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -170,
            left: -140,
            width: 430,
            height: 430,
            display: "flex",
            borderRadius: 999,
            background: `${theme.accent}10`,
          }}
        />
        <Spark top={150} left={865} size={13} color={theme.accent2} />
        <Spark top={260} left={930} size={8} color={theme.ink} />
        <Spark top={1160} left={80} size={9} color={theme.accent2} />
        <Spark top={1420} left={920} size={12} color={theme.ink} />
      </div>
    );
  }

  if (theme.motif === "grid") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.34,
        }}
      >
        {[130, 330, 530, 730, 930].map((left) => (
          <div
            key={`v-${left}`}
            style={{
              position: "absolute",
              top: 0,
              left,
              width: 1,
              height: 1920,
              display: "flex",
              background: theme.line,
            }}
          />
        ))}
        {[180, 520, 860, 1200, 1540].map((top) => (
          <div
            key={`h-${top}`}
            style={{
              position: "absolute",
              top,
              left: 0,
              width: 1080,
              height: 1,
              display: "flex",
              background: theme.line,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: 82,
            right: 72,
            width: 240,
            height: 240,
            display: "flex",
            background: `${theme.accent}0D`,
            transform: "rotate(8deg)",
          }}
        />
      </div>
    );
  }

  if (theme.motif === "blocks") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -70,
            width: 360,
            height: 600,
            display: "flex",
            borderRadius: 180,
            background: "rgba(159,47,47,0.10)",
            transform: "rotate(18deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -170,
            left: -120,
            width: 360,
            height: 620,
            display: "flex",
            borderRadius: 180,
            background: "rgba(159,47,47,0.08)",
            transform: "rotate(-18deg)",
          }}
        />
      </div>
    );
  }

  if (theme.motif === "bubbles") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -110,
            width: 500,
            height: 500,
            display: "flex",
            borderRadius: 999,
            background: "rgba(192,93,141,0.10)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 210,
            right: 90,
            width: 180,
            height: 180,
            display: "flex",
            borderRadius: 999,
            background: "rgba(105,168,189,0.11)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 180,
            left: -100,
            width: 390,
            height: 390,
            display: "flex",
            borderRadius: 999,
            background: "rgba(105,168,189,0.10)",
          }}
        />
      </div>
    );
  }

  if (theme.motif === "forest") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.42,
        }}
      >
        {[70, 135, 205, 285, 910, 970, 1020].map((left, index) => (
          <div
            key={left}
            style={{
              position: "absolute",
              bottom: 0,
              left,
              width: index % 2 === 0 ? 18 : 11,
              height: 560 + index * 75,
              display: "flex",
              borderRadius: 999,
              background: "rgba(70,76,70,0.10)",
              transform: `rotate(${index % 2 === 0 ? -3 : 4}deg)`,
            }}
          />
        ))}
      </div>
    );
  }

  if (theme.motif === "leaves") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 20,
            width: 380,
            height: 210,
            display: "flex",
            borderRadius: "100% 0 100% 0",
            background: "rgba(152,93,62,0.10)",
            transform: "rotate(-18deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 210,
            left: -50,
            width: 430,
            height: 240,
            display: "flex",
            borderRadius: "0 100% 0 100%",
            background: "rgba(194,148,88,0.12)",
            transform: "rotate(16deg)",
          }}
        />
      </div>
    );
  }

  if (theme.motif === "paper") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.48,
        }}
      >
        {[310, 365, 420, 475, 530, 585, 640].map((top) => (
          <div
            key={top}
            style={{
              position: "absolute",
              top,
              left: 70,
              width: 940,
              height: 1,
              display: "flex",
              background: "rgba(36,33,31,0.07)",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 70,
            width: 250,
            height: 170,
            display: "flex",
            background: `${theme.accent}0D`,
            transform: "rotate(5deg)",
          }}
        />
      </div>
    );
  }

  if (theme.motif === "spotlight") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: -250,
            right: -120,
            width: 620,
            height: 760,
            display: "flex",
            borderRadius: 999,
            background: "rgba(255,245,220,0.17)",
            transform: "rotate(-18deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -150,
            width: 530,
            height: 530,
            display: "flex",
            borderRadius: 999,
            background: "rgba(30,123,127,0.12)",
          }}
        />
        <Spark top={180} left={880} size={22} color={theme.accent} />
        <Spark top={1310} left={120} size={16} color={theme.accent2} />
      </div>
    );
  }

  if (theme.motif === "spark") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <Spark top={100} left={860} size={44} color={theme.accent} />
        <Spark top={220} left={930} size={20} color={theme.accent2} />
        <Spark top={1230} left={95} size={28} color={theme.accent} />
        <Spark top={1450} left={920} size={18} color={theme.accent2} />
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -130,
            width: 520,
            height: 520,
            display: "flex",
            borderRadius: 999,
            background: "rgba(183,131,44,0.08)",
          }}
        />
      </div>
    );
  }

  if (theme.motif === "country") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: -170,
            right: -120,
            width: 510,
            height: 510,
            display: "flex",
            borderRadius: 999,
            background: "rgba(79,125,104,0.09)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 60,
            width: 330,
            height: 130,
            display: "flex",
            borderRadius: "100% 0 100% 0",
            background: "rgba(181,138,77,0.09)",
            transform: "rotate(-14deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 245,
            left: -40,
            width: 250,
            height: 110,
            display: "flex",
            borderRadius: "0 100% 0 100%",
            background: "rgba(79,125,104,0.07)",
            transform: "rotate(12deg)",
          }}
        />
      </div>
    );
  }

  // Speak Now / ornament:
  // soft filled shapes + small diamonds only.
  // No large outlined circles, so nothing can read like a strand of hair.
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      <div
        style={{
          position: "absolute",
          top: -150,
          right: -90,
          width: 470,
          height: 470,
          display: "flex",
          borderRadius: 999,
          background: `${theme.accent}10`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 130,
          right: 120,
          width: 190,
          height: 190,
          display: "flex",
          borderRadius: 48,
          background: `${theme.accent2}0D`,
          transform: "rotate(45deg)",
        }}
      />
      <Spark top={250} left={930} size={15} color={theme.accent} />
      <Spark top={1180} left={92} size={18} color={theme.accent2} />
      <Spark top={1450} left={900} size={11} color={theme.accent} />
      <div
        style={{
          position: "absolute",
          bottom: -170,
          left: -140,
          width: 420,
          height: 420,
          display: "flex",
          borderRadius: 999,
          background: `${theme.accent2}0D`,
        }}
      />
    </div>
  );
}

export async function POST(request: Request) {
  let data: ShareCardData;

  try {
    data = await buildShareCardData(request);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate EraPrint card.",
      },
      { status: 400 },
    );
  }

  const { result, summary, dominantTraits } = data;
  const theme = ERA_THEMES[result.primaryEra.code] ?? DEFAULT_THEME;
  const secondaryTheme = ERA_THEMES[result.secondaryEra.code] ?? DEFAULT_THEME;
  const archetypeFontSize =
    result.archetype.length > 26 ? 68 : result.archetype.length > 20 ? 74 : 82;
  const eraBlendLength =
    result.primaryEra.name.length + result.secondaryEra.name.length;
  const eraBlendFontSize =
    eraBlendLength > 42 ? 41 : eraBlendLength > 32 ? 45 : 49;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "78px 78px 72px",
        background: theme.background,
        color: theme.ink,
        fontFamily: "sans-serif",
      }}
    >
      <EraBackground theme={theme} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                display: "flex",
                borderRadius: 999,
                background: theme.accent,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "serif",
                fontSize: 31,
                fontWeight: 700,
                letterSpacing: "-1px",
              }}
            >
              EraPrint
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 17px",
              border: `1px solid ${theme.line}`,
              borderRadius: 999,
              background: theme.softSurface,
              color: theme.muted,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "3px",
            }}
          >
            ERA PROFILE
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 150,
            maxWidth: 900,
          }}
        >
          <div
            style={{
              display: "flex",
              color: theme.accent,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "5px",
            }}
          >
            YOUR ERAPRINT
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              maxWidth: 900,
              fontFamily: "serif",
              fontSize: archetypeFontSize,
              lineHeight: 0.98,
              letterSpacing: "-3px",
            }}
          >
            {result.archetype}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 30,
              maxWidth: 820,
              color: theme.muted,
              fontSize: 26,
              lineHeight: 1.5,
            }}
          >
            {summary}
          </div>
        </div>

        {/* Era identity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 78,
            padding: "35px 38px",
            border: `1px solid ${theme.line}`,
            borderRadius: 30,
            background: theme.surface,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                color: theme.muted,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "4px",
              }}
            >
              ERA BLEND
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: theme.muted,
                fontSize: 14,
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  display: "flex",
                  borderRadius: 999,
                  background: theme.accent,
                }}
              />
              <div
                style={{
                  width: 9,
                  height: 9,
                  display: "flex",
                  borderRadius: 999,
                  background: secondaryTheme.accent,
                }}
              />
              PRIMARY × SECONDARY
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 19,
              maxWidth: 850,
              fontFamily: "serif",
              fontSize: eraBlendFontSize,
              lineHeight: 1.12,
              letterSpacing: "-1px",
            }}
          >
            {result.primaryEra.name} × {result.secondaryEra.name}
          </div>

          <div
            style={{
              display: "flex",
              width: "100%",
              height: 5,
              marginTop: 28,
              overflow: "hidden",
              borderRadius: 999,
              background: theme.line,
            }}
          >
            <div
              style={{
                width: "58%",
                height: "100%",
                display: "flex",
                background: theme.accent,
              }}
            />
            <div
              style={{
                width: "42%",
                height: "100%",
                display: "flex",
                background: secondaryTheme.accent,
              }}
            />
          </div>
        </div>

        {/* Signals */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              color: theme.muted,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "4px",
            }}
          >
            STRONGEST SIGNALS
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 17,
            }}
          >
            {dominantTraits.map((trait) => (
              <div
                key={trait.code}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 128,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "21px 22px",
                  border: `1px solid ${theme.line}`,
                  borderRadius: 22,
                  background: theme.softSurface,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: theme.muted,
                    fontSize: 14,
                  }}
                >
                  {trait.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 13,
                    fontFamily: "serif",
                    fontSize: 43,
                  }}
                >
                  {Math.round(trait.score)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meta badges */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 18,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "19px 22px",
              borderRadius: 20,
              border: `1px solid ${theme.line}`,
              background: theme.surface,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  color: theme.muted,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "3px",
                }}
              >
                HIDDEN ERA
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 7,
                  fontFamily: "serif",
                  fontSize: 26,
                }}
              >
                {result.hiddenEra.name}
              </div>
            </div>
            <div
              style={{
                width: 13,
                height: 13,
                display: "flex",
                borderRadius: 999,
                background:
                  ERA_THEMES[result.hiddenEra.code]?.accent ?? theme.accent2,
              }}
            />
          </div>

          <div
            style={{
              width: 220,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "19px 22px",
              borderRadius: 20,
              border: `1px solid ${theme.line}`,
              background: theme.surface,
            }}
          >
            <div
              style={{
                display: "flex",
                color: theme.muted,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "3px",
              }}
            >
              CLARITY
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 6,
                fontFamily: "serif",
                fontSize: 31,
              }}
            >
              {Math.round(result.clarity)}%
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            marginBottom: 50,
            paddingTop: 28,
            borderTop: `1px solid ${theme.line}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 30,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  color: theme.muted,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "3px",
                }}
              >
                ERAPRINT FINGERPRINT
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 7,
                  color: theme.ink,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                }}
              >
                {result.fingerprintCode}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: theme.muted,
                  fontSize: 15,
                }}
              >
                Distinctly yours.
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 6,
                  fontFamily: "serif",
                  fontSize: 24,
                }}
              >
                Create your own EraPrint
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1080,
      height: 1920,
    },
  );
}
