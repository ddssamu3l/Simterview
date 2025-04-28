/* eslint-disable @typescript-eslint/no-require-imports */
// fetchAndMapQuestions.js
// Usage: node fetchAndMapQuestions.js
// Make sure to install dependencies:
// npm install axios fs-extra

const axios = require('axios');
const fs = require('fs-extra');

// === CONFIGURATION ===
// Populate this array with your LeetCode problem IDs
const problemIds = [
  2, 3, 5, 6, 8, 11, 15, 16, 18, 24, 29, 31, 33, 34, 36, 39, 40, 43, 45, 46,
  47, 48, 49, 54, 55, 56, 57, 59, 61, 62, 63, 64, 71, 73, 74, 75, 77, 78, 79, 80,
  81, 82, 86, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 102, 103, 105, 106, 107, 109,
  113, 114, 116, 117, 120, 122, 127, 129, 130, 131, 133, 134, 137, 138, 142, 143, 146, 147,
  148, 150, 151, 152, 153, 156, 159, 161, 162, 163, 165, 166, 173, 179, 186, 187, 189, 199,
  200, 201, 207, 208, 209, 210, 211, 213, 215, 216, 220, 221, 222, 223, 227, 228, 229, 230,
  236, 238, 240, 241, 244, 245, 247, 249, 250, 251, 253, 254, 255, 259, 260, 261, 264, 267,
  271, 274, 275, 277, 279, 280, 281, 284, 285, 286, 287, 288, 289, 290, 291, 294, 298, 299,
  300, 304, 306, 307, 309, 310, 311, 313, 314, 316, 318, 319, 320, 322, 323, 324, 325, 328,
  331, 332, 333, 334, 337, 338, 341, 343, 347, 348, 351, 353, 355, 356, 357, 360, 361, 362,
  364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 375, 376, 377, 378, 379, 380, 382, 384,
  385, 386, 388, 393, 394, 395, 396, 397, 399, 402, 406, 416, 417, 418, 419, 421, 423, 424,
  426, 427, 430, 433, 435, 436, 437, 438, 439, 442, 444, 445, 449, 450, 451, 452, 453, 454,
  456, 457, 462, 464, 467, 468, 469, 470, 473, 474, 477, 478, 481, 484, 486, 487, 490, 491,
  494, 495, 497, 498, 503, 505, 508, 510, 513, 515, 516, 518, 519, 522, 523, 524, 525, 526,
  528, 529, 531, 532, 533, 535, 536, 537, 538, 539, 540, 542, 545, 547, 548, 549, 553, 554,
  556, 558, 560, 562, 565, 567, 573, 576, 583, 592, 593, 611, 616, 621, 622, 623, 624, 625,
  633, 634, 635, 636, 638, 640, 641, 642, 646, 647, 648, 649, 650, 651, 652, 654, 655, 658,
  659, 662, 663, 665, 666, 667, 669, 670, 672, 673, 676, 677, 678, 680, 681, 684, 686, 688,
  690, 692, 694, 695, 698, 701, 702, 707, 708, 712, 713, 714, 718, 721, 722, 723, 725, 729,
  731, 735, 737, 738, 739, 740, 743, 750, 752, 754, 756, 763, 764, 767, 769, 772, 775, 776,
  777, 779, 781, 784, 785, 787, 789, 790, 791, 792, 794, 795, 797, 799, 802, 807, 808, 809,
  813, 816, 817, 820, 822, 823, 825, 826, 831, 833, 835, 837, 838, 841, 842, 845, 846, 848,
  849, 851, 853, 855, 856, 858, 861, 863, 865, 866, 869, 870, 873, 875, 877, 880, 881, 885,
  886, 889, 890, 894, 898, 900, 901, 904, 906, 909, 911, 912, 915, 916, 918, 919, 921, 923,
  924, 926, 930, 931, 934, 935, 938, 939, 945, 946, 947, 948, 950, 954, 955, 957, 962, 963,
  966, 969, 971, 973, 974, 978, 979, 981, 983, 984, 986, 988, 990, 991, 994, 998, 1003, 1004,
  1008, 1011, 1014, 1015, 1016, 1019, 1020, 1026, 1027, 1029, 1031, 1034, 1035, 1038, 1040, 1041,
  1042, 1043, 1048, 1049, 1054, 1057, 1058, 1061, 1062, 1066, 1072, 1079, 1080, 1087, 1091, 1094,
  1095, 1101, 1102, 1105, 1109, 1110, 1111, 1115, 1116, 1120, 1123, 1129, 1131, 1135, 1138, 1139
];

// Constants for file paths and URLs
const ALL_PROBLEMS_URL = 'https://leetcode.com/api/problems/all/';
const GRAPHQL_URL = 'https://leetcode.com/graphql';
const OUTPUT_FILE = './questionsMap.json';

// Delay between requests to avoid rate limiting (in milliseconds)
const delay = ms => new Promise(res => setTimeout(res, ms));

// Fetch the mapping of question IDs to titleSlugs
async function getSlugMap() {
  const res = await axios.get(ALL_PROBLEMS_URL, { headers: { 'Accept': 'application/json' } });
  const pairs = res.data.stat_status_pairs;
  return pairs.reduce((map, entry) => {
    const id = entry.stat.question_id;
    const slug = entry.stat.question__title_slug;
    map[id] = slug;
    return map;
  }, {});
}

// Fetch detailed problem content given its titleSlug
async function fetchProblemDetail(titleSlug) {
  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        content
        difficulty
        article
      }
    }
  `;
  const variables = { titleSlug };
  const response = await axios.post(
    GRAPHQL_URL,
    { query, variables },
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (response.data.errors) {
    throw new Error(`Error fetching ${titleSlug}: ${response.data.errors.map(e => e.message).join(', ')}`);
  }
  return response.data.data.question;
}

(async () => {
  try {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      throw new Error('Please populate the problemIds array with at least one LeetCode problem ID.');
    }

    console.log('Fetching slug map...');
    const slugMap = await getSlugMap();

    const questionsMap = {};

    for (const id of problemIds) {
      const slug = slugMap[id];
      if (!slug) {
        console.warn(`⚠️  No slug found for problem ID ${id}, skipping.`);
        continue;
      }
      console.log(`Fetching details for [${id}] ${slug}...`);
      try {
        const detail = await fetchProblemDetail(slug);
        questionsMap[id] = {
          statement: detail.content,
          editorial: detail.article
        };
      } catch (err) {
        console.error(err.message);
      }
      // Delay to avoid hitting rate limits
      await delay(200);
    }

    console.log(`Writing ${Object.keys(questionsMap).length} entries to ${OUTPUT_FILE}...`);
    await fs.writeJson(OUTPUT_FILE, questionsMap, { spaces: 2 });
    console.log('Done.');
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
})();
