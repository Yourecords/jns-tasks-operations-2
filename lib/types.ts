export type UserRole = 'TEAM_MEMBER' | 'PRODUCER' | 'ADMIN';

export type JobFunction =
  | 'HEAD_OF_PRODUCTION'
  | 'PRODUCER'
  | 'VIDEO_EDITOR'
  | 'MOTION_GRAPHICS_DESIGNER'
  | 'GRAPHIC_DESIGNER'
  | 'STUDIO_OPERATOR'
  | 'CAMERAMAN'
  | 'OTHER';

export type MemberType = 'STAFF' | 'TEMPORARY';

export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  jobFunction: JobFunction;
  positionDisplay?: string;
  memberType?: MemberType;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  isImpersonated?: boolean;
  realUser?: {
    id: string;
    name: string;
    role: UserRole;
    email: string;
  };
}

export type ShowStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface Show {
  id: string;
  name: string;
  status: ShowStatus;
  hosts: string;
  producerId: string;
  defaultEditorId?: string;
  defaultGraphicsId?: string;
  recordingDay: string;
  publicationDay: string;
  description: string;
  notes?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export type ProductionType = 'EPISODE' | 'PILOT' | 'RENTAL';
export type ProductionStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type Priority = 'NORMAL' | 'HIGH' | 'URGENT';

export type EpisodeWorkflowStage =
  | 'FILMING'
  | 'FILES_UPLOADED'
  | 'PRODUCER_PACKAGE'
  | 'EDITING'
  | 'PRODUCER_REVIEW'
  | 'FINAL_APPROVAL'
  | 'FINAL_UPLOAD'
  | 'PUBLISHED';

export type RentalWorkflowStage =
  | 'RENTAL_SCHEDULED'
  | 'RECORDING_DONE'
  | 'FILES_UPLOADED'
  | 'LINK_SENT_TO_CLIENT'
  | 'BILLING_SENT_TO_FINANCE'
  | 'COMPLETED';

export type WorkflowStage = EpisodeWorkflowStage | RentalWorkflowStage;

export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'WAITING_FOR_REVIEW'
  | 'REVISION_REQUIRED'
  | 'BLOCKED'
  | 'COMPLETED';

export interface ProductionTask {
  id: string;
  productionId: string;
  stageName: string;
  title: string;
  assignedUserId: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  dueTime?: string;
  completedAt?: string;
  blockedReason?: string;
  blockedHelper?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionCycle {
  id: string;
  productionId: string;
  draftNumber: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REVISION_REQUIRED';
  editorId: string;
  reviewLink?: string;
  editorNotes?: string;
  submittedAt?: string;
  reviewerId?: string;
  decision?: 'APPROVED' | 'REVISION_REQUIRED';
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ProducerPackage {
  id: string;
  productionId: string;
  editingNotes: string;
  scriptText?: string;
  brollInstructions?: string;
  graphicsInstructions?: string;
  brollLinks: string[];
  referenceLinks: string[];
  additionalComments?: string;
  completedAt?: string;
}

export interface FileUploadRecord {
  id: string;
  productionId: string;
  dropboxPath?: string;
  serverPath?: string;
  editshareLocation?: string;
  url?: string;
  notes?: string;
  uploadedById: string;
  completedAt?: string;
}

export interface RentalDetails {
  id: string;
  productionId: string;
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
  clientLink?: string;
  financeBillingDetails?: string;
  financeAgreedAmount?: string;
  financeNotes?: string;
  financeSentDate?: string;
}

export interface PilotDetails {
  id: string;
  productionId: string;
  conceptSummary: string;
  convertedToShowId?: string;
  convertedAt?: string;
  convertedByUserId?: string;
}

export type RecordingType = 'IN_STUDIO' | 'STUDIO_REMOTE_GUEST' | 'FULLY_REMOTE';

export interface Production {
  id: string;
  type: ProductionType;
  showId?: string;
  episodeNumber?: string;
  title: string;
  status: ProductionStatus;
  priority: Priority;
  currentStage: WorkflowStage;
  filmingDate?: string;
  filmingTime?: string;
  location?: RecordingType | 'STUDIO' | 'REMOTE';
  recordingType?: RecordingType;
  editingDate?: string;
  editingTime?: string;
  editingDeadline?: string;
  publicationDeadline?: string;
  publishedAt?: string;
  publishedByUserId?: string;
  finalApprovedAt?: string;
  youtubeUrl?: string;
  dropboxUrl?: string;
  otherDeliveryUrl?: string;
  createdById: string;
  producerId: string;
  editorId?: string;
  graphicsId?: string;
  createdAt: string;
  updatedAt: string;

  // Polymorphic relation references
  tasks: ProductionTask[];
  revisionCycles: RevisionCycle[];
  producerPackage?: ProducerPackage;
  fileUploadRecord?: FileUploadRecord;
  rentalDetails?: RentalDetails;
  pilotDetails?: PilotDetails;
}

export interface Comment {
  id: string;
  productionId: string;
  taskId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  productionId?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface MeetingActionItem {
  id: string;
  meetingId: string;
  task: string;
  ownerId: string;
  ownerName: string;
  deadline: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  links?: string[];
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time?: string;
  participants: string;
  writtenById: string;
  writtenByName: string;
  summary: string;
  topicsDiscussed: string;
  decisionsMade: string;
  whatChanged: string;
  nextSteps: string;
  importantLinks?: string[];
  actionItems: MeetingActionItem[];
  createdAt: string;
  updatedAt: string;
}

export type ImprovementCategory =
  | 'Production Workflow'
  | 'Editing'
  | 'Graphics'
  | 'Studio'
  | 'Equipment'
  | 'Communication'
  | 'Scheduling'
  | 'Content'
  | 'Technical'
  | 'Other';

export interface Improvement {
  id: string;
  title: string;
  currentSituation: string;
  suggestedImprovement: string;
  whyHelpful: string;
  referenceLinks?: string[];
  authorId: string;
  authorName: string;
  category: ImprovementCategory;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'IMPLEMENTED' | 'DECLINED';
  createdAt: string;
}

export interface AnonymousProblemReport {
  id: string;
  title: string;
  problemDescription: string;
  impactDescription: string;
  suggestedSolution: string;
  referenceLinks?: string[];
  status: 'NEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

export type ShowIdeaCategory =
  | 'Studio Show'
  | 'Interview'
  | 'Panel'
  | 'Monologue'
  | 'Podcast'
  | 'Field Report'
  | 'Documentary / Feature'
  | 'Short-Form'
  | 'Spanish Content'
  | 'Hebrew Content'
  | 'Other';

export type ShowIdeaStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'INTERESTING'
  | 'PILOT_CONSIDERED'
  | 'APPROVED_FOR_PILOT'
  | 'REJECTED'
  | 'ARCHIVED';

export interface ShowIdea {
  id: string;
  showName: string;
  concept: string;
  whyJnsShouldMakeIt: string;
  targetAudience: string;
  suggestedHost?: string;
  suggestedFormat: string;
  suggestedLength: string;
  frequency?: string;
  examplesLinks?: string[];
  additionalNotes?: string;
  submittedById: string;
  submittedByName: string;
  category: ShowIdeaCategory;
  status: ShowIdeaStatus;
  createdAt: string;
}

export type EquipmentCategory =
  | 'Computer'
  | 'Monitor'
  | 'Mouse'
  | 'Keyboard'
  | 'Storage'
  | 'Studio equipment'
  | 'Camera equipment'
  | 'Audio'
  | 'Lighting'
  | 'Furniture'
  | 'Software'
  | 'Accessories'
  | 'Replacement parts'
  | 'Repair'
  | 'Other';

export type EquipmentStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'ORDERED'
  | 'RECEIVED'
  | 'REJECTED'
  | 'DEFERRED';

export type EquipmentPurchaseType = 'One-Time Purchase' | 'Monthly Subscription' | 'Annual Subscription';

export interface EquipmentRequest {
  id: string;
  itemName: string;
  category: EquipmentCategory;
  whyNeeded: string;
  urgency: Priority;
  requestedById: string;
  requestedByName: string;
  quantity: number;
  estimatedPrice?: string;
  purchaseType?: EquipmentPurchaseType;
  productUrl?: string;
  altProductUrl?: string;
  notes?: string;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AutomatedEmailAlertSettings {
  enabled: boolean;
  morningDigestTime: string; // e.g. "08:30"
  deadlineReminderTime: string; // e.g. "16:00"
  includeTaskAssignments: boolean;
  includeStageHandoffs: boolean;
  includeBlockerAlerts: boolean;
  includeDeadlineReminders: boolean;
  includeProducerApprovals: boolean;
  includeWeekendAlerts: boolean;
  targetRoles: ('PRODUCER' | 'ADMIN' | 'TEAM_MEMBER')[];
}

export interface GettBusinessConfig {
  connected: boolean;
  accountId?: string; // JNS Corporate Account ID (e.g. JNS-IL-98124)
  companyName?: string; // e.g. Jewish News Syndicate (JNS)
  clientId?: string;
  clientSecret?: string;
  environment?: 'production' | 'sandbox';
  defaultCostCenter?: string; // e.g. JNS Video Operations - Jerusalem Studio
  billingEmail?: string;
  autoDispatchLive?: boolean;
  lastTestedAt?: string;
  connectionStatus?: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  statusMessage?: string;
}

export interface SystemSettings {
  scheduleUrl: string;
  productionEmailUrl: string;
  organizationName: string;
  emailNotificationsEnabled?: boolean;
  smtpSenderEmail?: string;
  emailAlertConfig?: AutomatedEmailAlertSettings;
  gettBusinessConfig?: GettBusinessConfig;
  lastUpdated: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
}

// Gear Log & Equipment Checkout Interfaces
export type GearCategory =
  | 'Camera'
  | 'Lens'
  | 'Audio'
  | 'Lighting'
  | 'Grip & Support'
  | 'Monitor'
  | 'Wireless & Transmission'
  | 'Accessories';

export type GearStatus = 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE' | 'DECOMMISSIONED';
export type GearCondition = 'MINT' | 'GOOD' | 'FAIR' | 'NEEDS_REPAIR' | 'DAMAGED';

export interface GearItem {
  id: string;
  name: string;
  category: GearCategory;
  model: string;
  serialNumber: string;
  barcode?: string;
  location: string;
  status: GearStatus;
  condition: GearCondition;
  notes?: string;
  currentCheckoutId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GearCheckoutRecord {
  id: string;
  gearItemId: string;
  gearName: string;
  checkedOutToUserId: string;
  checkedOutToName: string;
  checkedOutToEmail: string;
  checkedOutByUserId: string;
  checkedOutByName: string;
  projectOrShowName?: string;
  checkoutDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  checkoutNotes?: string;
  returnNotes?: string;
  returnCondition?: GearCondition;
  isReturned: boolean;
}

// Production Velocity & Analytics Interfaces
export interface VelocityMetric {
  showId?: string;
  showName?: string;
  metric1Hours: number | null; // Footage upload -> Editor notes ready
  metric2Hours: number | null; // Editor notes ready -> Draft 1 submitted
  metric3Hours: number | null; // Footage upload -> Final episode approval
  sampleCount: number;
}

export interface ProducerPerformance {
  producerId: string;
  producerName: string;
  completedPackagesCount: number;
  avgHoursToEditorNotes: number | null;
  episodesProducedCount: number;
}

export interface EditorPerformance {
  editorId: string;
  editorName: string;
  draftsDeliveredCount: number;
  avgHoursToFirstDraft: number | null;
  totalRevisionCyclesAvg: number | null;
}

export interface AnalyticsSummary {
  overallVelocity: {
    metric1HoursAvg: number | null;
    metric2HoursAvg: number | null;
    metric3HoursAvg: number | null;
    completedEpisodesCount: number;
  };
  showBreakdown: VelocityMetric[];
  producers: ProducerPerformance[];
  editors: EditorPerformance[];
}

// In-App Messaging Interfaces
export type MessageChannelType = 'TEAM' | 'DIRECT';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: UserRole;
  senderAvatar?: string;
  channelType: MessageChannelType;
  recipientId?: string; // Required for DIRECT messages
  content: string;
  productionId?: string; // Optional attached production reference
  productionTitle?: string;
  createdAt: string;
  readBy?: string[]; // IDs of users who have read this message
  isEdited?: boolean;
  editedAt?: string;
}

// Gett Taxi Dispatch Interfaces
export type TaxiStatus =
  | 'REQUESTED'
  | 'DISPATCHED'
  | 'ARRIVED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type TaxiVehicleType = 'REGULAR' | 'XL' | 'PREMIUM';
export type TaxiDirection = 'TO_STUDIO' | 'FROM_STUDIO' | 'CUSTOM';
export type TaxiPassengerRole = 'GUEST' | 'HOST' | 'TEAM_MEMBER';

export interface TaxiRide {
  id: string;
  productionId?: string;
  productionTitle?: string;
  passengerName: string;
  passengerPhone: string;
  passengerRole: TaxiPassengerRole;
  pickupAddress: string;
  dropoffAddress: string;
  direction: TaxiDirection;
  scheduledTime: string; // ISO string
  isImmediate: boolean;
  vehicleType: TaxiVehicleType;
  status: TaxiStatus;
  estimatedPriceShekels: number;
  actualPriceShekels?: number;
  driver?: {
    name: string;
    phone: string;
    carModel: string;
    licensePlate: string;
    currentEtaMinutes?: number;
  };
  gettOrderId?: string;
  gettBusinessAccountId?: string;
  isCorporateRide?: boolean;
  trackingUrl?: string;
  costCenter?: string;
  notes?: string;
  orderedByUserId: string;
  orderedByUserName: string;
  createdAt: string;
  updatedAt: string;
}

// Graphic Design Task Interfaces
export type GraphicTaskType = 'LONG_TERM' | 'IMMEDIATE';

export type GraphicSubtaskStatus =
  | 'NOT_STARTED'
  | 'CONCEPT'
  | 'DESIGN'
  | 'ANIMATION'
  | 'IMPLEMENTATION'
  | 'FINALIZING'
  | 'AUDIO'
  | 'DONE';

export interface GraphicSubtask {
  id: string;
  title: string;
  status: GraphicSubtaskStatus;
  assignedUserId?: string;
  notes?: string;
  timing?: string;
  assetUrls?: string[];
  referenceUrls?: string[];
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type GraphicTaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'REVISION_REQUIRED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface GraphicAssetLink {
  id: string;
  title: string;
  url: string;
  type?: 'ASSET' | 'REFERENCE';
  addedByUserId?: string;
  addedAt: string;
  mediaId?: string;
  mime?: string;
  bytes?: number;
}

export interface GraphicDesignTask {
  id: string;
  type: GraphicTaskType;
  title: string;
  projectName?: string;
  showId?: string;
  showName?: string;
  productionId?: string;
  productionTitle?: string;
  description?: string;
  timing?: string;
  deadline?: string;
  priority: Priority;
  status: GraphicTaskStatus;
  assignedUserId: string;
  assignedUserName?: string;
  createdById: string;
  createdByName?: string;
  subtasks: GraphicSubtask[];
  assets: GraphicAssetLink[];
  references: GraphicAssetLink[];
  deliverableUrl?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}


