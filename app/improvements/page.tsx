'use client';
import Attachments from '@/components/Attachments';

import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  AlertCircle,
  Plus,
  ShieldCheck,
  User,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldOff
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { Improvement, AnonymousProblemReport } from '@/lib/types';
import QuickActionModal from '@/components/QuickActionModal';

export default function ImprovementsPage() {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<'IMPROVEMENTS' | 'PROBLEMS'>('IMPROVEMENTS');
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [problems, setProblems] = useState<AnonymousProblemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('IMPROVEMENT');

  const fetchData = async () => {
    try {
      const [iRes, pRes] = await Promise.all([
        fetch('/api/improvements'),
        fetch('/api/problem-reports'),
      ]);
      const [iData, pData] = await Promise.all([iRes.json(), pRes.json()]);
      if (iData.improvements) setImprovements(iData.improvements);
      if (pData.problemReports) setProblems(pData.problemReports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Production Operations & Continuous Improvement
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Constructive workflow suggestions and anonymous problem reports with required solutions
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setModalTab('IMPROVEMENT');
              setModalOpen(true);
            }}
          >
            <Lightbulb size={14} />
            <span>Suggest Improvement</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setModalTab('PROBLEM');
              setModalOpen(true);
            }}
          >
            <AlertCircle size={14} color="#fca5a5" />
            <span>Report Workflow Problem</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="filter-bar">
        <button
          className={`filter-tab ${activeTab === 'IMPROVEMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('IMPROVEMENTS')}
        >
          Constructive Improvements ({improvements.length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'PROBLEMS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PROBLEMS')}
        >
          Workflow Problems & Solutions ({problems.length})
        </button>
      </div>

      {/* TAB 1: CONSTRUCTIVE IMPROVEMENTS */}
      {activeTab === 'IMPROVEMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {improvements.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No improvement suggestions submitted yet.
            </div>
          ) : (
            improvements.map((imp) => (
              <div key={imp.id} className="section-panel" style={{ marginBottom: 0 }}>
                <div className="section-panel-header">
                  <div className="section-panel-title">
                    <Lightbulb size={16} color="var(--jns-gold)" />
                    <span>{imp.title}</span>
                    <span className="status-chip status-not-started" style={{ fontSize: '10px', marginLeft: '0.4rem' }}>
                      {imp.category}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Author: <strong style={{ color: 'var(--text-main)' }}>{imp.authorName}</strong> • {new Date(imp.createdAt).toLocaleDateString()}
                    </span>
                    <span className="status-chip status-approved">{imp.status}</span>
                  </div>
                </div>

                <Attachments kind="improvement" target={imp.id} />
                <div className="section-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '13px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px' }}>
                      Current Situation / Problem:
                    </strong>
                    <p style={{ color: 'var(--text-light)', marginTop: '2px' }}>{imp.currentSituation}</p>
                  </div>

                  <div>
                    <strong style={{ color: 'var(--jns-gold)', textTransform: 'uppercase', fontSize: '11px' }}>
                      Suggested Improvement:
                    </strong>
                    <p style={{ color: 'var(--text-main)', marginTop: '2px', fontWeight: 500 }}>{imp.suggestedImprovement}</p>
                  </div>

                  <div>
                    <strong style={{ color: '#86efac', textTransform: 'uppercase', fontSize: '11px' }}>
                      Why This Would Help:
                    </strong>
                    <p style={{ color: 'var(--text-light)', marginTop: '2px' }}>{imp.whyHelpful}</p>
                  </div>

                  {imp.referenceLinks && imp.referenceLinks.length > 0 && (
                    <div style={{ fontSize: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>References: </span>
                      {imp.referenceLinks.map((link, idx) => (
                        <a key={idx} href={link} target="_blank" rel="noreferrer" style={{ color: 'var(--jns-blue)', marginRight: '0.5rem' }}>
                          {link} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: WORKFLOW PROBLEMS & SOLUTIONS (Anonymous Option) */}
      {activeTab === 'PROBLEMS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid #3b82f6',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--text-light)',
            }}
          >
            <strong>Airtight Anonymity Guarantee:</strong> Anonymous problem reports are strictly decoupled from author user metadata. Neither Administrators nor Producers have access to the identity of the submitter. Every report is paired with a required constructive solution.
          </div>

          {problems.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No workflow problem reports submitted.
            </div>
          ) : (
            problems.map((prob) => (
              <div key={prob.id} className="section-panel" style={{ marginBottom: 0 }}>
                <div className="section-panel-header">
                  <div className="section-panel-title">
                    <AlertCircle size={16} color="#ef4444" />
                    <span>{prob.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '11px',
                        color: 'var(--jns-gold)',
                        backgroundColor: 'rgba(229, 169, 60, 0.15)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                      }}
                    >
                      <ShieldCheck size={12} />
                      <span>Verified Anonymous Submitter</span>
                    </span>
                    <span className="status-chip status-waiting">{prob.status}</span>
                  </div>
                </div>

                <div className="section-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '13px' }}>
                  <div>
                    <strong style={{ color: '#fca5a5', textTransform: 'uppercase', fontSize: '11px' }}>
                      Describe the Problem:
                    </strong>
                    <p style={{ color: 'var(--text-light)', marginTop: '2px' }}>{prob.problemDescription}</p>
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px' }}>
                      How Does It Affect the Work?
                    </strong>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{prob.impactDescription}</p>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'rgba(22, 101, 52, 0.15)',
                      border: '1px solid #16a34a',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.65rem 0.85rem',
                    }}
                  >
                    <strong style={{ color: '#86efac', textTransform: 'uppercase', fontSize: '11px' }}>
                      Proposed Constructive Solution (Mandatory):
                    </strong>
                    <p style={{ color: 'var(--text-main)', marginTop: '2px', fontWeight: 600 }}>
                      {prob.suggestedSolution}
                    </p>
                  </div>

                  {prob.referenceLinks && prob.referenceLinks.length > 0 && (
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>References: </span>
                      {prob.referenceLinks.map((link, idx) => (
                        <a key={idx} href={link} target="_blank" rel="noreferrer" style={{ color: 'var(--jns-blue)', marginRight: '0.5rem' }}>
                          {link} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <QuickActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
