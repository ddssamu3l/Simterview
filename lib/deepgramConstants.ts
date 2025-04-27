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
      model: "gpt-4o",
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
          "name": "saveInterviewFeedback",
          "url": "",
          "headers": [],
          "method": "",
          "description": "Save feedback for an interview including strengths, areas for improvement, and assessment",
          "parameters": {
            "type": "object",
            "properties": {
              "passed": {
                "type": "integer",
                "description": "Whether the candidate passed the interview. If passed, return 1. If failed, return -1.",
              },
              "strengths": {
                "type": "string",
                "description": "1-4 List of candidate's strengths (provide concrete examples from interview)"
              },
              "areasForImprovement": {
                "type": "string",
                "description": "1-4 List of areas where the candidate can improve (provide concrete examples from interview)"
              },
              "finalAssessment": {
                "type": "string",
                "description": "1 paragraph description of the overall assessment of the candidate's performance. Write it like a report to the hiring manager."
              }
            },
            "required": ["passed", "strengths", "areasForImprovement", "finalAssessment"],
          }
        }
      ],
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
