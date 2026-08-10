import type {
  EraDefinition,
  QuestionDefinition,
  TraitDefinition,
} from "../scoring/types";

export const TRAITS: TraitDefinition[] = [
  {
    code: "ROM",
    name: "Romantic Idealism",
    lowLabel: "realistic and cautious about romance",
    highLabel: "openly idealistic and all-in about romance",
  },
  {
    code: "EMO",
    name: "Emotional Intensity",
    lowLabel: "emotionally steady and contained",
    highLabel: "feels experiences strongly and vividly",
  },
  {
    code: "NOS",
    name: "Nostalgia",
    lowLabel: "future-oriented and quick to release the past",
    highLabel: "strongly attached to memories and past chapters",
  },
  {
    code: "AUT",
    name: "Self-Assertion",
    lowLabel: "accommodating and consensus-seeking",
    highLabel: "independent, decisive, and self-directed",
  },
  {
    code: "REF",
    name: "Introspection",
    lowLabel: "action-first and externally focused",
    highLabel: "reflective, analytical, and inward-looking",
  },
  {
    code: "ESC",
    name: "Imagination",
    lowLabel: "concrete and literal",
    highLabel: "imaginative, dreamy, and drawn to world-building",
  },
  {
    code: "SOC",
    name: "Social Energy",
    lowLabel: "private and low-key",
    highLabel: "outgoing, expressive, and energized by people",
  },
  {
    code: "GRD",
    name: "Guardedness",
    lowLabel: "open and emotionally accessible",
    highLabel: "protective, private, and slow to let people in",
  },
];

export const ERAS: EraDefinition[] = [
  {
    code: "DEBUT",
    name: "Taylor Swift (Debut)",
    profile: {
      ROM: 75,
      EMO: 60,
      NOS: 65,
      AUT: 45,
      REF: 65,
      ESC: 45,
      SOC: 55,
      GRD: 35,
    },
  },
  {
    code: "FEARLESS",
    name: "Fearless",
    profile: {
      ROM: 95,
      EMO: 70,
      NOS: 65,
      AUT: 55,
      REF: 55,
      ESC: 75,
      SOC: 65,
      GRD: 20,
    },
  },
  {
    code: "SPEAK_NOW",
    name: "Speak Now",
    profile: {
      ROM: 75,
      EMO: 80,
      NOS: 75,
      AUT: 80,
      REF: 80,
      ESC: 65,
      SOC: 50,
      GRD: 35,
    },
  },
  {
    code: "RED",
    name: "Red",
    profile: {
      ROM: 75,
      EMO: 95,
      NOS: 95,
      AUT: 55,
      REF: 85,
      ESC: 45,
      SOC: 60,
      GRD: 25,
    },
  },
  {
    code: "1989",
    name: "1989",
    profile: {
      ROM: 55,
      EMO: 65,
      NOS: 45,
      AUT: 90,
      REF: 50,
      ESC: 40,
      SOC: 95,
      GRD: 55,
    },
  },
  {
    code: "REPUTATION",
    name: "reputation",
    profile: {
      ROM: 65,
      EMO: 85,
      NOS: 45,
      AUT: 95,
      REF: 70,
      ESC: 40,
      SOC: 60,
      GRD: 90,
    },
  },
  {
    code: "LOVER",
    name: "Lover",
    profile: {
      ROM: 95,
      EMO: 70,
      NOS: 55,
      AUT: 70,
      REF: 65,
      ESC: 55,
      SOC: 90,
      GRD: 15,
    },
  },
  {
    code: "FOLKLORE",
    name: "folklore",
    profile: {
      ROM: 55,
      EMO: 70,
      NOS: 85,
      AUT: 60,
      REF: 95,
      ESC: 100,
      SOC: 25,
      GRD: 45,
    },
  },
  {
    code: "EVERMORE",
    name: "evermore",
    profile: {
      ROM: 45,
      EMO: 75,
      NOS: 90,
      AUT: 65,
      REF: 95,
      ESC: 95,
      SOC: 25,
      GRD: 55,
    },
  },
  {
    code: "MIDNIGHTS",
    name: "Midnights",
    profile: {
      ROM: 55,
      EMO: 80,
      NOS: 80,
      AUT: 75,
      REF: 95,
      ESC: 65,
      SOC: 55,
      GRD: 65,
    },
  },
  {
    code: "TTPD",
    name: "The Tortured Poets Department",
    profile: {
      ROM: 65,
      EMO: 95,
      NOS: 95,
      AUT: 75,
      REF: 100,
      ESC: 80,
      SOC: 35,
      GRD: 45,
    },
  },
  {
    code: "SHOWGIRL",
    name: "The Life of a Showgirl",
    profile: {
      ROM: 85,
      EMO: 75,
      NOS: 40,
      AUT: 95,
      REF: 55,
      ESC: 50,
      SOC: 100,
      GRD: 15,
    },
  },
];

export const QUESTIONS: QuestionDefinition[] = [
  {
    id: "Q01",
    type: "SCENARIO",
    category: "Relationship",
    prompt: "Someone from your past texts: “hey”.",
    choices: [
      {
        id: "Q01_A",
        label: "Reply immediately.",
        effects: {
          ROM: 2,
          EMO: 1,
          GRD: -2,
        },
      },
      {
        id: "Q01_B",
        label: "Read it. No reply.",
        effects: {
          GRD: 2,
          AUT: 1,
          ROM: -1,
        },
      },
      {
        id: "Q01_C",
        label: "Type something, delete it, then rewrite.",
        effects: {
          REF: 2,
          ROM: 1,
          GRD: 1,
        },
      },
      {
        id: "Q01_D",
        label: "Screenshot it to the group chat.",
        effects: {
          SOC: 2,
          EMO: 1,
          AUT: 1,
        },
      },
    ],
  },
  {
    id: "Q02",
    type: "SCENARIO",
    category: "Change",
    prompt: "A chapter of your life ends unexpectedly.",
    choices: [
      {
        id: "Q02_A",
        label: "Revisit everything that happened.",
        effects: {
          NOS: 2,
          REF: 1,
        },
      },
      {
        id: "Q02_B",
        label: "Reinvent myself completely.",
        effects: {
          AUT: 2,
          NOS: -1,
        },
      },
      {
        id: "Q02_C",
        label: "Disappear for a while.",
        effects: {
          REF: 2,
          GRD: 1,
          SOC: -1,
        },
      },
      {
        id: "Q02_D",
        label: "Turn it into a story in my head.",
        effects: {
          ESC: 2,
          EMO: 1,
        },
      },
    ],
  },
  {
    id: "Q03",
    type: "VISUAL_PICK",
    category: "Lifestyle",
    prompt: "Pick your Friday night.",
    choices: [
      {
        id: "Q03_A",
        label: "City lights, wandering alone.",
        effects: {
          AUT: 1,
          SOC: 1,
          REF: 1,
        },
        hint: "city",
      },
      {
        id: "Q03_B",
        label: "Rain on the window, music on.",
        effects: {
          NOS: 2,
          REF: 1,
          SOC: -1,
        },
        hint: "rain",
      },
      {
        id: "Q03_C",
        label: "A quiet cabin and a book.",
        effects: {
          ESC: 2,
          REF: 1,
          SOC: -1,
        },
        hint: "cabin",
      },
      {
        id: "Q03_D",
        label: "A loud room with friends.",
        effects: {
          SOC: 2,
          EMO: 1,
          REF: -1,
        },
        hint: "party",
      },
    ],
  },
  {
    id: "Q04",
    type: "SCENARIO",
    category: "Conflict",
    prompt: "Someone seriously disappoints you.",
    choices: [
      {
        id: "Q04_A",
        label: "Tell them exactly what I think.",
        effects: {
          AUT: 2,
          EMO: 1,
          GRD: -1,
        },
      },
      {
        id: "Q04_B",
        label: "Wait until I know exactly what to say.",
        effects: {
          REF: 2,
          GRD: 1,
        },
      },
      {
        id: "Q04_C",
        label: "Forgive pretty quickly.",
        effects: {
          ROM: 1,
          GRD: -1,
          EMO: -1,
        },
      },
      {
        id: "Q04_D",
        label: "Move on. Remember forever.",
        effects: {
          NOS: 2,
          AUT: 1,
          GRD: 1,
        },
      },
    ],
  },
  {
    id: "Q05",
    type: "THIS_OR_THAT",
    category: "Identity",
    prompt: "Keep only one.",
    choices: [
      {
        id: "Q05_A",
        label: "Being deeply understood.",
        effects: {
          REF: 2,
          ROM: 1,
          GRD: -1,
        },
      },
      {
        id: "Q05_B",
        label: "Being unforgettable.",
        effects: {
          AUT: 2,
          SOC: 1,
          EMO: 1,
        },
      },
    ],
  },
  {
    id: "Q06",
    type: "THIS_OR_THAT",
    category: "Relationship",
    prompt: "Second chances?",
    choices: [
      {
        id: "Q06_A",
        label: "Yes, if it still matters.",
        effects: {
          ROM: 1,
          GRD: -1,
        },
      },
      {
        id: "Q06_B",
        label: "Usually no.",
        effects: {
          AUT: 1,
          GRD: 1,
        },
      },
    ],
  },
  {
    id: "Q07",
    type: "THIS_OR_THAT",
    category: "Memory",
    prompt: "Old photos?",
    choices: [
      {
        id: "Q07_A",
        label: "Keep them.",
        effects: {
          NOS: 2,
        },
      },
      {
        id: "Q07_B",
        label: "I don't care much.",
        effects: {
          NOS: -1,
          AUT: 1,
        },
      },
    ],
  },
  {
    id: "Q08",
    type: "THIS_OR_THAT",
    category: "Emotion",
    prompt: "Feel everything or control everything?",
    choices: [
      {
        id: "Q08_A",
        label: "Feel everything.",
        effects: {
          EMO: 2,
          ROM: 1,
          GRD: -1,
        },
      },
      {
        id: "Q08_B",
        label: "Control everything.",
        effects: {
          GRD: 2,
          AUT: 1,
          EMO: -1,
        },
      },
    ],
  },
  {
    id: "Q09",
    type: "SCENARIO",
    category: "Social",
    prompt: "Plans get cancelled last minute.",
    choices: [
      {
        id: "Q09_A",
        label: "Secretly relieved.",
        effects: {
          REF: 1,
          SOC: -2,
        },
      },
      {
        id: "Q09_B",
        label: "Find someone else to go with.",
        effects: {
          SOC: 2,
          AUT: 1,
        },
      },
      {
        id: "Q09_C",
        label: "Make a solo plan.",
        effects: {
          AUT: 2,
          SOC: -1,
        },
      },
      {
        id: "Q09_D",
        label: "My mood is ruined for a while.",
        effects: {
          EMO: 2,
        },
      },
    ],
  },
  {
    id: "Q10",
    type: "SCENARIO",
    category: "Identity",
    prompt: "Someone completely misunderstands you.",
    choices: [
      {
        id: "Q10_A",
        label: "Explain myself.",
        effects: {
          AUT: 1,
          ROM: 1,
          GRD: -1,
        },
      },
      {
        id: "Q10_B",
        label: "Let them think what they want.",
        effects: {
          AUT: 2,
          GRD: 1,
        },
      },
      {
        id: "Q10_C",
        label: "Replay it later.",
        effects: {
          REF: 2,
          EMO: 1,
        },
      },
      {
        id: "Q10_D",
        label: "Pretend I don't care.",
        effects: {
          GRD: 2,
          EMO: 1,
        },
      },
    ],
  },
  {
    id: "Q11",
    type: "SCENARIO",
    category: "Future",
    prompt: "Your ideal future feels like…",
    choices: [
      {
        id: "Q11_A",
        label: "Big love and a safe home.",
        effects: {
          ROM: 2,
          GRD: -1,
        },
      },
      {
        id: "Q11_B",
        label: "Freedom to change everything.",
        effects: {
          AUT: 2,
        },
      },
      {
        id: "Q11_C",
        label: "Stories, places, and imagination.",
        effects: {
          ESC: 2,
          AUT: 1,
        },
      },
      {
        id: "Q11_D",
        label: "People, movement, and constant energy.",
        effects: {
          SOC: 2,
          EMO: 1,
        },
      },
    ],
  },
  {
    id: "Q12",
    type: "SCENARIO",
    category: "Memory",
    prompt: "You find something tied to an old memory.",
    choices: [
      {
        id: "Q12_A",
        label: "Keep it.",
        effects: {
          NOS: 2,
          GRD: 1,
        },
      },
      {
        id: "Q12_B",
        label: "Look at it, then put it away.",
        effects: {
          NOS: 1,
          REF: 1,
        },
      },
      {
        id: "Q12_C",
        label: "Let it go.",
        effects: {
          NOS: -2,
          AUT: 1,
        },
      },
      {
        id: "Q12_D",
        label: "Turn it into something creative.",
        effects: {
          ESC: 2,
          NOS: 1,
        },
      },
    ],
  },
  {
    id: "Q13",
    type: "SCENARIO",
    category: "Social",
    prompt: "Someone gives you a sincere compliment.",
    choices: [
      {
        id: "Q13_A",
        label: "Accept it.",
        effects: {
          AUT: 1,
          SOC: 1,
          GRD: -1,
        },
      },
      {
        id: "Q13_B",
        label: "Joke about it.",
        effects: {
          SOC: 1,
          GRD: 1,
        },
      },
      {
        id: "Q13_C",
        label: "Think about it later.",
        effects: {
          REF: 2,
          EMO: 1,
        },
      },
      {
        id: "Q13_D",
        label: "Compliment them back.",
        effects: {
          ROM: 1,
          SOC: 2,
        },
      },
    ],
  },
  {
    id: "Q14",
    type: "THIS_OR_THAT",
    category: "Decision",
    prompt: "A big decision has no obvious answer.",
    choices: [
      {
        id: "Q14_A",
        label: "Think until it makes sense.",
        effects: {
          REF: 2,
        },
      },
      {
        id: "Q14_B",
        label: "Choose, then make it work.",
        effects: {
          AUT: 2,
          REF: -1,
        },
      },
    ],
  },
  {
    id: "Q15",
    type: "SCENARIO",
    category: "Lifestyle",
    prompt: "Pick a trip with no itinerary.",
    choices: [
      {
        id: "Q15_A",
        label: "Return somewhere meaningful.",
        effects: {
          NOS: 2,
          REF: 1,
        },
      },
      {
        id: "Q15_B",
        label: "Go somewhere completely new.",
        effects: {
          AUT: 1,
          ESC: 1,
          NOS: -1,
        },
      },
      {
        id: "Q15_C",
        label: "A tiny town with no noise.",
        effects: {
          ESC: 2,
          REF: 1,
          SOC: -1,
        },
      },
      {
        id: "Q15_D",
        label: "A city that never sleeps.",
        effects: {
          SOC: 2,
          EMO: 1,
        },
      },
    ],
  },
  {
    id: "Q16",
    type: "SCENARIO",
    category: "Relationship",
    prompt: "Someone apologizes after hurting you.",
    choices: [
      {
        id: "Q16_A",
        label: "Try again if they are sincere.",
        effects: {
          ROM: 2,
          GRD: -1,
        },
      },
      {
        id: "Q16_B",
        label: "Forgive them, but don't let them back in.",
        effects: {
          AUT: 1,
          GRD: 2,
        },
      },
      {
        id: "Q16_C",
        label: "I need to understand why it happened.",
        effects: {
          REF: 2,
          NOS: 1,
        },
      },
      {
        id: "Q16_D",
        label: "Forgive, but remember.",
        effects: {
          NOS: 2,
          GRD: 1,
        },
      },
    ],
  },
  {
    id: "Q17",
    type: "THIS_OR_THAT",
    category: "Trust",
    prompt: "You learn something very personal about a friend.",
    choices: [
      {
        id: "Q17_A",
        label: "Keep it entirely to myself.",
        effects: {
          GRD: 2,
          SOC: -1,
        },
      },
      {
        id: "Q17_B",
        label: "I need one trusted person to process it with.",
        effects: {
          SOC: 1,
          REF: 1,
          GRD: -1,
        },
      },
    ],
  },
  {
    id: "Q18",
    type: "SCENARIO",
    category: "Social",
    prompt: "You enter a room knowing almost nobody.",
    choices: [
      {
        id: "Q18_A",
        label: "Talk to someone.",
        effects: {
          SOC: 2,
          GRD: -1,
        },
      },
      {
        id: "Q18_B",
        label: "Observe first.",
        effects: {
          REF: 1,
          GRD: 1,
        },
      },
      {
        id: "Q18_C",
        label: "Stay near one person.",
        effects: {
          GRD: 1,
          SOC: -1,
          ROM: 1,
        },
      },
      {
        id: "Q18_D",
        label: "Act confident until it works.",
        effects: {
          AUT: 2,
          SOC: 1,
        },
      },
    ],
  },
  {
    id: "Q19",
    type: "THIS_OR_THAT",
    category: "Imagination",
    prompt: "Which pulls you in more?",
    choices: [
      {
        id: "Q19_A",
        label: "A true story where tiny details matter.",
        effects: {
          REF: 2,
          NOS: 1,
        },
      },
      {
        id: "Q19_B",
        label: "A made-up world that feels real.",
        effects: {
          ESC: 2,
          EMO: 1,
        },
      },
    ],
  },
  {
    id: "Q20",
    type: "SCENARIO",
    category: "Conflict",
    prompt: "After an argument, what do you want?",
    choices: [
      {
        id: "Q20_A",
        label: "Say everything now.",
        effects: {
          EMO: 2,
          AUT: 1,
        },
      },
      {
        id: "Q20_B",
        label: "Time to think.",
        effects: {
          REF: 2,
          GRD: 1,
        },
      },
      {
        id: "Q20_C",
        label: "Reassurance that we're okay.",
        effects: {
          ROM: 2,
          GRD: -1,
        },
      },
      {
        id: "Q20_D",
        label: "A clear boundary, then move on.",
        effects: {
          AUT: 2,
          GRD: 1,
        },
      },
    ],
  },
  {
    id: "Q21",
    type: "SCENARIO",
    category: "Heartbreak",
    prompt: "After heartbreak…",
    choices: [
      {
        id: "Q21_A",
        label: "Revisit every detail.",
        effects: {
          NOS: 2,
          REF: 1,
        },
      },
      {
        id: "Q21_B",
        label: "Reinvent myself.",
        effects: {
          AUT: 2,
          GRD: 1,
        },
      },
      {
        id: "Q21_C",
        label: "Feel all of it.",
        effects: {
          EMO: 2,
          ROM: 1,
        },
      },
      {
        id: "Q21_D",
        label: "Keep busy.",
        effects: {
          SOC: 1,
          AUT: 1,
          GRD: 1,
        },
      },
    ],
  },
  {
    id: "Q22",
    type: "THIS_OR_THAT",
    category: "Story",
    prompt: "Choose an ending.",
    choices: [
      {
        id: "Q22_A",
        label: "Happy, certain, together.",
        effects: {
          ROM: 2,
          GRD: -1,
        },
      },
      {
        id: "Q22_B",
        label: "Messy, meaningful, unforgettable.",
        effects: {
          EMO: 2,
          NOS: 1,
          ESC: 1,
        },
      },
    ],
  },
  {
    id: "Q23",
    type: "THIS_OR_THAT",
    category: "Truth",
    prompt: "Which is harder to live with?",
    choices: [
      {
        id: "Q23_A",
        label: "A difficult truth.",
        effects: {
          REF: 1,
          AUT: 1,
          GRD: -1,
        },
      },
      {
        id: "Q23_B",
        label: "Not knowing the truth.",
        effects: {
          REF: 2,
          GRD: 1,
          EMO: 1,
        },
      },
    ],
  },
  {
    id: "Q24",
    type: "THIS_OR_THAT",
    category: "Memory",
    prompt: "A place holds a lot of memories.",
    choices: [
      {
        id: "Q24_A",
        label: "I'd go back.",
        effects: {
          NOS: 2,
          ROM: 1,
        },
      },
      {
        id: "Q24_B",
        label: "I'd rather make somewhere new matter.",
        effects: {
          AUT: 2,
          NOS: -1,
        },
      },
    ],
  },
  {
    id: "Q25",
    type: "THIS_OR_THAT",
    category: "Identity",
    prompt: "More valuable?",
    choices: [
      {
        id: "Q25_A",
        label: "Being recognized by many.",
        effects: {
          SOC: 2,
          AUT: 1,
        },
      },
      {
        id: "Q25_B",
        label: "Being deeply known by a few.",
        effects: {
          REF: 1,
          ROM: 1,
          SOC: -1,
          GRD: -1,
        },
      },
    ],
  },
  {
    id: "Q26",
    type: "SCENARIO",
    category: "Change",
    prompt: "Something planned for months falls apart.",
    choices: [
      {
        id: "Q26_A",
        label: "Fix it immediately.",
        effects: {
          AUT: 2,
          EMO: -1,
        },
      },
      {
        id: "Q26_B",
        label: "Be upset first.",
        effects: {
          EMO: 2,
        },
      },
      {
        id: "Q26_C",
        label: "Make a completely different plan.",
        effects: {
          ESC: 1,
          AUT: 1,
        },
      },
      {
        id: "Q26_D",
        label: "Pretend I'm fine while figuring it out.",
        effects: {
          GRD: 2,
          REF: 1,
        },
      },
    ],
  },
  {
    id: "Q27",
    type: "VISUAL_PICK",
    category: "Mood",
    prompt: "Pick a mood to disappear into.",
    choices: [
      {
        id: "Q27_A",
        label: "Soft light and handwritten thoughts.",
        effects: {
          REF: 2,
          ROM: 1,
        },
        hint: "soft",
      },
      {
        id: "Q27_B",
        label: "Neon and movement.",
        effects: {
          SOC: 2,
          AUT: 1,
        },
        hint: "neon",
      },
      {
        id: "Q27_C",
        label: "A storm outside.",
        effects: {
          EMO: 2,
        },
        hint: "storm",
      },
      {
        id: "Q27_D",
        label: "Trees, fog, no notifications.",
        effects: {
          ESC: 2,
          SOC: -1,
        },
        hint: "forest",
      },
    ],
  },
  {
    id: "Q28",
    type: "SCENARIO",
    category: "Communication",
    prompt: "You write a message you never send.",
    choices: [
      {
        id: "Q28_A",
        label: "Delete it immediately.",
        effects: {
          AUT: 1,
          GRD: 2,
        },
      },
      {
        id: "Q28_B",
        label: "Keep it in drafts.",
        effects: {
          NOS: 1,
          REF: 2,
        },
      },
      {
        id: "Q28_C",
        label: "Eventually send it.",
        effects: {
          ROM: 1,
          AUT: 1,
          GRD: -2,
        },
      },
      {
        id: "Q28_D",
        label: "Rewrite it into something else.",
        effects: {
          ESC: 2,
          REF: 1,
        },
      },
    ],
  },
  {
    id: "Q29",
    type: "SCENARIO",
    category: "Social",
    prompt: "A friend proposes a slightly reckless plan.",
    choices: [
      {
        id: "Q29_A",
        label: "Someone has to be sensible.",
        effects: {
          AUT: 2,
          EMO: -1,
        },
      },
      {
        id: "Q29_B",
        label: "Give me five minutes.",
        effects: {
          REF: 1,
          EMO: 1,
        },
      },
      {
        id: "Q29_C",
        label: "Absolutely.",
        effects: {
          SOC: 2,
          EMO: 1,
        },
      },
      {
        id: "Q29_D",
        label: "Improve the plan and somehow make it worse.",
        effects: {
          AUT: 1,
          ESC: 1,
          SOC: 1,
        },
      },
    ],
  },
  {
    id: "Q30",
    type: "SCENARIO",
    category: "Identity",
    prompt: "People often get one thing wrong about you.",
    choices: [
      {
        id: "Q30_A",
        label: "They think I'm quieter than I am.",
        effects: {
          SOC: 2,
          GRD: 1,
        },
      },
      {
        id: "Q30_B",
        label: "They think I'm stronger than I feel.",
        effects: {
          EMO: 2,
          GRD: 1,
        },
      },
      {
        id: "Q30_C",
        label: "They think I'm less emotional than I am.",
        effects: {
          EMO: 2,
          GRD: 2,
        },
      },
      {
        id: "Q30_D",
        label: "They think I'm more social than I feel.",
        effects: {
          SOC: -2,
          REF: 1,
        },
      },
    ],
  },
];

export const ANCHOR_QUESTION_IDS = ["Q01", "Q03", "Q04", "Q11", "Q19"] as const;

export const SCORING_VERSION = "v1.0.0";
