import assert from 'node:assert';
import {
  canUserPerform,
  createNewEpisode,
  completeFilmingStage,
  completeFileUploadStage,
  completeProducerPackageStage,
  submitDraftForReview,
  reviewDraft,
  giveFinalApproval,
  completeFinalUpload,
  markPublished,
  convertPilotToShow,
  updateRentalStep,
  submitProblemReport,
  submitEquipmentRequest,
  updateTaskStatus,
} from '../lib/workflow.ts';
import { getDb, resetToSeedData, countWords } from '../lib/db.ts';

console.log('--- RUNNING JNS VIDEO PRODUCTION OPERATIONS TEST SUITE ---\n');

// Reset to clean seed data before testing
resetToSeedData();
const db = getDb();

const adminUser = db.users.find((u) => u.role === 'ADMIN');
const producerUser = db.users.find((u) => u.role === 'PRODUCER');
const editorUser = db.users.find((u) => u.jobFunction === 'VIDEO_EDITOR');

assert(adminUser, 'Admin user must exist');
assert(producerUser, 'Producer user must exist');
assert(editorUser, 'Editor user must exist');

let testsPassed = 0;

// Test 1: Team Member cannot create production
try {
  assert.strictEqual(canUserPerform(editorUser, 'CREATE_EPISODE'), false);
  let threw = false;
  try {
    createNewEpisode(
      {
        showId: 'show_the_quad',
        episodeNumber: '999',
        filmingDate: '2026-09-15',
        priority: 'NORMAL',
        producerId: producerUser.id,
      },
      editorUser
    );
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Team Member creation should throw');
  console.log('✓ Test 1 Passed: Team Member cannot create production');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 1 Failed', err);
}

// Test 2: Producer can create episode
let createdEpisode;
try {
  assert.strictEqual(canUserPerform(producerUser, 'CREATE_EPISODE'), true);
  createdEpisode = createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '999',
      filmingDate: '2026-09-15',
      priority: 'HIGH',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );
  assert(createdEpisode, 'Episode should be created');
  assert.strictEqual(createdEpisode.currentStage, 'FILMING');
  assert.strictEqual(createdEpisode.status, 'ACTIVE');
  console.log('✓ Test 2 Passed: Producer can create episode and initialize Stage 1: Filming');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 2 Failed', err);
}

// Test 3: Editor can update assigned task
try {
  const dummyTask = createdEpisode.tasks[0];
  dummyTask.assignedUserId = editorUser.id; // Assign to editor
  const updated = updateTaskStatus(dummyTask.id, 'IN_PROGRESS', editorUser);
  assert.strictEqual(updated.status, 'IN_PROGRESS');
  console.log('✓ Test 3 Passed: Editor can update assigned task to In Progress');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 3 Failed', err);
}

// Test 4: Editor cannot approve final production
try {
  assert.strictEqual(canUserPerform(editorUser, 'FINAL_APPROVAL'), false);
  let threw = false;
  try {
    giveFinalApproval(createdEpisode.id, editorUser);
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Editor giving final approval must throw');
  console.log('✓ Test 4 Passed: Editor cannot give Final Producer Approval');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 4 Failed', err);
}

// Test 5 & 6: Revision cycle progression & Revision Required generates next revision
try {
  // Filming -> File Upload
  completeFilmingStage(createdEpisode.id, producerUser);
  assert.strictEqual(createdEpisode.currentStage, 'FILES_UPLOADED');

  // File Upload -> Producer Package
  completeFileUploadStage(
    createdEpisode.id,
    { dropboxPath: '/JNS_RAW/Test_999', notes: '4 ISOs uploaded' },
    editorUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'PRODUCER_PACKAGE');

  // Producer Package -> Edit Draft 1
  completeProducerPackageStage(
    createdEpisode.id,
    { editingNotes: 'Cut tight on opening debate', brollLinks: ['https://drive.google.com/broll'] },
    producerUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'EDITING');
  assert.strictEqual(createdEpisode.revisionCycles.length, 1);
  assert.strictEqual(createdEpisode.revisionCycles[0].draftNumber, 1);

  // Editor submits Draft 1
  submitDraftForReview(
    createdEpisode.id,
    'https://frame.io/player/test-999-d1',
    'Draft 1 ready for review',
    editorUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'PRODUCER_REVIEW');

  // Producer requests revisions -> generates Draft 2
  reviewDraft(
    createdEpisode.id,
    'REVISION_REQUIRED',
    'Trim 15 seconds from intro and swap lower third graphic',
    producerUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'EDITING');
  assert.strictEqual(createdEpisode.revisionCycles.length, 2);
  assert.strictEqual(createdEpisode.revisionCycles[1].draftNumber, 2);
  assert.strictEqual(createdEpisode.revisionCycles[0].decision, 'REVISION_REQUIRED');
  console.log('✓ Test 5 Passed: Revision Required correctly creates Draft 2 with revision notes');
  testsPassed++;

  // Editor submits Draft 2
  submitDraftForReview(
    createdEpisode.id,
    'https://frame.io/player/test-999-d2',
    'Draft 2 with trimmed intro',
    editorUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'PRODUCER_REVIEW');

  // Producer approves Draft 2
  reviewDraft(createdEpisode.id, 'APPROVED', 'Edit looks sharp. Approved.', producerUser);
  assert.strictEqual(createdEpisode.currentStage, 'FINAL_APPROVAL');
  console.log('✓ Test 6 Passed: Approved revision proceeds to Final Producer Approval');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 5 or 6 Failed', err);
}

// Test 7: Final Upload cannot happen before Final Approval
try {
  let threw = false;
  try {
    completeFinalUpload(
      createdEpisode.id,
      { youtubeUrl: 'https://youtube.com/test' },
      editorUser
    );
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Final Upload before Final Approval must fail');
  console.log('✓ Test 7 Passed: Final Upload cannot happen before explicit Final Approval');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 7 Failed', err);
}

// Test 8: Published cannot happen before Final Upload
try {
  // Give final approval
  giveFinalApproval(createdEpisode.id, producerUser);
  assert.strictEqual(createdEpisode.currentStage, 'FINAL_UPLOAD');

  // Attempt to mark published before upload
  let threw = false;
  try {
    markPublished(createdEpisode.id, { publicationDate: '2026-09-16' }, producerUser);
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Published before final upload must fail');

  // Now complete final upload
  completeFinalUpload(
    createdEpisode.id,
    {
      youtubeUrl: 'https://youtube.com/watch?v=master_999',
      dropboxUrl: 'https://dropbox.com/jns/master_999.mov',
    },
    editorUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'PUBLISHED');

  // Now Producer marks Published
  markPublished(
    createdEpisode.id,
    { youtubeUrl: 'https://youtube.com/watch?v=master_999' },
    producerUser
  );
  assert.strictEqual(createdEpisode.status, 'COMPLETED');
  console.log('✓ Test 8 Passed: Episode reaches COMPLETED only after Final Upload and Producer confirmation');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 8 Failed', err);
}

// Test 9: Pilot cannot become show before completion
try {
  const activePilot = db.productions.find((p) => p.type === 'PILOT' && p.status === 'ACTIVE');
  assert(activePilot, 'Active pilot should exist');

  let threw = false;
  try {
    convertPilotToShow(
      activePilot.id,
      {
        showName: 'Test Pilot Show',
        hosts: 'Test Host',
        producerId: producerUser.id,
        recordingDay: 'Monday',
        publicationDay: 'Tuesday',
        description: 'Test description',
      },
      producerUser
    );
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Incomplete pilot conversion must fail');
  console.log('✓ Test 9 Passed: Pilot cannot be converted to regular show before completion');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 9 Failed', err);
}

// Test 10: Anonymous complaint does not reveal author
try {
  const longProblem =
    'The camera telemetry audio track is routinely clipping during multi-camera switchovers because the automatic gain limiter on channel 3 has been drifting during extended studio sessions. This causes editors to spend excessive hours in post-production manually de-clipping dialogue waveforms with iZotope RX.';
  const longImpact =
    'This results in significant publication delays for daily news packages, causes frustration across the editing team, and risks degraded broadcast audio fidelity during high-profile Knesset coverage.';
  const longSolution =
    'Implement a hardware analog limiter before the audio enters the TVU encoder, calibrate all lavalier gain pots each morning, and provide a standardized 1kHz tone test before every studio recording session.';

  const totalWords = countWords(`${longProblem} ${longImpact} ${longSolution}`);
  assert(totalWords >= 100, 'Must meet 100-word substantive threshold');

  submitProblemReport(
    {
      title: 'Clipping on channel 3 telemetry during live switchovers',
      problemDescription: longProblem,
      impactDescription: longImpact,
      suggestedSolution: longSolution,
      isAnonymous: true,
    },
    editorUser
  );

  const updatedDb = getDb();
  const latestReport = updatedDb.anonymousProblemReports[0];
  assert(latestReport, 'Report should be saved');
  assert.strictEqual(latestReport.title, 'Clipping on channel 3 telemetry during live switchovers');
  // Verify strict schema anonymity: NO authorId or authorName fields exist on the report!
  assert.strictEqual(latestReport.authorId, undefined);
  assert.strictEqual(latestReport.authorName, undefined);
  console.log('✓ Test 10 Passed: Anonymous complaint strips all author identity at database layer');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 10 Failed', err);
}

// Test 11: Studio Rental completes only after Finance handoff
try {
  const rental = db.productions.find((p) => p.type === 'RENTAL');
  assert(rental, 'Studio rental must exist');

  // Link sent to client requires valid link
  let threw = false;
  try {
    updateRentalStep(rental.id, 'LINK_SENT_TO_CLIENT', { clientLink: '' }, producerUser);
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Empty client link must fail');

  updateRentalStep(
    rental.id,
    'LINK_SENT_TO_CLIENT',
    { clientLink: 'https://dropbox.com/jns/rental_delivery' },
    producerUser
  );
  assert.strictEqual(rental.currentStage, 'LINK_SENT_TO_CLIENT');

  // Billing details sent to finance completes rental
  updateRentalStep(
    rental.id,
    'BILLING_SENT_TO_FINANCE',
    {
      financeBillingDetails: 'Accounts Payable, ap@client.com',
      financeAgreedAmount: '$1,850',
      financeNotes: 'PO-2026-99',
    },
    producerUser
  );
  assert.strictEqual(rental.status, 'COMPLETED');
  console.log('✓ Test 11 Passed: Rental completes only after Finance billing handoff');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 11 Failed', err);
}

// Test 12: Equipment request validation works
try {
  // Reject vague "Need a monitor" without URL
  let threw = false;
  try {
    submitEquipmentRequest(
      {
        itemName: 'Need a monitor',
        category: 'Monitor',
        whyNeeded: 'Old monitor broke',
        urgency: 'NORMAL',
        quantity: 1,
      },
      editorUser
    );
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Vague equipment request must be rejected');

  // Accept specific product name or product URL
  submitEquipmentRequest(
    {
      itemName: 'Dell UltraSharp 32 4K USB-C Hub Monitor (U3223QE)',
      category: 'Monitor',
      whyNeeded: 'Need color-accurate calibrated display for HDR grading in Premiere Pro.',
      urgency: 'HIGH',
      quantity: 1,
      productUrl: 'https://www.dell.com/en-us/shop/dell-ultrasharp-32-4k-usb-c-hub-monitor-u3223qe/apd/210-bdrr',
    },
    editorUser
  );
  console.log('✓ Test 12 Passed: Equipment validation rejects vague requests and accepts verified models');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 12 Failed', err);
}

console.log(`\n========================================`);
console.log(`RESULTS: ${testsPassed} / 12 Critical Workflow Tests PASSED!`);
console.log(`========================================\n`);

// Reset clean demo seed data after test run
resetToSeedData();
