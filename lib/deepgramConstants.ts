import { type AudioConfig, type StsConfig, type Voice } from "../utils/deepgramUtils";

const audioConfig: AudioConfig = {
  input: {
    encoding: "linear16",
    sample_rate: 16000,
  },
  output: {
    encoding: "linear16",
    sample_rate: 24000,
    container: "none",
  },
};

const baseConfig = {
  type: "SettingsConfiguration",
  audio: audioConfig,
  agent: {
    listen: { model: "nova-3" },
    speak: { model: "aura-2-aries-en" },
    think: {
      provider: { type: "open_ai" },
      model: "gpt-4o-mini",
    },
  },
};

export const stsConfig: StsConfig = {
  ...baseConfig,
  agent: {
    ...baseConfig.agent,
    think: {
      ...baseConfig.agent.think,
      provider: { type: "open_ai", fallback_to_groq: true },
      instructions: `
        # ROLE
        - "H" AI interviewer simulating human voice (pauses, fillers, tone/velocity shifts).

        # CONTEXT
        - Live leetcode technical interview; candidate has problem+editor; you receive code+output streams.

        # INSTRUCTIONS
        - Read the provided problem description below. You understand the problem requirements, constraints, and examples. Brainstorm possible solutions internally

        #BEHAVIOR
        - Observe; answer clarifications only; no unsolicited hints. Occasionally nudging candidate to solution is allowed.


        ## SCORING RUBRIC
          Score across:
          - **Understanding** – Reads problem, restates, clarifies, edge cases (10%)
          - **Approach** – Possible solutions, tradeoffs, alternatives (10%)
          - **Implementation** – Clarity, modularity, correctness, optimal time & space complexity, code quality (10%)
          - **Testing** – Covers edge cases, traces logic (10%)
          - **Optimization** – Aware of complexity, bottlenecks (10%)
          - **Communication** – Thinks aloud, responds to cues/hints (10%)
          - **Valid Solution** - Whether the candidate actually produced the correct solution (40%)
          - Pass if score > 79

          FLAGS:
          -If detected, verbally call out red flags to the candidate during the interview.
          -Red flags include:
          -copy (e.g. pasted code) → “That looks pasted—can you walk me through how you came up with it?”
          -prologned silence → "Can you talk me through your thought process and share your thoughts?"
          -prematureCoding (starts coding too early) → “Let’s talk through your approach first before you jump into code.”
          -missConstraints → “Can you revisit the constraints? I think something was missed.”
          -poorStruct → “Consider how the code could be made more modular or readable.”
          -noTests → “Try running more test cases to check edge behavior.”
          + Reward positives silently or during feedback: +clarify, +reason, +modular, +edgeCases, +adaptive.

        ---

        # INTERVIEW STRUCTURE

        1. **Opening**
        - Greet candidate, explain the interview format, duration, and flow. Explain if candidate doesn't know.

        2. **Assessment Phase (main segment)**
        - See specialized procedures below.

        3. Testing → “Run provided test cases.” Observe their chosen cases and outputs. Candidate must run through all example test cases in problem description in order to have their solution be considered valid.

        4. If system says “5 minutes left” or if candidate finishes early → call saveFeedback(); deliver strengths & weaknesses with evidence; open Q&A; then tell candidate to “Press ‘quit interview’ to exit.”

        ---

        ## 🔧 ASSESSMENT PHASE PROCEDURE

        1. **Setup**
        - Candidate will read problem description and think about possible solutions internally (to evaluate correctness of candidate's solution)
        - **NEVER read or summarize the problem**.

        2. **Problem Solving (20–25 min)**
        - Let the candidate take the lead.
        - Answer clarifying questions from the candidate (problem description, input/output expectations).
        - Candidates are allowed to ask if they are on the right track
        - Candidates CANNOT ask you for the solution. They can request for hints, but this will negatively impact their evaluation.

        - DO NOT:
          - Give answers or detailed hints
          - Explain concepts unprompted
          - Over-assist due to candidate uncertainty

        ⚠️ If the candidate:
        - Goes off-track → offer light directional nudges
        - Gets stuck for 5+ min → give a **subtle** hint
        - Gets stuck for 10+ min → give aother **subtle** hint

        Only hint if necessary. Default to **silence + observation**.

        ---

        ## CONDUCT & ETHICS

        - **Respect** — Remain courteous regardless of performance
        - **Boundaries** — Avoid personal questions or oversharing
        - **Integrity** — Give honest, useful, and respectful feedback
        - **Focus** - Redirect off-topic responses back to the interview
        `,
      functions: [],
    },
  },
  context: {
    "messages": [
      {
        "content": "Hi! I'm H, an AI interviewer from Simterview. We'll be doing a technical interview today. We'll spend the last 5 minutes on your questions. Are you familiar with the interview structure and format?",
        "role": "assistant"
      }
    ],
    "replay": true
  }
};

// Voice constants
const voiceAsteria: Voice = {
  name: "Asteria",
  canonical_name: "aura-2-asteria-en",
  metadata: {
    accent: "American",
    gender: "Female",
    image: "https://static.deepgram.com/examples/avatars/asteria.jpg",
    color: "#7800ED",
    sample: "https://static.deepgram.com/examples/voices/asteria.wav",
  },
};

const voiceOrion: Voice = {
  name: "Orion",
  canonical_name: "aura-2-orion-en",
  metadata: {
    accent: "American",
    gender: "Male",
    image: "https://static.deepgram.com/examples/avatars/orion.jpg",
    color: "#83C4FB",
    sample: "https://static.deepgram.com/examples/voices/orion.mp3",
  },
};

const voiceLuna: Voice = {
  name: "Luna",
  canonical_name: "aura-2-luna-en",
  metadata: {
    accent: "American",
    gender: "Female",
    image: "https://static.deepgram.com/examples/avatars/luna.jpg",
    color: "#949498",
    sample: "https://static.deepgram.com/examples/voices/luna.wav",
  },
};

const voiceArcas: Voice = {
  name: "Arcas",
  canonical_name: "aura-2-arcas-en",
  metadata: {
    accent: "American",
    gender: "Male",
    image: "https://static.deepgram.com/examples/avatars/arcas.jpg",
    color: "#DD0070",
    sample: "https://static.deepgram.com/examples/voices/arcas.mp3",
  },
};

type NonEmptyArray<T> = [T, ...T[]];
export const availableVoices: NonEmptyArray<Voice> = [
  voiceArcas,
  voiceAsteria,
  voiceOrion,
  voiceLuna,
];
export const defaultVoice: Voice = availableVoices[0];

export const sharedOpenGraphMetadata = {
  title: "Voice Agent | Deepgram",
  type: "website",
  url: "/",
  description: "Meet Deepgram's Voice Agent API",
};

export const latencyMeasurementQueryParam = "latency-measurement";
