export const dummyInterviews: Interview[] =[
  {
    id: "1",
    name: "Tell me about yourself",
    length: 5,
    difficulty: 'Beginner',
    description: "A quick 5-minute self-intriduction to get started",
    createdAt: "03/30/2025",
    questions: ['So tell me a little bit about yourself and your background'],
    type: "Behavioral",
    finalized: false,
  },
  {
    id: "2",
    name: "Why this company?",
    length: 8,
    difficulty: 'Beginner',
    description: "Explain why you want to work at ___ based on the job description and company.",
    createdAt: "03/30/2025",
    questions: ['So tell me a little bit about yourself and your background'],
    type: "Behavioral",
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
Output: ["1","2","Fizz"]
Example 2:

Input: n = 5
Output: ["1","2","Fizz","4","Buzz"]
Example 3:

Input: n = 15
Output: ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]`],
    type: "Technical",
    finalized: false,
    pass: false,
  }
];