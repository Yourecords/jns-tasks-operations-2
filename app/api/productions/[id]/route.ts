import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
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
} from '@/lib/workflow';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === params.id);
  if (!prod) {
    return NextResponse.json({ error: 'Production not found' }, { status: 404 });
  }

  const comments = db.comments.filter((c) => c.productionId === params.id);
  const auditLogs = db.auditLogs.filter((l) => l.productionId === params.id);
  const show = prod.showId ? db.shows.find((s) => s.id === prod.showId) : undefined;

  return NextResponse.json({
    production: prod,
    comments,
    auditLogs,
    show,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }
  const body = await req.json();
  const { action, payload } = body;

  try {
    let updated;
    switch (action) {
      case 'COMPLETE_FILMING':
        updated = completeFilmingStage(params.id, user);
        break;

      case 'COMPLETE_FILE_UPLOAD':
        updated = completeFileUploadStage(params.id, payload, user);
        break;

      case 'COMPLETE_PRODUCER_PACKAGE':
        updated = completeProducerPackageStage(params.id, payload, user);
        break;

      case 'SUBMIT_DRAFT':
        updated = submitDraftForReview(
          params.id,
          payload.reviewLink,
          payload.editorNotes,
          user
        );
        break;

      case 'REVIEW_DRAFT':
        updated = reviewDraft(
          params.id,
          payload.decision,
          payload.reviewNotes,
          user
        );
        break;

      case 'GIVE_FINAL_APPROVAL':
        updated = giveFinalApproval(params.id, user);
        break;

      case 'COMPLETE_FINAL_UPLOAD':
        updated = completeFinalUpload(params.id, payload, user);
        break;

      case 'MARK_PUBLISHED':
        updated = markPublished(params.id, payload, user);
        break;

      case 'UPDATE_RENTAL_STEP':
        updated = updateRentalStep(params.id, payload.step, payload, user);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, production: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }
  try {
    const result = deleteProduction(params.id, user);
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to remove production' }, { status });
  }
}

