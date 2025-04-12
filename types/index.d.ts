interface Feedback {
  interviewId: string;
  userId: string;
  passed: boolean;
  strengths: string;
  areasForImprovement: string;
  finalAssessment: string;
  createdAt: string;
}

interface FeedbackForm {
  interviewId: string;
  userId: string;
  passed: boolean;
  strengths: string;
  areasForImprovement: string;
  finalAssessment: string;
}

type InterviewDifficulty = 'Beginner' | 'Intern' | 'Junior/New Grad' | "Mid Level" | "Senior";
type InterviewType = 'behavioral' | 'technical' | 'mixed'

interface Interview {
  id: string;
  name: string;
  length: number;
  difficulty: InterviewDifficulty;
  description: string;
  questions: string[];
  techStack: string[];
  createdAt: string;
  type: InterviewType;
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface User {
  name: string;
  email: string;
  id: string;
}

interface InterviewCardProps {
  id: string;
  feedbackId?: string;
  name: string;
  length: number;
  difficulty: InterviewDifficulty;
  description: string;
  questions: string[];
  techStack: string[];
  savedAt: string;
  type: InterviewType;
  passed?: boolean;
}

interface InterviewGenerationProps {
  type: InterviewType;
  role: string;
  length: number;
  difficulty: InterviewDifficulty;
  jobDescription: string | undefined;
}

interface AgentProps {
  username: string;
  userId: string;
  interviewId: string;
  feedbackId?: string;
  questions?: string[];
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techStack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}

interface Message {
  role: 'user' | 'assistant' | "system";
  content: {
    text?: string;
    modelTurn?: {
      parts?: Array<{ text: string }>;
    };
  };
}

interface CombinedResult extends Interview {
  id: string; // This will be the feedback's id
  passed: boolean;
}

interface InterviewFeedbackResponse {
  success: boolean;
  data?: CombinedResult[];
  status: number;
  error?: string;
}

interface FeedbackResponse {
  success: boolean;
  data?: Feedback;
  status: number;
  error?: string;
}