export type PublicQuestionType = "SCENARIO" | "THIS_OR_THAT" | "VISUAL_PICK";

export interface PublicChoice {
  id: string;
  label: string;
  hint?: string;
}

export interface PublicQuestion {
  id: string;
  type: PublicQuestionType;
  category: string;
  prompt: string;
  choices: PublicChoice[];
}

export const PUBLIC_TRAITS = [
  {
    "code": "ROM",
    "name": "Romantic Idealism",
    "lowLabel": "realistic and cautious about romance",
    "highLabel": "openly idealistic and all-in about romance"
  },
  {
    "code": "EMO",
    "name": "Emotional Intensity",
    "lowLabel": "emotionally steady and contained",
    "highLabel": "feels experiences strongly and vividly"
  },
  {
    "code": "NOS",
    "name": "Nostalgia",
    "lowLabel": "future-oriented and quick to release the past",
    "highLabel": "strongly attached to memories and past chapters"
  },
  {
    "code": "AUT",
    "name": "Self-Assertion",
    "lowLabel": "accommodating and consensus-seeking",
    "highLabel": "independent, decisive, and self-directed"
  },
  {
    "code": "REF",
    "name": "Introspection",
    "lowLabel": "action-first and externally focused",
    "highLabel": "reflective, analytical, and inward-looking"
  },
  {
    "code": "ESC",
    "name": "Imagination",
    "lowLabel": "concrete and literal",
    "highLabel": "imaginative, dreamy, and drawn to world-building"
  },
  {
    "code": "SOC",
    "name": "Social Energy",
    "lowLabel": "private and low-key",
    "highLabel": "outgoing, expressive, and energized by people"
  },
  {
    "code": "GRD",
    "name": "Guardedness",
    "lowLabel": "open and emotionally accessible",
    "highLabel": "protective, private, and slow to let people in"
  }
] as const;

export const PUBLIC_QUESTIONS: PublicQuestion[] = [
  {
    "id": "Q01",
    "type": "SCENARIO",
    "category": "Relationship",
    "prompt": "Someone from your past texts: “hey”.",
    "choices": [
      {
        "id": "Q01_A",
        "label": "Reply immediately."
      },
      {
        "id": "Q01_B",
        "label": "Read it. No reply."
      },
      {
        "id": "Q01_C",
        "label": "Type something, delete it, then rewrite."
      },
      {
        "id": "Q01_D",
        "label": "Screenshot it to the group chat."
      }
    ]
  },
  {
    "id": "Q02",
    "type": "SCENARIO",
    "category": "Change",
    "prompt": "A chapter of your life ends unexpectedly.",
    "choices": [
      {
        "id": "Q02_A",
        "label": "Revisit everything that happened."
      },
      {
        "id": "Q02_B",
        "label": "Reinvent myself completely."
      },
      {
        "id": "Q02_C",
        "label": "Disappear for a while."
      },
      {
        "id": "Q02_D",
        "label": "Turn it into a story in my head."
      }
    ]
  },
  {
    "id": "Q03",
    "type": "VISUAL_PICK",
    "category": "Lifestyle",
    "prompt": "Pick your Friday night.",
    "choices": [
      {
        "id": "Q03_A",
        "label": "City lights, wandering alone.",
        "hint": "city"
      },
      {
        "id": "Q03_B",
        "label": "Rain on the window, music on.",
        "hint": "rain"
      },
      {
        "id": "Q03_C",
        "label": "A quiet cabin and a book.",
        "hint": "cabin"
      },
      {
        "id": "Q03_D",
        "label": "A loud room with friends.",
        "hint": "party"
      }
    ]
  },
  {
    "id": "Q04",
    "type": "SCENARIO",
    "category": "Conflict",
    "prompt": "Someone seriously disappoints you.",
    "choices": [
      {
        "id": "Q04_A",
        "label": "Tell them exactly what I think."
      },
      {
        "id": "Q04_B",
        "label": "Wait until I know exactly what to say."
      },
      {
        "id": "Q04_C",
        "label": "Forgive pretty quickly."
      },
      {
        "id": "Q04_D",
        "label": "Move on. Remember forever."
      }
    ]
  },
  {
    "id": "Q05",
    "type": "THIS_OR_THAT",
    "category": "Identity",
    "prompt": "Keep only one.",
    "choices": [
      {
        "id": "Q05_A",
        "label": "Being deeply understood."
      },
      {
        "id": "Q05_B",
        "label": "Being unforgettable."
      }
    ]
  },
  {
    "id": "Q06",
    "type": "THIS_OR_THAT",
    "category": "Relationship",
    "prompt": "Second chances?",
    "choices": [
      {
        "id": "Q06_A",
        "label": "Yes, if it still matters."
      },
      {
        "id": "Q06_B",
        "label": "Usually no."
      }
    ]
  },
  {
    "id": "Q07",
    "type": "THIS_OR_THAT",
    "category": "Memory",
    "prompt": "Old photos?",
    "choices": [
      {
        "id": "Q07_A",
        "label": "Keep them."
      },
      {
        "id": "Q07_B",
        "label": "I don't care much."
      }
    ]
  },
  {
    "id": "Q08",
    "type": "THIS_OR_THAT",
    "category": "Emotion",
    "prompt": "Feel everything or control everything?",
    "choices": [
      {
        "id": "Q08_A",
        "label": "Feel everything."
      },
      {
        "id": "Q08_B",
        "label": "Control everything."
      }
    ]
  },
  {
    "id": "Q09",
    "type": "SCENARIO",
    "category": "Social",
    "prompt": "Plans get cancelled last minute.",
    "choices": [
      {
        "id": "Q09_A",
        "label": "Secretly relieved."
      },
      {
        "id": "Q09_B",
        "label": "Find someone else to go with."
      },
      {
        "id": "Q09_C",
        "label": "Make a solo plan."
      },
      {
        "id": "Q09_D",
        "label": "My mood is ruined for a while."
      }
    ]
  },
  {
    "id": "Q10",
    "type": "SCENARIO",
    "category": "Identity",
    "prompt": "Someone completely misunderstands you.",
    "choices": [
      {
        "id": "Q10_A",
        "label": "Explain myself."
      },
      {
        "id": "Q10_B",
        "label": "Let them think what they want."
      },
      {
        "id": "Q10_C",
        "label": "Replay it later."
      },
      {
        "id": "Q10_D",
        "label": "Pretend I don't care."
      }
    ]
  },
  {
    "id": "Q11",
    "type": "SCENARIO",
    "category": "Future",
    "prompt": "Your ideal future feels like…",
    "choices": [
      {
        "id": "Q11_A",
        "label": "Big love and a safe home."
      },
      {
        "id": "Q11_B",
        "label": "Freedom to change everything."
      },
      {
        "id": "Q11_C",
        "label": "Stories, places, and imagination."
      },
      {
        "id": "Q11_D",
        "label": "People, movement, and constant energy."
      }
    ]
  },
  {
    "id": "Q12",
    "type": "SCENARIO",
    "category": "Memory",
    "prompt": "You find something tied to an old memory.",
    "choices": [
      {
        "id": "Q12_A",
        "label": "Keep it."
      },
      {
        "id": "Q12_B",
        "label": "Look at it, then put it away."
      },
      {
        "id": "Q12_C",
        "label": "Let it go."
      },
      {
        "id": "Q12_D",
        "label": "Turn it into something creative."
      }
    ]
  },
  {
    "id": "Q13",
    "type": "SCENARIO",
    "category": "Social",
    "prompt": "Someone gives you a sincere compliment.",
    "choices": [
      {
        "id": "Q13_A",
        "label": "Accept it."
      },
      {
        "id": "Q13_B",
        "label": "Joke about it."
      },
      {
        "id": "Q13_C",
        "label": "Think about it later."
      },
      {
        "id": "Q13_D",
        "label": "Compliment them back."
      }
    ]
  },
  {
    "id": "Q14",
    "type": "THIS_OR_THAT",
    "category": "Decision",
    "prompt": "A big decision has no obvious answer.",
    "choices": [
      {
        "id": "Q14_A",
        "label": "Think until it makes sense."
      },
      {
        "id": "Q14_B",
        "label": "Choose, then make it work."
      }
    ]
  },
  {
    "id": "Q15",
    "type": "SCENARIO",
    "category": "Lifestyle",
    "prompt": "Pick a trip with no itinerary.",
    "choices": [
      {
        "id": "Q15_A",
        "label": "Return somewhere meaningful."
      },
      {
        "id": "Q15_B",
        "label": "Go somewhere completely new."
      },
      {
        "id": "Q15_C",
        "label": "A tiny town with no noise."
      },
      {
        "id": "Q15_D",
        "label": "A city that never sleeps."
      }
    ]
  },
  {
    "id": "Q16",
    "type": "SCENARIO",
    "category": "Relationship",
    "prompt": "Someone apologizes after hurting you.",
    "choices": [
      {
        "id": "Q16_A",
        "label": "Try again if they are sincere."
      },
      {
        "id": "Q16_B",
        "label": "Forgive them, but don't let them back in."
      },
      {
        "id": "Q16_C",
        "label": "I need to understand why it happened."
      },
      {
        "id": "Q16_D",
        "label": "Forgive, but remember."
      }
    ]
  },
  {
    "id": "Q17",
    "type": "THIS_OR_THAT",
    "category": "Trust",
    "prompt": "You learn something very personal about a friend.",
    "choices": [
      {
        "id": "Q17_A",
        "label": "Keep it entirely to myself."
      },
      {
        "id": "Q17_B",
        "label": "I need one trusted person to process it with."
      }
    ]
  },
  {
    "id": "Q18",
    "type": "SCENARIO",
    "category": "Social",
    "prompt": "You enter a room knowing almost nobody.",
    "choices": [
      {
        "id": "Q18_A",
        "label": "Talk to someone."
      },
      {
        "id": "Q18_B",
        "label": "Observe first."
      },
      {
        "id": "Q18_C",
        "label": "Stay near one person."
      },
      {
        "id": "Q18_D",
        "label": "Act confident until it works."
      }
    ]
  },
  {
    "id": "Q19",
    "type": "THIS_OR_THAT",
    "category": "Imagination",
    "prompt": "Which pulls you in more?",
    "choices": [
      {
        "id": "Q19_A",
        "label": "A true story where tiny details matter."
      },
      {
        "id": "Q19_B",
        "label": "A made-up world that feels real."
      }
    ]
  },
  {
    "id": "Q20",
    "type": "SCENARIO",
    "category": "Conflict",
    "prompt": "After an argument, what do you want?",
    "choices": [
      {
        "id": "Q20_A",
        "label": "Say everything now."
      },
      {
        "id": "Q20_B",
        "label": "Time to think."
      },
      {
        "id": "Q20_C",
        "label": "Reassurance that we're okay."
      },
      {
        "id": "Q20_D",
        "label": "A clear boundary, then move on."
      }
    ]
  },
  {
    "id": "Q21",
    "type": "SCENARIO",
    "category": "Heartbreak",
    "prompt": "After heartbreak…",
    "choices": [
      {
        "id": "Q21_A",
        "label": "Revisit every detail."
      },
      {
        "id": "Q21_B",
        "label": "Reinvent myself."
      },
      {
        "id": "Q21_C",
        "label": "Feel all of it."
      },
      {
        "id": "Q21_D",
        "label": "Keep busy."
      }
    ]
  },
  {
    "id": "Q22",
    "type": "THIS_OR_THAT",
    "category": "Story",
    "prompt": "Choose an ending.",
    "choices": [
      {
        "id": "Q22_A",
        "label": "Happy, certain, together."
      },
      {
        "id": "Q22_B",
        "label": "Messy, meaningful, unforgettable."
      }
    ]
  },
  {
    "id": "Q23",
    "type": "THIS_OR_THAT",
    "category": "Truth",
    "prompt": "Which is harder to live with?",
    "choices": [
      {
        "id": "Q23_A",
        "label": "A difficult truth."
      },
      {
        "id": "Q23_B",
        "label": "Not knowing the truth."
      }
    ]
  },
  {
    "id": "Q24",
    "type": "THIS_OR_THAT",
    "category": "Memory",
    "prompt": "A place holds a lot of memories.",
    "choices": [
      {
        "id": "Q24_A",
        "label": "I'd go back."
      },
      {
        "id": "Q24_B",
        "label": "I'd rather make somewhere new matter."
      }
    ]
  },
  {
    "id": "Q25",
    "type": "THIS_OR_THAT",
    "category": "Identity",
    "prompt": "More valuable?",
    "choices": [
      {
        "id": "Q25_A",
        "label": "Being recognized by many."
      },
      {
        "id": "Q25_B",
        "label": "Being deeply known by a few."
      }
    ]
  },
  {
    "id": "Q26",
    "type": "SCENARIO",
    "category": "Change",
    "prompt": "Something planned for months falls apart.",
    "choices": [
      {
        "id": "Q26_A",
        "label": "Fix it immediately."
      },
      {
        "id": "Q26_B",
        "label": "Be upset first."
      },
      {
        "id": "Q26_C",
        "label": "Make a completely different plan."
      },
      {
        "id": "Q26_D",
        "label": "Pretend I'm fine while figuring it out."
      }
    ]
  },
  {
    "id": "Q27",
    "type": "VISUAL_PICK",
    "category": "Mood",
    "prompt": "Pick a mood to disappear into.",
    "choices": [
      {
        "id": "Q27_A",
        "label": "Soft light and handwritten thoughts.",
        "hint": "soft"
      },
      {
        "id": "Q27_B",
        "label": "Neon and movement.",
        "hint": "neon"
      },
      {
        "id": "Q27_C",
        "label": "A storm outside.",
        "hint": "storm"
      },
      {
        "id": "Q27_D",
        "label": "Trees, fog, no notifications.",
        "hint": "forest"
      }
    ]
  },
  {
    "id": "Q28",
    "type": "SCENARIO",
    "category": "Communication",
    "prompt": "You write a message you never send.",
    "choices": [
      {
        "id": "Q28_A",
        "label": "Delete it immediately."
      },
      {
        "id": "Q28_B",
        "label": "Keep it in drafts."
      },
      {
        "id": "Q28_C",
        "label": "Eventually send it."
      },
      {
        "id": "Q28_D",
        "label": "Rewrite it into something else."
      }
    ]
  },
  {
    "id": "Q29",
    "type": "SCENARIO",
    "category": "Social",
    "prompt": "A friend proposes a slightly reckless plan.",
    "choices": [
      {
        "id": "Q29_A",
        "label": "Someone has to be sensible."
      },
      {
        "id": "Q29_B",
        "label": "Give me five minutes."
      },
      {
        "id": "Q29_C",
        "label": "Absolutely."
      },
      {
        "id": "Q29_D",
        "label": "Improve the plan and somehow make it worse."
      }
    ]
  },
  {
    "id": "Q30",
    "type": "SCENARIO",
    "category": "Identity",
    "prompt": "People often get one thing wrong about you.",
    "choices": [
      {
        "id": "Q30_A",
        "label": "They think I'm quieter than I am."
      },
      {
        "id": "Q30_B",
        "label": "They think I'm stronger than I feel."
      },
      {
        "id": "Q30_C",
        "label": "They think I'm less emotional than I am."
      },
      {
        "id": "Q30_D",
        "label": "They think I'm more social than I feel."
      }
    ]
  }
];

export const PUBLIC_ANCHOR_QUESTION_IDS = ["Q01", "Q03", "Q04", "Q11", "Q19"] as const;
export const PUBLIC_INITIAL_DECISIONS = 13;
