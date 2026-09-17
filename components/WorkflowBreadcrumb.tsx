'use client';

import React from 'react';
import { Check, ArrowRight, X, Clock, Play } from 'lucide-react';
import { Production, WorkflowStage } from '@/lib/types';

interface WorkflowBreadcrumbProps {
  production: Production;
}

export default function WorkflowBreadcrumb({ production }: WorkflowBreadcrumbProps) {
  const formatTime = (isoString?: string) => {
    if (!isoString) return undefined;
    if (isoString.includes(' at ')) {
      const [datePart, timePart] = isoString.split(' at ');
      const d = new Date(datePart);
      if (!isNaN(d.getTime())) {
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${dateStr}, ${timePart} IDT`;
      }
      return isoString;
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const hasTime = isoString.includes('T') || isoString.includes(':');
    if (!hasTime) return dateStr;
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dateStr}, ${timeStr} IDT`;
  };

  if (production.type === 'RENTAL') {
    const rentalStages: { key: string; label: string; submissionTime?: string }[] = [
      { key: 'RENTAL_SCHEDULED', label: '1. Scheduled', submissionTime: formatTime(production.createdAt) },
      { key: 'RECORDING_DONE', label: '2. Recording Completed', submissionTime: production.currentStage !== 'RENTAL_SCHEDULED' ? (production.filmingDate ? `${production.filmingDate}${production.filmingTime ? ` at ${production.filmingTime}` : ''}` : formatTime(production.updatedAt)) : undefined },
      { key: 'FILES_UPLOADED', label: '3. Files Uploaded', submissionTime: production.fileUploadRecord?.completedAt ? formatTime(production.fileUploadRecord.completedAt) : (production.currentStage !== 'RENTAL_SCHEDULED' && production.currentStage !== 'RECORDING_DONE' ? formatTime(production.updatedAt) : undefined) },
      { key: 'LINK_SENT_TO_CLIENT', label: '4. Link Sent to Client', submissionTime: production.rentalDetails?.clientLink ? formatTime(production.updatedAt) : undefined },
      { key: 'BILLING_SENT_TO_FINANCE', label: '5. Finance Details Sent', submissionTime: production.rentalDetails?.financeSentDate ? formatTime(production.rentalDetails.financeSentDate) : undefined },
      { key: 'COMPLETED', label: '6. Rental Completed', submissionTime: production.status === 'COMPLETED' ? formatTime(production.updatedAt) : undefined },
    ];

    const currentIdx = rentalStages.findIndex((s) => s.key === production.currentStage);

    return (
      <div className="workflow-timeline-box">
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Studio Rental Operations Progression
        </div>
        <div className="timeline-steps">
          {rentalStages.map((stage, idx) => {
            const isCompleted = idx < currentIdx || production.status === 'COMPLETED';
            const isActive = idx === currentIdx && production.status !== 'COMPLETED';

            return (
              <React.Fragment key={stage.key}>
                <div
                  className={`timeline-step ${
                    isCompleted ? 'completed' : isActive ? 'active' : ''
                  }`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {isCompleted ? (
                      <Check size={13} color="#86efac" />
                    ) : isActive ? (
                      <Play size={13} color="var(--jns-gold)" fill="var(--jns-gold)" />
                    ) : (
                      <Clock size={13} color="var(--text-muted)" />
                    )}
                    <span>{stage.label}</span>
                  </div>
                  {isCompleted && stage.submissionTime && (
                    <span style={{ fontSize: '9.5px', color: '#86efac', marginTop: '2px', fontWeight: 600, paddingLeft: '18px' }}>
                      ✓ {stage.submissionTime}
                    </span>
                  )}
                  {isActive && (
                    <span style={{ fontSize: '9.5px', color: 'var(--jns-gold)', marginTop: '2px', fontWeight: 600, paddingLeft: '18px' }}>
                      ● In progress
                    </span>
                  )}
                </div>
                {idx < rentalStages.length - 1 && <span className="timeline-arrow">→</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Episode or Pilot workflow
  // Dynamic steps including revision cycles
  const steps: {
    label: string;
    state: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'REVISION_REQ';
    roleRequired?: string;
    submissionTime?: string;
  }[] = [];

  // 1. Filming (Confirmed by Studio Operator or Admin, not by Producer)
  const filmingTask = production.tasks?.find((t) => t.stageName === 'FILMING');
  const filmingDone = production.currentStage !== 'FILMING';
  steps.push({
    label: 'FILMING',
    roleRequired: 'Studio / Admin',
    state: filmingDone ? 'COMPLETED' : 'ACTIVE',
    submissionTime: filmingDone
      ? filmingTask?.completedAt
        ? formatTime(filmingTask.completedAt)
        : production.filmingDate
        ? `${production.filmingDate}${production.filmingTime ? ` at ${production.filmingTime}` : ''}`
        : undefined
      : undefined,
  });

  // 2. Files Uploaded
  const filesUploadedDone =
    filmingDone && production.currentStage !== 'FILES_UPLOADED';
  steps.push({
    label: 'FILES UPLOADED',
    state: filesUploadedDone
      ? 'COMPLETED'
      : production.currentStage === 'FILES_UPLOADED'
      ? 'ACTIVE'
      : 'PENDING',
    submissionTime:
      filesUploadedDone
        ? formatTime(production.fileUploadRecord?.completedAt || production.updatedAt)
        : undefined,
  });

  // 3. Producer Notes
  const pkgDone =
    filesUploadedDone && production.currentStage !== 'PRODUCER_PACKAGE';
  steps.push({
    label: 'PRODUCER NOTES + B-ROLL',
    state: pkgDone
      ? 'COMPLETED'
      : production.currentStage === 'PRODUCER_PACKAGE'
      ? 'ACTIVE'
      : 'PENDING',
    submissionTime:
      pkgDone
        ? formatTime(production.producerPackage?.completedAt || production.updatedAt)
        : undefined,
  });

  // 4. Draft cycles
  if (production.revisionCycles.length === 0) {
    steps.push({
      label: 'DRAFT 1',
      state: production.currentStage === 'EDITING' ? 'ACTIVE' : 'PENDING',
    });
  } else {
    production.revisionCycles.forEach((rev) => {
      if (rev.decision === 'REVISION_REQUIRED') {
        steps.push({
          label: `DRAFT ${rev.draftNumber}`,
          state: 'COMPLETED',
          submissionTime: rev.submittedAt ? formatTime(rev.submittedAt) : undefined,
        });
        steps.push({
          label: `REV ${rev.draftNumber} REQUIRED`,
          state: 'REVISION_REQ',
          submissionTime: rev.reviewedAt ? formatTime(rev.reviewedAt) : undefined,
        });
      } else if (rev.decision === 'APPROVED') {
        steps.push({
          label: `DRAFT ${rev.draftNumber}`,
          state: 'COMPLETED',
          submissionTime: rev.submittedAt ? formatTime(rev.submittedAt) : undefined,
        });
      } else if (rev.status === 'READY_FOR_REVIEW') {
        steps.push({
          label: `DRAFT ${rev.draftNumber} REVIEW`,
          state: 'ACTIVE',
          submissionTime: rev.submittedAt ? formatTime(rev.submittedAt) : undefined,
        });
      } else {
        steps.push({
          label: `DRAFT ${rev.draftNumber}`,
          state: 'ACTIVE',
          submissionTime: rev.submittedAt ? formatTime(rev.submittedAt) : undefined,
        });
      }
    });
  }

  // 5. Final Approval
  const finalAppDone =
    production.currentStage === 'FINAL_UPLOAD' ||
    production.currentStage === 'PUBLISHED' ||
    production.status === 'COMPLETED';
  steps.push({
    label: 'FINAL APPROVAL',
    state: finalAppDone
      ? 'COMPLETED'
      : production.currentStage === 'FINAL_APPROVAL'
      ? 'ACTIVE'
      : 'PENDING',
    submissionTime:
      finalAppDone && production.finalApprovedAt
        ? formatTime(production.finalApprovedAt)
        : undefined,
  });

  // 6. Final Upload
  const finalUploadDone =
    production.currentStage === 'PUBLISHED' || production.status === 'COMPLETED';
  steps.push({
    label: 'FINAL UPLOAD (YT & DROPBOX)',
    state: finalUploadDone
      ? 'COMPLETED'
      : production.currentStage === 'FINAL_UPLOAD'
      ? 'ACTIVE'
      : 'PENDING',
    submissionTime: finalUploadDone ? formatTime(production.publishedAt || production.updatedAt) : undefined,
  });

  // 7. Published
  const publishedDone = production.status === 'COMPLETED';
  steps.push({
    label: 'PUBLISHED',
    state: publishedDone
      ? 'COMPLETED'
      : production.currentStage === 'PUBLISHED'
      ? 'ACTIVE'
      : 'PENDING',
    submissionTime:
      publishedDone && production.publishedAt
        ? formatTime(production.publishedAt)
        : undefined,
  });

  return (
    <div className="workflow-timeline-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Workflow Pipeline Timeline
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--jns-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Current Step: {production.currentStage.replace(/_/g, ' ')}</span>
          {production.currentStage === 'FILMING' && (
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '1px 7px', borderRadius: '4px' }}>
              Confirmed by Studio Operator or Admin
            </span>
          )}
        </div>
      </div>

      <div className="timeline-steps">
        {steps.map((step, idx) => {
          let stepClass = '';
          let Icon = Clock;
          let iconColor = 'var(--text-muted)';

          if (step.state === 'COMPLETED') {
            stepClass = 'completed';
            Icon = Check;
            iconColor = '#86efac';
          } else if (step.state === 'ACTIVE') {
            stepClass = 'active';
            Icon = Play;
            iconColor = 'var(--jns-gold)';
          } else if (step.state === 'REVISION_REQ') {
            stepClass = 'rev-req';
            Icon = X;
            iconColor = '#f472b6';
          }

          return (
            <React.Fragment key={`${step.label}-${idx}`}>
              <div
                className={`timeline-step ${stepClass}`}
                title={step.roleRequired ? `Confirmed by: ${step.roleRequired}` : undefined}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon size={13} color={iconColor} />
                  <span>{step.label}</span>
                  {step.roleRequired && (
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: step.state === 'ACTIVE' ? 'var(--jns-gold)' : 'var(--text-muted)',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                        marginLeft: '2px',
                      }}
                    >
                      {step.roleRequired}
                    </span>
                  )}
                </div>
                {step.submissionTime && (
                  <span style={{ fontSize: '9.5px', color: step.state === 'COMPLETED' ? '#86efac' : '#94a3b8', marginTop: '2px', fontWeight: 600, paddingLeft: '18px' }}>
                    ✓ {step.submissionTime}
                  </span>
                )}
                {step.state === 'ACTIVE' && (
                  <span style={{ fontSize: '9.5px', color: 'var(--jns-gold)', marginTop: '2px', fontWeight: 600, paddingLeft: '18px' }}>
                    ● In progress
                  </span>
                )}
              </div>
              {idx < steps.length - 1 && <span className="timeline-arrow">→</span>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
