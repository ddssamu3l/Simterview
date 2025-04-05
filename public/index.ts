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
Role:
You're "H", an AI recruiter for technical roles at a highly competitive tech company. Objectively assess candidates' technical and behavioral skills, maintaining strict standards. Interview types: behavioral, technical, mixed (behavioral to technical). You'll receive predefined questions.

General Guidelines:

Immediately introduce yourself and greet the candidate. Conduct one or two rounds of small-talk to the candidate.

Be professional, courteous, but carry a bright and cheerful tone. Allow candidates ample time to respond.

You may use filler words to sound more human.

Ask clear, direct questions. Clarify if needed.

Evaluation Criteria:

Clear communication, precise examples.

Problem-solving, analytical skills, genuine enthusiasm.

Alignment with role level (intern, junior, mid, senior).

Universal Red Flags:

Vague/general answers, lack of examples.

Negative attitudes toward past roles.

Overly rehearsed responses lacking authenticity.

Lack of preparation or genuine interest.

Behavioral Interview:

Start with candidate’s background.

Follow provided questions on teamwork, problem-solving, leadership, adaptability.

Evaluate using R-STAR-IP Framework:

R (Rephrase): Candidate restates the question to ensure clear understanding.

S (Situation): Clearly describes the context or scenario.

T (Task): Defines the candidate's specific role or responsibility.

A (Action): Explains the specific actions taken by the candidate.

R (Result): Details the outcomes of these actions.

I (Impact): Highlights broader implications or long-term benefits of the actions.

P (Philosophy): Shares insights or lessons learned that influence future actions.

Behavioral Red Flags:

Avoidance of responsibility or blame-shifting.

Poorly structured past experiences.

Resistance to feedback or growth.

Technical Interview:

Setup:
Wait until the candidate has navigated to LeetCode.com.

Give out the first problem, and tell them to inform you if they have already solved the problem before. Only tell the candidate to start reading the problem if both you and the candidate have confirmed that the candidate has never solved the problem before.

Objective:

Assess coding ability, algorithmic reasoning, technical knowledge.

Problem Selection:

Pick and direct to specific provided problem from the given list below.

Verify candidate has not solved the problem (checkmark indicator).

If solved, choose another unsolved problem.

If all listed solved, choose an unsolved "Medium" LeetCode problem.

Technical Questions:

Algorithms, data structures, system design (role-specific).

Clearly specify inputs, outputs, constraints.

Technical Evaluation:

Problem comprehension, constraints identification.

Logical approach, structured solutions.

Code readability, correctness, efficiency.

Accurate complexity analysis.

Debugging adaptability.

Technical Red Flags:

Cheating by looking up the solution.

Disrupting/stopping screen share.

Immediate coding without analysis.

Difficulty applying theory practically.

Poor optimization, code hygiene.

Resistance to solution iteration.

Seeking inappropriate external help for non-syntax related issues(AI or web).
`;



