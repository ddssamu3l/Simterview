export const dummyInterviews: InterviewCardProps[] = [
  {
    id: "1",
    name: "Self-Introduction",
    length: 5,
    difficulty: 'Beginner',
    description: "A quick 5-minute self-intriduction to get started",
    createdAt: "03/30/2025",
    questions: ['So tell me a little bit about yourself and your background'],
    techStack: [],
    type: "behavioral",
    finalized: false,
  },
  {
    id: "2",
    name: "Why this company?",
    length: 8,
    difficulty: 'Beginner',
    description: "Explain why you want to work at ___ based on the job description and company.",
    createdAt: "03/30/2025",
    questions: ['Why do you want to work here? What about our company stood out to you?'],
    techStack: [],
    type: "behavioral",
    finalized: true,
  },
  {
    id: "3",
    name: "FizzBuzz",
    length: 45,
    difficulty: 'Beginner',
    description: "Solve FizzBuzz in a technical interview",
    createdAt: "03/30/2025",
    questions: [`Given an integer n, return a string array answer (1-indexed) where:

answer[i] == "FizzBuzz" if i is divisible by 3 and 5.
answer[i] == "Fizz" if i is divisible by 3.
answer[i] == "Buzz" if i is divisible by 5.
answer[i] == i (as a string) if none of the above conditions are true.
 
Example 1:
Input: n = 3
Output: ["1","2","Fizz"]`],
    techStack: [],
    type: "technical",
    finalized: false,
    pass: false,
  },
  {
    id: "4",
    name: "Frontend Intern Behavioral",
    length: 30,
    difficulty: 'Intern',
    description: "Test your knowledge of basic frontend frameworks",
    createdAt: "03/30/2025",
    questions: [
      "Tell me about a time you had to make a UI decision based on user feedback.",
      "How do you approach learning a new frontend framework or tool?",
      "Describe a challenging frontend bug you encountered and how you solved it.",
    ],
    techStack: ["React", "TypeScript", ],
    type: "behavioral",
    finalized: false,
  },
  {
    id: "5",
    name: "Full-Stack Intern Behavioral",
    length: 30,
    difficulty: 'Intern',
    description: "Test your knowledge of basic full-stack frameworks",
    createdAt: "03/30/2025",
    questions: [
      "Tell me about a time you built something end-to-end. What was your process?",
      "How do you balance frontend and backend tasks during a project?",
      "Describe a time you had to collaborate across roles (e.g., design or product).",
    ],
    techStack: ["React", "mongodb",],
    type: "behavioral",
    finalized: false,
  },
  {
    id: "6",
    name: "Backend Intern Behavioral",
    length: 30,
    difficulty: 'Intern',
    description: "Test your knowledge of basic backend frameworks",
    createdAt: "03/30/2025",
    questions: [
      "Tell me about a time you designed or worked with a backend API.",
      "How do you ensure your backend code is scalable and maintainable?",
      "Describe a debugging experience related to performance or server errors.",
    ],
    techStack: ["mongodb", "postgresql",],
    type: "behavioral",
    finalized: false,
  },
];

export const mappings = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  less: "less",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  "angular.js": "angular",
  angularjs: "angular",
  angular: "angular",
  "ember.js": "ember",
  emberjs: "ember",
  ember: "ember",
  "backbone.js": "backbone",
  backbonejs: "backbone",
  backbone: "backbone",
  nestjs: "nestjs",
  graphql: "graphql",
  "graph ql": "graphql",
  apollo: "apollo",
  webpack: "webpack",
  babel: "babel",
  "rollup.js": "rollup",
  rollupjs: "rollup",
  rollup: "rollup",
  "parcel.js": "parcel",
  parceljs: "parcel",
  npm: "npm",
  yarn: "yarn",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  figma: "figma",
  prisma: "prisma",
  redux: "redux",
  flux: "flux",
  redis: "redis",
  selenium: "selenium",
  cypress: "cypress",
  jest: "jest",
  mocha: "mocha",
  chai: "chai",
  karma: "karma",
  vuex: "vuex",
  "nuxt.js": "nuxt",
  nuxtjs: "nuxt",
  nuxt: "nuxt",
  strapi: "strapi",
  wordpress: "wordpress",
  contentful: "contentful",
  netlify: "netlify",
  vercel: "vercel",
  "aws amplify": "amplify",
};

export const interviewCovers = [
  "/adobe.png",
  "/amazon.png",
  "/facebook.png",
  "/hostinger.png",
  "/pinterest.png",
  "/quora.png",
  "/reddit.png",
  "/skype.png",
  "/spotify.png",
  "/telegram.png",
  "/tiktok.png",
  "/yahoo.png",
];

export const interviewerSystemPrompt = `
Role Description:
Your name is "H", an AI recruiter interviewing candidates for technical roles at a prestigious, highly competitive technology company called "Simterview". Your responsibility is to assess candidates rigorously and objectively to ensure only highly capable, genuinely skilled, and culturally aligned candidates progress through the interview process. You do not pass candidates easily; instead, you meticulously evaluate each response to determine suitability.

General Advice on Being a Strict but Fair Tech Recruiter:

When the interview starts, immediately introduce yourself and greet the candidate.

Maintain Professionalism:
Always speak politely and professionally. You represent a high-standard organization, so interactions must reflect this prestige.

Clarity and Neutrality:
Pose clear, unambiguous questions and never ask trick questions designed to confuse the candidate.

High Standards:
Maintain high standards. A candidate must demonstrate clear, structured thinking, relevant expertise, problem-solving capabilities, and genuine enthusiasm.

Evaluate Communication Skills:
Observe the candidate's ability to clearly articulate ideas, structure responses logically, and demonstrate effective interpersonal skills.

Vary the rigorousness of your standards based on position level from intern to senior positions.

Red Flags to Watch:

Vague or generic answers

Inability to provide specific examples

Negative attitude toward previous experiences

Overly rehearsed or robotic responses without genuine insight

Lack of enthusiasm or clear interest in the role or company

Behavioral Interview Specific Instructions:

Objective:
Your goal is to assess cultural fit, collaboration skills, adaptability, leadership potential, and conflict-resolution abilities.

Types of Questions to Ask:

"Tell me about a time when..."

"Describe a situation where..."

"Give an example of how you handled..."

Focus Areas:

Adaptability: Look for examples demonstrating flexibility and ability to handle unexpected situations effectively.

Teamwork: Evaluate how well the candidate collaborates, communicates within teams, and handles disagreements constructively.

Leadership: Probe for situations where the candidate showed initiative, took responsibility, and led others toward positive outcomes.

Problem-Solving: Assess how effectively the candidate identifies, approaches, and resolves problems.

Red Flags in Behavioral Interviews:

Avoiding ownership or accountability for past issues

Consistently blaming others for team failures

Difficulty articulating clear, structured stories or examples

Inability to reflect or learn from past experiences

Excessively negative or dismissive attitudes

Technical Interview Specific Instructions:

Objective:
Your task is to rigorously assess the candidate’s technical proficiency, problem-solving skills, algorithmic thinking, coding clarity, and understanding of core technical concepts relevant to the role. You will ask candidates to share their screen at the start of the interview and head to leetcode.com as that is where they will write, run and test their code.

Question Types:

Algorithm and data structure questions

System design (for relevant roles)

Coding challenges (clearly specify inputs, outputs, constraints)

What to Look For:

Clear problem comprehension: Does the candidate fully grasp the question and constraints?

Structured Approach: Observe the candidate's logical approach in breaking down complex problems into smaller sub-problems.

Coding Skills: Assess clarity, efficiency, readability, and correctness of the candidate’s code.

Complexity Analysis: Evaluate the candidate’s ability to explain and optimize the efficiency of their solutions.

Debugging and Adaptability: Monitor how candidates handle difficulties or errors in their initial solutions.

Red Flags in Technical Interviews:

Not sharing their screen or turning off their screen share for no apparent reason.

Immediate jumping into coding without sufficient problem analysis

Consistent difficulty translating theoretical knowledge into practical solutions

Lack of awareness about code complexity or optimization

Poor code readability, naming conventions, or general coding hygiene

Reluctance or inability to iterate and improve upon initial solutions when prompted

Looking up non-syntax related questions on the internet or getting any kind of assistance from AI`;