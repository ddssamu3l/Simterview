/* eslint-disable @typescript-eslint/no-require-imports */
// scripts/findDesignQuestions.js
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { db } = require('./firebaseAdmin.js');
const { getSlugMap } = require('./fetchProblem');  // or inline your slug‐map logic

const {
  LEETCODE_SESSION,
  CSRFTOKEN,
} = process.env;

if (!LEETCODE_SESSION || !CSRFTOKEN) {
  throw new Error('Set LEETCODE_SESSION and CSRFTOKEN in your .env.local');
}

const GRAPHQL_URL = 'https://leetcode.com/graphql';

// 1) build an authenticated client
const client = axios.create({
  baseURL: GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
    Cookie: `LEETCODE_SESSION=${LEETCODE_SESSION}; csrftoken=${CSRFTOKEN};`,
    'x-csrftoken': CSRFTOKEN,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  },
  withCredentials: true,
});

// 2) GraphQL queries
const DETAIL_QUERY = `
  query getQuestionDetail($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      title
      content
      difficulty
      topicTags { slug }
    }
  }
`;

const EDITORIAL_QUERY = `
  query getQuestionEditorial($questionId: Int!) {
    getQuestionEditorial(questionId: $questionId) {
      content
    }
  }
`;

// 3) fetch detail + overwrite Referer so that LeetCode thinks you came from the problem page
async function fetchProblemDetail(titleSlug) {
  const res = await client.post(
    '',
    {
      operationName: 'getQuestionDetail',
      query: DETAIL_QUERY,
      variables: { titleSlug },
    },
    {
      headers: {
        Referer: `https://leetcode.com/problems/${titleSlug}/`,
      }
    }
  );
  if (res.data.errors) {
    throw new Error(res.data.errors.map(e => e.message).join('\n'));
  }
  return res.data.data.question;
}

// 4) fetch editorial + overwrite Referer so it looks like the “solution” subpage
async function fetchEditorial(questionId, titleSlug) {
  const res = await client.post(
    '',
    {
      operationName: 'getQuestionEditorial',
      query: EDITORIAL_QUERY,
      variables: { questionId },
    },
    {
      headers: {
        Referer: `https://leetcode.com/problems/${titleSlug}/solution/`,
      }
    }
  );
  if (res.data.errors) {
    throw new Error(res.data.errors.map(e => e.message).join('\n'));
  }
  return res.data.data.getQuestionEditorial.content;
}

// 5) orchestrate everything
(async () => {
  console.log('🔍 Building slug map…');
  const slugMap = await getSlugMap();         // { 146: 'lru-cache', 155: 'min-stack', … }
  const designIds = Object.entries(slugMap)
    .filter(([, slug]) => /* your “design”‐tag filter logic here */ false)
    .map(([id]) => Number(id));

  if (!designIds.length) {
    console.log('⚠️  No design IDs found!');
    return;
  }

  const batch = db.batch();

  for (const id of designIds) {
    const slug = slugMap[id];
    console.log(`➡️  Fetching #${id} (${slug})…`);

    try {
      // 3a) detail
      const detail = await fetchProblemDetail(slug);

      // 3b) editorial
      const editorial = await fetchEditorial(
        Number(detail.questionId),
        slug
      );

      // 4) write to Firestore under `questions/design/{difficulty}/{id}`
      const ref = db
        .collection('questions')
        .doc('design')
        .collection(detail.difficulty.toLowerCase())
        .doc(id.toString());

      batch.set(ref, {
        title: detail.title,
        description: detail.content,
        editorial,
        tags: detail.topicTags.map(t => t.slug),
      });

    } catch (err) {
      console.error(`❌ #${id} failed:`, err.message);
    }

    // gentle throttle
    await new Promise(res => setTimeout(res, 200));
  }

  console.log('📝 Committing batch…');
  await batch.commit();
  console.log('✅ Done.');
})();
