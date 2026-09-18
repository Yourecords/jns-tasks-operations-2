'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  Phone,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Navigation,
  Shield,
  DollarSign,
  User as UserIcon,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Film,
  Building,
  Settings,
  Check,
} from 'lucide-react';
import { TaxiRide, TaxiStatus, TaxiVehicleType, TaxiDirection, TaxiPassengerRole } from '@/lib/types';
import { useUser } from '@/components/UserContext';
import { canManageTaxis } from '@/lib/utils';

const PRESET_ADDRESSES = [
  { name: 'JNS Jerusalem Studio', address: 'JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem' },
  { name: 'King David Hotel', address: 'King David Hotel, King David St 23, Jerusalem' },
  { name: 'Orient Hotel Jerusalem', address: 'Orient Hotel, Emek Refaim St 3, Jerusalem' },
  { name: 'Mamilla Hotel', address: 'Mamilla Hotel, King Solomon St 11, Jerusalem' },
  { name: 'The Inbal Jerusalem', address: 'The Inbal Hotel, Liberty Bell Park, Jerusalem' },
  { name: 'Waldorf Astoria Jerusalem', address: 'Waldorf Astoria, Gershon Agron St 26-28, Jerusalem' },
  { name: 'Ben Gurion Airport (Terminal 3)', address: 'Ben Gurion Airport, Terminal 3, Departures/Arrivals' },
  { name: 'Tel Aviv Center', address: 'Rothschild Blvd, Tel Aviv' },
];

export default function TaxisPage() {
  const { currentUser } = useUser();
  const [rides, setRides] = useState<TaxiRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedRideForCancel, setSelectedRideForCancel] = useState<TaxiRide | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Productions for auto-fill
  const [productions, setProductions] = useState<any[]>([]);

  // Gett Business Connection State
  const [gettConfig, setGettConfig] = useState<any>(null);
  const [canManageGett, setCanManageGett] = useState(false);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [connLoading, setConnLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; details?: any } | null>(null);

  // Form State for Connect Gett Modal
  const [connAccountId, setConnAccountId] = useState('');
  const [connCompanyName, setConnCompanyName] = useState('Jewish News Syndicate (JNS)');
  const [connClientId, setConnClientId] = useState('');
  const [connClientSecret, setConnClientSecret] = useState('');
  const [connEnvironment, setConnEnvironment] = useState<'production' | 'sandbox'>('production');
  const [connCostCenter, setConnCostCenter] = useState('JNS Video Operations - Jerusalem Studio');
  const [connBillingEmail, setConnBillingEmail] = useState('production@jns.org');
  const [connAutoDispatch, setConnAutoDispatch] = useState(false);
  const [showAdvancedApi, setShowAdvancedApi] = useState(false);

  // Dispatch Form State
  const [selectedProductionId, setSelectedProductionId] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerRole, setPassengerRole] = useState<TaxiPassengerRole>('GUEST');
  const [direction, setDirection] = useState<TaxiDirection>('TO_STUDIO');
  const [pickupAddress, setPickupAddress] = useState('King David Hotel, King David St 23, Jerusalem');
  const [dropoffAddress, setDropoffAddress] = useState('JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem');
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [vehicleType, setVehicleType] = useState<TaxiVehicleType>('REGULAR');
  const [notes, setNotes] = useState('');
  const [costCenter, setCostCenter] = useState('JNS Video Operations');

  // Estimate state
  const [estimate, setEstimate] = useState<{ price: number; duration: number; eta: number }>({
    price: 65,
    duration: 20,
    eta: 5,
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTaxis = async () => {
    try {
      const res = await fetch('/api/taxis');
      if (res.ok) {
        const data = await res.json();
        setRides(data.rides || []);
      }
    } catch (err) {
      console.error('Error fetching taxis', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductions = async () => {
    try {
      const res = await fetch('/api/productions');
      if (res.ok) {
        const data = await res.json();
        setProductions(data.productions || []);
      }
    } catch (err) {
      console.error('Error fetching productions', err);
    }
  };

  const fetchGettConnection = async () => {
    try {
      const res = await fetch('/api/taxis/connection');
      if (res.ok) {
        const data = await res.json();
        setGettConfig(data.config);
        setCanManageGett(data.canManage);
        if (data.config) {
          setConnAccountId(data.config.accountId || '');
          setConnCompanyName(data.config.companyName || 'Jewish News Syndicate (JNS)');
          setConnEnvironment(data.config.environment || 'production');
          setConnCostCenter(data.config.defaultCostCenter || 'JNS Video Operations - Jerusalem Studio');
          setConnBillingEmail(data.config.billingEmail || 'production@jns.org');
          setConnAutoDispatch(Boolean(data.config.autoDispatchLive));
        }
      }
    } catch (err) {
      console.error('Error fetching Gett connection status', err);
    }
  };

  const handleTestConnection = async () => {
    setConnLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/taxis/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST',
          accountId: connAccountId,
          companyName: connCompanyName,
          clientId: connClientId,
          clientSecret: connClientSecret,
          environment: connEnvironment,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed.' });
    } finally {
      setConnLoading(false);
    }
  };

  const handleSaveConnection = async (connectNow = true) => {
    if (connectNow && !connAccountId.trim() && !connClientId.trim()) {
      showToast('Please enter your Gett Corporate Account ID or API Client ID.', 'error');
      return;
    }
    setConnLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/taxis/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE',
          connected: connectNow,
          accountId: connAccountId,
          companyName: connCompanyName,
          clientId: connClientId,
          clientSecret: connClientSecret,
          environment: connEnvironment,
          defaultCostCenter: connCostCenter,
          billingEmail: connBillingEmail,
          autoDispatchLive: connAutoDispatch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save connection');
      showToast(data.message || 'Gett Business IL connected successfully!', 'success');
      setGettConfig(data.config);
      setConnectionModalOpen(false);
      fetchTaxis();
    } catch (err: any) {
      showToast(err.message, 'error');
      setTestResult({ success: false, message: err.message });
    } finally {
      setConnLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect JNS account from Gett Business Israel? Bookings will revert to local simulation.')) return;
    setConnLoading(true);
    try {
      const res = await fetch('/api/taxis/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISCONNECT' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
      showToast('Gett Business Israel disconnected.', 'success');
      setGettConfig(data.config);
      setConnectionModalOpen(false);
      fetchTaxis();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setConnLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxis();
    fetchProductions();
    fetchGettConnection();
    const interval = setInterval(fetchTaxis, 8000);
    return () => clearInterval(interval);
  }, []);

  // Update estimate dynamically when addresses or vehicle type changes
  useEffect(() => {
    if (!pickupAddress || !dropoffAddress) return;
    const fetchEstimate = async () => {
      try {
        const res = await fetch('/api/taxis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ESTIMATE',
            pickupAddress,
            dropoffAddress,
            vehicleType,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.estimate) {
            setEstimate({
              price: data.estimate.estimatedPriceShekels,
              duration: data.estimate.estimatedDurationMinutes,
              eta: data.estimate.etaMinutes,
            });
          }
        }
      } catch (e) {
        // ignore
      }
    };
    const timer = setTimeout(fetchEstimate, 300);
    return () => clearTimeout(timer);
  }, [pickupAddress, dropoffAddress, vehicleType]);

  // Handle Production Select auto-fill
  const handleProductionSelect = (prodId: string) => {
    setSelectedProductionId(prodId);
    if (!prodId) return;
    const prod = productions.find((p) => p.id === prodId);
    if (prod) {
      setCostCenter(`${prod.title} (Production)`);
      if (prod.filmingDate) {
        setScheduledDate(prod.filmingDate);
      }
      if (prod.filmingTime) {
        const startH = prod.filmingTime.split('-')[0].trim();
        setScheduledTime(startH);
        setIsImmediate(false);
      }
      // If production has a guest note or title
      if (!passengerName) {
        setPassengerName('Special Guest');
      }
    }
  };

  // Direction toggle handler
  const handleDirectionChange = (newDir: TaxiDirection) => {
    setDirection(newDir);
    const studioAddr = 'JNS Jerusalem Studio, King George St / Jaffa St, Jerusalem';
    if (newDir === 'TO_STUDIO') {
      setDropoffAddress(studioAddr);
      if (pickupAddress === studioAddr) {
        setPickupAddress('King David Hotel, King David St 23, Jerusalem');
      }
    } else if (newDir === 'FROM_STUDIO') {
      setPickupAddress(studioAddr);
      if (dropoffAddress === studioAddr) {
        setDropoffAddress('King David Hotel, King David St 23, Jerusalem');
      }
    }
  };

  // Submit new taxi dispatch
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim() || !passengerPhone.trim()) {
      showToast('Please enter passenger name and phone number.', 'error');
      return;
    }
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      showToast('Please enter both pickup and dropoff addresses.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      let fullScheduledIso: string | undefined = undefined;
      if (!isImmediate && scheduledDate) {
        const timePart = scheduledTime ? `${scheduledTime}:00` : '10:00:00';
        fullScheduledIso = new Date(`${scheduledDate}T${timePart}`).toISOString();
      }

      const prod = productions.find((p) => p.id === selectedProductionId);

      const res = await fetch('/api/taxis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionId: selectedProductionId || undefined,
          productionTitle: prod ? prod.title : undefined,
          passengerName,
          passengerPhone,
          passengerRole,
          pickupAddress,
          dropoffAddress,
          direction,
          isImmediate,
          scheduledTime: fullScheduledIso,
          vehicleType,
          notes,
          costCenter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch taxi');
      }

      showToast(`Taxi order ${data.ride.gettOrderId} confirmed via Gett!`, 'success');
      setDispatchModalOpen(false);
      fetchTaxis();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel ride handler
  const handleConfirmCancel = async () => {
    if (!selectedRideForCancel) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/taxis/${selectedRideForCancel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL_RIDE',
          reason: cancelReason || 'Producer cancelled ride',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel taxi');
      }
      showToast(`Ride ${selectedRideForCancel.gettOrderId} has been cancelled.`, 'success');
      setSelectedRideForCancel(null);
      setCancelReason('');
      fetchTaxis();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Simulation step advance handler (for testing progression)
  const handleAdvanceStatus = async (rideId: string, nextStatus: TaxiStatus) => {
    try {
      const res = await fetch(`/api/taxis/${rideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          status: nextStatus,
        }),
      });
      if (res.ok) {
        showToast(`Ride status updated to ${nextStatus}`, 'success');
        fetchTaxis();
      }
    } catch (e) {
      // ignore
    }
  };

  // Counts
  const activeRides = rides.filter(
    (r) => r.status === 'DISPATCHED' || r.status === 'ARRIVED' || r.status === 'IN_TRANSIT'
  );
  const scheduledRides = rides.filter((r) => r.status === 'REQUESTED');
  const completedRides = rides.filter((r) => r.status === 'COMPLETED');

  // Filtered by activeTab and search
  const filteredRides = rides.filter((r) => {
    if (activeTab === 'ACTIVE') {
      if (r.status !== 'DISPATCHED' && r.status !== 'ARRIVED' && r.status !== 'IN_TRANSIT') return false;
    } else if (activeTab === 'SCHEDULED') {
      if (r.status !== 'REQUESTED') return false;
    } else if (activeTab === 'COMPLETED') {
      if (r.status !== 'COMPLETED' && r.status !== 'CANCELLED') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPassenger = r.passengerName.toLowerCase().includes(q);
      const matchDriver = r.driver?.name.toLowerCase().includes(q) || false;
      const matchPlate = r.driver?.licensePlate.toLowerCase().includes(q) || false;
      const matchProd = r.productionTitle?.toLowerCase().includes(q) || false;
      const matchOrder = r.gettOrderId?.toLowerCase().includes(q) || false;
      return matchPassenger || matchDriver || matchPlate || matchProd || matchOrder;
    }
    return true;
  });

  const getStatusBadge = (status: TaxiStatus) => {
    switch (status) {
      case 'IN_TRANSIT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6', animation: 'pulse 1.5s infinite' }} />
            In Transit
          </span>
        );
      case 'DISPATCHED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)' }}>
            <Car size={12} />
            Driver Dispatched
          </span>
        );
      case 'ARRIVED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <MapPin size={12} />
            Driver Arrived
          </span>
        );
      case 'REQUESTED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.4)' }}>
            <Clock size={12} />
            Scheduled
          </span>
        );
      case 'COMPLETED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <XCircle size={12} />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  if (currentUser && !canManageTaxis(currentUser)) {
    return (
      <div className="calendar-page-container" style={{ minHeight: '100vh', background: 'var(--bg-main, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center', padding: '36px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <Shield size={32} color="#f59e0b" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>Access Restricted</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
            Guest taxi dispatching and transit logistics are reserved for Administrators, Producers, and Studio Operators. If your shoot requires transit, please coordinate with the assigned show producer.
          </p>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#2563eb', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page-container" style={{ minHeight: '100vh', background: 'var(--bg-main, #0f172a)', color: 'var(--text-main, #f8fafc)', padding: '24px 32px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toast.type === 'success' ? '#065f46' : '#991b1b',
            color: '#fff',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={22} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                Guest Taxis & Transit Logistics
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
                Direct Gett Business dispatch for studio guests, interviewees, and production talent across Jerusalem & Israel.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Gett Business Connection Status Badge */}
          {gettConfig?.connected ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
              <span>Gett Business IL: Connected</span>
              {gettConfig.accountId && (
                <span style={{ fontSize: '11px', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>
                  #{gettConfig.accountId}
                </span>
              )}
              {canManageGett && (
                <button
                  type="button"
                  onClick={() => {
                    setTestResult(null);
                    setConnectionModalOpen(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60a5fa',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 4px',
                    textDecoration: 'underline',
                  }}
                  title="Configure account credentials and cost centers"
                >
                  Settings
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
              <span>Gett Business IL: Not Connected</span>
              {canManageGett && (
                <button
                  type="button"
                  onClick={() => {
                    setTestResult(null);
                    setConnectionModalOpen(true);
                  }}
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fef08a',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '5px',
                    marginLeft: '4px',
                  }}
                  title="Connect JNS Gett Business corporate account"
                >
                  Connect Account
                </button>
              )}
            </div>
          )}

          <button
            onClick={fetchTaxis}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #334155)',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              color: '#cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Refresh Live Status"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setDispatchModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Dispatch New Taxi (Gett)</span>
          </button>
        </div>
      </div>

      {/* QUICK STATS STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Active In-Transit</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#60a5fa', marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {activeRides.length}
            {activeRides.length > 0 && (
              <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>● Live radar</span>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Upcoming Scheduled</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#facc15', marginTop: '4px' }}>
            {scheduledRides.length}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Completed Rides</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {completedRides.length}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-color, #334155)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>Corporate Billing Account</div>
            {gettConfig?.connected && canManageGett && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={connLoading}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  borderRadius: '5px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: connLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Disconnect Gett Business corporate billing account"
              >
                {connLoading ? '...' : 'Disconnect'}
              </button>
            )}
          </div>
          {gettConfig?.connected ? (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                <span>Gett Business IL (Connected)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Account #{gettConfig.accountId || 'Active'}
                </div>
                {canManageGett && (
                  <button
                    type="button"
                    onClick={() => {
                      setTestResult(null);
                      setConnectionModalOpen(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60a5fa',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Edit Settings
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                <span>Not Connected (Simulation)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Local simulation mode
                </div>
                {canManageGett && (
                  <button
                    type="button"
                    onClick={() => {
                      setTestResult(null);
                      setConnectionModalOpen(true);
                    }}
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fef08a',
                      borderRadius: '5px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIVE IN-TRANSIT RADAR SECTION (Show prominent cards if active rides exist) */}
      {activeRides.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Navigation size={18} color="#60a5fa" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Live Dispatched Taxis ({activeRides.length})
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {activeRides.map((ride) => (
              <div
                key={ride.id}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    {getStatusBadge(ride.status)}
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      Order: {ride.gettOrderId}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>
                      ₪{ride.estimatedPriceShekels}
                    </div>
                    {ride.driver?.currentEtaMinutes !== undefined && ride.driver.currentEtaMinutes > 0 ? (
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#facc15' }}>
                        ETA {ride.driver.currentEtaMinutes} mins
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399' }}>
                        Arrived at location
                      </div>
                    )}
                  </div>
                </div>

                {/* Passenger Info */}
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(51, 65, 85, 0.4)', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      {ride.passengerName}
                    </span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
                      {ride.passengerRole}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={12} />
                    <a href={`tel:${ride.passengerPhone}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>
                      {ride.passengerPhone}
                    </a>
                  </div>
                  {ride.productionTitle && (
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Film size={11} color="#eab308" />
                      <span>{ride.productionTitle}</span>
                    </div>
                  )}
                </div>

                {/* Route */}
                <div style={{ fontSize: '12px', marginBottom: '14px', lineHeight: 1.4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#cbd5e1' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>● Pickup:</span>
                    <span style={{ color: '#f8fafc' }}>{ride.pickupAddress}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px', color: '#cbd5e1' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>▼ Dropoff:</span>
                    <span style={{ color: '#f8fafc' }}>{ride.dropoffAddress}</span>
                  </div>
                </div>

                {/* Driver Box */}
                {ride.driver && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.25)', backgroundColor: 'rgba(30, 41, 59, 0.7)', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                          Driver: {ride.driver.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {ride.driver.carModel} • <span style={{ color: '#facc15', fontWeight: 700 }}>{ride.driver.licensePlate}</span>
                        </div>
                      </div>
                      <a
                        href={`tel:${ride.driver.phone}`}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(37, 99, 235, 0.2)',
                          color: '#60a5fa',
                          fontSize: '11px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Phone size={11} />
                        Call
                      </a>
                    </div>
                  </div>
                )}

                {/* Card Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
                  {ride.trackingUrl ? (
                    <a
                      href={ride.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#38bdf8',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <span>Gett Live Tracker</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : <div />}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {ride.status === 'DISPATCHED' && (
                      <button
                        onClick={() => handleAdvanceStatus(ride.id, 'ARRIVED')}
                        style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', cursor: 'pointer', fontWeight: 600 }}
                        title="Simulate driver arrived at pickup"
                      >
                        Mark Arrived
                      </button>
                    )}
                    {ride.status === 'ARRIVED' && (
                      <button
                        onClick={() => handleAdvanceStatus(ride.id, 'IN_TRANSIT')}
                        style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', cursor: 'pointer', fontWeight: 600 }}
                        title="Simulate passenger onboard"
                      >
                        Mark In Transit
                      </button>
                    )}
                    {ride.status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => handleAdvanceStatus(ride.id, 'COMPLETED')}
                        style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', cursor: 'pointer', fontWeight: 600 }}
                        title="Complete ride and settle fare"
                      >
                        Complete Ride
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRideForCancel(ride)}
                      style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABS & SEARCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ALL', 'ACTIVE', 'SCHEDULED', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: activeTab === tab ? '#2563eb' : 'rgba(30, 41, 59, 0.6)',
                color: activeTab === tab ? '#ffffff' : '#94a3b8',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'ALL' && `All Rides (${rides.length})`}
              {tab === 'ACTIVE' && `Active (${activeRides.length})`}
              {tab === 'SCHEDULED' && `Scheduled (${scheduledRides.length})`}
              {tab === 'COMPLETED' && `Completed (${completedRides.length})`}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search passenger, driver, plate, show..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #334155)',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* RIDES TABLE / LIST */}
      <div style={{ borderRadius: '12px', border: '1px solid var(--border-color, #334155)', backgroundColor: 'rgba(30, 41, 59, 0.4)', overflow: 'hidden' }}>
        {filteredRides.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <Car size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#cbd5e1' }}>No taxi rides found</div>
            <p style={{ fontSize: '13px', margin: '6px 0 16px 0' }}>
              {searchQuery ? 'Try adjusting your search query' : 'Click "Dispatch New Taxi" to order a ride for a guest or host.'}
            </p>
            <button
              onClick={() => setDispatchModalOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Order Taxi
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color, #334155)', backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Passenger</th>
                <th style={{ padding: '12px 16px' }}>Production</th>
                <th style={{ padding: '12px 16px' }}>Route</th>
                <th style={{ padding: '12px 16px' }}>Pickup Time</th>
                <th style={{ padding: '12px 16px' }}>Driver & Vehicle</th>
                <th style={{ padding: '12px 16px' }}>Fare (NIS)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRides.map((ride) => (
                <tr
                  key={ride.id}
                  style={{
                    borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(51, 65, 85, 0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    {getStatusBadge(ride.status)}
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                      {ride.gettOrderId}
                    </div>
                    {ride.isCorporateRide && (
                      <div style={{ marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            display: 'inline-block',
                          }}
                        >
                          🏢 Gett Business
                        </span>
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{ride.passengerName}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      <a href={`tel:${ride.passengerPhone}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>
                        {ride.passengerPhone}
                      </a>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {ride.productionId ? (
                      <Link
                        href={`/productions/${ride.productionId}`}
                        style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>{ride.productionTitle || 'View Production'}</span>
                        <ChevronRight size={12} />
                      </Link>
                    ) : (
                      <span style={{ color: '#64748b' }}>Direct Booking</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                    <div style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>From: </span>
                      {ride.pickupAddress}
                    </div>
                    <div style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>To: </span>
                      {ride.dropoffAddress}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#cbd5e1', fontWeight: 600 }}>
                      {new Date(ride.scheduledTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(ride.scheduledTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} IDT
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {ride.driver ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{ride.driver.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {ride.driver.carModel} • <span style={{ color: '#facc15' }}>{ride.driver.licensePlate}</span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '12px' }}>Awaiting dispatch</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, color: '#38bdf8' }}>
                      ₪{ride.actualPriceShekels || ride.estimatedPriceShekels}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {ride.actualPriceShekels ? 'Final' : 'Estimate'}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {ride.trackingUrl && (
                        <a
                          href={ride.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid var(--border-color, #334155)',
                            color: '#38bdf8',
                            fontSize: '11px',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                          title="Open live Gett tracker in new tab"
                        >
                          <span>Track</span>
                          <ExternalLink size={10} />
                        </a>
                      )}

                      {ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED' && (
                        <button
                          onClick={() => setSelectedRideForCancel(ride)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DISPATCH TAXI MODAL */}
      {dispatchModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setDispatchModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#1e293b',
              borderRadius: '14px',
              border: '1px solid #334155',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={18} color="#60a5fa" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                    Dispatch Taxi via Gett
                  </h3>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Charged directly to corporate account
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleDispatchSubmit} style={{ padding: '20px 24px', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Optional Production Select */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Link to Production (Optional Auto-Fill)
                </label>
                <select
                  value={selectedProductionId}
                  onChange={(e) => handleProductionSelect(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="">-- Manual Guest Dispatch (No linked show) --</option>
                  {productions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.filmingDate ? `${p.filmingDate} ${p.filmingTime || ''}` : 'No date'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Direction Toggle */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Transit Direction
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleDirectionChange('TO_STUDIO')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: direction === 'TO_STUDIO' ? '2px solid #2563eb' : '1px solid #334155',
                      backgroundColor: direction === 'TO_STUDIO' ? 'rgba(37, 99, 235, 0.2)' : '#0f172a',
                      color: direction === 'TO_STUDIO' ? '#93c5fd' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ➔ To Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectionChange('FROM_STUDIO')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: direction === 'FROM_STUDIO' ? '2px solid #2563eb' : '1px solid #334155',
                      backgroundColor: direction === 'FROM_STUDIO' ? 'rgba(37, 99, 235, 0.2)' : '#0f172a',
                      color: direction === 'FROM_STUDIO' ? '#93c5fd' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    From Studio ➔
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('CUSTOM')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: direction === 'CUSTOM' ? '2px solid #2563eb' : '1px solid #334155',
                      backgroundColor: direction === 'CUSTOM' ? 'rgba(37, 99, 235, 0.2)' : '#0f172a',
                      color: direction === 'CUSTOM' ? '#93c5fd' : '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Custom Route
                  </button>
                </div>
              </div>

              {/* Passenger Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Passenger Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Dan Schueftan"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Phone (for Driver SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+972-5X-XXXXXXX"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Pickup Address */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>
                    ● Pickup Address *
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Where driver meets passenger</span>
                </div>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>

              {/* Dropoff Address */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                    ▼ Dropoff Destination *
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Final destination</span>
                </div>
                <input
                  type="text"
                  required
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>

              {/* Quick Preset Badges */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Quick Hotel Presets:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {PRESET_ADDRESSES.slice(1, 6).map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        if (direction === 'TO_STUDIO') setPickupAddress(preset.address);
                        else setDropoffAddress(preset.address);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(51, 65, 85, 0.4)',
                        border: '1px solid #475569',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Type & Timing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Vehicle Class
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as TaxiVehicleType)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                  >
                    <option value="REGULAR">Standard Taxi (1-4 seats)</option>
                    <option value="XL">XL Van (5-6 seats / Luggage)</option>
                    <option value="PREMIUM">Executive / Premium</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Dispatch Timing
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsImmediate(true)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: isImmediate ? '2px solid #2563eb' : '1px solid #334155',
                        backgroundColor: isImmediate ? 'rgba(37, 99, 235, 0.2)' : '#0f172a',
                        color: isImmediate ? '#93c5fd' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Now (Immediate)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsImmediate(false)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: !isImmediate ? '2px solid #2563eb' : '1px solid #334155',
                        backgroundColor: !isImmediate ? 'rgba(37, 99, 235, 0.2)' : '#0f172a',
                        color: !isImmediate ? '#93c5fd' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Schedule Later
                    </button>
                  </div>
                </div>
              </div>

              {/* Schedule Date & Time (if not immediate) */}
              {!isImmediate && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      required={!isImmediate}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                      Pickup Time (IDT)
                    </label>
                    <input
                      type="time"
                      required={!isImmediate}
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                    />
                  </div>
                </div>
              )}

              {/* Driver Special Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Driver Instructions & Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wait at lobby entrance. Guest has briefing folder."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>

              {/* Live Fare Estimate Card */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(15, 23, 42, 0.6))', border: '1px solid rgba(59, 130, 246, 0.35)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gett Estimated Fare</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                    ₪{estimate.price}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                    ~{estimate.duration} min ride • Corporate Account Billing
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 700 }}>
                    Driver ETA: ~{estimate.eta} mins
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                    SMS tracking sent to guest
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.7 : 1,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  {actionLoading ? 'Dispatching...' : 'Confirm & Dispatch Taxi (Gett)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {selectedRideForCancel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedRideForCancel(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              border: '1px solid #334155',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
              Cancel Taxi Order?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
              Are you sure you want to cancel the taxi for <strong>{selectedRideForCancel.passengerName}</strong> (Order: {selectedRideForCancel.gettOrderId})?
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
                Reason for Cancellation (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Guest rescheduled, shoot delayed..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setSelectedRideForCancel(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {actionLoading ? 'Cancelling...' : 'Yes, Cancel Taxi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONNECT GETT BUSINESS ISRAEL MODAL */}
      {connectionModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9500,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setConnectionModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#1e293b',
              borderRadius: '16px',
              border: '1px solid #334155',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={22} color="#60a5fa" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                    Connect Gett Business Israel (גט לעסקים)
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Directly link your JNS Corporate account for seamless taxi dispatch and billing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConnectionModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
                  color: testResult.success ? '#34d399' : '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Connection Status Overview */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid #334155',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Current Status
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: gettConfig?.connected ? '#34d399' : '#f59e0b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: gettConfig?.connected ? '#10b981' : '#f59e0b', display: 'inline-block' }}></span>
                  <span>{gettConfig?.connected ? 'Connected to JNS Account' : 'Disconnected (Internal Simulator)'}</span>
                </div>
              </div>
              <a
                href="https://business.gett.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(51, 65, 85, 0.6)',
                  border: '1px solid #475569',
                  color: '#93c5fd',
                  fontSize: '11px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>Gett Business Portal</span>
                <ExternalLink size={11} />
              </a>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={connCompanyName}
                  onChange={(e) => setConnCompanyName(e.target.value)}
                  placeholder="Jewish News Syndicate (JNS)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Gett Business Corporate Account ID (מזהה לקוח עסקי)
                </label>
                <input
                  type="text"
                  value={connAccountId}
                  onChange={(e) => setConnAccountId(e.target.value)}
                  placeholder="e.g. JNS-CORP-IL or your 6-digit customer number"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Found on your monthly Gett corporate billing invoice or Gett Business contract.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Environment
                  </label>
                  <select
                    value={connEnvironment}
                    onChange={(e) => setConnEnvironment(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                  >
                    <option value="production">Production Israel (api.gett.com)</option>
                    <option value="sandbox">Sandbox Testing (api-sandbox.gett.com)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Billing Notification Email
                  </label>
                  <input
                    type="email"
                    value={connBillingEmail}
                    onChange={(e) => setConnBillingEmail(e.target.value)}
                    placeholder="production@jns.org"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Default Cost Center (מרכז עלות)
                </label>
                <input
                  type="text"
                  value={connCostCenter}
                  onChange={(e) => setConnCostCenter(e.target.value)}
                  placeholder="JNS Video Operations - Jerusalem Studio"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>

              {/* Collapsible Direct API Credentials */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvancedApi(!showAdvancedApi)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#93c5fd',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{showAdvancedApi ? '▼' : '►'} Advanced: Gett Business Direct API Credentials (OAuth2)</span>
                </button>

                {showAdvancedApi && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                        API Client ID
                      </label>
                      <input
                        type="text"
                        value={connClientId}
                        onChange={(e) => setConnClientId(e.target.value)}
                        placeholder="e.g. gett_client_..."
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                        API Client Secret
                      </label>
                      <input
                        type="password"
                        value={connClientSecret}
                        onChange={(e) => setConnClientSecret(e.target.value)}
                        placeholder="Leave blank to keep existing or enter new secret"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc', fontSize: '12px' }}
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={connAutoDispatch}
                        onChange={(e) => setConnAutoDispatch(e.target.checked)}
                      />
                      <span>Automatically dispatch live rides directly through Gett Business API</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #334155' }}>
              <div>
                {gettConfig?.connected && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={connLoading}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#f87171',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Disconnect
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={connLoading}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    backgroundColor: 'rgba(51, 65, 85, 0.6)',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: connLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {connLoading ? 'Testing...' : 'Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveConnection(true)}
                  disabled={connLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: connLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {connLoading ? 'Saving...' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
