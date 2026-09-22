import assert from 'node:assert';
import { NextRequest } from 'next/server';
import {
  canUserPerform,
  createNewEpisode,
  createNewPilot,
  createNewRental,
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
  reassignProductionEditor,
  rescheduleProductionFilming,
} from '../lib/workflow';
import { getDb, resetToSeedData, countWords, getDbAsync, saveDbAsync } from '../lib/db';
import { updateProductionWithLock, insertProductionWithLock, registerDbAccess } from '../lib/pg';
import { parseFilmingTimeToMinutes, sortProductionsByFilmingSchedule, findStudioConflict } from '../lib/utils';
import { formatDurationMinutes, getEventSlotSpan, buildDayColumnSchedule } from '../lib/calendarUtils';
registerDbAccess({ getDbAsync, saveDbAsync });
import { GET as getAuthMe, POST as postAuthMe } from '../app/api/auth/me/route';
import { POST as postReset } from '../app/api/reset/route';
import { GET as getTestWorkflow } from '../app/api/test-workflow/route';
import { GET as getProductions } from '../app/api/productions/route';
import { PATCH as patchProduction } from '../app/api/productions/[id]/route';
import { GET as getGear, POST as postGear, DELETE as deleteGear } from '../app/api/gear/route';
import { GET as getMessages, POST as postMessages, PATCH as patchMessages } from '../app/api/messages/route';
import { GET as getTaxis, POST as postTaxis } from '../app/api/taxis/route';
import { PATCH as patchTaxi } from '../app/api/taxis/[id]/route';
import { GET as getTaxiConnection, POST as postTaxiConnection } from '../app/api/taxis/connection/route';
import { GET as getGraphics, POST as postGraphics } from '../app/api/graphics/route';
import { GET as getGraphicItem, PATCH as patchGraphicItem, DELETE as deleteGraphicItem } from '../app/api/graphics/[id]/route';
import { middleware } from '../middleware';

console.log('--- RUNNING JNS VIDEO PRODUCTION OPERATIONS TEST SUITE ---\n');

// Reset to clean seed data before testing
resetToSeedData();
let db = getDb();

const adminUser = db.users.find((u) => u.role === 'ADMIN');
const producerUser = db.users.find((u) => u.role === 'PRODUCER');
const editorUser = db.users.find((u) => u.jobFunction === 'VIDEO_EDITOR');
const studioUser = db.users.find((u) => u.jobFunction === 'STUDIO_OPERATOR');

assert(adminUser, 'Admin user must exist');
assert(producerUser, 'Producer user must exist');
assert(editorUser, 'Editor user must exist');
assert(studioUser, 'Studio user must exist');

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
  // Verify Producer CANNOT confirm filming (must be Studio Operator or Admin)
  let producerFilmingThrew = false;
  try {
    await completeFilmingStage(createdEpisode.id, producerUser);
  } catch (e) {
    producerFilmingThrew = true;
  }
  assert.strictEqual(producerFilmingThrew, true, 'Producer confirming filming must throw');

  // Verify Editor CANNOT confirm filming
  let editorFilmingThrew = false;
  try {
    await completeFilmingStage(createdEpisode.id, editorUser);
  } catch (e) {
    editorFilmingThrew = true;
  }
  assert.strictEqual(editorFilmingThrew, true, 'Editor confirming filming must throw');

  // Filming -> File Upload (Studio Operator confirms)
  createdEpisode = await completeFilmingStage(createdEpisode.id, studioUser);
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

// Test 17: Filming schedule chronologically sorted by hour of filming (earliest on top)
try {
  // Test time parsing
  assert.strictEqual(parseFilmingTimeToMinutes('09:00'), 540);
  assert.strictEqual(parseFilmingTimeToMinutes('10:30'), 630);
  assert.strictEqual(parseFilmingTimeToMinutes('14:00 - 16:30 IDT'), 840);
  assert.strictEqual(parseFilmingTimeToMinutes('2:15 pm'), 855);
  assert.strictEqual(parseFilmingTimeToMinutes(undefined), 99999);

  // Test sorting by hour on the same day
  const testShootsSameDay = [
    { id: '1', title: 'Afternoon Shoot', filmingDate: '2026-09-15', filmingTime: '15:30' },
    { id: '2', title: 'Morning Shoot', filmingDate: '2026-09-15', filmingTime: '09:00' },
    { id: '3', title: 'Midday Shoot', filmingDate: '2026-09-15', filmingTime: '11:45' },
    { id: '4', title: 'Early Afternoon Shoot', filmingDate: '2026-09-15', filmingTime: '13:00 - 15:00 IDT' },
    { id: '5', title: 'Unspecified Time Shoot', filmingDate: '2026-09-15' },
  ];

  const sortedSameDay = sortProductionsByFilmingSchedule(testShootsSameDay);
  assert.strictEqual(sortedSameDay[0].title, 'Morning Shoot', '09:00 must be earliest on top');
  assert.strictEqual(sortedSameDay[1].title, 'Midday Shoot', '11:45 must be second');
  assert.strictEqual(sortedSameDay[2].title, 'Early Afternoon Shoot', '13:00 must be third');
  assert.strictEqual(sortedSameDay[3].title, 'Afternoon Shoot', '15:30 must be fourth');
  assert.strictEqual(sortedSameDay[4].title, 'Unspecified Time Shoot', 'Unspecified time must be last');

  // Test sorting across dates and hours
  const testShootsMultiDay = [
    { id: 'a', title: 'Tomorrow Morning', filmingDate: '2026-09-16', filmingTime: '08:30' },
    { id: 'b', title: 'Today Late', filmingDate: '2026-09-15', filmingTime: '16:00' },
    { id: 'c', title: 'Today Early', filmingDate: '2026-09-15', filmingTime: '10:00' },
  ];

  const sortedMultiDay = sortProductionsByFilmingSchedule(testShootsMultiDay);
  assert.strictEqual(sortedMultiDay[0].title, 'Today Early', 'Today 10:00 must be first');
  assert.strictEqual(sortedMultiDay[1].title, 'Today Late', 'Today 16:00 must be second');
  assert.strictEqual(sortedMultiDay[2].title, 'Tomorrow Morning', 'Tomorrow 08:30 must follow Today');

  console.log('✓ Test 17 Passed: Filming schedule chronologically sorted by hour of filming (earliest on top)');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 17 Failed', err);
}

// Test 18: Gear inventory item addition, unshifting to top, retrieval and deletion
try {
  // 1. Add gear item as Studio Operator / Admin
  const addReq = new NextRequest('http://localhost:3000/api/gear', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `jns_user_id=${adminUser.id}`,
    },
    body: JSON.stringify({
      action: 'ADD_ITEM',
      name: 'Sony FE 24-70mm f/2.8 GM II Lens',
      category: 'Lens',
      model: 'SEL2470GM2',
      serialNumber: 'SN-TEST-9921',
      barcode: 'JNS-LENS-99',
      location: 'Studio Lens Locker',
      condition: 'MINT',
      notes: 'New production lens test',
    }),
  });

  const addRes = await postGear(addReq);
  assert.strictEqual(addRes.status, 200, 'Adding gear item should succeed');
  const addData = await addRes.json();
  assert.strictEqual(addData.success, true);
  assert.strictEqual(addData.item.name, 'Sony FE 24-70mm f/2.8 GM II Lens');
  assert.strictEqual(addData.gearInventory[0].id, addData.item.id, 'New item must be at index 0 (top of inventory)');

  // 2. Query GET /api/gear to verify item appears in Equipment Inventory
  const getReq = new NextRequest('http://localhost:3000/api/gear', {
    method: 'GET',
    headers: {
      'Cookie': `jns_user_id=${adminUser.id}`,
    },
  });
  const getRes = await getGear(getReq);
  assert.strictEqual(getRes.status, 200);
  const getData = await getRes.json();
  const foundItem = getData.gearInventory.find((g) => g.id === addData.item.id);
  assert(foundItem, 'Added gear item must appear in Equipment Inventory list');
  assert.strictEqual(foundItem.name, 'Sony FE 24-70mm f/2.8 GM II Lens');
  assert.strictEqual(getData.gearInventory[0].id, addData.item.id, 'Item must be first in list when fetched');

  // 3. Delete item
  const delReq = new NextRequest(`http://localhost:3000/api/gear?id=${addData.item.id}`, {
    method: 'DELETE',
    headers: {
      'Cookie': `jns_user_id=${adminUser.id}`,
    },
  });
  const delRes = await deleteGear(delReq);
  assert.strictEqual(delRes.status, 200);

  // 4. Verify item was removed from inventory
  const getRes2 = await getGear(getReq);
  const getData2 = await getRes2.json();
  const foundAfterDelete = getData2.gearInventory.find((g) => g.id === addData.item.id);
  assert.strictEqual(foundAfterDelete, undefined, 'Deleted gear item must no longer appear in inventory');

  console.log('✓ Test 18 Passed: Gear inventory item added, unshifted to top, and verified in inventory list');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 18 Failed', err);
}

// Test 19: Performance Analytics & Gear Export Date Filtering and Excel generation
try {
  const { getDateRangeFromPreset, filterProductionsByDateRange } = await import('../lib/excel-export');

  // 1. Test Presets
  const rangeAll = getDateRangeFromPreset('ALL');
  assert.strictEqual(rangeAll.start, '');
  assert.strictEqual(rangeAll.end, '');

  const range7D = getDateRangeFromPreset('7D');
  assert(range7D.start && range7D.end, '7D preset must return start and end dates');
  assert(range7D.start <= range7D.end, 'start date must be <= end date');

  // 2. Test Date Filtering
  const mockProds = [
    { id: 'p1', filmingDate: '2026-09-01', publishedAt: '2026-09-03T10:00:00Z', title: 'Ep 1' },
    { id: 'p2', filmingDate: '2026-09-10', publishedAt: '2026-09-12T10:00:00Z', title: 'Ep 2' },
    { id: 'p3', filmingDate: '2026-09-20', publishedAt: '2026-09-22T10:00:00Z', title: 'Ep 3' },
  ];

  const filteredFilming = filterProductionsByDateRange(mockProds, '2026-09-05', '2026-09-15', 'FILMING');
  assert.strictEqual(filteredFilming.length, 1);
  assert.strictEqual(filteredFilming[0].id, 'p2');

  const filteredPublished = filterProductionsByDateRange(mockProds, '2026-09-01', '2026-09-05', 'PUBLISHED');
  assert.strictEqual(filteredPublished.length, 1);
  assert.strictEqual(filteredPublished[0].id, 'p1');

  // 3. Test ExcelJS Workbook Buffer Generation
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Summary');
  ws.addRow(['Metric', 'Value']);
  ws.addRow(['Completed Episodes', 12]);
  const buffer = await wb.xlsx.writeBuffer();
  assert(buffer && buffer.byteLength > 0, 'Excel workbook must produce valid binary buffer');

  console.log('✓ Test 19 Passed: Performance & Gear Excel date filtering and workbook generation verified');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 19 Failed', err);
}

// Test 20: Admin View-As user mode & permission controls
try {
  // 1. Admin switches to View-As Editor
  const adminSwitchReq = new NextRequest('http://localhost:3000/api/auth/me', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${adminUser.id}`,
    },
    body: JSON.stringify({ userId: editorUser.id }),
  });
  const switchRes = await postAuthMe(adminSwitchReq);
  assert.strictEqual(switchRes.status, 200, 'Admin should be able to switch to View-As mode');
  const switchBody = await switchRes.json();
  assert.strictEqual(switchBody.isImpersonating, true);
  assert.strictEqual(switchBody.user.id, editorUser.id);
  assert.strictEqual(switchBody.user.isImpersonated, true);
  assert.strictEqual(switchBody.realUser.id, adminUser.id);

  // 2. GET /api/auth/me reflects the active impersonation
  const viewAsGetReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: {
      cookie: `jns_user_id=${adminUser.id}; jns_impersonate_user_id=${editorUser.id}`,
    },
  });
  const meViewAsRes = await getAuthMe(viewAsGetReq);
  const meViewAsBody = await meViewAsRes.json();
  assert.strictEqual(meViewAsBody.isImpersonating, true);
  assert.strictEqual(meViewAsBody.user.id, editorUser.id);
  assert.strictEqual(meViewAsBody.realUser.id, adminUser.id);

  // 3. Admin exits View-As mode back to Admin
  const exitReq = new NextRequest('http://localhost:3000/api/auth/me', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${adminUser.id}; jns_impersonate_user_id=${editorUser.id}`,
    },
    body: JSON.stringify({ userId: adminUser.id }),
  });
  const exitRes = await postAuthMe(exitReq);
  const exitBody = await exitRes.json();
  assert.strictEqual(exitBody.isImpersonating, false);
  assert.strictEqual(exitBody.user.id, adminUser.id);

  console.log('✓ Test 20 Passed: Admin View-As user mode, perspective switching & exit back to admin verified');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 20 Failed', err);
}

// Test 21: Studio conflict prevention across 3 recording setups:
// 1) In studio recording (IN_STUDIO) -> occupies studio
// 2) Studio + remote interviewee (STUDIO_REMOTE_GUEST) -> occupies studio
// 3) Fully remote recording (FULLY_REMOTE) -> exempt from studio capacity
try {
  // Step 1: Create a studio shoot with IN_STUDIO on 2026-09-28 at 14:00 - 15:30
  const studioEp1 = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '801',
      filmingDate: '2026-09-28',
      filmingTime: '14:00 - 15:30',
      location: 'IN_STUDIO',
      priority: 'HIGH',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );
  assert(studioEp1, 'First studio episode should be created');
  assert.strictEqual(studioEp1.recordingType, 'IN_STUDIO');

  // Step 2: Attempt to book Studio + remote interviewee (STUDIO_REMOTE_GUEST) at overlapping hour 14:30 - 16:00 (MUST FAIL)
  let studioGuestConflictThrew = false;
  let conflictReason = '';
  try {
    await createNewEpisode(
      {
        showId: 'show_the_quad',
        episodeNumber: '802',
        filmingDate: '2026-09-28',
        filmingTime: '14:30 - 16:00',
        location: 'STUDIO_REMOTE_GUEST',
        priority: 'NORMAL',
        producerId: producerUser.id,
        editorId: editorUser.id,
      },
      producerUser
    );
  } catch (err) {
    studioGuestConflictThrew = true;
    conflictReason = err.message;
  }
  assert.strictEqual(studioGuestConflictThrew, true, 'Studio + Remote Interviewee overlapping studio shoot must be blocked');
  assert(conflictReason.includes('Studio is already booked'), 'Error message must explain the studio conflict');

  // Step 3: Attempt to book a studio rental on the same hour (MUST FAIL)
  let rentalConflictThrew = false;
  try {
    await createNewRental(
      {
        clientName: 'Reuters TV',
        projectName: 'Middle East Live Cross',
        contactName: 'James Miller',
        contactInfo: 'jmiller@reuters.com',
        recordingDate: '2026-09-28',
        recordingTime: '14:00 - 15:00',
        studioSetup: 'Main anchor desk',
        producerId: producerUser.id,
      },
      producerUser
    );
  } catch (err) {
    rentalConflictThrew = true;
  }
  assert.strictEqual(rentalConflictThrew, true, 'Studio rental conflicting with studio shoot must be blocked');

  // Step 4: Attempt to book a PILOT with IN_STUDIO on the same hour (MUST FAIL)
  let pilotConflictThrew = false;
  try {
    await createNewPilot(
      {
        title: 'Geopolitics Weekly',
        conceptSummary: 'Middle East analysis deep dive',
        filmingDate: '2026-09-28',
        filmingTime: '14:00 - 15:00',
        location: 'IN_STUDIO',
        priority: 'HIGH',
        producerId: producerUser.id,
      },
      producerUser
    );
  } catch (err) {
    pilotConflictThrew = true;
  }
  assert.strictEqual(pilotConflictThrew, true, 'Pilot with In Studio recording conflicting with existing shoot must be blocked');

  // Step 5: Book a FULLY_REMOTE episode shoot on the exact same date and hour (MUST SUCCEED)
  const fullyRemoteEp = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '803',
      filmingDate: '2026-09-28',
      filmingTime: '14:00 - 15:30',
      location: 'FULLY_REMOTE',
      priority: 'NORMAL',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );
  assert(fullyRemoteEp, 'Fully remote shoot on same hour must succeed without studio conflict');
  assert.strictEqual(fullyRemoteEp.recordingType, 'FULLY_REMOTE');

  // Step 6: Book a FULLY_REMOTE PILOT on the exact same date and hour (MUST SUCCEED)
  const fullyRemotePilot = await createNewPilot(
    {
      title: 'Global Perspectives',
      conceptSummary: 'Remote interviews with international delegates',
      filmingDate: '2026-09-28',
      filmingTime: '14:00 - 15:30',
      location: 'FULLY_REMOTE',
      priority: 'NORMAL',
      producerId: producerUser.id,
    },
    producerUser
  );
  assert(fullyRemotePilot, 'Fully remote pilot must succeed concurrently');
  assert.strictEqual(fullyRemotePilot.recordingType, 'FULLY_REMOTE');

  // Step 7: Book back-to-back studio shoot right after wrap (15:30 - 17:00) with STUDIO_REMOTE_GUEST (MUST SUCCEED)
  const backToBackStudio = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '804',
      filmingDate: '2026-09-28',
      filmingTime: '15:30 - 17:00',
      location: 'STUDIO_REMOTE_GUEST',
      priority: 'NORMAL',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );
  assert(backToBackStudio, 'Back-to-back studio shoot starting at previous wrap time must succeed');
  assert.strictEqual(backToBackStudio.recordingType, 'STUDIO_REMOTE_GUEST');

  console.log('✓ Test 21 Passed: Conflict prevented for In Studio & Studio+Remote Guest, while Fully Remote recordings succeed concurrently');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 21 Failed', err);
}

// Test 22: In-app messaging floating dock: Team group chat, 1-on-1 private DMs, unread counts, and production reference attachment
try {
  // 1. Post a message to General Team channel
  const teamMsgReq = new NextRequest('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      channelType: 'TEAM',
      content: 'Team, studio call time is moved up 15 minutes tomorrow.',
    }),
  });
  const teamMsgRes = await postMessages(teamMsgReq);
  assert.strictEqual(teamMsgRes.status, 201, 'Posting to team channel must return 201');
  const teamMsgBody = await teamMsgRes.json();
  assert(teamMsgBody.message.id, 'New team message must have an ID');
  assert.strictEqual(teamMsgBody.message.channelType, 'TEAM');
  assert.strictEqual(teamMsgBody.message.senderId, producerUser.id);

  // 2. Fetch team messages from editor's perspective (should show unread for editor)
  const getTeamReq = new NextRequest('http://localhost:3000/api/messages?channelType=TEAM', {
    headers: {
      cookie: `jns_user_id=${editorUser.id}`,
    },
  });
  const getTeamRes = await getMessages(getTeamReq);
  const getTeamBody = await getTeamRes.json();
  assert(getTeamBody.messages.length > 0, 'Should return team messages');
  assert(getTeamBody.teamUnreadCount >= 1, 'Editor should have at least 1 unread team message');

  // 3. Send a private 1-on-1 Direct Message with production reference attachment
  const sampleProd = db.productions[0];
  const dmMsgReq = new NextRequest('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      channelType: 'DIRECT',
      recipientId: editorUser.id,
      content: 'Can you check the lower thirds on this cut?',
      productionId: sampleProd?.id,
      productionTitle: sampleProd?.title,
    }),
  });
  const dmMsgRes = await postMessages(dmMsgReq);
  assert.strictEqual(dmMsgRes.status, 201, 'Sending private DM must return 201');
  const dmMsgBody = await dmMsgRes.json();
  assert.strictEqual(dmMsgBody.message.channelType, 'DIRECT');
  assert.strictEqual(dmMsgBody.message.recipientId, editorUser.id);
  assert.strictEqual(dmMsgBody.message.productionId, sampleProd?.id);

  // 4. Verify in-app notification was generated for recipient of DM
  const currentDb = getDb();
  const dmNotif = currentDb.notifications.find(
    (n) => n.userId === editorUser.id && n.title.includes(producerUser.name)
  );
  assert(dmNotif, 'Recipient of private DM must receive an in-app notification');

  // 5. Query DM messages from recipient's perspective
  const getDmReq = new NextRequest(`http://localhost:3000/api/messages?channelType=DIRECT&recipientId=${producerUser.id}`, {
    headers: {
      cookie: `jns_user_id=${editorUser.id}`,
    },
  });
  const getDmRes = await getMessages(getDmReq);
  const getDmBody = await getDmRes.json();
  assert(getDmBody.messages.some((m) => m.id === dmMsgBody.message.id), 'DM thread must contain sent message');
  assert(getDmBody.dmUnreadCounts[producerUser.id] >= 1, 'Unread DM count from producer must be >= 1');

  // 6. Mark messages as read by recipient
  const markReadReq = new NextRequest('http://localhost:3000/api/messages', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${editorUser.id}`,
    },
    body: JSON.stringify({
      channelType: 'DIRECT',
      senderId: producerUser.id,
    }),
  });
  const markReadRes = await patchMessages(markReadReq);
  assert.strictEqual(markReadRes.status, 200, 'Marking read must return 200');

  // 7. Verify unread count is cleared for editor
  const getDmReqAfter = new NextRequest(`http://localhost:3000/api/messages?channelType=DIRECT&recipientId=${producerUser.id}`, {
    headers: {
      cookie: `jns_user_id=${editorUser.id}`,
    },
  });
  const getDmResAfter = await getMessages(getDmReqAfter);
  const getDmBodyAfter = await getDmResAfter.json();
  assert.strictEqual(getDmBodyAfter.dmUnreadCounts[producerUser.id] || 0, 0, 'Unread count should be 0 after marking read');

  console.log('✓ Test 22 Passed: In-app messaging floating dock: Team group chat, 1-on-1 private DMs, unread counts & attachments verified');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 22 Failed', err);
}

// Test 23: Calendar Drag-and-Drop: Reassign Editor, Reschedule Filming & Enforce Studio Conflict Check
try {
  const currentDb = getDb();
  const editors = currentDb.users.filter((u) => u.jobFunction === 'VIDEO_EDITOR');
  assert(editors.length >= 2, 'Need at least 2 video editors for reassignment test');
  const editorA = editors[0];
  const editorB = editors[1];

  // 1. Create a test episode assigned to editorA
  const testEpisode = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '990',
      filmingDate: '2026-09-25',
      filmingTime: '10:00 - 11:30',
      location: 'IN_STUDIO',
      priority: 'NORMAL',
      producerId: producerUser.id,
      editorId: editorA.id,
    },
    producerUser
  );
  assert.strictEqual(testEpisode.editorId, editorA.id);

  // 2. Drag & drop editor reassignment via PATCH /api/productions/[id]
  const reassignReq = new NextRequest(`http://localhost:3000/api/productions/${testEpisode.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'REASSIGN_EDITOR',
      editorId: editorB.id,
      editingDate: '2026-09-26',
    }),
  });
  const reassignRes = await patchProduction(reassignReq, { params: { id: testEpisode.id } });
  assert.strictEqual(reassignRes.status, 200, 'Reassign editor must return 200');
  const reassignData = await reassignRes.json();
  assert.strictEqual(reassignData.production.editorId, editorB.id, 'Editor must be updated to editorB');
  assert.strictEqual(reassignData.production.editingDate, '2026-09-26', 'Editing shift date must be updated');

  // Verify internal editing tasks were reassigned to editorB
  const editingTasks = reassignData.production.tasks.filter((t) =>
    t.stageName === 'EDITING' || t.title.toLowerCase().includes('edit')
  );
  for (const t of editingTasks) {
    assert.strictEqual(t.assignedUserId, editorB.id, 'Editing task assignedUserId must be updated to editorB');
    assert.strictEqual(t.dueDate, '2026-09-26', 'Editing task dueDate must match target editing date');
  }

  // 3. Drag & drop filming reschedule via PATCH /api/productions/[id]
  const rescheduleReq = new NextRequest(`http://localhost:3000/api/productions/${testEpisode.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'RESCHEDULE_FILMING',
      filmingDate: '2026-10-05',
      filmingTime: '15:00 - 16:30',
    }),
  });
  const rescheduleRes = await patchProduction(rescheduleReq, { params: { id: testEpisode.id } });
  const rescheduleData = await rescheduleRes.json();
  assert.strictEqual(rescheduleRes.status, 200, 'Reschedule filming must return 200');
  assert.strictEqual(rescheduleData.production.filmingDate, '2026-10-05', 'Filming date must be updated');
  assert.strictEqual(rescheduleData.production.filmingTime, '15:00 - 16:30', 'Filming time must be updated');

  // Verify filming tasks dueDate was updated
  const filmingTasks = rescheduleData.production.tasks.filter((t) =>
    t.stageName === 'FILMING' || t.title.toLowerCase().includes('filming')
  );
  for (const t of filmingTasks) {
    assert.strictEqual(t.dueDate, '2026-10-05', 'Filming task dueDate must match rescheduled filming date');
  }

  // 4. Physical Studio Double-Booking Prevention
  // Create a second episode in studio on 2026-09-29
  const conflictingEpisode = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '991',
      filmingDate: '2026-09-29',
      filmingTime: '09:00 - 10:00',
      location: 'IN_STUDIO',
      priority: 'NORMAL',
      producerId: producerUser.id,
      editorId: editorA.id,
    },
    producerUser
  );

  // Attempt to drag/reschedule conflictingEpisode to 2026-10-05 15:30 (overlaps with testEpisode)
  const conflictReq = new NextRequest(`http://localhost:3000/api/productions/${conflictingEpisode.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'RESCHEDULE_FILMING',
      filmingDate: '2026-10-05',
      filmingTime: '15:30 - 16:30',
    }),
  });
  const conflictRes = await patchProduction(conflictReq, { params: { id: conflictingEpisode.id } });
  assert.strictEqual(conflictRes.status, 400, 'Conflicting studio reschedule must be rejected with 400');
  const conflictData = await conflictRes.json();
  assert(
    conflictData.error.includes('Studio Double-Booking Conflict'),
    `Expected studio conflict error, got: ${conflictData.error}`
  );

  // 5. Remote Recording Exemption: Remote shoot at the same slot should SUCCEED
  const remoteEpisode = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '992',
      filmingDate: '2026-09-29',
      filmingTime: '09:00 - 10:00',
      location: 'FULLY_REMOTE',
      priority: 'NORMAL',
      producerId: producerUser.id,
      editorId: editorA.id,
    },
    producerUser
  );

  const remoteReq = new NextRequest(`http://localhost:3000/api/productions/${remoteEpisode.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'RESCHEDULE_FILMING',
      filmingDate: '2026-10-05',
      filmingTime: '15:30 - 16:30',
    }),
  });
  const remoteRes = await patchProduction(remoteReq, { params: { id: remoteEpisode.id } });
  assert.strictEqual(remoteRes.status, 200, 'Remote shoot reschedule at same time must succeed');
  const remoteData = await remoteRes.json();
  assert.strictEqual(remoteData.production.filmingTime, '15:30 - 16:30');

  console.log('✓ Test 23 Passed: Production Calendar drag-and-drop: Editor reassignment, filming reschedule & studio conflict checks');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 23 Failed', err);
}

// Test 24: Gett Taxi Dispatch Module: Role permissions, immediate dispatch, estimation, status progression & cancellation
try {
  // 0. Permission Check: Editor is forbidden from ordering or managing taxis
  const editorOrderReq = new NextRequest('http://localhost:3000/api/taxis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${editorUser.id}`,
    },
    body: JSON.stringify({
      passengerName: 'Unauthorized Guest',
      passengerPhone: '+972-50-0000000',
      pickupAddress: 'King David Hotel, King David St 23, Jerusalem',
      dropoffAddress: 'JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem',
      direction: 'TO_STUDIO',
    }),
  });
  const editorOrderRes = await postTaxis(editorOrderReq);
  assert.strictEqual(editorOrderRes.status, 403, 'Editor must receive 403 Forbidden when attempting to order taxi');
  const editorOrderData = await editorOrderRes.json();
  assert(editorOrderData.error.includes('restricted to Administrators, Producers, and Studio Operators'));

  // Studio Operator is permitted to order taxis
  const studioOrderReq = new NextRequest('http://localhost:3000/api/taxis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${studioUser.id}`,
    },
    body: JSON.stringify({
      passengerName: 'Ahron Test Host',
      passengerPhone: '+972-54-3334455',
      pickupAddress: 'JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem',
      dropoffAddress: 'Mamilla Hotel, King Solomon St 11, Jerusalem',
      direction: 'FROM_STUDIO',
      isImmediate: true,
    }),
  });
  const studioOrderRes = await postTaxis(studioOrderReq);
  assert.strictEqual(studioOrderRes.status, 201, 'Studio Operator must be permitted to dispatch taxis (201)');

  // 1. Dispatch an immediate taxi for a guest via POST /api/taxis (by Producer)
  const orderReq = new NextRequest('http://localhost:3000/api/taxis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      passengerName: 'Ambassador David Friedman',
      passengerPhone: '+972-52-1112233',
      passengerRole: 'GUEST',
      pickupAddress: 'King David Hotel, King David St 23, Jerusalem',
      dropoffAddress: 'JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem',
      direction: 'TO_STUDIO',
      isImmediate: true,
      vehicleType: 'REGULAR',
      notes: 'VIP Guest for The QUAD interview.',
      costCenter: 'The QUAD (Production)',
    }),
  });
  const orderRes = await postTaxis(orderReq);
  assert.strictEqual(orderRes.status, 201, 'Dispatching taxi must return 201');
  const orderData = await orderRes.json();
  assert(orderData.ride, 'Response must contain ride object');
  assert.strictEqual(orderData.ride.passengerName, 'Ambassador David Friedman');
  assert.strictEqual(orderData.ride.status, 'DISPATCHED', 'Immediate ride must have DISPATCHED status');
  assert(orderData.ride.driver, 'Dispatched ride must have assigned driver');
  assert(orderData.ride.driver.name, 'Driver must have a name');
  assert(orderData.ride.driver.licensePlate, 'Driver must have a license plate');
  assert(orderData.ride.gettOrderId.startsWith('gett_ord_'), 'Gett order ID must be generated');
  assert(orderData.ride.estimatedPriceShekels > 0, 'Estimated price must be calculated');

  const rideId = orderData.ride.id;

  // 2. Query rides via GET /api/taxis
  const getReq = new NextRequest('http://localhost:3000/api/taxis', {
    headers: {
      cookie: `jns_user_id=${producerUser.id}`,
    },
  });
  const getRes = await getTaxis(getReq);
  assert.strictEqual(getRes.status, 200, 'GET /api/taxis must return 200');
  const getData = await getRes.json();
  assert(getData.rides.some((r) => r.id === rideId), 'Rides list must include newly dispatched ride');
  assert(getData.activeCount >= 1, 'Active count must be >= 1');

  // 3. Status progression via PATCH /api/taxis/[id]
  // Advance to ARRIVED
  const arriveReq = new NextRequest(`http://localhost:3000/api/taxis/${rideId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'UPDATE_STATUS',
      status: 'ARRIVED',
    }),
  });
  const arriveRes = await patchTaxi(arriveReq, { params: { id: rideId } });
  assert.strictEqual(arriveRes.status, 200, 'Updating status to ARRIVED must return 200');
  const arriveData = await arriveRes.json();
  assert.strictEqual(arriveData.ride.status, 'ARRIVED');

  // Advance to IN_TRANSIT
  const inTransitReq = new NextRequest(`http://localhost:3000/api/taxis/${rideId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'UPDATE_STATUS',
      status: 'IN_TRANSIT',
    }),
  });
  const inTransitRes = await patchTaxi(inTransitReq, { params: { id: rideId } });
  assert.strictEqual(inTransitRes.status, 200);
  const inTransitData = await inTransitRes.json();
  assert.strictEqual(inTransitData.ride.status, 'IN_TRANSIT');

  // Complete the ride
  const completeReq = new NextRequest(`http://localhost:3000/api/taxis/${rideId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'UPDATE_STATUS',
      status: 'COMPLETED',
      actualPrice: 65,
    }),
  });
  const completeRes = await patchTaxi(completeReq, { params: { id: rideId } });
  assert.strictEqual(completeRes.status, 200);
  const completeData = await completeRes.json();
  assert.strictEqual(completeData.ride.status, 'COMPLETED');
  assert.strictEqual(completeData.ride.actualPriceShekels, 65);

  // 4. Create a scheduled taxi and test cancellation flow
  const schedReq = new NextRequest('http://localhost:3000/api/taxis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      passengerName: 'Mark Regev',
      passengerPhone: '+972-54-9998877',
      passengerRole: 'GUEST',
      pickupAddress: 'Orient Hotel, Emek Refaim St 3, Jerusalem',
      dropoffAddress: 'JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem',
      direction: 'TO_STUDIO',
      isImmediate: false,
      scheduledTime: '2026-09-20T14:30:00.000Z',
      vehicleType: 'PREMIUM',
    }),
  });
  const schedRes = await postTaxis(schedReq);
  assert.strictEqual(schedRes.status, 201);
  const schedData = await schedRes.json();
  assert.strictEqual(schedData.ride.status, 'REQUESTED', 'Scheduled ride must have REQUESTED status');
  const schedRideId = schedData.ride.id;

  // Cancel the scheduled ride
  const cancelReq = new NextRequest(`http://localhost:3000/api/taxis/${schedRideId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'CANCEL_RIDE',
      reason: 'Interview rescheduled to tomorrow',
    }),
  });
  const cancelRes = await patchTaxi(cancelReq, { params: { id: schedRideId } });
  assert.strictEqual(cancelRes.status, 200, 'Cancelling ride must return 200');
  const cancelData = await cancelRes.json();
  assert.strictEqual(cancelData.ride.status, 'CANCELLED');
  assert(cancelData.ride.notes.includes('Interview rescheduled to tomorrow'));

  // 5. Verify audit log entry exists
  const currentDb = getDb();
  const taxiAudit = currentDb.auditLogs.find(
    (l) => l.action === 'ORDER_TAXI' && l.details.includes('Ambassador David Friedman')
  );
  assert(taxiAudit, 'Audit log must record taxi order action');

  console.log('✓ Test 24 Passed: Gett Taxi Dispatch Module: Immediate dispatch, estimation, status progression & cancellation');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 24 Failed', err);
}

// Test 25: Gett Business Israel (Gett Business IL) Corporate Account Connection & Attribution
try {
  // 1. Role Guard: Editor cannot configure Gett Business connection (403 Forbidden)
  const editorConnReq = new NextRequest('http://localhost:3000/api/taxis/connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${editorUser.id}`,
    },
    body: JSON.stringify({
      action: 'SAVE',
      accountId: 'MALICIOUS_ATTEMPT',
    }),
  });
  const editorConnRes = await postTaxiConnection(editorConnReq);
  assert.strictEqual(editorConnRes.status, 403, 'Editor must receive 403 when configuring Gett Business');

  // 2. Connection Testing: Producer tests connection with corporate ID
  const testConnReq = new NextRequest('http://localhost:3000/api/taxis/connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'TEST',
      accountId: 'JNS-IL-98124',
      companyName: 'Jewish News Syndicate (JNS)',
    }),
  });
  const testConnRes = await postTaxiConnection(testConnReq);
  assert.strictEqual(testConnRes.status, 200, 'Test connection endpoint must return 200');
  const testConnData = await testConnRes.json();
  assert.strictEqual(testConnData.success, true, 'Valid Account ID must pass connection test');

  // 3. Account Connection: Producer connects JNS Gett Business corporate account
  const saveConnReq = new NextRequest('http://localhost:3000/api/taxis/connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      action: 'SAVE',
      connected: true,
      accountId: 'JNS-IL-98124',
      companyName: 'Jewish News Syndicate (JNS)',
      defaultCostCenter: 'JNS Video Operations - Jerusalem Studio',
      billingEmail: 'production@jns.org',
    }),
  });
  const saveConnRes = await postTaxiConnection(saveConnReq);
  assert.strictEqual(saveConnRes.status, 200, 'Saving Gett Business connection must return 200');
  const saveConnData = await saveConnRes.json();
  assert.strictEqual(saveConnData.config.connected, true);
  assert.strictEqual(saveConnData.config.accountId, 'JNS-IL-98124');

  // 4. GET endpoint verification: Returns active connection status
  const getConnReq = new NextRequest('http://localhost:3000/api/taxis/connection', {
    method: 'GET',
    headers: {
      cookie: `jns_user_id=${producerUser.id}`,
    },
  });
  const getConnRes = await getTaxiConnection(getConnReq);
  assert.strictEqual(getConnRes.status, 200);
  const getConnData = await getConnRes.json();
  assert.strictEqual(getConnData.config.connected, true);
  assert.strictEqual(getConnData.config.accountId, 'JNS-IL-98124');
  assert.strictEqual(getConnData.canManage, true);

  // 5. Corporate Dispatch Attribution: Ride ordered while connected is tagged as corporate
  const corpOrderReq = new NextRequest('http://localhost:3000/api/taxis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      passengerName: 'General Yaakov Amidror',
      passengerPhone: '+972-52-1112233',
      passengerRole: 'GUEST',
      pickupAddress: 'Inbal Hotel, Liberty Bell Park, Jerusalem',
      dropoffAddress: 'JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem',
      direction: 'TO_STUDIO',
      isImmediate: true,
    }),
  });
  const corpOrderRes = await postTaxis(corpOrderReq);
  assert.strictEqual(corpOrderRes.status, 201);
  const corpOrderData = await corpOrderRes.json();
  assert.strictEqual(corpOrderData.ride.isCorporateRide, true, 'Ride must be attributed as corporate ride');
  assert.strictEqual(corpOrderData.ride.gettBusinessAccountId, 'JNS-IL-98124', 'Ride must link to JNS Gett Business account ID');
  assert(corpOrderData.ride.trackingUrl.includes('business.gett.com/rides'), 'Tracking URL must link to Gett Business portal');

  // 6. Audit log check
  const dbAfter = getDb();
  const corpAudit = dbAfter.auditLogs.find(
    (l) => l.action === 'ORDER_TAXI' && l.details.includes('JNS-IL-98124')
  );
  assert(corpAudit, 'Audit log must record Gett Business corporate account attribution');

  // 7. Disconnect Gett Business account
  const discReq = new NextRequest('http://localhost:3000/api/taxis/connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${adminUser.id}`,
    },
    body: JSON.stringify({ action: 'DISCONNECT' }),
  });
  const discRes = await postTaxiConnection(discReq);
  assert.strictEqual(discRes.status, 200);
  const discData = await discRes.json();
  assert.strictEqual(discData.config.connected, false, 'Disconnect action must mark connection false');

  console.log('✓ Test 25 Passed: Gett Business Israel (Gett Business IL) Corporate Account Connection, Masked Auth & Corporate Attribution');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 25 Failed', err);
}

// Test 26: In-App Messenger: Edit message allowed for 1 hour after sent, blocked thereafter
try {
  // 1. Post a new message from Producer
  const postReq = new NextRequest('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      channelType: 'TEAM',
      content: 'Original message before typo fix',
    }),
  });
  const postRes = await postMessages(postReq);
  assert.strictEqual(postRes.status, 201, 'Sending message should succeed');
  const postData = await postRes.json();
  const msgId = postData.message.id;

  // 2. Edit within 1 hour as sender -> should succeed
  const editReq = new NextRequest('http://localhost:3000/api/messages', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      messageId: msgId,
      content: 'Corrected message content within 1 hour',
    }),
  });
  const editRes = await patchMessages(editReq);
  assert.strictEqual(editRes.status, 200, 'Editing message within 1 hour by author must succeed');
  const editData = await editRes.json();
  assert.strictEqual(editData.message.content, 'Corrected message content within 1 hour');
  assert.strictEqual(editData.message.isEdited, true, 'Message must be flagged as isEdited: true');
  assert(editData.message.editedAt, 'Message must have editedAt timestamp');

  // 3. Different user attempting to edit -> 403 Forbidden
  const rogueReq = new NextRequest('http://localhost:3000/api/messages', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${editorUser.id}`,
    },
    body: JSON.stringify({
      messageId: msgId,
      content: 'Unauthorized edit attempt by different user',
    }),
  });
  const rogueRes = await patchMessages(rogueReq);
  assert.strictEqual(rogueRes.status, 403, 'Non-author edit attempt must return 403 Forbidden');

  // 4. Age the message to > 1 hour ago (e.g. 70 minutes ago)
  const currentDb = getDb();
  const storedMsg = currentDb.chatMessages.find((m) => m.id === msgId);
  assert(storedMsg, 'Stored message must be found in db');
  storedMsg.createdAt = new Date(Date.now() - 70 * 60 * 1000).toISOString();
  await saveDbAsync(currentDb);

  // 5. Attempting to edit after 1 hour -> 403 Forbidden
  const expiredReq = new NextRequest('http://localhost:3000/api/messages', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      messageId: msgId,
      content: 'Late edit attempt after 1 hour expiration',
    }),
  });
  const expiredRes = await patchMessages(expiredReq);
  assert.strictEqual(expiredRes.status, 403, 'Editing message after 1 hour must return 403 Forbidden');
  const expiredData = await expiredRes.json();
  assert(expiredData.error.includes('1 hour'), 'Error message must state 1 hour limit');

  console.log('✓ Test 26 Passed: In-App Messenger: Edit message allowed for 1 hour after sent, blocked thereafter');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 26 Failed', err);
}

// Test 27: Graphic Design Task Management & Quick Action Creation
try {
  // 1. Create Immediate Graphic Request (Title, Show, Timing, Deadline, Assets, References)
  const immReq = new NextRequest('http://localhost:3000/api/graphics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      type: 'IMMEDIATE',
      title: 'Quote Card - US-Israel Strategic Accord',
      showName: 'The Quad',
      deadline: '2026-09-21T18:00',
      timing: '04:12 - 04:40',
      description: 'Full-screen graphic displaying Netanyahu quote with dual flag backdrop',
      priority: 'HIGH',
      assignedUserId: 'usr_ilia_graphics',
      assets: [{ title: 'Press Release PDF', url: 'https://jns.org/assets/press-release.pdf' }],
      references: [{ title: 'Previous Quad Style', url: 'https://youtube.com/watch?v=ref123' }],
    }),
  });
  const immRes = await postGraphics(immReq);
  assert.strictEqual(immRes.status, 201, 'Immediate graphic request creation must succeed');
  const immData = await immRes.json();
  assert.strictEqual(immData.task.type, 'IMMEDIATE');
  assert.strictEqual(immData.task.showName, 'The Quad');
  assert.strictEqual(immData.task.timing, '04:12 - 04:40');
  assert.strictEqual(immData.task.assets.length, 1);
  assert.strictEqual(immData.task.references.length, 1);
  const immTaskId = immData.task.id;

  // 2. Create Long-Term Project with the 8 lifecycle stages
  const STAGES_8 = [
    'NOT_STARTED',
    'CONCEPT',
    'DESIGN',
    'ANIMATION',
    'IMPLEMENTATION',
    'FINALIZING',
    'AUDIO',
    'DONE',
  ];
  const longReq = new NextRequest('http://localhost:3000/api/graphics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      type: 'LONG_TERM',
      projectName: '2026 Channel Identity & Studio Virtual Wall Overhaul',
      description: 'Complete studio motion packaging across all 8 stages',
      deadline: '2026-10-30',
      priority: 'URGENT',
      assignedUserId: 'usr_ilia_graphics',
      subtasks: STAGES_8.map((stage, i) => ({
        title: `Phase ${i + 1}: ${stage}`,
        status: stage === 'NOT_STARTED' ? 'NOT_STARTED' : stage,
      })),
    }),
  });
  const longRes = await postGraphics(longReq);
  assert.strictEqual(longRes.status, 201, 'Long-term project creation must succeed');
  const longData = await longRes.json();
  assert.strictEqual(longData.task.type, 'LONG_TERM');
  assert.strictEqual(longData.task.subtasks.length, 8, 'Must have all 8 subtasks');
  const longTaskId = longData.task.id;

  // 3. Update subtask stage and task status
  const patchReq = new NextRequest(`http://localhost:3000/api/graphics/${immTaskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: `jns_user_id=${producerUser.id}`,
    },
    body: JSON.stringify({
      status: 'COMPLETED',
      deliverableUrl: 'https://dropbox.com/s/jns_quote_card_v1.mov',
    }),
  });
  const patchRes = await patchGraphicItem(patchReq, { params: Promise.resolve({ id: immTaskId }) });
  assert.strictEqual(patchRes.status, 200, 'Updating task status must succeed');
  const patchData = await patchRes.json();
  assert.strictEqual(patchData.task.status, 'COMPLETED');
  assert.strictEqual(patchData.task.deliverableUrl, 'https://dropbox.com/s/jns_quote_card_v1.mov');

  // 4. Retrieve via GET /api/graphics
  const getReq = new NextRequest('http://localhost:3000/api/graphics', {
    method: 'GET',
    headers: { cookie: `jns_user_id=${producerUser.id}` },
  });
  const getRes = await getGraphics(getReq);
  assert.strictEqual(getRes.status, 200);
  const allGfx = await getRes.json();
  assert(allGfx.tasks.length >= 2, 'Retrieved tasks must include created tasks');

  console.log('✓ Test 27 Passed: Graphic Design Hub & Quick Action: Immediate requests & 8-stage long-term projects verified');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 27 Failed', err);
}

// Test 28: Production Scheduling End Time, Duration Formatting & Multi-Hour Calendar Slot Spanning
try {
  // 1. Test formatDurationMinutes utility
  assert.strictEqual(formatDurationMinutes(45), '45m');
  assert.strictEqual(formatDurationMinutes(60), '1h');
  assert.strictEqual(formatDurationMinutes(90), '1h 30m');
  assert.strictEqual(formatDurationMinutes(120), '2h');
  assert.strictEqual(formatDurationMinutes(150), '2h 30m');
  assert.strictEqual(formatDurationMinutes(180), '3h');

  // 2. Test getEventSlotSpan utility
  // Default 90m for legacy single time
  const legacySpan = getEventSlotSpan('10:00', 90);
  assert.strictEqual(legacySpan.formattedRange, '10:00 – 11:30');
  assert.strictEqual(legacySpan.durationMinutes, 90);
  assert.strictEqual(legacySpan.formattedDuration, '1h 30m');
  assert.strictEqual(legacySpan.span, 2);
  assert.strictEqual(legacySpan.startSlotIndex, 2); // 10:00 is index 2 (TIME_SLOTS begins at 08:00)

  // Explicit 2-hour shoot (10:00 - 12:00)
  const twoHourSpan = getEventSlotSpan('10:00 - 12:00', 90);
  assert.strictEqual(twoHourSpan.formattedRange, '10:00 – 12:00');
  assert.strictEqual(twoHourSpan.durationMinutes, 120);
  assert.strictEqual(twoHourSpan.formattedDuration, '2h');
  assert.strictEqual(twoHourSpan.span, 2);
  assert.strictEqual(twoHourSpan.startSlotIndex, 2);

  // Explicit 3-hour rental shoot (10:00 - 13:00)
  const threeHourSpan = getEventSlotSpan('10:00 - 13:00', 90);
  assert.strictEqual(threeHourSpan.formattedRange, '10:00 – 13:00');
  assert.strictEqual(threeHourSpan.durationMinutes, 180);
  assert.strictEqual(threeHourSpan.formattedDuration, '3h');
  assert.strictEqual(threeHourSpan.span, 3);
  assert.strictEqual(threeHourSpan.startSlotIndex, 2);

  // 3. Test buildDayColumnSchedule grid schedule mapping
  const mockRentalProd = {
    id: 'prod_test_rental_3h',
    title: 'Jerusalem Post Studio Rental',
    type: 'RENTAL',
    filmingDate: '2026-10-15',
    filmingTime: '10:00 - 13:00',
    location: 'IN_STUDIO',
  };
  const mockAfternoonShoot = {
    id: 'prod_test_afternoon',
    title: 'Special Briefing',
    type: 'EPISODE',
    filmingDate: '2026-10-15',
    filmingTime: '15:00 - 16:30',
    location: 'IN_STUDIO',
  };

  const daySchedule = buildDayColumnSchedule([mockRentalProd, mockAfternoonShoot], 90);
  // TIME_SLOTS: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', ...]
  // Slot 1 (09:00): empty, not covered
  assert.strictEqual(daySchedule[1].isCovered, false);
  assert.strictEqual(daySchedule[1].items.length, 0);

  // Slot 2 (10:00): start of 3h rental -> rowSpan: 3, items: [mockRentalProd], not covered
  assert.strictEqual(daySchedule[2].isCovered, false);
  assert.strictEqual(daySchedule[2].rowSpan, 3);
  assert.strictEqual(daySchedule[2].items[0].id, mockRentalProd.id);

  // Slot 3 (11:00): covered by rental
  assert.strictEqual(daySchedule[3].isCovered, true);

  // Slot 4 (12:00): covered by rental
  assert.strictEqual(daySchedule[4].isCovered, true);

  // Slot 5 (13:00): rental ends at 13:00, slot 5 is free!
  assert.strictEqual(daySchedule[5].isCovered, false);
  assert.strictEqual(daySchedule[5].items.length, 0);

  // Slot 7 (15:00): start of afternoon shoot -> rowSpan: 2 (15:00 - 16:30 covers 15:00 and 16:00)
  assert.strictEqual(daySchedule[7].isCovered, false);
  assert.strictEqual(daySchedule[7].rowSpan, 2);
  assert.strictEqual(daySchedule[7].items[0].id, mockAfternoonShoot.id);

  // Slot 8 (16:00): covered by afternoon shoot
  assert.strictEqual(daySchedule[8].isCovered, true);

  // 4. Create an Episode with explicit start and end time via createNewEpisode
  const schedEpisode = await createNewEpisode(
    {
      showId: 'show_the_quad',
      episodeNumber: '995',
      filmingDate: '2026-10-20',
      filmingTime: '10:00 - 12:30', // 2.5 hours
      location: 'IN_STUDIO',
      priority: 'NORMAL',
      producerId: producerUser.id,
      editorId: editorUser.id,
    },
    producerUser
  );
  assert.strictEqual(schedEpisode.filmingTime, '10:00 - 12:30');

  // 5. Verify studio conflict detection across the full span of the shoot
  // A shoot starting at 11:30 must conflict with '10:00 - 12:30'
  const conflict1 = findStudioConflict(
    [schedEpisode],
    '2026-10-20',
    '11:30 - 12:30',
    'IN_STUDIO'
  );
  assert.strictEqual(conflict1.hasConflict, true, 'Shoot overlapping with 10:00-12:30 must trigger conflict');

  // A shoot starting at 12:30 must NOT conflict with '10:00 - 12:30'
  const nonConflict = findStudioConflict(
    [schedEpisode],
    '2026-10-20',
    '12:30 - 13:30',
    'IN_STUDIO'
  );
  assert.strictEqual(nonConflict.hasConflict, false, 'Shoot starting after end time must NOT trigger conflict');

  // 6. Create a Rental with explicit start/end time and hoursCount
  const rentalProd = await createNewRental(
    {
      clientName: 'i24 News Special Broadcast',
      projectName: 'Live Cross',
      contactName: 'David Cohen',
      contactInfo: 'david@i24news.tv',
      recordingDate: '2026-10-22',
      recordingTime: '10:00 - 14:00',
      hoursCount: '4',
      agreedPrice: '1400',
      studioSetup: 'Main desk',
      producerId: producerUser.id,
    },
    producerUser
  );
  assert.strictEqual(rentalProd.filmingTime, '10:00 - 14:00');
  assert.strictEqual(rentalProd.type, 'RENTAL');

  console.log('✓ Test 28 Passed: Production Scheduling End Time, Duration Formatting & Multi-Hour Calendar Slot Spanning verified');
  testsPassed++;
} catch (err) {
  console.error('✗ Test 28 Failed', err);
}

console.log(`\n========================================`);
console.log(`RESULTS: ${testsPassed} / 28 Critical Production & Workflow Tests PASSED!`);
console.log(`========================================\n`);

// Reset clean demo seed data after test run
resetToSeedData();

if (testsPassed !== 28) {
  process.exit(1);
}
