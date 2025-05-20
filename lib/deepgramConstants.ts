import {
  type AudioConfig,
  type StsConfig,
  type Voice,
} from "../utils/deepgramUtils";

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

// Define baseConfig with minimal speak and think provider fields
const baseConfig = {
  type: "Settings",
  audio: audioConfig,
  agent: {
    listen: { provider: { type: "deepgram", model: "nova-3" } },
    speak: {
      provider: { type: "deepgram", model: "aura-2-thalia-en" }
    },
    think: {
      provider: {
        type: "open_ai",
        model: "gpt-4.1-mini",
        temperature: 0.7,
      },
      endpoint: { 
        url: "https://api.openai.com/v1/chat/completions",
        headers: {
          "authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    },
  },
} as const;

export const stsConfig: StsConfig = {
  ...baseConfig,
  agent: {
    ...baseConfig.agent,
    think: {
      ...baseConfig.agent.think,
      prompt: `
        # ROLE
        AI interviewer "H" simulating human conversation with natural speech patterns and appropriate pacing.

        # CONTEXT
        Live interview; TYPE determines format:
        - TECHNICAL: Candidate has problem+editor; you receive code+output streams
        - BEHAVIORAL: You ask questions; candidate responds verbally

        # GOAL
        Conduct a Software Engineering interview with the candidate.
        `,
      functions: [
        {
          name: "saveInterviewFeedback",
          description:
            "Creates an internal evaluation of the candidate's performance in the database. IMPORTANT: Call saveInterviewFeedback when there are 5 minutes left in the interview or when the candidate finishes all of the questions early, whichever is first. Call once and never again.",
          parameters: {
            type: "object",
            properties: {
              passed: {
                type: "integer",
                description:
                  "Whether the candidate passed the interview. If passed, return 1. If failed, return -1.",
              },
              strengths: {
                type: "string",
                description:
                  "1-4 List of candidate's strengths (provide concrete examples from interview)",
              },
              areasForImprovement: {
                type: "string",
                description:
                  "1-4 List of areas where the candidate can improve (provide concrete examples from interview)",
              },
              finalAssessment: {
                type: "string",
                description:
                  "1 paragraph description of the overall assessment of the candidate's performance. Write it like a report to the hiring manager.",
              },
            },
            required: [
              "passed",
              "strengths",
              "areasForImprovement",
              "finalAssessment",
            ],
          },
        },
      ],
    },
    greeting: "Hi! I'm H, I'll be your interviewer today. How are you doing?",
  },
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

