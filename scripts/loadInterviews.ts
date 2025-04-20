// @ts-check
require('dotenv').config({ path: '.env.local' }); // Load environment variables from .env.local file

// Check if Firebase credentials are available
if (!process.env.FIREBASE_PROJECT_ID || 
    !process.env.FIREBASE_CLIENT_EMAIL || 
    !process.env.FIREBASE_PRIVATE_KEY) {
  console.error("Firebase credentials are missing! Make sure you have a .env.local file with the following variables:");
  console.error("FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
  console.error("\nAlternatively, you can run this script inside the Next.js environment where these variables are already loaded.");
  process.exit(1);
}

const { db } = require("../firebase/admin");

const docs = [
  {
    "name": "Frontend Intern Behavioral Interview",
    "createdBy": "Simterview",
    "type": "behavioral",
    "difficulty": "Intern",
    "length": 25,
    "description": "Interview to evaluate frontend internship candidates’ communication, design empathy, and collaboration skills.",
    "questions": [
      "Tell me about a time you designed a UI component. What were your priorities and challenges?",
      "Describe a situation where you had to collaborate closely with a designer or backend developer.",
      "Have you ever received negative feedback about a user interface you built? How did you respond?",
      "Tell me about a time you advocated for better user experience over a faster delivery.",
      "How do you stay updated on modern frontend technologies and design trends?"
    ],
    "createdAt": "2025-04-17T12:00:00.000Z"
  }, {
    "name": "Backend Intern Behavioral Interview",
    "createdBy": "Simterview",
    "type": "behavioral",
    "difficulty": "Intern",
    "length": 25,
    "description": "Interview to assess backend candidates on problem solving, ownership, and backend collaboration.",
    "questions": [
      "Tell me about a backend system you helped build or maintain.",
      "Describe a time when you debugged a difficult backend issue.",
      "How do you typically write or validate tests for backend endpoints?",
      "Have you ever handled data modeling in a project? Walk me through your approach.",
      "Tell me about a time you made a tradeoff between performance and simplicity."
    ],
    "createdAt": "2025-04-17T12:00:00.000Z"
  }, {
    "name": "Fullstack Intern Behavioral Interview",
    "createdBy": "Simterview",
    "type": "behavioral",
    "difficulty": "Intern",
    "length": 30,
    "description": "Interview to evaluate fullstack internship candidates across frontend, backend, and collaboration scenarios.",
    "questions": [
      "Walk me through a project where you worked on both frontend and backend.",
      "How do you decide what should be done client-side vs. server-side?",
      "Describe a time you worked in a cross-functional team. What challenges did you face?",
      "Tell me about a time when you had to learn a new stack or framework quickly.",
      "How do you manage state across different parts of a fullstack application?"
    ],
    "createdAt": "2025-04-17T12:00:00.000Z"
  }, {
    "name": "FizzBuzz and Multiples",
    "createdBy": "Simterview",
    "type": "technical",
    "difficulty": "Intern",
    "length": 30,
    "description": "A light programming challenge for intern-level candidates to assess logic and loop control.",
    "questions": [
      "<p><strong>Problem Description:</strong></p><p>Write a function that returns a list of strings representing numbers from <code>1</code> to <code>n</code>. But for multiples of three, add <code>\"Fizz\"</code> instead of the number, and for the multiples of five add <code>\"Buzz\"</code>. For numbers which are multiples of both three and five, add <code>\"FizzBuzz\"</code>.</p><p><strong>Input:</strong></p><ul><li><code>int n</code> – The upper bound of the number sequence</li></ul><p><strong>Output:</strong></p><ul><li><code>List&lt;String&gt;</code> – Transformed sequence</li></ul><p><strong>Example:</strong></p><pre><code>Input: n = 5\nOutput: [\"1\",\"2\",\"Fizz\",\"4\",\"Buzz\"]</code></pre><p><strong>Constraints:</strong></p><ul><li><code>1 &lt;= n &lt;= 10<sup>4</sup></code></li></ul>"
    ],
    "createdAt": "2025-04-17T12:00:00.000Z"
  }, {
    "name": "Reverse a Linked List",
    "createdBy": "Simterview",
    "type": "technical",
    "difficulty": "Intern",
    "length": 30,
    "description": "A common interview problem to assess pointer manipulation and iteration.",
    "questions": [
      "<p><strong>Problem Description:</strong></p><p>Given the <code>head</code> of a singly linked list, reverse the list and return the reversed list.</p><p><strong>Input:</strong></p><ul><li><code>ListNode head</code> – The head node of a singly linked list</li></ul><p><strong>Output:</strong></p><ul><li><code>ListNode</code> – The new head of the reversed list</li></ul><p><strong>Example:</strong></p><pre><code>Input: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]</code></pre><p><strong>Constraints:</strong></p><ul><li>The number of nodes in the list is the range <code>[0, 5000]</code></li><li><code>-5000 &lt;= Node.val &lt;= 5000</code></li></ul>"
    ],
    "createdAt": "2025-04-17T12:00:00.000Z"
  }, {
    "name": "Valid Parentheses Checker",
    "createdBy": "Simterview",
    "type": "technical",
    "difficulty": "Intern",
    "length": 25,
    "description": "A stack-based problem to assess logical matching of parentheses.",
    "questions": [
      "<p><strong>Problem Description:</strong></p><p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code>, and <code>']'</code>, determine if the input string is valid.</p><p>An input string is valid if:<br/>1. Open brackets are closed by the same type of brackets.<br/>2. Open brackets are closed in the correct order.</p><p><strong>Input:</strong></p><ul><li><code>string s</code> – The input string containing brackets</li></ul><p><strong>Output:</strong></p><ul><li><code>boolean</code> – Whether the string is valid</li></ul><p><strong>Example:</strong></p><pre><code>Input: s = \"()[]{}\"\nOutput: true</code></pre><pre><code>Input: s = \"(]\"\nOutput: false</code></pre><p><strong>Constraints:</strong></p><ul><li><code>1 &lt;= s.length &lt;= 10<sup>4</sup></code></li><li><code>s</code> consists only of parentheses characters</li></ul>"
    ],
    "createdAt": "2025-04-17T12:00:00.000Z"
  }, 
 
];

async function load() {
  try {
    const batch = db.batch();
    const colRef = db.collection('interviews');
    docs.forEach(docData => {
      const docRef = colRef.doc();  // auto-ID
      batch.set(docRef, docData);
    });
    await batch.commit();
    console.log('✅ Successfully loaded trivial interviews!');
  } catch (error) {
    console.error('❌ Error loading interviews:', error);
  }
}

load();