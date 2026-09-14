import assert from 'node:assert';
import { NextRequest } from 'next/server';
import {
  canUserPerform,
  createNewEpisode,
  createNewPilot,
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
  deleteProduction,
  deleteTask,
} from '../lib/workflow';
import { getDb, resetToSeedData, countWords, getDbAsync, saveDbAsync } from '../lib/db';
import { updateProductionWithLock, insertProductionWithLock, registerDbAccess } from '../lib/pg';
registerDbAccess({ getDbAsync, saveDbAsync });
import { GET as getAuthMe, POST as postAuthMe } from '../app/api/auth/me/route';
import { POST as postReset } from '../app/api/reset/route';
import { GET as getTestWorkflow } from '../app/api/test-workflow/route';
import { GET as getProductions } from '../app/api/productions/route';
import { middleware } from '../middleware';

console.log('--- RUNNING JNS VIDEO PRODUCTION OPERATIONS TEST SUITE ---\n');

// Reset to clean seed data before testing
resetToSeedData();
let db = getDb();

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
    await createNewEpisode(
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
  createdEpisode = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '999',
      filmingDate: '2026-09-15',
      filmingTime: '10:30',
      priority: 'HIGH',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );
  assert(createdEpisode, 'Episode should be created');
  assert.strictEqual(createdEpisode.currentStage, 'FILMING');
  assert.strictEqual(createdEpisode.status, 'ACTIVE');
  assert.strictEqual(createdEpisode.filmingTime, '10:30');

  // Verify pilot creation with filmingTime
  const testPilot = await createNewPilot(
    {
      title: 'Investigation Pilot',
      conceptSummary: 'New investigative weekly pilot',
      filmingDate: '2026-09-20',
      filmingTime: '14:00 - 16:30 IDT',
      priority: 'NORMAL',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );
  assert.strictEqual(testPilot.filmingTime, '14:00 - 16:30 IDT');

  console.log('✓ Test 2 Passed: Producer can create episode & pilot with filming time and initialize Stage 1');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 2 Failed', err);
}

// Test 3: Editor can update assigned task
try {
  db = getDb();
  let editorTask;
  for (const p of db.productions) {
    const t = p.tasks.find((task) => task.assignedUserId === editorUser.id);
    if (t) {
      editorTask = t;
      break;
    }
  }
  assert(editorTask, 'Task assigned to editor should exist in database');
  const updated = await updateTaskStatus(editorTask.id, 'IN_PROGRESS', editorUser);
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
    await giveFinalApproval(createdEpisode.id, editorUser);
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
  createdEpisode = await completeFilmingStage(createdEpisode.id, producerUser);
  assert.strictEqual(createdEpisode.currentStage, 'FILES_UPLOADED');

  // File Upload -> Producer Package
  createdEpisode = await completeFileUploadStage(
    createdEpisode.id,
    { dropboxPath: '/JNS_RAW/Test_999', notes: '4 ISOs uploaded' },
    editorUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'PRODUCER_PACKAGE');

  // Producer Package -> Edit Draft 1
  createdEpisode = await completeProducerPackageStage(
    createdEpisode.id,
    { editingNotes: 'Cut tight on opening debate', brollLinks: ['https://drive.google.com/broll'] },
    producerUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'EDITING');
  assert.strictEqual(createdEpisode.revisionCycles.length, 1);
  assert.strictEqual(createdEpisode.revisionCycles[0].draftNumber, 1);

  // Editor submits Draft 1
  createdEpisode = await submitDraftForReview(
    createdEpisode.id,
    'https://frame.io/player/test-999-d1',
    'Draft 1 ready for review',
    editorUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'PRODUCER_REVIEW');

  // Producer requests revisions -> generates Draft 2
  createdEpisode = await reviewDraft(
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
  createdEpisode = await submitDraftForReview(
    createdEpisode.id,
    'https://frame.io/player/test-999-d2',
    'Draft 2 with trimmed intro',
    editorUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'PRODUCER_REVIEW');

  // Producer approves Draft 2
  createdEpisode = await reviewDraft(createdEpisode.id, 'APPROVED', 'Edit looks sharp. Approved.', producerUser);
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
    await completeFinalUpload(
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
  createdEpisode = await giveFinalApproval(createdEpisode.id, producerUser);
  assert.strictEqual(createdEpisode.currentStage, 'FINAL_UPLOAD');

  // Attempt to mark published before upload
  let threw = false;
  try {
    await markPublished(createdEpisode.id, { publicationDate: '2026-09-16' }, producerUser);
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Published before final upload must fail');

  // Now complete final upload
  createdEpisode = await completeFinalUpload(
    createdEpisode.id,
    {
      youtubeUrl: 'https://youtube.com/watch?v=master_999',
      dropboxUrl: 'https://dropbox.com/jns/master_999.mov',
    },
    editorUser
  );
  assert.strictEqual(createdEpisode.currentStage, 'PUBLISHED');

  // Now Producer marks Published
  createdEpisode = await markPublished(
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
  db = getDb();
  const activePilot = db.productions.find((p) => p.type === 'PILOT' && p.status === 'ACTIVE');
  assert(activePilot, 'Active pilot should exist');

  let threw = false;
  try {
    await convertPilotToShow(
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
    'The camera telemetry audio track is routinely clipping during multi-camera switchovers because the automatic gain limiter on channel 3 has been drifting during extended studio recording sessions. This causes video editors to spend excessive hours in post-production manually de-clipping dialogue waveforms with specialized audio plugins and repair tools.';
  const longImpact =
    'This results in significant publication delays for our daily news packages, causes intense frustration across the post-production team, and risks visibly degraded broadcast audio fidelity during high-profile Knesset coverage and international panel interviews.';
  const longSolution =
    'Implement a hardware analog limiter before the audio enters the TVU encoder, calibrate all lavalier gain pots each morning, and provide a standardized 1kHz tone test before every studio recording session to ensure broadcast compliance.';

  const totalWords = countWords(`${longProblem} ${longImpact} ${longSolution}`);
  assert(totalWords >= 100, 'Must meet 100-word substantive threshold');

  await submitProblemReport(
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
  db = getDb();
  const rental = db.productions.find((p) => p.type === 'RENTAL');
  assert(rental, 'Studio rental must exist');

  // Link sent to client requires valid link
  let threw = false;
  try {
    await updateRentalStep(rental.id, 'LINK_SENT_TO_CLIENT', { clientLink: '' }, producerUser);
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Empty client link must fail');

  const rStep1 = await updateRentalStep(
    rental.id,
    'LINK_SENT_TO_CLIENT',
    { clientLink: 'https://dropbox.com/jns/rental_delivery' },
    producerUser
  );
  assert.strictEqual(rStep1.currentStage, 'LINK_SENT_TO_CLIENT');
  assert.notStrictEqual(rStep1.status, 'COMPLETED');

  // Billing details sent to finance completes rental
  const rStep2 = await updateRentalStep(
    rental.id,
    'BILLING_SENT_TO_FINANCE',
    {
      financeBillingDetails: 'Accounts Payable, ap@client.com',
      financeAgreedAmount: '$1,850',
      financeNotes: 'PO-2026-99',
    },
    producerUser
  );
  assert.strictEqual(rStep2.status, 'COMPLETED');
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
    await submitEquipmentRequest(
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
  await submitEquipmentRequest(
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

// Test 13: Unauthenticated API access protection
try {
  // 1. Unauthenticated request to /api/auth/me returns HTTP 401 and never leaks users or emails
  const unauthMeReq = new NextRequest('http://localhost:3000/api/auth/me');
  const meRes = await getAuthMe(unauthMeReq);
  assert.strictEqual(meRes.status, 401, '/api/auth/me must return 401 for unauthenticated requests');
  const meBody = await meRes.json();
  assert(meBody.error, 'Response must contain an error message');
  assert.strictEqual(meBody.user, undefined, 'Must not return user object');
  assert.strictEqual(meBody.allUsers, undefined, 'Must not return allUsers array');
  assert.strictEqual(meBody.users, undefined, 'Must not return users array');
  assert(!JSON.stringify(meBody).includes('@jns.org'), 'Must never leak user email addresses');

  // 2. Middleware blocks unauthenticated request to /api/auth/me
  const mwRes = await middleware(unauthMeReq);
  assert.strictEqual(mwRes.status, 401, 'Middleware must reject unauthenticated /api/auth/me with 401');

  // 3. Unauthenticated request to protected API routes returns 401
  const unauthProdReq = new NextRequest('http://localhost:3000/api/productions');
  const prodRes = await getProductions(unauthProdReq);
  assert.strictEqual(prodRes.status, 401, 'Protected route /api/productions must return 401 when unauthenticated');

  console.log('✓ Test 13 Passed: Unauthenticated API access returns 401 with zero user/email leakage');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 13 Failed', err);
}

// Test 14: Server-side role enforcement
try {
  // 1. Team member cannot delete a production
  let delProdThrew = false;
  try {
    await deleteProduction(createdEpisode.id, editorUser);
  } catch (e) {
    delProdThrew = true;
    assert(e.message.includes('Unauthorized'), 'Error must specify unauthorized');
  }
  assert.strictEqual(delProdThrew, true, 'Team member cannot delete production');

  // 2. Team member cannot give final producer approval
  let finalAppThrew = false;
  try {
    await giveFinalApproval(createdEpisode.id, editorUser);
  } catch (e) {
    finalAppThrew = true;
    assert(e.message.includes('Unauthorized'), 'Error must specify unauthorized');
  }
  assert.strictEqual(finalAppThrew, true, 'Team member cannot give final approval');

  // 3. Team member cannot update task assigned to someone else
  const prodTask = createdEpisode.tasks.find((t) => t.assignedUserId === producerUser.id);
  assert(prodTask, 'Task assigned to producer must exist');
  let updateOtherTaskThrew = false;
  try {
    await updateTaskStatus(prodTask.id, 'IN_PROGRESS', editorUser);
  } catch (e) {
    updateOtherTaskThrew = true;
    assert(e.message.includes('Unauthorized'), 'Must reject updating tasks assigned to others');
  }
  assert.strictEqual(updateOtherTaskThrew, true, 'Team member cannot update task assigned to another user');

  // 4. Team member cannot delete a task assigned to someone else
  let deleteOtherTaskThrew = false;
  try {
    await deleteTask(prodTask.id, editorUser);
  } catch (e) {
    deleteOtherTaskThrew = true;
    assert(e.message.includes('Unauthorized'), 'Must reject deleting tasks assigned to others');
  }
  assert.strictEqual(deleteOtherTaskThrew, true, 'Team member cannot delete task assigned to another user');

  console.log('✓ Test 14 Passed: Server-side role permissions strictly enforced across all operations');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 14 Failed', err);
}

// Test 15: Production-only endpoints disabled unconditionally in production
try {
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    // 1. /api/reset returns 404 in production unconditionally (even with admin headers)
    const resetReq = new NextRequest('http://localhost:3000/api/reset', {
      method: 'POST',
      headers: { 'x-admin-secret': 'super-admin-secret' },
    });
    const resetRes = await postReset(resetReq);
    assert.strictEqual(resetRes.status, 404, '/api/reset must return 404 unconditionally in production');

    // 2. /api/test-workflow returns 404 in production unconditionally
    const testWfReq = new NextRequest('http://localhost:3000/api/test-workflow', {
      method: 'GET',
      headers: { 'x-admin-secret': 'super-admin-secret' },
    });
    const testWfRes = await getTestWorkflow(testWfReq);
    assert.strictEqual(testWfRes.status, 404, '/api/test-workflow must return 404 unconditionally in production');
  } finally {
    process.env.NODE_ENV = origEnv;
  }

  console.log('✓ Test 15 Passed: /api/reset and /api/test-workflow unconditionally disabled (404) in production');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 15 Failed', err);
}

// Test 16: Simultaneous database updates (Transactional concurrency)
try {
  // Setup: Create two distinct productions with tasks
  const simProdA = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '881',
      filmingDate: '2026-09-20',
      priority: 'HIGH',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );

  const simProdB = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '882',
      filmingDate: '2026-09-21',
      priority: 'NORMAL',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );

  // Add an extra task to simProdA so it has 2 tasks for same-production test
  await updateProductionWithLock(simProdA.id, (prod) => {
    prod.tasks.push({
      id: `tsk_extra_${Date.now()}`,
      productionId: prod.id,
      stageName: 'FILMING',
      title: 'Extra B-Roll Task',
      assignedUserId: producerUser.id,
      status: 'NOT_STARTED',
      priority: 'NORMAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return prod;
  });

  // Part A: Simultaneous updates to DIFFERENT tasks on DIFFERENT productions
  const taskA = simProdA.tasks[0];
  const taskB = simProdB.tasks[0];

  await Promise.all([
    updateTaskStatus(taskA.id, 'IN_PROGRESS', producerUser),
    updateTaskStatus(taskB.id, 'IN_PROGRESS', producerUser),
  ]);

  // Verify fresh database state: both tasks must be IN_PROGRESS
  let freshDb = await getDbAsync();
  let freshA = freshDb.productions.find((p) => p.id === simProdA.id);
  let freshB = freshDb.productions.find((p) => p.id === simProdB.id);

  let updatedTaskA = freshA?.tasks.find((t) => t.id === taskA.id);
  let updatedTaskB = freshB?.tasks.find((t) => t.id === taskB.id);

  assert.strictEqual(updatedTaskA?.status, 'IN_PROGRESS', 'Task A on Prod A must be IN_PROGRESS');
  assert.strictEqual(updatedTaskB?.status, 'IN_PROGRESS', 'Task B on Prod B must be IN_PROGRESS');

  // Part B: Simultaneous updates to DIFFERENT tasks on the SAME production
  const taskA1 = freshA.tasks[0];
  const taskA2 = freshA.tasks[1];
  assert(taskA1 && taskA2, 'Production A must have at least 2 tasks');

  await Promise.all([
    updateTaskStatus(taskA1.id, 'COMPLETED', producerUser),
    updateTaskStatus(taskA2.id, 'IN_PROGRESS', producerUser),
  ]);

  freshDb = await getDbAsync();
  freshA = freshDb.productions.find((p) => p.id === simProdA.id);
  const freshTaskA1 = freshA?.tasks.find((t) => t.id === taskA1.id);
  const freshTaskA2 = freshA?.tasks.find((t) => t.id === taskA2.id);

  assert.strictEqual(freshTaskA1?.status, 'COMPLETED', 'Task A1 must be COMPLETED');
  assert.strictEqual(freshTaskA2?.status, 'IN_PROGRESS', 'Task A2 must be IN_PROGRESS');

  // Part C: Multiple concurrent status updates on identical tasks
  await Promise.all([
    updateTaskStatus(taskA1.id, 'IN_PROGRESS', producerUser),
    updateTaskStatus(taskA1.id, 'COMPLETED', producerUser),
  ]);

  freshDb = await getDbAsync();
  freshA = freshDb.productions.find((p) => p.id === simProdA.id);
  const finalTaskA1 = freshA?.tasks.find((t) => t.id === taskA1.id);
  assert(['IN_PROGRESS', 'COMPLETED'].includes(finalTaskA1?.status), 'Final status must be valid and intact');

  console.log('✓ Test 16 Passed: Simultaneous database updates complete transactionally without lost updates');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 16 Failed', err);
}

console.log(`\n========================================`);
console.log(`RESULTS: ${testsPassed} / 16 Critical Production & Workflow Tests PASSED!`);
console.log(`========================================\n`);

// Reset clean demo seed data after test run
resetToSeedData();

if (testsPassed !== 16) {
  process.exit(1);
}
