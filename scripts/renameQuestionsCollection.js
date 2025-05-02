/* eslint-disable @typescript-eslint/no-require-imports */

const { db } = require('./firebaseAdmin.js')

// The difficulties (subcollections) under the algorithmsQuestions doc
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const oldCollectionName = 'algorithmsQuestions';
const newCollectionName = 'algorithms';

async function renameAlgorithmsQuestions() {
  const oldDocRef = db.collection('questions').doc(oldCollectionName);
  const newDocRef = db.collection('questions').doc(newCollectionName);

  // Ensure the new doc exists (empty) so its subcollections can be created
  await newDocRef.set({}, { merge: true });

  for (const diff of DIFFICULTIES) {
    const oldColRef = oldDocRef.collection(diff);
    const newColRef = newDocRef.collection(diff);

    console.log(`Moving subcollection '${diff}'...`);
    const snapshot = await oldColRef.get();
    if (snapshot.empty) {
      console.log(`  No documents in ${diff}, skipping.`);
      continue;
    }

    const batch = db.batch();
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const newDoc = newColRef.doc(docSnap.id);
      const oldDoc = oldColRef.doc(docSnap.id);
      batch.set(newDoc, data);
      batch.delete(oldDoc);
    });

    await batch.commit();
    console.log(`  Moved ${snapshot.size} documents from '${diff}'.`);
  }

  // Delete the old parent doc (it no longer has subcollections)
  await oldDocRef.delete();
  console.log("Deleted old 'algorithmsQuestions' document.");

  console.log('Rename complete!');
}

renameAlgorithmsQuestions()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error during rename:', err);
    process.exit(1);
  });
