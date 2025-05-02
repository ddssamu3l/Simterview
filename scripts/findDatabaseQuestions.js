/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
// npm install axios
const axios = require('axios');
const { db } = require('./firebaseAdmin.js')
const { fetchProblemDetail } = require('./fetchProblem');


require('dotenv').config({ path: '.env.local' });

const { LEETCODE_SESSION, CSRFTOKEN } = process.env;
if (!LEETCODE_SESSION || !CSRFTOKEN) {
  throw new Error('Please set LEETCODE_SESSION and CSRFTOKEN in your .env.local');
}

const PAGE_SIZE = 50;
const GRAPHQL_URL = 'https://leetcode.com/graphql';
const DOCNAME = 'database';

// 1) Authenticated GraphQL client
const client = axios.create({
  baseURL: GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `LEETCODE_SESSION=${LEETCODE_SESSION}; csrftoken=${CSRFTOKEN};`,
    'x-csrftoken': CSRFTOKEN,
    'Referer': `https://leetcode.com/problem-list/${DOCNAME}/`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  withCredentials: true,
});

// 2) The schema LeetCode actually supports (no hasMore) :contentReference[oaicite:0]{index=0}
const LIST_QUERY = `
query problemsetQuestionList(
  $categorySlug: String, 
  $limit: Int, 
  $skip: Int, 
  $filters: QuestionListFilterInput
) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      questionFrontendId
      titleSlug
      difficulty
      topicTags { slug }
    }
  }
}
`;


async function fetchPage(skip = 0) {
  const res = await client.post(
    '',
    {
      operationName: 'problemsetQuestionList',
      query: LIST_QUERY,
      variables: {
        categorySlug: DOCNAME,
        skip,
        limit: PAGE_SIZE,
        filters: {}
      }
    }
  );
  if (res.data.errors) {
    throw new Error(res.data.errors.map(e => e.message).join('\n'));
  }
  return res.data.data.problemsetQuestionList;
}

function cleanMediaTags(html) {
  return html
    // remove any <tag ... src="...">...< /tag>
    .replace(/<([a-z]+)[^>]*\bsrc=["'][^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '')
    // remove any self-closing <tag ... src="..." />
    .replace(/<[^>]+\bsrc=["'][^"']*["'][^>]*\/?>/gi, '');
}

// …bootstrap axios, db, queries…

(async () => {
  // 1) page & collect slugs + metadata
  const all = [];
  let skip = 0;
  const first = await fetchPage(0);
  const total = first.total;
  all.push(...first.questions);

  while (all.length < total) {
    skip += PAGE_SIZE;
    const page = await fetchPage(skip);
    all.push(...page.questions);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`Got ${all.length}/${total}`);

  // 2) chunk into batches of 400 or so
  const chunks = [];
  for (let i = 0; i < all.length; i += 400) {
    chunks.push(all.slice(i, i + 400));
  }

  // 3) for each chunk, build & commit a batch
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const q of chunk) {
      console.log(`Making a document for question: ${q.questionFrontendId}=${q.titleSlug}`);
      try{
        // fetch detail for description
        const detail = await fetchProblemDetail(q.titleSlug);

        const ref = db
          .collection('questions')
          .doc(DOCNAME)
          .collection(q.difficulty.toLowerCase())
          .doc(q.questionFrontendId);

        batch.set(ref, {
          title: q.titleSlug,
          description: cleanMediaTags(detail.description),
          editorial: cleanMediaTags(detail.editorial),
          tags: q.topicTags?.map(t => t.slug) || [],
        });

        console.log(`Prepared ${q.questionFrontendId}`);
      }catch(error){
        console.log("Error: " + error);
        console.log(JSON.stringify(q));
        continue;
      }
      await new Promise(r => setTimeout(r, 50)); // throttle
    }
    await batch.commit();
    console.log(`Committed batch of ${chunk.length}`);
  }

  console.log('✅ Done writing all questions.');
})();
