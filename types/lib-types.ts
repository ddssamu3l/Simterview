/**
 * Types used throughout the lib folder
 */

/**
 * User account information.
 * 
 * Represents a user account in the application with authentication
 * and profile details.
 * 
 * @typedef {Object} User
 * @property {string} id - Unique identifier for the user (Firebase UID)
 * @property {string} name - Display name of the user
 * @property {string} email - Email address of the user
 * @property {string} createdAt - ISO timestamp of when the account was created
 * @property {string} authProvider - The authentication provider used (e.g., 'email', 'github')
 * @property {number} coinCount - Number of coins/credits the user has
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  authProvider: string;
  coinCount: number;
}

/**
 * Parameters required for user sign-up.
 * 
 * @typedef {Object} SignUpParams
 * @property {string} uid - Unique identifier for the new user
 * @property {string} name - Display name for the new user
 * @property {string} email - Email address for the new user
 */
export interface SignUpParams {
  uid: string;
  name: string;
  email: string;
}

/**
 * Parameters required for user sign-in.
 * 
 * @typedef {Object} SignInParams
 * @property {string} email - Email address of the user trying to sign in
 * @property {string} idToken - Firebase ID token for authentication
 */
export interface SignInParams {
  email: string;
  idToken: string;
}

/**
 * Feedback for an interview attempt.
 * 
 * Contains the evaluation data for a user's interview performance.
 * 
 * @typedef {Object} Feedback
 * @property {string} id - Unique identifier for the feedback
 * @property {string} userId - ID of the user who took the interview
 * @property {string} interviewId - ID of the interview that was taken
 * @property {boolean} passed - Whether the user passed the interview
 * @property {string} strengths - Description of the user's strengths
 * @property {string} areasForImprovement - Areas where the user can improve
 * @property {string} finalAssessment - Overall assessment of the interview
 * @property {string} createdAt - ISO timestamp of when the feedback was created
 */
export interface Feedback {
  id?: string;
  userId: string;
  interviewId: string;
  passed: boolean;
  strengths: string;
  areasForImprovement: string;
  finalAssessment: string;
  createdAt: string;
}

/**
 * Interview information.
 * 
 * Contains the details of an interview template.
 * 
 * @typedef {Object} Interview
 * @property {string} id - Unique identifier for the interview
 * @property {string} title - Title/name of the interview
 * @property {string} description - Description of the interview
 * @property {string} difficulty - Difficulty level (e.g., 'Intern', 'Junior', 'Senior')
 * @property {number} length - Duration of the interview in minutes
 * @property {string[]} questions - List of interview questions (as HTML strings)
 * @property {string} type - Type of interview ('technical' or 'behavioral')
 * @property {string} createdBy - ID of the user who created the interview or 'Simterview' for system interviews
 * @property {string} createdAt - ISO timestamp of when the interview was created
 * @property {boolean} [passed] - Optional flag indicating if the user passed this interview (added when enriching with feedback)
 * @property {string} [solution] - Optional solution guide for the interview questions
 */
export interface Interview {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  length: number;
  questions: string[];
  type: string;
  createdBy: string;
  createdAt: string;
  passed?: boolean;
  solution?: string;
}

/**
 * Combined result of interview data with feedback.
 * 
 * Used to display interview history with pass/fail status.
 * 
 * @typedef {Object} CombinedResult
 * @property {string} id - ID of the feedback (not the interview)
 * @property {boolean} passed - Whether the user passed the interview
 * @property {string} title - Title of the interview
 * @property {string} description - Description of the interview
 * @property {string} difficulty - Difficulty level of the interview
 * @property {string} type - Type of interview ('technical' or 'behavioral')
 * @property {string} createdAt - Timestamp when the feedback was created
 */
export interface CombinedResult extends Omit<Interview, 'id' | 'passed'> {
  id: string; // This is the feedback ID, not the interview ID
  passed: boolean;
}

/**
 * Response format for feedback retrieval.
 * 
 * @typedef {Object} FeedbackResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {number} status - HTTP status code
 * @property {Feedback} [data] - The retrieved feedback data (if successful)
 * @property {string} [error] - Error message (if unsuccessful)
 */
export interface FeedbackResponse {
  success: boolean;
  status: number;
  data?: Feedback;
  error?: string;
}

/**
 * Response format for interview feedback retrieval.
 * 
 * @typedef {Object} InterviewFeedbackResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {number} status - HTTP status code
 * @property {CombinedResult[]} [data] - The retrieved interview feedback data (if successful)
 * @property {string} [error] - Error message (if unsuccessful)
 */
export interface InterviewFeedbackResponse {
  success: boolean;
  status: number;
  data?: CombinedResult[];
  error?: string;
}

/**
 * Response format for interview retrieval.
 * 
 * @typedef {Object} InterviewResponse
 * @property {boolean} success - Whether the operation was successful
 * @property {number} status - HTTP status code
 * @property {Interview[]} [data] - The retrieved interview data (if successful)
 * @property {string} [error] - Error message (if unsuccessful)
 */
export interface InterviewResponse {
  success: boolean;
  status: number;
  data?: Interview[];
  error?: string;
}