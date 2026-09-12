import {
  User,
  Production,
  ProductionTask,
  RevisionCycle,
  ProducerPackage,
  FileUploadRecord,
  RentalDetails,
  PilotDetails,
  Show,
  AuditLog,
  InAppNotification,
  WorkflowStage,
  EpisodeWorkflowStage,
  RentalWorkflowStage,
  Priority,
  TaskStatus
} from './types';
import { getDb, saveDb, countWords } from './db';
import { dispatchWorkflowEmail } from './email';

// RBAC helper utilities
export function canUserPerform(
  user: User,
  action:
    | 'CREATE_PRODUCTION'
    | 'CREATE_EPISODE'
    | 'CREATE_PILOT'
    | 'CREATE_RENTAL'
    | 'ASSIGN_TASKS'
    | 'APPROVE_DRAFT'
    | 'FINAL_APPROVAL'
    | 'MARK_PUBLISHED'
    | 'MANAGE_USERS'
    | 'MANAGE_SHOWS'
    | 'MANAGE_SETTINGS'
    | 'ACCESS_PRODUCTION_EMAIL'
    | 'CONVERT_PILOT'
): boolean {
  if (user.role === 'ADMIN') return true;

  if (user.role === 'PRODUCER') {
    switch (action) {
      case 'CREATE_PRODUCTION':
      case 'CREATE_EPISODE':
      case 'CREATE_PILOT':
      case 'CREATE_RENTAL':
      case 'ASSIGN_TASKS':
      case 'APPROVE_DRAFT':
      case 'FINAL_APPROVAL':
      case 'MARK_PUBLISHED':
      case 'ACCESS_PRODUCTION_EMAIL':
      case 'CONVERT_PILOT':
        return true;
      case 'MANAGE_USERS':
      case 'MANAGE_SHOWS':
      case 'MANAGE_SETTINGS':
        return false;
      default:
        return false;
    }
  }

  // TEAM_MEMBER cannot perform these elevated actions
  return false;
}

export function logAudit(
  productionId: string | undefined,
  user: User,
  action: string,
  details: string
): void {
  const db = getDb();
  const log: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    productionId,
    userId: user.id,
    userName: user.name,
    action,
    details,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(log);
  saveDb(db);
}

export function createNotification(
  userId: string,
  title: string,
  message: string,
  linkUrl: string,
  eventType?: 'STAGE_HANDOFF' | 'TASK_ASSIGNED' | 'REVISION_REQUESTED' | 'APPROVAL_REQUIRED' | 'DEADLINE_ALERT' | 'INFO',
  details?: Array<{ label: string; value: string }>
): void {
  const db = getDb();
  const notif: InAppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title,
    message,
    linkUrl,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  saveDb(db);

  // Background asynchronous email dispatch
  const lower = title.toLowerCase();
  const resolvedType = eventType || (
    lower.includes('revision') ? 'REVISION_REQUESTED' :
    lower.includes('approval') || lower.includes('publish') ? 'APPROVAL_REQUIRED' :
    lower.includes('assigned') || lower.includes('task') || lower.includes('scheduled') ? 'TASK_ASSIGNED' :
    lower.includes('stage') || lower.includes('upload') || lower.includes('ready') || lower.includes('package') ? 'STAGE_HANDOFF' :
    'INFO'
  );

  dispatchWorkflowEmail({
    userId,
    eventType: resolvedType,
    title,
    message,
    linkUrl,
    details,
  }).catch((err) => {
    console.error('Failed background workflow email dispatch:', err);
  });
}

// 1. Create Episode / Production
export function createNewEpisode(
  data: {
    showId: string;
    episodeNumber: string;
    filmingDate: string;
    editingDeadline?: string;
    publicationDeadline?: string;
    priority: Priority;
    producerId: string;
    editorId?: string;
    graphicsId?: string;
    initialNotes?: string;
  },
  user: User
): Production {
  if (!canUserPerform(user, 'CREATE_EPISODE')) {
    throw new Error('Unauthorized: Only Producers or Administrators can create episodes.');
  }

  const db = getDb();
  const show = db.shows.find((s) => s.id === data.showId);
  if (!show) throw new Error('Show not found.');

  const prodId = `prod_${data.showId.replace('show_', '')}_${data.episodeNumber}`;
  const title = `${show.name} — Episode ${data.episodeNumber}`;

  const assignedProducer = data.producerId || show.producerId;
  const assignedEditor = data.editorId || show.defaultEditorId;

  const filmingTask: ProductionTask = {
    id: `tsk_${Date.now()}_film`,
    productionId: prodId,
    stageName: 'FILMING',
    title: `Filming: ${title}`,
    assignedUserId: assignedProducer,
    status: 'NOT_STARTED',
    priority: data.priority,
    dueDate: data.filmingDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newProd: Production = {
    id: prodId,
    type: 'EPISODE',
    showId: show.id,
    episodeNumber: data.episodeNumber,
    title,
    status: 'ACTIVE',
    priority: data.priority,
    currentStage: 'FILMING',
    filmingDate: data.filmingDate,
    editingDeadline: data.editingDeadline,
    publicationDeadline: data.publicationDeadline,
    createdById: user.id,
    producerId: assignedProducer,
    editorId: assignedEditor,
    graphicsId: data.graphicsId || show.defaultGraphicsId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: [filmingTask],
    revisionCycles: [],
  };

  db.productions.unshift(newProd);
  saveDb(db);

  logAudit(prodId, user, 'CREATE_EPISODE', `Created new episode: ${title}`);
  createNotification(
    assignedProducer,
    'New Episode Scheduled',
    `You are assigned as producer for ${title}. Filming on ${data.filmingDate}.`,
    `/productions/${prodId}`,
    'TASK_ASSIGNED',
    [
      { label: 'Show', value: show.name },
      { label: 'Episode', value: `Episode ${data.episodeNumber}` },
      { label: 'Filming Date', value: data.filmingDate },
      { label: 'Editing Deadline', value: data.editingDeadline || 'Standard turnaround' },
      { label: 'Priority', value: data.priority },
    ]
  );
  if (assignedEditor && assignedEditor !== assignedProducer) {
    createNotification(
      assignedEditor,
      'New Episode Assigned for Editing',
      `You are the assigned editor for ${title}. Filming is scheduled for ${data.filmingDate}.`,
      `/productions/${prodId}`,
      'TASK_ASSIGNED',
      [
        { label: 'Show', value: show.name },
        { label: 'Episode', value: `Episode ${data.episodeNumber}` },
        { label: 'Filming Date', value: data.filmingDate },
        { label: 'Editing Deadline', value: data.editingDeadline || 'Standard turnaround' },
      ]
    );
  }

  return newProd;
}

// 2. Create Pilot
export function createNewPilot(
  data: {
    title: string;
    conceptSummary: string;
    filmingDate: string;
    editingDeadline?: string;
    publicationDeadline?: string;
    priority: Priority;
    producerId: string;
    editorId?: string;
    graphicsId?: string;
  },
  user: User
): Production {
  if (!canUserPerform(user, 'CREATE_PILOT')) {
    throw new Error('Unauthorized: Only Producers or Administrators can create pilots.');
  }

  const db = getDb();
  const prodId = `pilot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const pilotTask: ProductionTask = {
    id: `tsk_${Date.now()}_pilot_preprod`,
    productionId: prodId,
    stageName: 'FILMING',
    title: `Pre-Production & Filming: ${data.title}`,
    assignedUserId: data.producerId,
    status: 'NOT_STARTED',
    priority: data.priority,
    dueDate: data.filmingDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newPilot: Production = {
    id: prodId,
    type: 'PILOT',
    title: `${data.title} (Pilot)`,
    status: 'ACTIVE',
    priority: data.priority,
    currentStage: 'FILMING',
    filmingDate: data.filmingDate,
    editingDeadline: data.editingDeadline,
    publicationDeadline: data.publicationDeadline,
    createdById: user.id,
    producerId: data.producerId,
    editorId: data.editorId,
    graphicsId: data.graphicsId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pilotDetails: {
      id: `pdet_${prodId}`,
      productionId: prodId,
      conceptSummary: data.conceptSummary,
    },
    tasks: [pilotTask],
    revisionCycles: [],
  };

  db.productions.unshift(newPilot);
  saveDb(db);

  logAudit(prodId, user, 'CREATE_PILOT', `Created new pilot: ${data.title}`);
  createNotification(
    data.producerId,
    'New Pilot Assigned',
    `You are assigned as producer for pilot "${data.title}". Filming scheduled on ${data.filmingDate}.`,
    `/productions/${prodId}`,
    'TASK_ASSIGNED',
    [
      { label: 'Pilot Title', value: data.title },
      { label: 'Concept Summary', value: data.conceptSummary },
      { label: 'Filming Date', value: data.filmingDate },
      { label: 'Editing Deadline', value: data.editingDeadline || 'TBD' },
    ]
  );
  if (data.editorId && data.editorId !== data.producerId) {
    createNotification(
      data.editorId,
      'Pilot Editor Assignment',
      `You are designated editor for pilot "${data.title}".`,
      `/productions/${prodId}`,
      'TASK_ASSIGNED',
      [
        { label: 'Pilot Title', value: data.title },
        { label: 'Filming Date', value: data.filmingDate },
      ]
    );
  }
  return newPilot;
}

// 3. Create Studio Rental
export function createNewRental(
  data: {
    clientName: string;
    projectName: string;
    contactName: string;
    contactInfo: string;
    recordingDate: string;
    recordingTime: string;
    studioSetup: string;
    producerId: string;
    agreedPrice?: string;
    hoursCount?: string;
    specialRequirements?: string;
    priority?: Priority;
  },
  user: User
): Production {
  if (!canUserPerform(user, 'CREATE_RENTAL')) {
    throw new Error('Unauthorized: Only Producers or Administrators can create rental jobs.');
  }

  const db = getDb();
  const prodId = `rental_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const title = `Studio Rental: ${data.clientName} — ${data.projectName}`;

  const rentalTask: ProductionTask = {
    id: `tsk_${Date.now()}_rent_sched`,
    productionId: prodId,
    stageName: 'RENTAL_SCHEDULED',
    title: `Studio Rental Setup & Preparation`,
    assignedUserId: data.producerId,
    status: 'IN_PROGRESS',
    priority: data.priority || 'NORMAL',
    dueDate: data.recordingDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newRental: Production = {
    id: prodId,
    type: 'RENTAL',
    title,
    status: 'ACTIVE',
    priority: data.priority || 'NORMAL',
    currentStage: 'RENTAL_SCHEDULED',
    filmingDate: data.recordingDate,
    createdById: user.id,
    producerId: data.producerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rentalDetails: {
      id: `rdet_${prodId}`,
      productionId: prodId,
      clientName: data.clientName,
      projectName: data.projectName,
      contactName: data.contactName,
      contactInfo: data.contactInfo,
      recordingDate: data.recordingDate,
      recordingTime: data.recordingTime,
      studioSetup: data.studioSetup,
      producerId: data.producerId,
      agreedPrice: data.agreedPrice,
      hoursCount: data.hoursCount,
      specialRequirements: data.specialRequirements,
    },
    tasks: [rentalTask],
    revisionCycles: [],
  };

  db.productions.unshift(newRental);
  saveDb(db);

  logAudit(prodId, user, 'CREATE_RENTAL', `Created new rental job for ${data.clientName}`);
  return newRental;
}

// 4. Update Task Status (with 1-2 click updates and Blocked requirement)
export function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  user: User,
  blockedReason?: string,
  blockedHelper?: string
): ProductionTask {
  const db = getDb();
  let foundTask: ProductionTask | undefined;
  let parentProd: Production | undefined;

  for (const prod of db.productions) {
    const t = prod.tasks.find((task) => task.id === taskId);
    if (t) {
      foundTask = t;
      parentProd = prod;
      break;
    }
  }

  if (!foundTask || !parentProd) {
    throw new Error('Task not found.');
  }

  // Permission check: Assigned user, Producer, or Admin
  if (
    user.role === 'TEAM_MEMBER' &&
    foundTask.assignedUserId !== user.id &&
    parentProd.producerId !== user.id
  ) {
    throw new Error('Unauthorized: You can only update tasks assigned to you.');
  }

  // If marking BLOCKED, require explanation
  if (newStatus === 'BLOCKED') {
    if (!blockedReason || blockedReason.trim().length === 0) {
      throw new Error('Mandatory requirement: Please specify what is blocking this task.');
    }
    foundTask.blockedReason = blockedReason.trim();
    foundTask.blockedHelper = blockedHelper?.trim();
  } else {
    // Clear blocked metadata if transitioning away from BLOCKED
    foundTask.blockedReason = undefined;
    foundTask.blockedHelper = undefined;
  }

  foundTask.status = newStatus;
  foundTask.updatedAt = new Date().toISOString();
  if (newStatus === 'COMPLETED') {
    foundTask.completedAt = new Date().toISOString();
  }

  saveDb(db);

  if (newStatus === 'BLOCKED') {
    createNotification(
      parentProd.producerId,
      `⚠️ Task Blocked: ${foundTask.title}`,
      `${user.name} reported that "${foundTask.title}" is BLOCKED. Reason: "${blockedReason}". Please review and assist.`,
      `/productions/${parentProd.id}`,
      'INFO',
      [
        { label: 'Production', value: parentProd.title },
        { label: 'Blocked Task', value: foundTask.title },
        { label: 'Reported By', value: user.name },
        { label: 'Blocking Reason', value: blockedReason || 'Unspecified' },
        { label: 'Assistance Needed', value: blockedHelper || 'General assistance' },
      ]
    );
  }

  logAudit(
    parentProd.id,
    user,
    `TASK_STATUS_${newStatus}`,
    `Updated task "${foundTask.title}" to ${newStatus}${
      blockedReason ? ` (Reason: ${blockedReason})` : ''
    }`
  );

  return foundTask;
}

// 5. STAGE 1 -> Complete Filming (Producer confirms)
export function completeFilmingStage(
  productionId: string,
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod) throw new Error('Production not found.');

  if (user.role === 'TEAM_MEMBER') {
    throw new Error('Unauthorized: Filming completion must be confirmed by a Producer.');
  }

  if (prod.currentStage !== 'FILMING') {
    throw new Error(`Invalid stage transition: Production is currently at ${prod.currentStage}.`);
  }

  // Complete filming task
  const filmTask = prod.tasks.find((t) => t.stageName === 'FILMING');
  if (filmTask) {
    filmTask.status = 'COMPLETED';
    filmTask.completedAt = new Date().toISOString();
  }

  // Advance stage to FILES_UPLOADED
  prod.currentStage = 'FILES_UPLOADED';
  prod.updatedAt = new Date().toISOString();

  // Create Files Uploaded task assigned to Studio Operator or Editor
  const uploadTask: ProductionTask = {
    id: `tsk_${Date.now()}_upload`,
    productionId: prod.id,
    stageName: 'FILES_UPLOADED',
    title: 'Raw Footage & ISO Files Uploaded',
    assignedUserId: prod.editorId || 'usr_david_studio',
    status: 'IN_PROGRESS',
    priority: prod.priority,
    dueDate: prod.filmingDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  prod.tasks.push(uploadTask);

  saveDb(db);
  logAudit(prod.id, user, 'FILMING_COMPLETED', `Marked filming complete. Activated Stage 2: Files Uploaded.`);
  return prod;
}

// 6. STAGE 2 -> Complete File Upload
export function completeFileUploadStage(
  productionId: string,
  uploadDetails: {
    dropboxPath?: string;
    serverPath?: string;
    editshareLocation?: string;
    url?: string;
    notes?: string;
  },
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod) throw new Error('Production not found.');

  if (prod.currentStage !== 'FILES_UPLOADED') {
    throw new Error(`Invalid transition: Production is currently at ${prod.currentStage}.`);
  }

  prod.fileUploadRecord = {
    id: `fur_${Date.now()}`,
    productionId: prod.id,
    dropboxPath: uploadDetails.dropboxPath,
    serverPath: uploadDetails.serverPath,
    editshareLocation: uploadDetails.editshareLocation,
    url: uploadDetails.url,
    notes: uploadDetails.notes,
    uploadedById: user.id,
    completedAt: new Date().toISOString(),
  };

  const uploadTask = prod.tasks.find((t) => t.stageName === 'FILES_UPLOADED');
  if (uploadTask) {
    uploadTask.status = 'COMPLETED';
    uploadTask.completedAt = new Date().toISOString();
  }

  // Advance stage to PRODUCER_PACKAGE
  prod.currentStage = 'PRODUCER_PACKAGE';
  prod.updatedAt = new Date().toISOString();

  // Create task for Producer
  const packageTask: ProductionTask = {
    id: `tsk_${Date.now()}_package`,
    productionId: prod.id,
    stageName: 'PRODUCER_PACKAGE',
    title: 'Producer Notes + B-Roll Ready',
    assignedUserId: prod.producerId,
    status: 'IN_PROGRESS',
    priority: prod.priority,
    dueDate: prod.editingDeadline || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  prod.tasks.push(packageTask);

  saveDb(db);
  logAudit(
    prod.id,
    user,
    'FILES_UPLOADED_COMPLETED',
    `Files uploaded to ${uploadDetails.dropboxPath || uploadDetails.editshareLocation || uploadDetails.url || 'server'}. Activated Stage 3: Producer Package.`
  );
  createNotification(
    prod.producerId,
    'Files Uploaded — Producer Package Needed',
    `Raw footage uploaded for ${prod.title}. Please prepare notes and B-roll instructions for the editor.`,
    `/productions/${prod.id}`,
    'STAGE_HANDOFF',
    [
      { label: 'Production', value: prod.title },
      { label: 'Stage', value: 'Stage 3: Producer Package' },
      { label: 'Footage Location', value: uploadDetails.dropboxPath || uploadDetails.editshareLocation || uploadDetails.url || 'Server' },
      { label: 'Action Required', value: 'Complete assembly notes & B-roll instructions' },
    ]
  );
  return prod;
}

// 7. STAGE 3 -> Complete Producer Package
export function completeProducerPackageStage(
  productionId: string,
  pkgData: {
    editingNotes: string;
    scriptText?: string;
    brollInstructions?: string;
    graphicsInstructions?: string;
    brollLinks?: string[];
    referenceLinks?: string[];
    additionalComments?: string;
  },
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod) throw new Error('Production not found.');

  if (user.role === 'TEAM_MEMBER') {
    throw new Error('Unauthorized: Only a Producer or Admin can complete the editing package.');
  }

  if (prod.currentStage !== 'PRODUCER_PACKAGE') {
    throw new Error(`Invalid transition: Production is currently at ${prod.currentStage}.`);
  }

  prod.producerPackage = {
    id: `pkg_${Date.now()}`,
    productionId: prod.id,
    editingNotes: pkgData.editingNotes,
    scriptText: pkgData.scriptText,
    brollInstructions: pkgData.brollInstructions,
    graphicsInstructions: pkgData.graphicsInstructions,
    brollLinks: pkgData.brollLinks || [],
    referenceLinks: pkgData.referenceLinks || [],
    additionalComments: pkgData.additionalComments,
    completedAt: new Date().toISOString(),
  };

  const pkgTask = prod.tasks.find((t) => t.stageName === 'PRODUCER_PACKAGE');
  if (pkgTask) {
    pkgTask.status = 'COMPLETED';
    pkgTask.completedAt = new Date().toISOString();
  }

  // Advance stage to EDITING (Draft 1)
  prod.currentStage = 'EDITING';
  prod.updatedAt = new Date().toISOString();

  const assignedEditor = prod.editorId || 'usr_ryan_editor';

  const editDraftTask: ProductionTask = {
    id: `tsk_${Date.now()}_draft1`,
    productionId: prod.id,
    stageName: 'EDITING',
    title: 'Edit Draft 1',
    assignedUserId: assignedEditor,
    status: 'IN_PROGRESS',
    priority: prod.priority,
    dueDate: prod.editingDeadline || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  prod.tasks.push(editDraftTask);

  const initialCycle: RevisionCycle = {
    id: `rev_${prod.id}_1`,
    productionId: prod.id,
    draftNumber: 1,
    status: 'IN_PROGRESS',
    editorId: assignedEditor,
    createdAt: new Date().toISOString(),
  };
  prod.revisionCycles.push(initialCycle);

  saveDb(db);
  logAudit(
    prod.id,
    user,
    'PRODUCER_PACKAGE_COMPLETED',
    `Producer notes and B-roll ready. Activated Stage 4: Edit Draft 1.`
  );
  createNotification(
    assignedEditor,
    'New Editing Task — Package Ready',
    `Producer notes and package are ready for ${prod.title}. You have been assigned Edit Draft 1.`,
    `/productions/${prod.id}`,
    'STAGE_HANDOFF',
    [
      { label: 'Production', value: prod.title },
      { label: 'Stage', value: 'Stage 4: Editing' },
      { label: 'Draft', value: 'Draft 1' },
      { label: 'Editing Deadline', value: prod.editingDeadline || 'Standard turnaround' },
      { label: 'Footage Location', value: prod.fileUploadRecord?.dropboxPath || prod.fileUploadRecord?.url || 'In production folder' },
    ]
  );
  return prod;
}

// 8. STAGE 4 -> Editor Submits Draft for Producer Review
export function submitDraftForReview(
  productionId: string,
  reviewLink: string,
  editorNotes: string,
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod) throw new Error('Production not found.');

  if (prod.currentStage !== 'EDITING') {
    throw new Error(`Invalid stage: Cannot submit draft while at stage ${prod.currentStage}.`);
  }

  if (!reviewLink || reviewLink.trim().length === 0) {
    throw new Error('A review link (Frame.io, YouTube, Dropbox, etc.) is required.');
  }

  // Find active revision cycle
  const currentCycle = prod.revisionCycles[prod.revisionCycles.length - 1];
  if (!currentCycle) {
    throw new Error('No active revision cycle found.');
  }

  currentCycle.status = 'READY_FOR_REVIEW';
  currentCycle.reviewLink = reviewLink.trim();
  currentCycle.editorNotes = editorNotes?.trim();
  currentCycle.submittedAt = new Date().toISOString();

  // Complete editing task
  const editTask = prod.tasks.find(
    (t) => t.stageName === 'EDITING' && t.status !== 'COMPLETED'
  );
  if (editTask) {
    editTask.status = 'COMPLETED';
    editTask.completedAt = new Date().toISOString();
  }

  // Advance stage to PRODUCER_REVIEW
  prod.currentStage = 'PRODUCER_REVIEW';
  prod.updatedAt = new Date().toISOString();

  // Create review task for Producer
  const reviewTask: ProductionTask = {
    id: `tsk_${Date.now()}_review_d${currentCycle.draftNumber}`,
    productionId: prod.id,
    stageName: 'PRODUCER_REVIEW',
    title: `Review Draft ${currentCycle.draftNumber}`,
    assignedUserId: prod.producerId,
    status: 'WAITING_FOR_REVIEW',
    priority: prod.priority,
    dueDate: prod.editingDeadline || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  prod.tasks.push(reviewTask);

  saveDb(db);
  logAudit(
    prod.id,
    user,
    `SUBMITTED_DRAFT_${currentCycle.draftNumber}`,
    `Editor submitted Draft ${currentCycle.draftNumber} for review (${reviewLink}).`
  );
  createNotification(
    prod.producerId,
    `Draft ${currentCycle.draftNumber} Ready for Review`,
    `${user.name} submitted Draft ${currentCycle.draftNumber} for ${prod.title}.`,
    `/productions/${prod.id}`,
    'APPROVAL_REQUIRED',
    [
      { label: 'Production', value: prod.title },
      { label: 'Stage', value: 'Stage 5: Producer Review' },
      { label: 'Submitted Draft', value: `Draft ${currentCycle.draftNumber}` },
      { label: 'Review Link', value: reviewLink },
      { label: 'Editor Notes', value: editorNotes || 'None' },
    ]
  );
  return prod;
}

// 9. STAGE 4 -> Producer Reviews Draft (APPROVED vs REVISION_REQUIRED)
export function reviewDraft(
  productionId: string,
  decision: 'APPROVED' | 'REVISION_REQUIRED',
  reviewNotes: string,
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod) throw new Error('Production not found.');

  if (!canUserPerform(user, 'APPROVE_DRAFT')) {
    throw new Error('Unauthorized: Only Producers or Administrators can review drafts.');
  }

  if (prod.currentStage !== 'PRODUCER_REVIEW') {
    throw new Error(`Invalid stage: Cannot review draft while at stage ${prod.currentStage}.`);
  }

  const currentCycle = prod.revisionCycles[prod.revisionCycles.length - 1];
  if (!currentCycle) throw new Error('No active revision cycle found.');

  currentCycle.reviewerId = user.id;
  currentCycle.decision = decision;
  currentCycle.reviewNotes = reviewNotes;
  currentCycle.reviewedAt = new Date().toISOString();

  const reviewTask = prod.tasks.find(
    (t) => t.stageName === 'PRODUCER_REVIEW' && t.status !== 'COMPLETED'
  );
  if (reviewTask) {
    reviewTask.status = 'COMPLETED';
    reviewTask.completedAt = new Date().toISOString();
  }

  if (decision === 'APPROVED') {
    currentCycle.status = 'APPROVED';
    // Advance to FINAL_APPROVAL
    prod.currentStage = 'FINAL_APPROVAL';
    prod.updatedAt = new Date().toISOString();

    const finalAppTask: ProductionTask = {
      id: `tsk_${Date.now()}_final_approval`,
      productionId: prod.id,
      stageName: 'FINAL_APPROVAL',
      title: 'Final Producer Approval',
      assignedUserId: prod.producerId,
      status: 'WAITING',
      priority: prod.priority,
      dueDate: prod.publicationDeadline || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prod.tasks.push(finalAppTask);

    saveDb(db);
    logAudit(
      prod.id,
      user,
      'DRAFT_APPROVED',
      `Producer approved Draft ${currentCycle.draftNumber}. Production awaiting Final Producer Approval.`
    );
    createNotification(
      prod.producerId,
      'Final Approval Required',
      `Draft ${currentCycle.draftNumber} approved for ${prod.title}. Please provide final producer approval.`,
      `/productions/${prod.id}`
    );
  } else {
    // REVISION REQUIRED: must provide notes
    if (!reviewNotes || reviewNotes.trim().length === 0) {
      throw new Error('Revision notes are required when requesting revisions.');
    }

    currentCycle.status = 'REVISION_REQUIRED';
    prod.currentStage = 'EDITING';
    prod.updatedAt = new Date().toISOString();

    const nextDraftNumber = currentCycle.draftNumber + 1;
    const assignedEditor = prod.editorId || currentCycle.editorId;

    const nextDraftTask: ProductionTask = {
      id: `tsk_${Date.now()}_draft${nextDraftNumber}`,
      productionId: prod.id,
      stageName: 'EDITING',
      title: `Edit Draft ${nextDraftNumber} (Revision)`,
      assignedUserId: assignedEditor,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: prod.editingDeadline || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    prod.tasks.push(nextDraftTask);

    const nextCycle: RevisionCycle = {
      id: `rev_${prod.id}_${nextDraftNumber}`,
      productionId: prod.id,
      draftNumber: nextDraftNumber,
      status: 'IN_PROGRESS',
      editorId: assignedEditor,
      createdAt: new Date().toISOString(),
    };
    prod.revisionCycles.push(nextCycle);

    saveDb(db);
    logAudit(
      prod.id,
      user,
      `REVISION_REQUESTED_DRAFT_${currentCycle.draftNumber}`,
      `Producer requested revisions on Draft ${currentCycle.draftNumber}: ${reviewNotes}. Created Draft ${nextDraftNumber}.`
    );
    createNotification(
      assignedEditor,
      `Revision Requested (Draft ${nextDraftNumber})`,
      `Producer requested revisions on ${prod.title}: "${reviewNotes}". Draft ${nextDraftNumber} is ready to edit.`,
      `/productions/${prod.id}`,
      'REVISION_REQUESTED',
      [
        { label: 'Production', value: prod.title },
        { label: 'Stage', value: `Stage 4: Edit Draft ${nextDraftNumber}` },
        { label: 'Producer Notes', value: reviewNotes },
        { label: 'Priority', value: 'HIGH' },
      ]
    );
  }

  return prod;
}

// 10. STAGE 5 -> Final Producer Approval
export function giveFinalApproval(
  productionId: string,
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod) throw new Error('Production not found.');

  if (!canUserPerform(user, 'FINAL_APPROVAL')) {
    throw new Error('Unauthorized: Only Producers or Administrators can give final approval.');
  }

  if (prod.currentStage !== 'FINAL_APPROVAL') {
    throw new Error(`Invalid stage: Cannot give final approval while at stage ${prod.currentStage}.`);
  }

  const finalAppTask = prod.tasks.find((t) => t.stageName === 'FINAL_APPROVAL');
  if (finalAppTask) {
    finalAppTask.status = 'COMPLETED';
    finalAppTask.completedAt = new Date().toISOString();
  }

  // Advance to FINAL_UPLOAD
  prod.finalApprovedAt = new Date().toISOString();
  prod.currentStage = 'FINAL_UPLOAD';
  prod.updatedAt = new Date().toISOString();

  const assignedEditor = prod.editorId || 'usr_ryan_editor';
  const uploadFinalTask: ProductionTask = {
    id: `tsk_${Date.now()}_final_upload`,
    productionId: prod.id,
    stageName: 'FINAL_UPLOAD',
    title: 'Upload Final Master File (YouTube & Dropbox)',
    assignedUserId: assignedEditor,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: prod.publicationDeadline || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  prod.tasks.push(uploadFinalTask);

  saveDb(db);
  logAudit(
    prod.id,
    user,
    'FINAL_APPROVAL_GIVEN',
    `Final producer approval confirmed by ${user.name}. Activated Stage 6: Final Upload.`
  );
  createNotification(
    assignedEditor,
    'Final Upload Required',
    `Final approval confirmed for ${prod.title}. Please render and upload final master files to YouTube & Dropbox.`,
    `/productions/${prod.id}`,
    'STAGE_HANDOFF',
    [
      { label: 'Production', value: prod.title },
      { label: 'Stage', value: 'Stage 7: Final Upload' },
      { label: 'Action Required', value: 'Upload master video and thumbnail' },
      { label: 'Approved By', value: user.name },
    ]
  );
  return prod;
}

// 11. STAGE 6 -> Final File Upload
export function completeFinalUpload(
  productionId: string,
  urls: {
    youtubeUrl?: string;
    dropboxUrl?: string;
    otherDeliveryUrl?: string;
  },
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod) throw new Error('Production not found.');

  if (prod.currentStage !== 'FINAL_UPLOAD') {
    throw new Error(`Invalid stage: Cannot complete final upload while at stage ${prod.currentStage}.`);
  }

  if (!urls.youtubeUrl && !urls.dropboxUrl && !urls.otherDeliveryUrl) {
    throw new Error('At least one delivery URL (YouTube, Dropbox, or Other) is required.');
  }

  prod.youtubeUrl = urls.youtubeUrl;
  prod.dropboxUrl = urls.dropboxUrl;
  prod.otherDeliveryUrl = urls.otherDeliveryUrl;

  const uploadTask = prod.tasks.find((t) => t.stageName === 'FINAL_UPLOAD');
  if (uploadTask) {
    uploadTask.status = 'COMPLETED';
    uploadTask.completedAt = new Date().toISOString();
  }

  // Advance to PUBLISHED confirmation stage
  prod.currentStage = 'PUBLISHED';
  prod.updatedAt = new Date().toISOString();

  const publishTask: ProductionTask = {
    id: `tsk_${Date.now()}_publish_confirm`,
    productionId: prod.id,
    stageName: 'PUBLISHED',
    title: 'Confirm Publication & Mark Episode Completed',
    assignedUserId: prod.producerId,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: prod.publicationDeadline || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  prod.tasks.push(publishTask);

  saveDb(db);
  logAudit(
    prod.id,
    user,
    'FINAL_UPLOAD_COMPLETED',
    `Final master files uploaded. YouTube: ${urls.youtubeUrl || 'N/A'}, Dropbox: ${urls.dropboxUrl || 'N/A'}.`
  );
  createNotification(
    prod.producerId,
    'Master Uploaded — Ready to Publish',
    `Final master files uploaded for ${prod.title}. Please confirm publication.`,
    `/productions/${prod.id}`
  );
  return prod;
}

// 12. STAGE 7 -> Confirm Publication (Completes production and moves to archive)
export function markPublished(
  productionId: string,
  data: {
    youtubeUrl?: string;
    publicationDate?: string;
  },
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod) throw new Error('Production not found.');

  if (!canUserPerform(user, 'MARK_PUBLISHED')) {
    throw new Error('Unauthorized: Only Producers or Administrators can mark an episode as Published.');
  }

  if (prod.currentStage !== 'PUBLISHED') {
    throw new Error('Cannot mark Published before Final Upload stage has been reached and completed.');
  }

  prod.status = 'COMPLETED';
  prod.publishedAt = data.publicationDate || new Date().toISOString();
  prod.publishedByUserId = user.id;
  if (data.youtubeUrl) prod.youtubeUrl = data.youtubeUrl;
  prod.updatedAt = new Date().toISOString();

  const pubTask = prod.tasks.find((t) => t.stageName === 'PUBLISHED');
  if (pubTask) {
    pubTask.status = 'COMPLETED';
    pubTask.completedAt = new Date().toISOString();
  }

  saveDb(db);
  logAudit(
    prod.id,
    user,
    'EPISODE_PUBLISHED',
    `Production published and marked COMPLETED. Published by ${user.name} on ${prod.publishedAt}.`
  );
  return prod;
}

// 13. Convert Pilot to Show (strictly only when pilot is COMPLETED)
export function convertPilotToShow(
  pilotId: string,
  showData: {
    showName: string;
    hosts: string;
    producerId: string;
    defaultEditorId?: string;
    defaultGraphicsId?: string;
    recordingDay: string;
    publicationDay: string;
    description: string;
    notes?: string;
  },
  user: User
): Show {
  const db = getDb();
  const pilot = db.productions.find((p) => p.id === pilotId);
  if (!pilot || pilot.type !== 'PILOT') {
    throw new Error('Pilot not found.');
  }

  if (!canUserPerform(user, 'CONVERT_PILOT')) {
    throw new Error('Unauthorized: Only Producers or Administrators can convert a pilot.');
  }

  if (pilot.status !== 'COMPLETED') {
    throw new Error('Cannot convert pilot before it has reached COMPLETED status.');
  }

  const showId = `show_${showData.showName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  if (db.shows.some((s) => s.id === showId)) {
    throw new Error('A show with this name already exists.');
  }

  const newShow: Show = {
    id: showId,
    name: showData.showName,
    status: 'ACTIVE',
    hosts: showData.hosts,
    producerId: showData.producerId,
    defaultEditorId: showData.defaultEditorId,
    defaultGraphicsId: showData.defaultGraphicsId,
    recordingDay: showData.recordingDay,
    publicationDay: showData.publicationDay,
    description: showData.description,
    notes: showData.notes,
    createdAt: new Date().toISOString(),
  };

  db.shows.push(newShow);

  if (pilot.pilotDetails) {
    pilot.pilotDetails.convertedToShowId = showId;
    pilot.pilotDetails.convertedAt = new Date().toISOString();
    pilot.pilotDetails.convertedByUserId = user.id;
  }

  saveDb(db);
  logAudit(
    pilot.id,
    user,
    'CONVERT_PILOT_TO_SHOW',
    `Converted completed pilot "${pilot.title}" into regular recurring show "${newShow.name}".`
  );
  return newShow;
}

// 14. Studio Rental Workflow Progression
export function updateRentalStep(
  productionId: string,
  step: 'RECORDING_DONE' | 'FILES_UPLOADED' | 'LINK_SENT_TO_CLIENT' | 'BILLING_SENT_TO_FINANCE',
  payload: {
    clientLink?: string;
    financeBillingDetails?: string;
    financeAgreedAmount?: string;
    financeNotes?: string;
    financeSentDate?: string;
  },
  user: User
): Production {
  const db = getDb();
  const prod = db.productions.find((p) => p.id === productionId);
  if (!prod || prod.type !== 'RENTAL' || !prod.rentalDetails) {
    throw new Error('Studio Rental not found.');
  }

  switch (step) {
    case 'RECORDING_DONE':
      prod.currentStage = 'RECORDING_DONE';
      break;

    case 'FILES_UPLOADED':
      prod.currentStage = 'FILES_UPLOADED';
      break;

    case 'LINK_SENT_TO_CLIENT':
      if (!payload.clientLink || payload.clientLink.trim().length === 0) {
        throw new Error('A valid delivery URL or confirmation link is required for the client.');
      }
      prod.rentalDetails.clientLink = payload.clientLink.trim();
      prod.currentStage = 'LINK_SENT_TO_CLIENT';
      break;

    case 'BILLING_SENT_TO_FINANCE':
      if (!payload.financeBillingDetails || payload.financeBillingDetails.trim().length === 0) {
        throw new Error('Billing/contact details for Finance are required.');
      }
      if (!payload.financeAgreedAmount || payload.financeAgreedAmount.trim().length === 0) {
        throw new Error('Agreed billing amount is required for Finance.');
      }
      prod.rentalDetails.financeBillingDetails = payload.financeBillingDetails.trim();
      prod.rentalDetails.financeAgreedAmount = payload.financeAgreedAmount.trim();
      prod.rentalDetails.financeNotes = payload.financeNotes?.trim();
      prod.rentalDetails.financeSentDate = payload.financeSentDate || new Date().toISOString().split('T')[0];
      prod.currentStage = 'COMPLETED';
      prod.status = 'COMPLETED';
      break;

    default:
      throw new Error('Invalid rental step.');
  }

  prod.updatedAt = new Date().toISOString();
  saveDb(db);
  logAudit(
    prod.id,
    user,
    `RENTAL_STEP_${step}`,
    `Studio rental updated to step ${step}. ${step === 'BILLING_SENT_TO_FINANCE' ? 'Rental COMPLETED.' : ''}`
  );
  return prod;
}

// 15. Create Improvement Suggestion (Author required, >= 100 substantive words)
export function submitImprovement(
  data: {
    title: string;
    currentSituation: string;
    suggestedImprovement: string;
    whyHelpful: string;
    referenceLinks?: string[];
    category: any;
  },
  user: User
): void {
  const combinedText = `${data.currentSituation} ${data.suggestedImprovement} ${data.whyHelpful}`;
  const totalWords = countWords(combinedText);
  if (totalWords < 100) {
    throw new Error(
      `Insufficient detail: Substantive fields require at least 100 words combined (currently ${totalWords} words). Please explain the situation, improvement, and benefits thoroughly.`
    );
  }

  const db = getDb();
  db.improvements.unshift({
    id: `imp_${Date.now()}`,
    title: data.title.trim(),
    currentSituation: data.currentSituation.trim(),
    suggestedImprovement: data.suggestedImprovement.trim(),
    whyHelpful: data.whyHelpful.trim(),
    referenceLinks: data.referenceLinks || [],
    authorId: user.id,
    authorName: user.name,
    category: data.category,
    status: 'SUBMITTED',
    createdAt: new Date().toISOString(),
  });
  saveDb(db);
  logAudit(undefined, user, 'SUBMIT_IMPROVEMENT', `Submitted improvement idea: "${data.title}"`);
}

// 16. Create Anonymous Problem Report (Strictly zero author metadata, requires solution, >= 100 words)
export function submitProblemReport(
  data: {
    title: string;
    problemDescription: string;
    impactDescription: string;
    suggestedSolution: string;
    referenceLinks?: string[];
    isAnonymous: boolean;
  },
  user: User
): void {
  if (!data.suggestedSolution || data.suggestedSolution.trim().length < 10) {
    throw new Error('Every problem report MUST include a meaningful proposed solution.');
  }

  const combinedText = `${data.problemDescription} ${data.impactDescription} ${data.suggestedSolution}`;
  const totalWords = countWords(combinedText);
  if (totalWords < 100) {
    throw new Error(
      `Insufficient detail: Substantive fields require at least 100 words combined (currently ${totalWords} words). Please describe the problem, impact, and your proposed solution thoroughly.`
    );
  }

  const db = getDb();
  // Note: NO authorId or authorName is stored! Airtight anonymity.
  db.anonymousProblemReports.unshift({
    id: `anon_${Date.now()}`,
    title: data.title.trim(),
    problemDescription: data.problemDescription.trim(),
    impactDescription: data.impactDescription.trim(),
    suggestedSolution: data.suggestedSolution.trim(),
    referenceLinks: data.referenceLinks || [],
    status: 'NEW',
    createdAt: new Date().toISOString(),
  });
  saveDb(db);

  if (data.isAnonymous) {
    logAudit(undefined, { id: 'anon', name: 'Anonymous', role: 'TEAM_MEMBER', email: '', jobFunction: 'OTHER', isActive: true, createdAt: '' }, 'SUBMIT_PROBLEM_REPORT_ANONYMOUS', `New problem report submitted anonymously: "${data.title}"`);
  } else {
    logAudit(undefined, user, 'SUBMIT_PROBLEM_REPORT', `New problem report submitted by ${user.name}: "${data.title}"`);
  }
}

// 17. Submit Equipment Request (Must have identifiable product name OR product URL)
export function submitEquipmentRequest(
  data: {
    itemName: string;
    category: any;
    whyNeeded: string;
    urgency: Priority;
    quantity: number;
    estimatedPrice?: string;
    purchaseType?: any;
    productUrl?: string;
    altProductUrl?: string;
    notes?: string;
  },
  user: User
): void {
  if (!data.itemName || data.itemName.trim().length < 4) {
    throw new Error('Please specify a full identifiable product name.');
  }

  // Reject vague submissions such as "Need a monitor"
  const isVague = /^(need a|want a|a|some)\s+(monitor|mouse|keyboard|camera|laptop|computer|mic|light)$/i.test(
    data.itemName.trim()
  );
  if (isVague && (!data.productUrl || !data.productUrl.startsWith('http'))) {
    throw new Error('Vague equipment requests are not allowed. Please provide either a complete product make & model or a direct product link.');
  }

  const db = getDb();
  db.equipmentRequests.unshift({
    id: `eq_${Date.now()}`,
    itemName: data.itemName.trim(),
    category: data.category,
    whyNeeded: data.whyNeeded.trim(),
    urgency: data.urgency,
    requestedById: user.id,
    requestedByName: user.name,
    quantity: data.quantity || 1,
    estimatedPrice: data.estimatedPrice?.trim(),
    purchaseType: data.purchaseType || 'One-Time Purchase',
    productUrl: data.productUrl?.trim(),
    altProductUrl: data.altProductUrl?.trim(),
    notes: data.notes?.trim(),
    status: 'REQUESTED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  saveDb(db);
  logAudit(undefined, user, 'EQUIPMENT_REQUESTED', `Requested equipment: ${data.itemName}`);
}

export function deleteProduction(
  productionId: string,
  user: User
): { success: boolean; message: string; deletedId: string } {
  if (user.role !== 'ADMIN' && user.role !== 'PRODUCER') {
    throw new Error('Unauthorized: Only Administrators and Producers can remove productions.');
  }

  const db = getDb();
  const prodIndex = db.productions.findIndex((p) => p.id === productionId);
  if (prodIndex === -1) {
    throw new Error('Production not found.');
  }

  const prod = db.productions[prodIndex];
  db.productions.splice(prodIndex, 1);

  // Clean up comments related to this production
  db.comments = db.comments.filter((c) => c.productionId !== productionId);

  saveDb(db);

  logAudit(
    undefined,
    user,
    'DELETE_PRODUCTION',
    `${user.name} (${user.role}) removed production task "${prod.title}" [${prod.type}] from the system.`
  );

  return {
    success: true,
    message: `Production "${prod.title}" removed successfully.`,
    deletedId: productionId,
  };
}

export function deleteTask(
  taskId: string,
  user: User
): { success: boolean; message: string; deletedTaskId: string; productionId: string } {
  const db = getDb();
  let foundTask: ProductionTask | undefined;
  let parentProd: Production | undefined;

  for (const prod of db.productions) {
    const t = prod.tasks.find((task) => task.id === taskId);
    if (t) {
      foundTask = t;
      parentProd = prod;
      break;
    }
  }

  if (!foundTask || !parentProd) {
    throw new Error('Task not found.');
  }

  if (
    user.role !== 'ADMIN' &&
    user.role !== 'PRODUCER' &&
    parentProd.producerId !== user.id &&
    foundTask.assignedUserId !== user.id
  ) {
    throw new Error('Unauthorized: You do not have permission to remove this task.');
  }

  parentProd.tasks = parentProd.tasks.filter((t) => t.id !== taskId);
  saveDb(db);

  logAudit(
    parentProd.id,
    user,
    'DELETE_TASK',
    `${user.name} (${user.role}) removed task "${foundTask.title}" from production "${parentProd.title}".`
  );

  return {
    success: true,
    message: `Task "${foundTask.title}" removed successfully.`,
    deletedTaskId: taskId,
    productionId: parentProd.id,
  };
}

