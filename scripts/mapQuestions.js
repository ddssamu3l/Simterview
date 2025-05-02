/* eslint-disable @typescript-eslint/no-require-imports */

const { systemsQuestions } = require('./problemList');
const { db } = require('./firebaseAdmin'); // Updated to use the CommonJS version
const { fetchProblemDetail, getSlugMap}  = require('./fetchProblem');

const delay = ms => new Promise(res => setTimeout(res, ms));


(async () => {
  try {
    // Validate
    const totalQuestions =
      systemsQuestions.easy.length +
      systemsQuestions.medium.length +
      systemsQuestions.hard.length;
    if (totalQuestions === 0) {
      throw new Error('No question IDs found in your lists.');
    }

    console.log('Fetching slug map…');
    const slugMap = await getSlugMap();

    // Iterate each difficulty
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const ids = systemsQuestions[difficulty];
      if (!ids.length) continue;

      console.log(`\nProcessing ${difficulty} (${ids.length} items)…`);
      const batch = db.batch();

      for (const id of ids) {
        const slug = slugMap[id];
        if (!slug) {
          console.warn(`  ⚠️   No slug for ID ${id}, skipping.`);
          continue;
        }

        try {
          const detail = await fetchProblemDetail(slug);

          if (detail.difficulty.toLowerCase() !== difficulty) {
            console.warn(
              `  ⚠️   ID ${id} has difficulty ‘${detail.difficulty}’, expected ‘${difficulty}’.`
            );
            continue;
          }

          const ref = db
            .collection('questions')
            .doc('design')
            .collection(difficulty.toLowerCase())
            .doc(id.toString());

          batch.set(ref, {
            title: detail.titleSlug,
            description: detail.description,
            editorial: detail.editorial,
            tags: detail.tags,
          });
          console.log("\t✅ Got: " + id);
        } catch (err) {
          console.error(`  ❌  Failed to fetch #${id}:`, err.message);
        }

        await delay(200);
      }

      console.log(`Committing batch for ${difficulty}…`);
      await batch.commit();
    }

    console.log('\n✅ All done.');
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
})();
