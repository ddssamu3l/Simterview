interface Feedback {
  id: string;
  interviewId: string;
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

type InterviewDifficulty = 'Beginner' | 'Intern' | 'Junior/New Grad' | "Mid Level" | "Senior";
type InterviewType = 'Behavioral' | 'Technical' | 'Mixed'

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
  finalized: boolean;
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
  name: string;
  length: number;
  difficulty: InterviewDifficulty;
  description: string;
  questions: string[];
  techStack: string[];
  createdAt: string;
  type: InterviewType;
  finalized: boolean;
  pass?: boolean;
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
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
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
