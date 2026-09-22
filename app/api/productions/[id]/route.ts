import { NextRequest, NextResponse } from 'next/server';
import { getDbAsync } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  completeFilmingStage,
  completeFileUploadStage,
  completeProducerPackageStage,
  submitDraftForReview,
  reviewDraft,
  giveFinalApproval,
  completeFinalUpload,
  markPublished,
  updateRentalStep,
  deleteProduction,
  reassignProductionEditor,
  rescheduleProductionFilming,
  modifyScheduledProduction,
} from '@/lib/workflow';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { id } = await Promise.resolve(context.params);
  const db = await getDbAsync();
  const prod = db.productions.find((p) => p.id === id);
  if (!prod) {
    return NextResponse.json({ error: 'Production not found' }, { status: 404 });
  }

  const comments = db.comments.filter((c) => c.productionId === id);
  const auditLogs = db.auditLogs.filter((l) => l.productionId === id);
  const show = prod.showId ? db.shows.find((s) => s.id === prod.showId) : undefined;

  return NextResponse.json({
    production: prod,
    comments,
    auditLogs,
    show,
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }
  const { id } = await Promise.resolve(context.params);
  const body = await req.json();
  const { action, payload } = body;

  try {
    let updated;
    switch (action) {
      case 'COMPLETE_FILMING':
        updated = await completeFilmingStage(id, user);
        break;

      case 'COMPLETE_FILE_UPLOAD':
        updated = await completeFileUploadStage(id, payload, user);
        break;

      case 'COMPLETE_PRODUCER_PACKAGE':
        updated = await completeProducerPackageStage(id, payload, user);
        break;

      case 'SUBMIT_DRAFT':
        updated = await submitDraftForReview(
          id,
          payload.reviewLink,
          payload.editorNotes,
          user
        );
        break;

      case 'REVIEW_DRAFT':
        updated = await reviewDraft(
          id,
          payload.decision,
          payload.reviewNotes,
          user
        );
        break;

      case 'GIVE_FINAL_APPROVAL':
        updated = await giveFinalApproval(id, user);
        break;

      case 'COMPLETE_FINAL_UPLOAD':
        updated = await completeFinalUpload(id, payload, user);
        break;

      case 'MARK_PUBLISHED':
        updated = await markPublished(id, payload, user);
        break;

      case 'UPDATE_RENTAL_STEP':
        updated = await updateRentalStep(id, payload.step, payload, user);
        break;

      case 'REASSIGN_EDITOR':
        updated = await reassignProductionEditor(
          id,
          payload?.editorId || body.editorId || payload?.targetEditorId || body.targetEditorId,
          payload?.editingDate || body.editingDate,
          user
        );
        break;

      case 'RESCHEDULE_FILMING':
        updated = await rescheduleProductionFilming(
          id,
          payload?.filmingDate || body.filmingDate,
          payload?.filmingTime || body.filmingTime,
          user
        );
        break;

      case 'MODIFY_PRODUCTION':
        updated = await modifyScheduledProduction(id, payload || body.updates || body, user);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, production: updated });
  } catch (err: any) {
    const status = err.message?.includes('Unauthorized') || err.message?.includes('Forbidden') ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Action failed' }, { status });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }
  const { id } = await Promise.resolve(context.params);
  try {
    const result = await deleteProduction(id, user);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to remove production' }, { status });
  }
}
