/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const axios = require('axios');

require('dotenv').config({ path: '.env.local' });

const { LEETCODE_SESSION, CSRFTOKEN } = process.env;
if (!LEETCODE_SESSION || !CSRFTOKEN) {
  throw new Error('Please set LEETCODE_SESSION and CSRFTOKEN in your .env.local');
}

const GRAPHQL_URL = 'https://leetcode.com/graphql';
const ALL_PROBLEMS_URL = 'https://leetcode.com/api/problems/all/';

// create an axios instance for GraphQL
const graphqlClient = axios.create({
  baseURL: GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `LEETCODE_SESSION=${LEETCODE_SESSION}; csrftoken=${CSRFTOKEN};`,
    'x-csrftoken': CSRFTOKEN,
    'Referer': 'https://leetcode.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/114.0.0.0 Safari/537.36',
  },
  withCredentials: true,
  timeout: 10000,   // 10s timeout
});

const EDITORIAL_QUERY = `
  query questionSolution($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      solution {
        content
      }
    }
  }
`;
// 1) fetch the question metadata
const DETAIL_QUERY = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        titleSlug
        content
        difficulty
        topicTags { slug }
      }
    }
  `;

async function fetchProblemDetail(slug) {
  // 1) Get the basic problem info
  const detailResp = await graphqlClient.post('', {
    query: DETAIL_QUERY,
    variables: { titleSlug: slug },
  });
  if (detailResp.data.errors) {
    throw new Error(detailResp.data.errors.map(e => e.message).join('\n'));
  }
  const q = detailResp.data.data.question;

  // 2) Fetch the editorial via `question.solution` 
  // This is the key change - using titleSlug instead of questionId
  const edResp = await graphqlClient.post('', {
    query: EDITORIAL_QUERY,
    variables: { titleSlug: slug },
    operationName: 'questionSolution'
  });
  if (edResp.data.errors) {
    throw new Error(edResp.data.errors.map(e => e.message).join('\n'));
  }

  // 3) Combine and return
  return {
    questionId: q.questionId,
    titleSlug: q.titleSlug,
    difficulty: q.difficulty,                              // ← Now present
    tags: q.topicTags.map(t => t.slug),                   // ← Now present
    description: cleanMediaTags(q.content),
    editorial: cleanMediaTags(edResp.data.data.question.solution?.content) || null,
  };
}

/**
 * Returns a map { id: slug, ... }
 */
async function getSlugMap() {
  const res = await axios.get(ALL_PROBLEMS_URL, {
    headers: { 'Accept': 'application/json' }
  });
  return res.data.stat_status_pairs.reduce((map, e) => {
    map[e.stat.question_id] = e.stat.question__title_slug;
    return map;
  }, {});
}

/**
 * Remove all tags that require a src (images, iframes, videos, etc.)
 * and return the cleansed HTML string.
 */
function cleanMediaTags(html) {
  return html
    // remove any <tag ... src="...">...< /tag>
    .replace(/<([a-z]+)[^>]*\bsrc=["'][^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '')
    // remove any self-closing <tag ... src="..." />
    .replace(/<[^>]+\bsrc=["'][^"']*["'][^>]*\/?>/gi, '');
}

module.exports = { fetchProblemDetail, getSlugMap };


/**
 * 
 */
