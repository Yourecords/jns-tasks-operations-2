'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Camera,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Plus,
  Lock,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  Package,
  Calendar,
  ExternalLink,
  RotateCcw,
  Trash2,
  X,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { useUser } from '@/components/UserContext';
import { GearItem, GearCheckoutRecord, GearCategory, GearCondition } from '@/lib/types';
import { exportGearInventoryToExcel } from '@/lib/excel-export';
import WhatsAppShareButton from '@/components/WhatsAppShareButton';

const CATEGORIES: GearCategory[] = [
  'Camera',
  'Lens',
  'Audio',
  'Lighting',
  'Grip & Support',
  'Monitor',
  'Wireless & Transmission',
  'Accessories',
];

export default function GearLogPage() {
  const { currentUser, allUsers } = useUser();
  const [inventory, setInventory] = useState<GearItem[]>([]);
  const [checkouts, setCheckouts] = useState<GearCheckoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & view state
  const [activeTab, setActiveTab] = useState<'ACTIVE_LOANS' | 'INVENTORY' | 'HISTORY'>('ACTIVE_LOANS');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Checkout modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedGearId, setSelectedGearId] = useState('');
  const [checkoutBorrowerId, setCheckoutBorrowerId] = useState('');
  const [checkoutProject, setCheckoutProject] = useState('');
  const [checkoutReturnDate, setCheckoutReturnDate] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Checkin modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnTargetRecord, setReturnTargetRecord] = useState<GearCheckoutRecord | null>(null);
  const [returnCondition, setReturnCondition] = useState<GearCondition>('GOOD');
  const [returnNotes, setReturnNotes] = useState('');

  // Add Item modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GearCategory>('Camera');
  const [newItemModel, setNewItemModel] = useState('');
  const [newItemSerial, setNewItemSerial] = useState('');
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemCondition, setNewItemCondition] = useState<GearCondition>('MINT');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Delete Item modal
  const [deleteItemTarget, setDeleteItemTarget] = useState<GearItem | null>(null);
  const [deleteItemLoading, setDeleteItemLoading] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState('');

  // Highlight newly added or modified item
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [isExportingGear, setIsExportingGear] = useState(false);

  const isAuthorized =
    currentUser?.role === 'ADMIN' ||
    currentUser?.jobFunction === 'STUDIO_OPERATOR' ||
    currentUser?.id === 'usr_yuri_admin' ||
    currentUser?.id === 'usr_ahron_studio';

  const fetchGear = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gear', {
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.status === 403) {
        setErrorMsg('Access denied: Equipment Checkout & Studio Gear Log is confidential and visible only to Yuri and Ahron.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInventory(data.gearInventory || []);
      setCheckouts(data.gearCheckouts || []);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load gear log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGear();
  }, [currentUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'INVENTORY' || tabParam === 'HISTORY' || tabParam === 'ACTIVE_LOANS') {
        setActiveTab(tabParam as any);
      }
      if (params.get('modal') === 'removeItem' && inventory.length > 0 && !deleteItemTarget) {
        const item = inventory.find((g) => g.status === 'AVAILABLE') || inventory[0];
        if (item) setDeleteItemTarget(item);
      }
    }
  }, [inventory]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await fetch('/api/gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({
          action: 'CHECKOUT',
          gearItemId: selectedGearId,
          checkedOutToUserId: checkoutBorrowerId,
          projectOrShowName: checkoutProject,
          expectedReturnDate: checkoutReturnDate,
          checkoutNotes: checkoutNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(data.message || 'Gear checked out successfully.');
      setIsCheckoutModalOpen(false);
      setSelectedGearId('');
      setCheckoutBorrowerId('');
      setCheckoutProject('');
      setCheckoutReturnDate('');
      setCheckoutNotes('');
      fetchGear();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!deleteItemTarget || !currentUser) return;
    setDeleteItemLoading(true);
    setDeleteItemError('');
    try {
      const res = await fetch(`/api/gear?id=${deleteItemTarget.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove item');
      setSuccessMsg(`Removed "${deleteItemTarget.name}" from studio inventory.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      const targetId = deleteItemTarget.id;
      setDeleteItemTarget(null);
      if (data.gearInventory && Array.isArray(data.gearInventory)) {
        setInventory(data.gearInventory);
      } else {
        setInventory((prev) => prev.filter((i) => i.id !== targetId));
      }
      fetchGear();
    } catch (err: any) {
      setDeleteItemError(err.message);
    } finally {
      setDeleteItemLoading(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !returnTargetRecord) return;
    try {
      const res = await fetch('/api/gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({
          action: 'CHECKIN',
          checkoutId: returnTargetRecord.id,
          returnCondition: returnCondition,
          returnNotes: returnNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(data.message || 'Gear returned and restored to inventory.');
      setIsReturnModalOpen(false);
      setReturnTargetRecord(null);
      setReturnNotes('');
      fetchGear();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await fetch('/api/gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({
          action: 'ADD_ITEM',
          name: newItemName,
          category: newItemCategory,
          model: newItemModel,
          serialNumber: newItemSerial,
          barcode: newItemBarcode,
          location: newItemLocation,
          condition: newItemCondition,
          notes: newItemNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(data.message || 'Item added to inventory.');
      setTimeout(() => setSuccessMsg(''), 5000);
      setIsAddItemModalOpen(false);
      setNewItemName('');
      setNewItemModel('');
      setNewItemSerial('');
      setNewItemBarcode('');
      setNewItemLocation('');
      setNewItemNotes('');

      // 1. Immediately update local inventory state so item appears without delay
      if (data.gearInventory && Array.isArray(data.gearInventory)) {
        setInventory(data.gearInventory);
      } else if (data.item) {
        setInventory((prev) => [data.item, ...prev.filter((i) => i.id !== data.item.id)]);
      }

      // 2. Automatically switch to Equipment Inventory tab
      setActiveTab('INVENTORY');

      // 3. Clear filters so the newly added item is not filtered out
      setCategoryFilter('ALL');
      setStatusFilter('ALL');
      setSearchQuery('');

      // 4. Highlight the newly added item row
      if (data.item?.id) {
        setHighlightedItemId(data.item.id);
        setTimeout(() => setHighlightedItemId(null), 5000);
      }

      fetchGear();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportGear = async () => {
    setIsExportingGear(true);
    try {
      await exportGearInventoryToExcel({
        includeInventory: true,
        includeActiveLoans: true,
        includeHistory: true,
        inventory,
        checkouts,
      });
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExportingGear(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="empty-state-box" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '1.25rem' }}>
          <Lock size={28} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Confidential Access Restricted
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '14px', lineHeight: 1.5 }}>
          The Equipment Checkout & Studio Gear Log is strictly restricted to Yuri (Director / Admin) and Ahron (Studio Operator).
        </p>
        <Link href="/" className="btn btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const activeLoans = checkouts.filter((c) => !c.isReturned);
  const returnedLoans = checkouts.filter((c) => c.isReturned);
  const overdueLoans = activeLoans.filter((c) => c.expectedReturnDate < todayStr);

  const availableItems = inventory.filter((g) => g.status === 'AVAILABLE');
  const checkedOutItems = inventory.filter((g) => g.status === 'CHECKED_OUT');

  // Filter inventory
  const filteredInventory = inventory.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchModel = item.model.toLowerCase().includes(q);
      const matchSerial = item.serialNumber.toLowerCase().includes(q);
      const matchLoc = item.location.toLowerCase().includes(q);
      if (!matchName && !matchModel && !matchSerial && !matchLoc) return false;
    }
    return true;
  });

  return (
    <div className="gear-log-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <Lock size={11} /> Confidential • Yuri & Ahron Only
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Authorized: {currentUser?.name}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={26} color="var(--jns-gold)" />
            <span>Equipment Checkout & Studio Gear Log</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Track JNS cinema cameras, lenses, lighting, and wireless kits. Manage crew checkouts and return condition.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportGear}
            disabled={isExportingGear || inventory.length === 0}
            title="Export Equipment Registry and Loans to Excel (.xlsx)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Download size={14} />
            <span>{isExportingGear ? 'Exporting...' : 'Export to Excel'}</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsAddItemModalOpen(true)}
          >
            <Plus size={14} />
            <span>Add Equipment</span>
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (availableItems.length > 0) setSelectedGearId(availableItems[0].id);
              setIsCheckoutModalOpen(true);
            }}
          >
            <ArrowRightLeft size={14} />
            <span>Check Out Gear</span>
          </button>
        </div>
      </div>

      {/* Alert banners */}
      {successMsg && (
        <div className="alert-banner alert-banner-info" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: 'auto', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {errorMsg && (
        <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Gear Units</span>
            <Package size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {inventory.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Registered studio assets
          </div>
        </div>

        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Available in Studio</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {availableItems.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Ready on shelves & racks
          </div>
        </div>

        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active On Loan</span>
            <ArrowRightLeft size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
            {activeLoans.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            With crew or on field shoots
          </div>
        </div>

        <div className="metric-card" style={{ padding: '1rem 1.25rem', borderColor: overdueLoans.length > 0 ? '#ef4444' : undefined, backgroundColor: overdueLoans.length > 0 ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: overdueLoans.length > 0 ? '#ef4444' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Overdue Returns</span>
            <AlertTriangle size={16} color={overdueLoans.length > 0 ? '#ef4444' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: overdueLoans.length > 0 ? '#ef4444' : 'var(--text-main)', marginTop: '4px' }}>
            {overdueLoans.length}
          </div>
          <div style={{ fontSize: '11px', color: overdueLoans.length > 0 ? '#ef4444' : 'var(--text-muted)', marginTop: '2px' }}>
            {overdueLoans.length > 0 ? 'Immediate return required' : 'All checkouts on schedule'}
          </div>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`filter-tab ${activeTab === 'ACTIVE_LOANS' ? 'active' : ''}`}
          onClick={() => setActiveTab('ACTIVE_LOANS')}
        >
          Active Checkouts ({activeLoans.length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'INVENTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('INVENTORY')}
        >
          Studio Equipment Registry ({inventory.length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          Loan History ({returnedLoans.length})
        </button>
      </div>

      {/* TAB 1: ACTIVE LOANS */}
      {activeTab === 'ACTIVE_LOANS' && (
        <div className="section-panel">
          <div className="section-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-panel-title">
              <ArrowRightLeft size={16} color="var(--jns-gold)" />
              <span>Current Out-on-Loan Gear ({activeLoans.length})</span>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: 0 }}>
            {activeLoans.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>All Studio Equipment is Accounted For</p>
                <p style={{ fontSize: '12px' }}>No items are currently checked out on loan.</p>
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table" style={{ width: '100%', minWidth: '920px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Equipment Item</th>
                      <th style={{ width: '18%' }}>Checked Out To</th>
                      <th style={{ width: '18%' }}>Project / Shoot</th>
                      <th style={{ width: '9%' }}>Loaned</th>
                      <th style={{ width: '10%' }}>Return Due</th>
                      <th style={{ width: '8%' }}>Status</th>
                      <th style={{ width: '9%', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLoans.map((rec) => {
                      const isOverdue = rec.expectedReturnDate < todayStr;
                      const gear = inventory.find((g) => g.id === rec.gearItemId);
                      return (
                        <tr key={rec.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {rec.gearName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {gear?.category} • Serial: {gear?.serialNumber}
                            </div>
                            {rec.checkoutNotes && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>
                                &ldquo;{rec.checkoutNotes}&rdquo;
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {rec.checkedOutToName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {rec.checkedOutToEmail}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                              {rec.projectOrShowName || 'General Studio'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {new Date(rec.checkoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: isOverdue ? '#ef4444' : 'var(--text-main)',
                              }}
                            >
                              {rec.expectedReturnDate}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-chip ${
                                isOverdue ? 'status-blocked' : 'status-in-progress'
                              }`}
                              style={{ fontSize: '10px' }}
                            >
                              {isOverdue ? 'OVERDUE' : 'ON LOAN'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                              <WhatsAppShareButton
                                recipientName={rec.checkedOutToName.split(' ')[0]}
                                itemTitle={rec.gearName}
                                stageOrAction={`studio loan is due back on ${rec.expectedReturnDate}. Please return to the studio equipment room or confirm with Ahron/Yuri`}
                                size="xs"
                                variant="outline"
                                buttonLabel="Remind"
                              />
                              <button
                                className="btn btn-success btn-xs"
                                onClick={() => {
                                  setReturnTargetRecord(rec);
                                  setReturnCondition(gear?.condition || 'GOOD');
                                  setIsReturnModalOpen(true);
                                }}
                              >
                                <RotateCcw size={12} />
                                <span>Check In</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY REGISTRY */}
      {activeTab === 'INVENTORY' && (
        <div>
          {/* Filter / Search bar */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search gear by name, model, serial, barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '12px' }}
              />
            </div>

            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ fontSize: '12px', minWidth: '150px' }}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: '12px', minWidth: '140px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available Only</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          <div className="section-panel">
            <div className="section-panel-header">
              <div className="section-panel-title">
                <Package size={16} color="var(--jns-blue)" />
                <span>Equipment Inventory ({filteredInventory.length} items)</span>
              </div>
            </div>
            <div className="section-panel-body" style={{ padding: 0 }}>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '27%', padding: '0.65rem 0.5rem' }}>Item Name</th>
                      <th style={{ width: '10%', padding: '0.65rem 0.4rem' }}>Category</th>
                      <th style={{ width: '20%', padding: '0.65rem 0.4rem' }}>Model & Serial</th>
                      <th style={{ width: '15%', padding: '0.65rem 0.4rem' }}>Location</th>
                      <th style={{ width: '8%', padding: '0.65rem 0.4rem' }}>Condition</th>
                      <th style={{ width: '8%', padding: '0.65rem 0.4rem' }}>Status</th>
                      <th style={{ width: '12%', textAlign: 'right', padding: '0.65rem 0.5rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr
                        key={item.id}
                        style={
                          highlightedItemId === item.id
                            ? { backgroundColor: 'rgba(217, 119, 6, 0.18)', transition: 'background-color 0.5s ease' }
                            : undefined
                        }
                      >
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {item.name}
                          </div>
                          {item.notes && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <span className="status-chip status-not-started" style={{ fontSize: '10px' }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', fontFamily: 'monospace' }}>
                            {item.model}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            SN: {item.serialNumber} {item.barcode ? `• Barcode: ${item.barcode}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {item.location}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: item.condition === 'MINT' ? '#10b981' : item.condition === 'GOOD' ? '#3b82f6' : '#eab308',
                            }}
                          >
                            {item.condition}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <span
                            className={`status-chip ${
                              item.status === 'AVAILABLE'
                                ? 'status-completed'
                                : item.status === 'CHECKED_OUT'
                                ? 'status-waiting'
                                : 'status-revision'
                            }`}
                            style={{ fontSize: '10px' }}
                          >
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {item.status === 'AVAILABLE' ? (
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => {
                                  setSelectedGearId(item.id);
                                  setIsCheckoutModalOpen(true);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px' }}
                              >
                                <ArrowRightLeft size={11} />
                                <span>Check Out</span>
                              </button>
                            ) : item.status === 'CHECKED_OUT' ? (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '3px 6px' }}>
                                On Loan
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#f59e0b', padding: '3px 6px' }}>
                                Maintenance
                              </span>
                            )}

                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              disabled={item.status === 'CHECKED_OUT'}
                              onClick={() => {
                                setDeleteItemError('');
                                setDeleteItemTarget(item);
                              }}
                              title={
                                item.status === 'CHECKED_OUT'
                                  ? 'Item is currently checked out on loan. Check in first to remove.'
                                  : `Remove ${item.name}`
                              }
                              style={{
                                borderColor: item.status === 'CHECKED_OUT' ? 'transparent' : 'rgba(239, 68, 68, 0.4)',
                                color: item.status === 'CHECKED_OUT' ? 'var(--text-muted)' : '#f87171',
                                backgroundColor: item.status === 'CHECKED_OUT' ? 'transparent' : 'rgba(239, 68, 68, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                opacity: item.status === 'CHECKED_OUT' ? 0.4 : 1,
                                cursor: item.status === 'CHECKED_OUT' ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOAN HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <div className="section-panel-title">
              <Clock size={16} color="var(--jns-gold)" />
              <span>Past Checkout Records ({returnedLoans.length})</span>
            </div>
          </div>
          <div className="section-panel-body" style={{ padding: 0 }}>
            {returnedLoans.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No completed returns on record.
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Borrower</th>
                      <th>Project</th>
                      <th>Checked Out</th>
                      <th>Returned Date</th>
                      <th>Return Condition</th>
                      <th>Return Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnedLoans.map((rec) => (
                      <tr key={rec.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {rec.gearName}
                        </td>
                        <td>
                          <div>{rec.checkedOutToName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>By: {rec.checkedOutByName}</div>
                        </td>
                        <td style={{ fontSize: '12px' }}>{rec.projectOrShowName || 'General'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(rec.checkoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                          {rec.actualReturnDate ? new Date(rec.actualReturnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : rec.expectedReturnDate}
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>
                            {rec.returnCondition || 'GOOD'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {rec.returnNotes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CHECKOUT MODAL                                            */}
      {/* ========================================================= */}
      {isCheckoutModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCheckoutModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRightLeft size={18} color="var(--jns-gold)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Check Out Studio Equipment
                </h3>
              </div>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setIsCheckoutModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">
                  Equipment Item <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedGearId}
                  onChange={(e) => setSelectedGearId(e.target.value)}
                  required
                >
                  <option value="">Select available equipment...</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category} • {item.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Check Out To (Team Member) <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={checkoutBorrowerId}
                  onChange={(e) => setCheckoutBorrowerId(e.target.value)}
                  required
                >
                  <option value="">Select crew member...</option>
                  {allUsers.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.name} ({u.positionDisplay || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Project / Show Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Defense Summit Field Shoot"
                    value={checkoutProject}
                    onChange={(e) => setCheckoutProject(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Expected Return Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkoutReturnDate}
                    onChange={(e) => setCheckoutReturnDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kit Contents / Checkout Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Packed in Pelican case with 3x batteries, dual charger, and 128GB SD card."
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCheckoutModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={15} />
                  <span>Authorize Checkout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CHECKIN / RETURN MODAL                                    */}
      {/* ========================================================= */}
      {isReturnModalOpen && returnTargetRecord && (
        <div className="modal-overlay" onClick={() => setIsReturnModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={18} color="#10b981" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Check In Equipment to Studio
                </h3>
              </div>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setIsReturnModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                  {returnTargetRecord.gearName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Returned by: <strong>{returnTargetRecord.checkedOutToName}</strong> • Loaned on {new Date(returnTargetRecord.checkoutDate).toLocaleDateString()}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Return Condition <span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as GearCondition)}
                  required
                >
                  <option value="MINT">Mint (Clean, no scuffs, fully working)</option>
                  <option value="GOOD">Good (Normal cosmetic wear, fully working)</option>
                  <option value="FAIR">Fair (Heavy wear, operable)</option>
                  <option value="NEEDS_REPAIR">Needs Repair (Sent to maintenance)</option>
                  <option value="DAMAGED">Damaged / Missing Parts</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Check-In Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. All cables and lens caps returned. Batteries recharged."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsReturnModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  <CheckCircle2 size={15} />
                  <span>Confirm Return to Studio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD GEAR ITEM MODAL                                       */}
      {/* ========================================================= */}
      {isAddItemModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddItemModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--jns-gold)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Register New Studio Equipment
                </h3>
              </div>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setIsAddItemModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">
                  Item Display Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sony FX6 Cinema Camera (Kit C)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                >
                </input>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Category <span className="req">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as GearCategory)}
                    required
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Manufacturer / Model <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ILME-FX6VK"
                    value={newItemModel}
                    onChange={(e) => setNewItemModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Serial Number <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="SN-1234567"
                    value={newItemSerial}
                    onChange={(e) => setNewItemSerial(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Barcode / Asset Tag</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="JNS-CAM-05"
                    value={newItemBarcode}
                    onChange={(e) => setNewItemBarcode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Studio Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Studio Rack 2 / Shelf B"
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select
                    className="form-select"
                    value={newItemCondition}
                    onChange={(e) => setNewItemCondition(e.target.value as GearCondition)}
                  >
                    <option value="MINT">Mint</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="NEEDS_REPAIR">Needs Repair</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Included Accessories & Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="Included cables, hard cases, lenses, batteries..."
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddItemModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={15} />
                  <span>Register Equipment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE GEAR ITEM CONFIRMATION MODAL */}
      {deleteItemTarget && (
        <div className="modal-overlay" onClick={() => setDeleteItemTarget(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <AlertTriangle size={18} />
                <span>Remove Equipment Item</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteItemTarget(null)}
                disabled={deleteItemLoading}
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deleteItemError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '12px',
                }}>
                  {deleteItemError}
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--jns-gold)' }}>{deleteItemTarget.name}</strong> from the studio equipment inventory?
              </p>

              <div style={{
                background: '#0b1120',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                display: 'grid',
                gridTemplateColumns: '100px 1fr',
                rowGap: '6px',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Item:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{deleteItemTarget.name}</span>

                <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                <span style={{ color: '#93c5fd' }}>{deleteItemTarget.category}</span>

                <span style={{ color: 'var(--text-muted)' }}>Model:</span>
                <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{deleteItemTarget.model}</span>

                <span style={{ color: 'var(--text-muted)' }}>Serial Number:</span>
                <span style={{ color: 'var(--text-light)', fontFamily: 'monospace' }}>
                  {deleteItemTarget.serialNumber} {deleteItemTarget.barcode ? `(${deleteItemTarget.barcode})` : ''}
                </span>

                <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{deleteItemTarget.location}</span>

                <span style={{ color: 'var(--text-muted)' }}>Condition:</span>
                <span style={{ color: deleteItemTarget.condition === 'MINT' ? '#10b981' : '#3b82f6' }}>
                  {deleteItemTarget.condition}
                </span>
              </div>

              <div style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: '1.4',
                padding: '8px 10px',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: '6px',
              }}>
                <strong>Notice:</strong> Removing this item permanently purges it from studio inventory and loan availability. Historical check-in logs remain intact for auditing.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteItemTarget(null)}
                disabled={deleteItemLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteItem}
                disabled={deleteItemLoading}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>{deleteItemLoading ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
