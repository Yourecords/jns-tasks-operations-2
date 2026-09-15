import { NextRequest, NextResponse } from 'next/server';
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
} from '@/lib/workflow';
import { getDbAsync, resetToSeedData, saveDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    );
  }

  const results: { test: string; passed: boolean; message?: string }[] = [];

  try {
    // Reset to clean seed data before testing
    resetToSeedData();
    let db = await getDbAsync();

    const adminUser = db.users.find((u) => u.role === 'ADMIN')!;
    const producerUser = db.users.find((u) => u.role === 'PRODUCER')!;
    const editorUser = db.users.find((u) => u.jobFunction === 'VIDEO_EDITOR')!;
    const studioUser = db.users.find((u) => u.jobFunction === 'STUDIO_OPERATOR')!;

    // 1. Team Member cannot create production
    try {
      if (canUserPerform(editorUser, 'CREATE_EPISODE')) {
        throw new Error('Editor should not have CREATE_EPISODE permission');
      }
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
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Creating episode as editor should throw');
      results.push({ test: '1. Team Member cannot create production', passed: true });
    } catch (e: any) {
      results.push({ test: '1. Team Member cannot create production', passed: false, message: e.message });
    }

    // 2. Producer can create episode
    let currentProd: any;
    try {
      currentProd = await createNewEpisode(
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
      if (currentProd.currentStage !== 'FILMING' || currentProd.status !== 'ACTIVE') {
        throw new Error('Created episode has incorrect initial stage or status');
      }
      results.push({ test: '2. Producer can create episode & initialize Stage 1: Filming', passed: true });
    } catch (e: any) {
      results.push({ test: '2. Producer can create episode', passed: false, message: e.message });
    }

    // 3. Editor can update assigned task
    try {
      // Find an existing task assigned to editor (e.g. from seed data)
      db = await getDbAsync();
      let editorTask: any;
      for (const p of db.productions) {
        const t = p.tasks.find((task) => task.assignedUserId === editorUser.id);
        if (t) {
          editorTask = t;
          break;
        }
      }
      if (!editorTask) throw new Error('No task assigned to editor found');

      const updated = await updateTaskStatus(editorTask.id, 'IN_PROGRESS', editorUser);
      if (updated.status !== 'IN_PROGRESS') throw new Error('Status not updated to IN_PROGRESS');
      results.push({ test: '3. Editor can update assigned task', passed: true });
    } catch (e: any) {
      results.push({ test: '3. Editor can update assigned task', passed: false, message: e.message });
    }

    // 4. Editor cannot approve final production
    try {
      if (canUserPerform(editorUser, 'FINAL_APPROVAL')) {
        throw new Error('Editor should not have FINAL_APPROVAL permission');
      }
      let threw = false;
      try {
        await giveFinalApproval(currentProd.id, editorUser);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Editor giving final approval should throw');
      results.push({ test: '4. Editor cannot give final approval', passed: true });
    } catch (e: any) {
      results.push({ test: '4. Editor cannot give final approval', passed: false, message: e.message });
    }

    // 5. Revision Required generates next editing revision
    try {
      let producerFilmingThrew = false;
      try {
        await completeFilmingStage(currentProd.id, producerUser);
      } catch {
        producerFilmingThrew = true;
      }
      if (!producerFilmingThrew) {
        throw new Error('Producer confirming filming should throw');
      }

      currentProd = await completeFilmingStage(currentProd.id, studioUser);
      currentProd = await completeFileUploadStage(currentProd.id, { dropboxPath: '/JNS_RAW/test' }, editorUser);
      currentProd = await completeProducerPackageStage(currentProd.id, { editingNotes: 'Test notes' }, producerUser);
      currentProd = await submitDraftForReview(currentProd.id, 'https://frame.io/test-d1', 'First cut', editorUser);
      currentProd = await reviewDraft(currentProd.id, 'REVISION_REQUIRED', 'Trim 10 seconds from intro', producerUser);

      if (
        currentProd.currentStage !== 'EDITING' ||
        currentProd.revisionCycles.length !== 2 ||
        currentProd.revisionCycles[1].draftNumber !== 2
      ) {
        throw new Error('Draft 2 was not generated as expected');
      }
      results.push({ test: '5. Revision Required generates next editing revision (Draft 2)', passed: true });
    } catch (e: any) {
      results.push({ test: '5. Revision Required generates next revision', passed: false, message: e.message });
    }

    // 6. Approved revision proceeds correctly
    try {
      currentProd = await submitDraftForReview(currentProd.id, 'https://frame.io/test-d2', 'Second cut', editorUser);
      currentProd = await reviewDraft(currentProd.id, 'APPROVED', 'Looks good. Approved.', producerUser);
      if (currentProd.currentStage !== 'FINAL_APPROVAL') {
        throw new Error('Stage should advance to FINAL_APPROVAL');
      }
      results.push({ test: '6. Approved revision proceeds toward Final Approval', passed: true });
    } catch (e: any) {
      results.push({ test: '6. Approved revision proceeds correctly', passed: false, message: e.message });
    }

    // 7. Final Upload cannot happen before approval
    try {
      let threw = false;
      try {
        await completeFinalUpload(currentProd.id, { youtubeUrl: 'https://youtube.com/test' }, editorUser);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Upload before approval should fail');
      results.push({ test: '7. Final Upload cannot happen before explicit approval', passed: true });
    } catch (e: any) {
      results.push({ test: '7. Final Upload before approval check', passed: false, message: e.message });
    }

    // 8. Published cannot happen before final upload
    try {
      currentProd = await giveFinalApproval(currentProd.id, producerUser);
      let threw = false;
      try {
        await markPublished(currentProd.id, {}, producerUser);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Marking published before final upload should fail');

      currentProd = await completeFinalUpload(currentProd.id, { youtubeUrl: 'https://youtube.com/final' }, editorUser);
      currentProd = await markPublished(currentProd.id, { youtubeUrl: 'https://youtube.com/final' }, producerUser);
      if (currentProd.status !== 'COMPLETED') throw new Error('Episode status should be COMPLETED');
      results.push({ test: '8. Published reaches COMPLETED only after Final Upload', passed: true });
    } catch (e: any) {
      results.push({ test: '8. Published transition check', passed: false, message: e.message });
    }

    // 9. Pilot cannot become show before completion
    try {
      db = await getDbAsync();
      const activePilot = db.productions.find((p) => p.type === 'PILOT' && p.status === 'ACTIVE')!;
      let threw = false;
      try {
        await convertPilotToShow(activePilot.id, { showName: 'Incomplete Pilot', hosts: 'Host', producerId: producerUser.id, recordingDay: 'Mon', publicationDay: 'Tue', description: 'desc' }, producerUser);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Incomplete pilot conversion should fail');
      results.push({ test: '9. Pilot cannot become show before completion', passed: true });
    } catch (e: any) {
      results.push({ test: '9. Pilot conversion check', passed: false, message: e.message });
    }

    // 10. Anonymous complaint does not reveal author
    try {
      const pText = 'The camera telemetry audio track is routinely clipping during multi-camera switchovers because the automatic gain limiter on channel 3 has been drifting during extended studio recording sessions. This causes video editors to spend excessive hours in post-production manually de-clipping dialogue waveforms with specialized audio plugins and repair tools.';
      const iText = 'This results in significant publication delays for our daily news packages, causes intense frustration across the post-production team, and risks visibly degraded broadcast audio fidelity during high-profile Knesset coverage and international panel interviews.';
      const sText = 'Implement a hardware analog limiter before the audio enters the TVU encoder, calibrate all lavalier gain pots each morning, and provide a standardized 1kHz tone test before every studio recording session to ensure broadcast compliance.';

      await submitProblemReport(
        {
          title: 'Clipping on channel 3 telemetry during live switchovers',
          problemDescription: pText,
          impactDescription: iText,
          suggestedSolution: sText,
          isAnonymous: true,
        },
        editorUser
      );

      const currentDb = await getDbAsync();
      const latestReport = currentDb.anonymousProblemReports[0];
      if ((latestReport as any).authorId !== undefined || (latestReport as any).authorName !== undefined) {
        throw new Error('Author metadata was found on anonymous report!');
      }
      results.push({ test: '10. Anonymous complaint strictly strips author identity', passed: true });
    } catch (e: any) {
      results.push({ test: '10. Anonymous complaint check', passed: false, message: e.message });
    }

    // 11. Rental completes only after Finance handoff
    try {
      db = await getDbAsync();
      const rental = db.productions.find((p) => p.type === 'RENTAL')!;
      const rStep1 = await updateRentalStep(rental.id, 'LINK_SENT_TO_CLIENT', { clientLink: 'https://dropbox.com/jns/rental' }, producerUser);
      if (rStep1.status === 'COMPLETED') throw new Error('Rental should not be complete before Finance');

      const rStep2 = await updateRentalStep(rental.id, 'BILLING_SENT_TO_FINANCE', { financeBillingDetails: 'AP, ap@corp.com', financeAgreedAmount: '$2,000' }, producerUser);
      if (rStep2.status !== 'COMPLETED') throw new Error('Rental should be COMPLETED after finance handoff');
      results.push({ test: '11. Rental completes only after Finance handoff', passed: true });
    } catch (e: any) {
      results.push({ test: '11. Rental finance handoff check', passed: false, message: e.message });
    }

    // 12. Equipment request validation works
    try {
      let threw = false;
      try {
        await submitEquipmentRequest({ itemName: 'Need a monitor', category: 'Monitor', whyNeeded: 'Old broke', urgency: 'NORMAL', quantity: 1 }, editorUser);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Vague equipment request should have thrown');

      await submitEquipmentRequest({
        itemName: 'Dell UltraSharp 32 4K USB-C Hub Monitor (U3223QE)',
        category: 'Monitor',
        whyNeeded: 'Need color-accurate calibrated display for HDR grading in Premiere Pro.',
        urgency: 'HIGH',
        quantity: 1,
        productUrl: 'https://dell.com/monitor',
      }, editorUser);
      results.push({ test: '12. Equipment request validation rejects vague and accepts verified models', passed: true });
    } catch (e: any) {
      results.push({ test: '12. Equipment request validation check', passed: false, message: e.message });
    }

    // Reset clean seed data after test
    resetToSeedData();
  } catch (globalErr: any) {
    return NextResponse.json({ error: globalErr.message }, { status: 500 });
  }

  const allPassed = results.every((r) => r.passed);
  return NextResponse.json({
    allPassed,
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
    results,
  });
}
