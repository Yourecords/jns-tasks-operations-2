'use client';

import React from 'react';
import { Check, ArrowRight, X, Clock, Play } from 'lucide-react';
import { Production, WorkflowStage } from '@/lib/types';

interface WorkflowBreadcrumbProps {
  production: Production;
}

export default function WorkflowBreadcrumb({ production }: WorkflowBreadcrumbProps) {
  if (production.type === 'RENTAL') {
    const rentalStages: { key: string; label: string }[] = [
      { key: 'RENTAL_SCHEDULED', label: '1. Scheduled' },
      { key: 'RECORDING_DONE', label: '2. Recording Completed' },
      { key: 'FILES_UPLOADED', label: '3. Files Uploaded' },
      { key: 'LINK_SENT_TO_CLIENT', label: '4. Link Sent to Client' },
      { key: 'BILLING_SENT_TO_FINANCE', label: '5. Finance Details Sent' },
      { key: 'COMPLETED', label: '6. Rental Completed' },
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
                >
                  {isCompleted ? (
                    <Check size={13} color="#86efac" />
                  ) : isActive ? (
                    <Play size={13} color="var(--jns-gold)" fill="var(--jns-gold)" />
                  ) : (
                    <Clock size={13} color="var(--text-muted)" />
                  )}
                  <span>{stage.label}</span>
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
  const steps: { label: string; state: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'REVISION_REQ' }[] = [];

  // 1. Filming
  const filmingDone =
    production.currentStage !== 'FILMING';
  steps.push({
    label: 'FILMING',
    state: filmingDone ? 'COMPLETED' : 'ACTIVE',
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
        });
        steps.push({
          label: `REV ${rev.draftNumber} REQUIRED`,
          state: 'REVISION_REQ',
        });
      } else if (rev.decision === 'APPROVED') {
        steps.push({
          label: `DRAFT ${rev.draftNumber}`,
          state: 'COMPLETED',
        });
      } else if (rev.status === 'READY_FOR_REVIEW') {
        steps.push({
          label: `DRAFT ${rev.draftNumber} REVIEW`,
          state: 'ACTIVE',
        });
      } else {
        steps.push({
          label: `DRAFT ${rev.draftNumber}`,
          state: 'ACTIVE',
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
  });

  return (
    <div className="workflow-timeline-box">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Workflow Pipeline Timeline
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--jns-gold)' }}>
          Current Step: {production.currentStage.replace(/_/g, ' ')}
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
              <div className={`timeline-step ${stepClass}`}>
                <Icon size={13} color={iconColor} />
                <span>{step.label}</span>
              </div>
              {idx < steps.length - 1 && <span className="timeline-arrow">→</span>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
