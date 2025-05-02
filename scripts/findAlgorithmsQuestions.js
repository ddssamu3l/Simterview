/* eslint-disable @typescript-eslint/no-require-imports */
/* scripts/findAlgorithmsQuestions.js */

require('dotenv').config();
const axios = require('axios');
const { db } = require('./firebaseAdmin');   // adjust path as needed
const { fetchProblemDetail } = require('./fetchProblem');

const PAGE_SIZE = 50;
const GRAPHQL_URL = 'https://leetcode.com/graphql';
const CATEGORY = 'algorithms';



// build an authenticated client
const client = axios.create({
  baseURL: GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `LEETCODE_SESSION=${process.env.LEETCODE_SESSION}; csrftoken=${process.env.CSRFTOKEN};`,
    'x-csrftoken': process.env.CSRFTOKEN,
    'Referer': 'https://leetcode.com',
    'User-Agent': 'Mozilla/5.0'
  },
  withCredentials: true,
});

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

function cleanMediaTags(html) {
  return html
    // remove any <tag ... src="...">...< /tag>
    .replace(/<([a-z]+)[^>]*\bsrc=["'][^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '')
    // remove any self-closing <tag ... src="..." />
    .replace(/<[^>]+\bsrc=["'][^"']*["'][^>]*\/?>/gi, '');
}


async function fetchPage(skip = 0) {
  const res = await client.post('', {
    operationName: 'problemsetQuestionList',
    query: LIST_QUERY,
    variables: {
      categorySlug: CATEGORY,
      skip,
      limit: PAGE_SIZE,
      filters: {}   // we’ll filter by tags client-side
    }
  });
  if (res.data.errors) {
    throw new Error(res.data.errors.map(e => e.message).join('\n'));
  }
  return res.data.data.problemsetQuestionList;
}

(async () => {
  // 1) fetch *all* meta for “algorithms”
  let all = [];
  const first = await fetchPage(0);
  const total = first.total;
  all.push(...first.questions);
  console.log(`🔍 Fetched ${all.length}/${total}`);

  while (all.length < total) {
    await new Promise(r => setTimeout(r, 300));
    const next = await fetchPage(all.length);
    all.push(...next.questions);
    console.log(`🔍 Fetched ${all.length}/${total}`);
  }

  // 2) client‐side filter by tags
  const filtered = all.filter(q => {
    const tags = q.topicTags.map(t => t.slug);
    const ok = tags.some(t => INCLUDE.has(t));
    const bad = tags.some(t => EXCLUDE.has(t));
    return ok && !bad;
  });
  console.log(`\n🎯 ${filtered.length} questions remain after tag filtering\n`);

  // 3) chunk into batches of 400
  const chunks = [];
  for (let i = 0; i < filtered.length; i += 400) {
    chunks.push(filtered.slice(i, i + 400));
  }

  // 4) for each chunk: fetch detail + set + commit
  for (let ci = 0; ci < chunks.length; ci++) {
    const batch = db.batch();
    console.log(`💾 Processing batch ${ci + 1}/${chunks.length}…`);

    for (const q of chunks[ci]) {
      try {
        const detail = await fetchProblemDetail(q.titleSlug);
        const ref = db
          .collection('questions')
          .doc(CATEGORY)
          .collection(detail.difficulty.toLowerCase())
          .doc(q.questionFrontendId);
        batch.set(ref, {
          title: q.titleSlug,
          description: cleanMediaTags(detail.description),
          editorial: cleanMediaTags(detail.editorial),
          tags: q.topicTags.map(t => t.slug),
        });
        process.stdout.write(`  ✅ ${q.questionFrontendId} `);
      } catch (err) {
        console.error(`  ❌ ${q.questionFrontendId} failed: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 100)); // throttle
    }

    console.log(`\nCommitting batch ${ci + 1}…`);
    await batch.commit();
  }

  console.log('\n✅ All done!');
})().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});