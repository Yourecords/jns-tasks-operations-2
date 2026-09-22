import fs from 'fs';
import path from 'path';
import {
  User,
  Show,
  Production,
  ProductionTask,
  RevisionCycle,
  ProducerPackage,
  FileUploadRecord,
  RentalDetails,
  PilotDetails,
  Comment,
  AuditLog,
  Meeting,
  MeetingActionItem,
  Improvement,
  AnonymousProblemReport,
  ShowIdea,
  EquipmentRequest,
  SystemSettings,
  InAppNotification,
  UserRole,
  Priority,
  WorkflowStage,
  TaskStatus,
  EpisodeWorkflowStage,
  RentalWorkflowStage,
  GearItem,
  GearCheckoutRecord,
  GearCategory,
  GearStatus,
  GearCondition,
  ChatMessage,
  TaxiRide,
  GraphicDesignTask,
} from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'jns_production_data.json');

export interface DatabaseSchema {
  users: User[];
  shows: Show[];
  productions: Production[];
  comments: Comment[];
  auditLogs: AuditLog[];
  meetings: Meeting[];
  improvements: Improvement[];
  anonymousProblemReports: AnonymousProblemReport[];
  showIdeas: ShowIdea[];
  equipmentRequests: EquipmentRequest[];
  systemSettings: SystemSettings;
  notifications: InAppNotification[];
  gearInventory: GearItem[];
  gearCheckouts: GearCheckoutRecord[];
  chatMessages: ChatMessage[];
  taxiRides: TaxiRide[];
  graphicDesignTasks: GraphicDesignTask[];
}

// Initial seed users representing typical production personas
export const SEED_USERS: User[] = [
  {
    id: 'usr_yuri_admin',
    name: 'Yuri',
    fullName: 'Yuri Skvirski',
    email: 'yskvirski@jns.org',
    role: 'ADMIN',
    jobFunction: 'HEAD_OF_PRODUCTION',
    positionDisplay: 'Admin',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr_ahron_studio',
    name: 'Ahron',
    fullName: 'Ahron Wohlgelernter',
    email: 'awohlgel@jns.org',
    role: 'TEAM_MEMBER',
    jobFunction: 'STUDIO_OPERATOR',
    positionDisplay: 'Studio',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr_zach_producer',
    name: 'Zach',
    fullName: 'Zach Sicherman',
    email: 'zsicherman@jns.org',
    role: 'PRODUCER',
    jobFunction: 'PRODUCER',
    positionDisplay: 'Producer',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr_ryan_editor',
    name: 'Ryan',
    fullName: 'Ryan Lifchitz',
    email: 'rlifchitz@jns.org',
    role: 'TEAM_MEMBER',
    jobFunction: 'VIDEO_EDITOR',
    positionDisplay: 'Video Editor',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr_barbara_producer',
    name: 'Barbara',
    fullName: 'Barbara Hanimov',
    email: 'bhanimov@jns.org',
    role: 'PRODUCER',
    jobFunction: 'PRODUCER',
    positionDisplay: 'Producer',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr_olga_editor',
    name: 'Olga',
    fullName: 'Olga Senatov',
    email: 'osenatov@jns.org',
    role: 'TEAM_MEMBER',
    jobFunction: 'VIDEO_EDITOR',
    positionDisplay: 'Video Editor',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr_ksenia_editor',
    name: 'Ksenia',
    fullName: 'Ksenia Pelishenko',
    email: 'kpelishenko@jns.org',
    role: 'TEAM_MEMBER',
    jobFunction: 'VIDEO_EDITOR',
    positionDisplay: 'Video Editor',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'usr_ilia_graphics',
    name: 'Ilia',
    fullName: 'Ilia Molchanov',
    email: 'imolchanov@jns.org',
    role: 'TEAM_MEMBER',
    jobFunction: 'MOTION_GRAPHICS_DESIGNER',
    positionDisplay: 'Graphics',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T08:00:00Z',
  },
];

export const INITIAL_SETTINGS: SystemSettings = {
  organizationName: 'JNS Video Production',
  scheduleUrl: 'https://calendar.google.com/calendar/u/0/r?tab=mc',
  productionEmailUrl: 'https://mail.google.com/mail/?view=cm&fs=1&to=production@jns.org',
  emailNotificationsEnabled: true,
  smtpSenderEmail: 'production@jns.org',
  gettBusinessConfig: {
    connected: false,
    accountId: '',
    companyName: 'Jewish News Syndicate (JNS)',
    clientId: '',
    clientSecret: '',
    environment: 'production',
    defaultCostCenter: 'JNS Video Operations - Jerusalem Studio',
    billingEmail: 'production@jns.org',
    autoDispatchLive: false,
    connectionStatus: 'DISCONNECTED',
    statusMessage: 'Not connected to Gett Business Israel account.',
  },
  lastUpdated: new Date().toISOString(),
};

export const SEED_SHOWS: Show[] = [
  {
    id: 'show_the_quad_shows',
    name: 'The QUAD (Shows)',
    status: 'ACTIVE',
    hosts: 'Fleur Hassan-Nahoum, Vivian Bercovici, Emily Schrader, Guest Co-Hosts',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    defaultGraphicsId: 'usr_ilia_graphics',
    recordingDay: 'Tuesday',
    publicationDay: 'Wednesday',
    description: 'The QUAD flagship 4-woman panel show debating global politics, Middle East strategy, and culture.',
    notes: 'Standard 4-camera studio setup with lower thirds and intro sting.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_the_quad_interviews',
    name: 'The QUAD (interviews)',
    status: 'ACTIVE',
    hosts: 'The QUAD Hosts',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    defaultGraphicsId: 'usr_ilia_graphics',
    recordingDay: 'Wednesday',
    publicationDay: 'Thursday',
    description: 'Feature interviews conducted by The QUAD hosts with high-profile global figures and changemakers.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_axis_of_truth_shows',
    name: 'Axis Of Truth (Shows)',
    status: 'ACTIVE',
    hosts: 'JNS Editorial Team',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    defaultGraphicsId: 'usr_ilia_graphics',
    recordingDay: 'Monday',
    publicationDay: 'Tuesday',
    description: 'Flagship studio discussion analyzing the global axis confronting Western democracies.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_axis_of_truth_interviews',
    name: 'Axis Of Truth (Interviews)',
    status: 'ACTIVE',
    hosts: 'JNS Editorial Team',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    defaultGraphicsId: 'usr_ilia_graphics',
    recordingDay: 'Tuesday',
    publicationDay: 'Wednesday',
    description: 'In-depth one-on-one interviews with international defense and security experts.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_basic_law',
    name: 'Basic Law',
    status: 'ACTIVE',
    hosts: 'Legal Analysts & Guest Scholars',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Wednesday',
    publicationDay: 'Thursday',
    description: 'Constitutional, supreme court, and legislative analysis of Israel’s legal landscape.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_europe_show',
    name: 'Europe Show',
    status: 'ACTIVE',
    hosts: 'European Bureau Correspondents',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Thursday',
    publicationDay: 'Friday',
    description: 'Coverage of European-Israeli diplomacy, EU policy, and antisemitism trends across Europe.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_field_reports',
    name: 'Field Reports',
    status: 'ACTIVE',
    hosts: 'JNS Field Correspondents',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Variable',
    publicationDay: 'Weekly',
    description: 'On-the-ground visual reporting from border regions, Judea & Samaria, and key geopolitical flashpoints.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_fleur_monologs',
    name: 'Fleur Monologs',
    status: 'ACTIVE',
    hosts: 'Fleur Hassan-Nahoum',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Monday',
    publicationDay: 'Tuesday',
    description: 'Sharp, direct monologues and editorial commentary by Fleur Hassan-Nahoum on Middle East affairs.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_israel_undiplomatic',
    name: 'Israel Undiplomatic',
    status: 'ACTIVE',
    hosts: 'Seasoned Foreign Affairs Commentators',
    producerId: 'usr_yuri_admin',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Tuesday',
    publicationDay: 'Wednesday',
    description: 'Unvarnished, straight-talking diplomatic reality checks without diplomatic euphemisms.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_jns_roundtable',
    name: 'JNS Roundtable',
    status: 'ACTIVE',
    hosts: 'Alex Traiman & JNS Senior Editors',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    defaultGraphicsId: 'usr_ilia_graphics',
    recordingDay: 'Thursday',
    publicationDay: 'Friday',
    description: 'Comprehensive weekly editorial roundtable debating the top stories across Israel and the Jewish world.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_jerusalem_minute',
    name: 'Jerusalem Minute',
    status: 'ACTIVE',
    hosts: 'JNS News Desk',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Daily',
    publicationDay: 'Daily',
    description: 'Fast, high-impact 60-second news and analysis briefs direct from Jerusalem.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_judeacation',
    name: 'Judeacation',
    status: 'ACTIVE',
    hosts: 'Historians & Cultural Educators',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Wednesday',
    publicationDay: 'Thursday',
    description: 'Educational explorations into Jewish history, heritage, archaeology, and identity.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_meira_k',
    name: 'Meira K',
    status: 'ACTIVE',
    hosts: 'Meira K',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Monday',
    publicationDay: 'Tuesday',
    description: 'Engaging cultural, social, and human interest interviews and perspectives.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_steve_linde_interviews',
    name: 'Steve Linde Interviews',
    status: 'ACTIVE',
    hosts: 'Steve Linde',
    producerId: 'usr_yuri_admin',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Thursday',
    publicationDay: 'Friday',
    description: 'Premier interviews with statesmen, Nobel laureates, community leaders, and international dignitaries.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_our_middle_east',
    name: 'Our Middle East',
    status: 'ACTIVE',
    hosts: 'Jerusalem Bureau Analysts',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Tuesday',
    publicationDay: 'Wednesday',
    description: 'Regional geopolitical analysis spanning the Abraham Accords, Iran, the Gulf states, and Levantine neighbors.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_sin_filtro',
    name: 'Sin Filtro',
    status: 'ACTIVE',
    hosts: 'Spanish Language Editorial Desk',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Wednesday',
    publicationDay: 'Thursday',
    description: 'JNS Spanish-language flagship program delivering direct reporting to the Hispanic and Latin American world.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_straight_up',
    name: 'Straight Up',
    status: 'ACTIVE',
    hosts: 'Commentators & Guest Contributors',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Thursday',
    publicationDay: 'Friday',
    description: 'Direct, candid, no-nonsense debates on current headlines and contentious media narratives.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_talx',
    name: 'TALX',
    status: 'ACTIVE',
    hosts: 'Host & Media Panelists',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Monday',
    publicationDay: 'Tuesday',
    description: 'Fast-paced, conversational dialogue dissecting media bias and social media trends.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_thinktwice',
    name: 'ThinkTwice',
    status: 'ACTIVE',
    hosts: 'Strategic & Philosophical Thinkers',
    producerId: 'usr_yuri_admin',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Tuesday',
    publicationDay: 'Wednesday',
    description: 'Long-form analytical program challenging prevailing orthodoxies and conventional wisdom.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_true_east',
    name: 'True East',
    status: 'ACTIVE',
    hosts: 'Regional Security Analysts',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Wednesday',
    publicationDay: 'Thursday',
    description: 'In-depth explorations into the true dynamics and history of Eastern Mediterranean and Levantine societies.',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'show_tov_le_yehudim',
    name: 'Tov Le Yehudim',
    status: 'ACTIVE',
    hosts: 'Hebrew & Israeli Affairs Analysts',
    producerId: 'usr_yuri_admin',
    defaultEditorId: 'usr_ryan_editor',
    recordingDay: 'Thursday',
    publicationDay: 'Friday',
    description: 'Engaging Hebrew/Israeli affairs discourse addressing the fundamental question: Is it good for the Jews?',
    createdAt: '2026-01-01T08:00:00Z',
  },
  // Legacy alias to ensure backwards compatibility with tests
  {
    id: 'show_the_quad',
    name: 'The QUAD (Shows)',
    status: 'ACTIVE',
    hosts: 'Fleur Hassan-Nahoum, Vivian Bercovici',
    producerId: 'usr_zach_producer',
    defaultEditorId: 'usr_ryan_editor',
    defaultGraphicsId: 'usr_ilia_graphics',
    recordingDay: 'Tuesday',
    publicationDay: 'Wednesday',
    description: 'The QUAD flagship 4-woman panel show debating global politics, Middle East strategy, and culture.',
    createdAt: '2026-01-01T08:00:00Z',
  },
];


function generateSeedProductions(): Production[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000).toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString().split('T')[0];
  const yesterdayAt11 = `${yesterday}T11:20:00Z`;
  const yesterdayAt14 = `${yesterday}T14:35:00Z`;
  const yesterdayAt18 = `${yesterday}T18:15:00Z`;
  const todayAt12 = `${today}T12:40:00Z`;

  return [
    // 1. One production filming today
    {
      id: 'prod_the_quad_134',
      type: 'EPISODE',
      showId: 'show_the_quad',
      episodeNumber: '134',
      title: 'The Quad — Episode 134',
      status: 'ACTIVE',
      priority: 'HIGH',
      currentStage: 'FILMING',
      filmingDate: today,
      filmingTime: '10:30',
      location: 'IN_STUDIO',
      recordingType: 'IN_STUDIO',
      editingDeadline: tomorrow,
      publicationDeadline: tomorrow,
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      graphicsId: 'usr_ilia_graphics',
      createdAt: yesterday,
      updatedAt: today,
      tasks: [
        {
          id: 'tsk_134_film',
          productionId: 'prod_the_quad_134',
          stageName: 'FILMING',
          title: 'Studio Filming: The Quad Ep 134',
          assignedUserId: 'usr_zach_producer',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: today,
          createdAt: yesterday,
          updatedAt: today,
        },
      ],
      revisionCycles: [],
    },

    // 2. One awaiting producer notes
    {
      id: 'prod_me_focus_89',
      type: 'EPISODE',
      showId: 'show_middle_east_report',
      episodeNumber: '89',
      title: 'Middle East Focus — Episode 89',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'PRODUCER_PACKAGE',
      filmingDate: yesterday,
      editingDeadline: tomorrow,
      publicationDeadline: tomorrow,
      createdById: 'usr_yuri_admin',
      producerId: 'usr_yuri_admin',
      editorId: 'usr_ryan_editor',
      createdAt: twoDaysAgo,
      updatedAt: today,
      fileUploadRecord: {
        id: 'fur_89',
        productionId: 'prod_me_focus_89',
        dropboxPath: '/JNS_RAW/2026-09/ME_Focus_89/',
        editshareLocation: 'Volume1/ME_Focus_Raw/Ep89',
        url: 'https://dropbox.com/jns/me-focus-ep89-raw',
        notes: '3 camera ISOs and stereo boom audio uploaded to EditShare.',
        uploadedById: 'usr_ahron_studio',
        completedAt: yesterdayAt14,
      },
      tasks: [
        {
          id: 'tsk_89_film',
          productionId: 'prod_me_focus_89',
          stageName: 'FILMING',
          title: 'Filming',
          assignedUserId: 'usr_yuri_admin',
          status: 'COMPLETED',
          priority: 'NORMAL',
          completedAt: yesterdayAt11,
          createdAt: twoDaysAgo,
          updatedAt: yesterdayAt11,
        },
        {
          id: 'tsk_89_upload',
          productionId: 'prod_me_focus_89',
          stageName: 'FILES_UPLOADED',
          title: 'Files Uploaded',
          assignedUserId: 'usr_ahron_studio',
          status: 'COMPLETED',
          priority: 'NORMAL',
          completedAt: yesterdayAt14,
          createdAt: yesterday,
          updatedAt: yesterdayAt14,
        },
        {
          id: 'tsk_89_notes',
          productionId: 'prod_me_focus_89',
          stageName: 'PRODUCER_PACKAGE',
          title: 'Producer Notes + B-Roll Ready',
          assignedUserId: 'usr_yuri_admin',
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          dueDate: today,
          createdAt: yesterday,
          updatedAt: today,
        },
      ],
      revisionCycles: [],
    },

    // 3. One Draft 1 being edited
    {
      id: 'prod_the_quad_132',
      type: 'EPISODE',
      showId: 'show_the_quad',
      episodeNumber: '132',
      title: 'The Quad — Episode 132',
      status: 'ACTIVE',
      priority: 'HIGH',
      currentStage: 'EDITING',
      filmingDate: twoDaysAgo,
      editingDeadline: today,
      publicationDeadline: tomorrow,
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      graphicsId: 'usr_ilia_graphics',
      createdAt: twoDaysAgo,
      updatedAt: today,
      producerPackage: {
        id: 'pkg_132',
        productionId: 'prod_the_quad_132',
        editingNotes: 'Tight cut on topic 1. Keep intro stinger to exactly 5 seconds. Use split screen during debate at 08:30.',
        scriptText: 'Script link attached with timestamps for soundbites.',
        brollInstructions: 'Add archival footage for Knesset discussion; insert graphic map for the northern border.',
        graphicsInstructions: 'Lower third for guest Amb. Danny Danon at 03:15.',
        brollLinks: ['https://drive.google.com/jns/broll-knesset-sept-2026'],
        referenceLinks: ['https://jns.org/briefing-notes-sept'],
        completedAt: yesterday,
      },
      fileUploadRecord: {
        id: 'fur_132',
        productionId: 'prod_the_quad_132',
        dropboxPath: '/JNS_RAW/TheQuad_132',
        completedAt: twoDaysAgo,
        uploadedById: 'usr_ahron_studio',
      },
      tasks: [
        {
          id: 'tsk_132_draft1',
          productionId: 'prod_the_quad_132',
          stageName: 'EDITING',
          title: 'Edit Draft 1',
          assignedUserId: 'usr_ryan_editor',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: today,
          createdAt: yesterday,
          updatedAt: today,
        },
      ],
      revisionCycles: [
        {
          id: 'rev_132_1',
          productionId: 'prod_the_quad_132',
          draftNumber: 1,
          status: 'IN_PROGRESS',
          editorId: 'usr_ryan_editor',
          createdAt: yesterday,
        },
      ],
    },

    // 4. One awaiting producer review
    {
      id: 'prod_jns_weekly_44',
      type: 'EPISODE',
      showId: 'show_jns_weekly',
      episodeNumber: '44',
      title: 'JNS Weekly Briefing — Episode 44',
      status: 'ACTIVE',
      priority: 'URGENT',
      currentStage: 'PRODUCER_REVIEW',
      filmingDate: yesterday,
      editingDeadline: today,
      publicationDeadline: today,
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      createdAt: yesterday,
      updatedAt: today,
      tasks: [
        {
          id: 'tsk_44_review',
          productionId: 'prod_jns_weekly_44',
          stageName: 'PRODUCER_REVIEW',
          title: 'Review Draft 1',
          assignedUserId: 'usr_zach_producer',
          status: 'WAITING_FOR_REVIEW',
          priority: 'URGENT',
          dueDate: today,
          createdAt: today,
          updatedAt: today,
        },
      ],
      revisionCycles: [
        {
          id: 'rev_44_1',
          productionId: 'prod_jns_weekly_44',
          draftNumber: 1,
          status: 'READY_FOR_REVIEW',
          editorId: 'usr_ryan_editor',
          reviewLink: 'https://frame.io/player/jns-weekly-44-draft1',
          editorNotes: 'Paced according to rundown. Color graded and audio normalized to -14 LUFS.',
          submittedAt: today,
          createdAt: yesterday,
        },
      ],
    },

    // 5. One requiring Draft 2 (Revision cycle demonstration)
    {
      id: 'prod_the_quad_131',
      type: 'EPISODE',
      showId: 'show_the_quad',
      episodeNumber: '131',
      title: 'The Quad — Episode 131',
      status: 'ACTIVE',
      priority: 'HIGH',
      currentStage: 'EDITING',
      filmingDate: twoDaysAgo,
      editingDeadline: today,
      publicationDeadline: tomorrow,
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      createdAt: twoDaysAgo,
      updatedAt: today,
      tasks: [
        {
          id: 'tsk_131_draft2',
          productionId: 'prod_the_quad_131',
          stageName: 'EDITING',
          title: 'Edit Draft 2 (Revision)',
          assignedUserId: 'usr_ryan_editor',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: today,
          createdAt: today,
          updatedAt: today,
        },
      ],
      revisionCycles: [
        {
          id: 'rev_131_1',
          productionId: 'prod_the_quad_131',
          draftNumber: 1,
          status: 'REVISION_REQUIRED',
          editorId: 'usr_ryan_editor',
          reviewLink: 'https://frame.io/player/the-quad-131-draft1',
          editorNotes: 'First pass ready.',
          submittedAt: yesterday,
          reviewerId: 'usr_zach_producer',
          decision: 'REVISION_REQUIRED',
          reviewNotes: 'Please trim 30 seconds from opening banter. Replace lower third graphic at 04:12 with correct spelling of speaker name.',
          reviewedAt: today,
          createdAt: twoDaysAgo,
        },
        {
          id: 'rev_131_2',
          productionId: 'prod_the_quad_131',
          draftNumber: 2,
          status: 'IN_PROGRESS',
          editorId: 'usr_ryan_editor',
          createdAt: today,
        },
      ],
    },

    // 6. One awaiting final approval
    {
      id: 'prod_me_focus_88',
      type: 'EPISODE',
      showId: 'show_middle_east_report',
      episodeNumber: '88',
      title: 'Middle East Focus — Episode 88',
      status: 'ACTIVE',
      priority: 'HIGH',
      currentStage: 'FINAL_APPROVAL',
      filmingDate: twoDaysAgo,
      editingDeadline: yesterday,
      publicationDeadline: today,
      createdById: 'usr_yuri_admin',
      producerId: 'usr_yuri_admin',
      editorId: 'usr_ryan_editor',
      createdAt: twoDaysAgo,
      updatedAt: today,
      tasks: [
        {
          id: 'tsk_88_final_app',
          productionId: 'prod_me_focus_88',
          stageName: 'FINAL_APPROVAL',
          title: 'Final Producer Approval',
          assignedUserId: 'usr_yuri_admin',
          status: 'WAITING',
          priority: 'HIGH',
          dueDate: today,
          createdAt: today,
          updatedAt: today,
        },
      ],
      revisionCycles: [
        {
          id: 'rev_88_1',
          productionId: 'prod_me_focus_88',
          draftNumber: 1,
          status: 'APPROVED',
          editorId: 'usr_ryan_editor',
          reviewLink: 'https://frame.io/player/me-focus-88-v1',
          editorNotes: 'Clean audio, graphics approved.',
          submittedAt: yesterday,
          reviewerId: 'usr_yuri_admin',
          decision: 'APPROVED',
          reviewNotes: 'Edit looks sharp. Color and captions look great.',
          reviewedAt: today,
          createdAt: twoDaysAgo,
        },
      ],
    },

    // 7. One ready to publish (final upload completed)
    {
      id: 'prod_jns_weekly_43',
      type: 'EPISODE',
      showId: 'show_jns_weekly',
      episodeNumber: '43',
      title: 'JNS Weekly Briefing — Episode 43',
      status: 'ACTIVE',
      priority: 'HIGH',
      currentStage: 'PUBLISHED',
      filmingDate: twoDaysAgo,
      editingDeadline: yesterday,
      publicationDeadline: today,
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      youtubeUrl: 'https://youtube.com/watch?v=demo_jns_weekly_43',
      dropboxUrl: 'https://dropbox.com/jns/master/weekly_43_master.mov',
      createdAt: twoDaysAgo,
      updatedAt: today,
      tasks: [
        {
          id: 'tsk_43_pub',
          productionId: 'prod_jns_weekly_43',
          stageName: 'PUBLISHED',
          title: 'Confirm Publication & Launch',
          assignedUserId: 'usr_zach_producer',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: today,
          createdAt: today,
          updatedAt: today,
        },
      ],
      revisionCycles: [
        {
          id: 'rev_43_1',
          productionId: 'prod_jns_weekly_43',
          draftNumber: 1,
          status: 'APPROVED',
          editorId: 'usr_ryan_editor',
          reviewLink: 'https://frame.io/player/jns43-final',
          submittedAt: yesterday,
          reviewerId: 'usr_zach_producer',
          decision: 'APPROVED',
          reviewedAt: yesterday,
          createdAt: twoDaysAgo,
        },
      ],
    },

    // 8. One overdue task demonstration
    {
      id: 'prod_the_quad_130',
      type: 'EPISODE',
      showId: 'show_the_quad',
      episodeNumber: '130',
      title: 'The Quad — Episode 130 (Overdue Graphic Pack)',
      status: 'ACTIVE',
      priority: 'URGENT',
      currentStage: 'EDITING',
      filmingDate: twoDaysAgo,
      editingDeadline: yesterday,
      publicationDeadline: today,
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      graphicsId: 'usr_ilia_graphics',
      createdAt: twoDaysAgo,
      updatedAt: today,
      tasks: [
        {
          id: 'tsk_130_motion',
          productionId: 'prod_the_quad_130',
          stageName: 'EDITING',
          title: 'Custom Motion Graphic & Title Card',
          assignedUserId: 'usr_ilia_graphics',
          status: 'IN_PROGRESS',
          priority: 'URGENT',
          dueDate: yesterday, // Clearly overdue!
          createdAt: twoDaysAgo,
          updatedAt: today,
        },
      ],
      revisionCycles: [],
    },

    // 9. One blocked task demonstration
    {
      id: 'prod_special_interview_netanyahu',
      type: 'EPISODE',
      showId: 'show_middle_east_report',
      episodeNumber: 'Special',
      title: 'Special Interview — Knesset Bureau ISOs',
      status: 'ACTIVE',
      priority: 'URGENT',
      currentStage: 'EDITING',
      filmingDate: yesterday,
      editingDeadline: today,
      publicationDeadline: today,
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      createdAt: yesterday,
      updatedAt: today,
      tasks: [
        {
          id: 'tsk_spec_blocked',
          productionId: 'prod_special_interview_netanyahu',
          stageName: 'EDITING',
          title: 'Assembly Cut with Foreign ISO audio',
          assignedUserId: 'usr_ryan_editor',
          status: 'BLOCKED',
          priority: 'URGENT',
          dueDate: today,
          blockedReason: 'Audio track 4 is corrupt on card B; missing foreign guest lavalier track.',
          blockedHelper: 'Ahron (Studio Operator) is retrieving backup Zoom F8 recorder card.',
          createdAt: yesterday,
          updatedAt: today,
        },
      ],
      revisionCycles: [],
    },

    // 10. One Pilot production
    {
      id: 'prod_pilot_tech_israel',
      type: 'PILOT',
      title: 'Silicon Wadi: Israel High-Tech Inside (Pilot)',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'FILMING',
      filmingDate: tomorrow,
      editingDeadline: new Date(now.getTime() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
      publicationDeadline: new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      graphicsId: 'usr_ilia_graphics',
      createdAt: yesterday,
      updatedAt: today,
      pilotDetails: {
        id: 'pdet_tech_israel',
        productionId: 'prod_pilot_tech_israel',
        conceptSummary: 'A dynamic 20-minute bi-weekly showcase exploring cutting-edge Israeli defense, cyber, and agricultural tech innovators.',
      },
      tasks: [
        {
          id: 'tsk_pilot_preprod',
          productionId: 'prod_pilot_tech_israel',
          stageName: 'FILMING',
          title: 'Pilot Studio Shoot & Guest Teleprompter Setup',
          assignedUserId: 'usr_ahron_studio',
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          dueDate: tomorrow,
          createdAt: yesterday,
          updatedAt: today,
        },
      ],
      revisionCycles: [],
    },

    // 11. One Studio Rental demonstration
    {
      id: 'prod_rental_bloomberg_01',
      type: 'RENTAL',
      title: 'Studio Rental: Bloomberg TV Live Cross',
      status: 'ACTIVE',
      priority: 'HIGH',
      currentStage: 'RECORDING_DONE',
      filmingDate: today,
      filmingTime: '14:30 - 16:00 IDT',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      createdAt: yesterday,
      updatedAt: today,
      rentalDetails: {
        id: 'rent_det_01',
        productionId: 'prod_rental_bloomberg_01',
        clientName: 'Bloomberg News London',
        projectName: 'Global Markets Live Studio Cross',
        contactName: 'Charlotte Evans',
        contactInfo: 'charlotte.evans@bloomberg.net / +44 20 7330 7500',
        recordingDate: today,
        recordingTime: '14:30 - 16:00 IDT',
        studioSetup: 'Main anchor desk, Live TVU feed + 4K ProRes ISO backup',
        producerId: 'usr_zach_producer',
        agreedPrice: '$1,850',
        hoursCount: '2 hours',
        specialRequirements: 'Live IFB earpiece feed from London control room via fiber line.',
      },
      tasks: [
        {
          id: 'tsk_rent_rec',
          productionId: 'prod_rental_bloomberg_01',
          stageName: 'RECORDING_DONE',
          title: 'Live Studio Transmission & Local ISO Recording',
          assignedUserId: 'usr_ahron_studio',
          status: 'COMPLETED',
          priority: 'HIGH',
          completedAt: todayAt12,
          createdAt: yesterday,
          updatedAt: today,
        },
        {
          id: 'tsk_rent_upload',
          productionId: 'prod_rental_bloomberg_01',
          stageName: 'FILES_UPLOADED',
          title: 'Upload Clean Backup ProRes to Aspera/Dropbox',
          assignedUserId: 'usr_ahron_studio',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: today,
          createdAt: today,
          updatedAt: today,
        },
      ],
      revisionCycles: [],
    },

    // 12. One Completed/Published production for historical record
    {
      id: 'prod_the_quad_129',
      type: 'EPISODE',
      showId: 'show_the_quad',
      episodeNumber: '129',
      title: 'The Quad — Episode 129 (Special Report)',
      status: 'COMPLETED',
      priority: 'NORMAL',
      currentStage: 'PUBLISHED',
      filmingDate: twoDaysAgo,
      editingDeadline: yesterday,
      publicationDeadline: yesterday,
      publishedAt: yesterdayAt18,
      publishedByUserId: 'usr_zach_producer',
      youtubeUrl: 'https://youtube.com/watch?v=the_quad_129_demo',
      dropboxUrl: 'https://dropbox.com/jns/master/the_quad_129_master.mov',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      createdAt: twoDaysAgo,
      updatedAt: yesterday,
      tasks: [],
      revisionCycles: [
        {
          id: 'rev_129_1',
          productionId: 'prod_the_quad_129',
          draftNumber: 1,
          status: 'APPROVED',
          editorId: 'usr_ryan_editor',
          submittedAt: twoDaysAgo,
          reviewerId: 'usr_zach_producer',
          decision: 'APPROVED',
          reviewedAt: yesterday,
          createdAt: twoDaysAgo,
        },
      ],
    },

    // 13. Think Twice (Sunday Shoot & Ryan Edit)
    {
      id: 'prod_think_twice_sun',
      type: 'EPISODE',
      showId: 'show_thinktwice',
      episodeNumber: '42',
      title: 'ThinkTwice — Episode 42',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'PRODUCER_REVIEW',
      filmingDate: '2026-09-13',
      filmingTime: '14:00 - 15:30',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      editingDate: '2026-09-13',
      editingTime: '10:00 - 13:00',
      publicationDeadline: '2026-09-14T19:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-13T08:00:00Z',
      updatedAt: '2026-09-13T08:00:00Z',
    },

    // 14. Axis of Truth (Sunday Shoot & Olga Edit)
    {
      id: 'prod_axis_of_truth_sun',
      type: 'EPISODE',
      showId: 'show_axis_of_truth_shows',
      episodeNumber: '58',
      title: 'Axis Of Truth — Episode 58',
      status: 'ACTIVE',
      priority: 'HIGH',
      currentStage: 'EDITING',
      filmingDate: '2026-09-13',
      filmingTime: '13:00 - 14:00',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_olga_editor',
      editingDate: '2026-09-13',
      editingTime: '10:00 - 14:00',
      publicationDeadline: '2026-09-15T18:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-13T08:00:00Z',
      updatedAt: '2026-09-13T08:00:00Z',
    },

    // 15. Meira K (Sunday Shoot & Ksenia Edit)
    {
      id: 'prod_meira_k_sun',
      type: 'EPISODE',
      showId: 'show_meira_k',
      episodeNumber: '31',
      title: 'Meira K — Episode 31',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'EDITING',
      filmingDate: '2026-09-13',
      filmingTime: '16:00 - 17:00',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ksenia_editor',
      editingDate: '2026-09-13',
      editingTime: '10:00 - 15:00',
      publicationDeadline: '2026-09-15T12:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-13T08:00:00Z',
      updatedAt: '2026-09-13T08:00:00Z',
    },

    // 16. Jerusalem Minute (Sunday Deliverable)
    {
      id: 'prod_jerusalem_minute_sun',
      type: 'EPISODE',
      showId: 'show_jerusalem_minute',
      episodeNumber: '112',
      title: 'Jerusalem Minute — Daily Brief #112',
      status: 'COMPLETED',
      priority: 'URGENT',
      currentStage: 'PUBLISHED',
      filmingDate: '2026-09-13',
      filmingTime: '09:00 - 09:45',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ksenia_editor',
      editingDate: '2026-09-13',
      editingTime: '10:00 - 12:00',
      publicationDeadline: '2026-09-13T17:00:00Z',
      publishedAt: '2026-09-13T17:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-13T08:00:00Z',
      updatedAt: '2026-09-13T08:00:00Z',
    },

    // 17. Straight Up (Monday Shoot & Ryan Edit)
    {
      id: 'prod_straight_up_mon',
      type: 'EPISODE',
      showId: 'show_straight_up',
      episodeNumber: '47',
      title: 'Straight Up — Episode 47',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'EDITING',
      filmingDate: '2026-09-14',
      filmingTime: '10:00 - 12:00',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      editingDate: '2026-09-14',
      editingTime: '13:00 - 17:00',
      publicationDeadline: '2026-09-15T18:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-14T08:00:00Z',
      updatedAt: '2026-09-14T08:00:00Z',
    },

    // 18. Basic Law (Monday Shoot)
    {
      id: 'prod_basic_law_mon',
      type: 'EPISODE',
      showId: 'show_basic_law',
      episodeNumber: '14',
      title: 'Basic Law — Episode 14',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'EDITING',
      filmingDate: '2026-09-14',
      filmingTime: '13:00 - 15:00',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ryan_editor',
      editingDate: '2026-09-15',
      editingTime: '09:00 - 12:00',
      publicationDeadline: '2026-09-17T19:00:00Z',
      publishedAt: '2026-09-17T19:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-14T08:00:00Z',
      updatedAt: '2026-09-14T08:00:00Z',
    },

    // 19. Sin Filtro Spanish Show (Monday Edit)
    {
      id: 'prod_sin_filtro_mon',
      type: 'EPISODE',
      showId: 'show_sin_filtro',
      episodeNumber: '26',
      title: 'Sin Filtro — Episode 26 (Edición Semanal)',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'EDITING',
      filmingDate: '2026-09-14',
      filmingTime: '15:30 - 17:00',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_olga_editor',
      editingDate: '2026-09-14',
      editingTime: '10:00 - 14:00',
      publicationDeadline: '2026-09-16T16:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-14T08:00:00Z',
      updatedAt: '2026-09-14T08:00:00Z',
    },

    // 20. Judeacation (Wednesday Shoot & Olga Edit)
    {
      id: 'prod_judeacation_wed',
      type: 'EPISODE',
      showId: 'show_judeacation',
      episodeNumber: '19',
      title: 'Judeacation — Episode 19: The Ancient Galilee',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'EDITING',
      filmingDate: '2026-09-16',
      filmingTime: '13:00 - 14:30',
      location: 'STUDIO',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_olga_editor',
      editingDate: '2026-09-16',
      editingTime: '10:00 - 13:30',
      publicationDeadline: '2026-09-18T16:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-16T08:00:00Z',
      updatedAt: '2026-09-16T08:00:00Z',
    },

    // 21. Steve Linde Interviews (Thursday Shoot & Olga Edit)
    {
      id: 'prod_steve_linde_thu',
      type: 'EPISODE',
      showId: 'show_steve_linde_interviews',
      episodeNumber: '09',
      title: 'Steve Linde Interviews — Episode 09',
      status: 'ACTIVE',
      priority: 'HIGH',
      currentStage: 'EDITING',
      filmingDate: '2026-09-17',
      filmingTime: '13:00 - 14:30',
      location: 'STUDIO',
      createdById: 'usr_yuri_admin',
      producerId: 'usr_yuri_admin',
      editorId: 'usr_olga_editor',
      editingDate: '2026-09-17',
      editingTime: '11:00 - 15:00',
      publicationDeadline: '2026-09-18T14:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-17T08:00:00Z',
      updatedAt: '2026-09-17T08:00:00Z',
    },

    // 22. Straight Up Remote (Thursday Remote Shoot)
    {
      id: 'prod_straight_up_thu',
      type: 'EPISODE',
      showId: 'show_straight_up',
      episodeNumber: '48',
      title: 'Straight Up — Episode 48: Live From Knesset',
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentStage: 'FILMING',
      filmingDate: '2026-09-17',
      filmingTime: '15:00 - 17:00',
      location: 'REMOTE',
      createdById: 'usr_zach_producer',
      producerId: 'usr_zach_producer',
      editorId: 'usr_ksenia_editor',
      editingDate: '2026-09-17',
      editingTime: '10:00 - 14:00',
      publicationDeadline: '2026-09-18T18:00:00Z',
      tasks: [],
      revisionCycles: [],
      createdAt: '2026-09-17T08:00:00Z',
      updatedAt: '2026-09-17T08:00:00Z',
    },
  ];
}

export const SEED_MEETINGS: Meeting[] = [
  {
    id: 'mtg_weekly_prod_sync_sep',
    title: 'Weekly Production Operations & Studio Capacity Sync',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 - 11:30',
    participants: 'Yuri, Zach, Ryan, Barbara, Olga, Ksenia, Ilia, Ahron',
    writtenById: 'usr_zach_producer',
    writtenByName: 'Zach (Senior Producer)',
    summary: 'Aligned on the production schedule for next week, upcoming studio rental bookings, and standardizing graphics lower thirds.',
    topicsDiscussed: '1. Review of turnaround times for The Quad and Weekly Briefing.\n2. Influx of international news crews requesting studio rental time.\n3. Motion graphics asset library overhaul to eliminate repetitive renders.',
    decisionsMade: '• All raw camera cards must be dumped to EditShare within 60 minutes of wrap.\n• Editors will notify Producers on Frame.io at least 3 hours before publication deadline.\n• Sarah will release the unified 2026 lower-third MOGRT template by Friday.',
    whatChanged: 'Shifted Thursday studio rental block from 11:00 to 14:00 to accommodate live Knesset broadcast.',
    nextSteps: 'Zach to verify teleprompter script sync software upgrade; Ryan to archive August raw footage to LTO tape.',
    importantLinks: ['https://jns.org/production-manual-2026', 'https://frame.io/teams/jns'],
    actionItems: [
      {
        id: 'act_01',
        meetingId: 'mtg_weekly_prod_sync_sep',
        task: 'Publish new unified lower-third MOGRT template for Premiere editors',
        ownerId: 'usr_ilia_graphics',
        ownerName: 'Ilia (Motion Graphics Designer)',
        deadline: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'IN_PROGRESS',
      },
      {
        id: 'act_02',
        meetingId: 'mtg_weekly_prod_sync_sep',
        task: 'Clean up EditShare volume 2 to free 4TB for upcoming studio rentals',
        ownerId: 'usr_ahron_studio',
        ownerName: 'Ahron (Studio Operator)',
        deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'PENDING',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_EQUIPMENT_REQUESTS: EquipmentRequest[] = [
  {
    id: 'eq_req_01',
    itemName: 'SanDisk Professional 48TB G-RAID Shuttle 8 Storage System',
    category: 'Storage',
    whyNeeded: 'Our primary 4K ProRes editing array is currently at 94% capacity. Without dedicated secondary RAID storage for ongoing shows, editors will experience severe frame dropping in Premiere Pro.',
    urgency: 'HIGH',
    requestedById: 'usr_ryan_editor',
    requestedByName: 'Ryan (Lead Video Editor)',
    quantity: 1,
    estimatedPrice: '$3,899',
    productUrl: 'https://www.bhphotovideo.com/c/product/1665476-REG/sandisk_professional_sdph38h_048t_nbaab_48tb_g_raid_shuttle_8.html',
    notes: 'Thunderbolt 3 compatible. Connects directly to lead edit station.',
    status: 'UNDER_REVIEW',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_IMPROVEMENTS: Improvement[] = [
  {
    id: 'imp_01',
    title: 'Automated Ingest Checklists & Proxy Generation Pipeline',
    currentSituation: 'Currently, studio operators copy raw camera cards manually onto EditShare, but the editors frequently have to wait several hours before Premiere Pro finishes generating local editing proxies for multi-cam playback.',
    suggestedImprovement: 'Implement an automatic background ingest script using DaVinci Resolve Studio watch folders to ingest and transcode ProRes Proxy files as soon as cards are mounted.',
    whyHelpful: 'This would completely eliminate editor idle time on shoot days. Ryan and guest editors could open multi-camera timelines within 15 minutes of shoot completion instead of waiting for overnight render queues.',
    referenceLinks: ['https://documents.blackmagicdesign.com/UserManuals/DaVinci_Resolve_Proxy_Generator.pdf'],
    authorId: 'usr_ryan_editor',
    authorName: 'Ryan (Lead Video Editor)',
    category: 'Editing',
    status: 'UNDER_REVIEW',
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
];

export const SEED_ANONYMOUS_REPORTS: AnonymousProblemReport[] = [
  {
    id: 'anon_01',
    title: 'Last-minute script alterations after multi-camera studio wrap',
    problemDescription: 'In several recent productions, substantive editorial script revisions were requested after the hosts and guests had already departed the studio floor. This forces post-production editors to perform unnatural Franken-bite audio cuts and search frantically for filler B-roll to hide jump cuts.',
    impactDescription: 'It adds 3 to 4 hours of tedious repair editing per episode, delays the daily publication window by half a day, and reduces overall viewer engagement because audio cadence sounds visibly patched together.',
    suggestedSolution: 'Institute a mandatory script freeze 30 minutes prior to call time. If a host requires a factual adjustment after recording concludes, schedule a formal 5-minute pickup session in front of the studio microphone rather than expecting editors to patch disjointed syllables together in post.',
    referenceLinks: ['https://jns.org/editorial-standards'],
    status: 'NEW',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
];

export const SEED_SHOW_IDEAS: ShowIdea[] = [
  {
    id: 'idea_01',
    showName: 'Jerusalem Diplomatic Salon',
    concept: 'A monthly high-table roundtable hosted with visiting ambassadors, foreign correspondents, and intelligence scholars discussing regional security treaties over casual dinner-style debate.',
    whyJnsShouldMakeIt: 'JNS has unique access to senior diplomatic personnel in Jerusalem who are eager for thoughtful long-form discussion rather than soundbite-driven cable television interviews. This will establish high prestige and syndication opportunities.',
    targetAudience: 'Policy professionals, think-tank analysts, government leaders, and international geopolitical watchers.',
    suggestedHost: 'Alex Traiman or Fleur Hassan-Nahoum',
    suggestedFormat: '3-person intimate panel with warm cinematic studio lighting and conversational tone',
    suggestedLength: '28 minutes',
    frequency: 'Monthly',
    examplesLinks: ['https://youtube.com/watch?v=diplomatic_reference_example'],
    additionalNotes: 'Can share the main studio setup used for The Quad with minor lighting adjustments.',
    submittedById: 'usr_ilia_graphics',
    submittedByName: 'Ilia (Motion Graphics Designer)',
    category: 'Panel',
    status: 'INTERESTING',
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_01',
    productionId: 'prod_the_quad_132',
    userId: 'usr_zach_producer',
    userName: 'Zach (Senior Producer)',
    action: 'PRODUCER_PACKAGE_COMPLETED',
    details: 'Completed editing notes and attached B-roll reference links for Ryan.',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'log_02',
    productionId: 'prod_the_quad_131',
    userId: 'usr_zach_producer',
    userName: 'Zach (Senior Producer)',
    action: 'REVISION_REQUESTED',
    details: 'Reviewed Draft 1 and requested changes: trim opening banter and fix speaker lower-third.',
    timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'log_03',
    productionId: 'prod_the_quad_131',
    userId: 'usr_ryan_editor',
    userName: 'Ryan (Lead Video Editor)',
    action: 'DRAFT_STARTED',
    details: 'Started editing Draft 2 incorporating revision notes.',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
];

export const SEED_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif_01',
    userId: 'usr_ryan_editor',
    title: 'New Task Assigned',
    message: 'You have been assigned to Edit Draft 1 on The Quad Ep. 132.',
    linkUrl: '/productions/prod_the_quad_132',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'notif_02',
    userId: 'usr_zach_producer',
    title: 'Draft 1 Ready for Review',
    message: 'Ryan has submitted Draft 1 for JNS Weekly Briefing Ep. 44.',
    linkUrl: '/productions/prod_jns_weekly_44',
    isRead: false,
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
];

// Helper to count words for validation rules
export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const SEED_GEAR_INVENTORY: GearItem[] = [
  {
    id: 'gear_cam_fx6_a',
    name: 'Sony FX6 Cinema Camera (Kit A)',
    category: 'Camera',
    model: 'ILME-FX6VK',
    serialNumber: 'SN-FX6-882104',
    barcode: 'JNS-CAM-01',
    location: 'Studio Camera Rack 1',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Includes top handle, smart grip, LCD monitor, 2x Sony 160GB CFexpress-A cards, 2x BP-U70 batteries.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_cam_fx6_b',
    name: 'Sony FX6 Cinema Camera (Kit B)',
    category: 'Camera',
    model: 'ILME-FX6VK',
    serialNumber: 'SN-FX6-882109',
    barcode: 'JNS-CAM-02',
    location: 'Studio Camera Rack 1',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Includes top handle, smart grip, LCD monitor, 2x Sony 160GB CFexpress-A cards, 2x BP-U70 batteries.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_cam_a7s3',
    name: 'Sony A7S III Mobile/B-Cam Rig',
    category: 'Camera',
    model: 'ILCE-7SM3',
    serialNumber: 'SN-A7S3-551029',
    barcode: 'JNS-CAM-03',
    location: 'Pelican Mobile Case 1',
    status: 'CHECKED_OUT',
    condition: 'GOOD',
    notes: 'SmallRig full cage, HDMI clamp, 3x NP-FZ100 batteries, dual charger, 128GB V90 SD.',
    currentCheckoutId: 'chk_gear_01',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-09-11T10:00:00Z',
  },
  {
    id: 'gear_cam_fx3',
    name: 'Sony FX3 Cinema Camera',
    category: 'Camera',
    model: 'ILME-FX3',
    serialNumber: 'SN-FX3-912044',
    barcode: 'JNS-CAM-04',
    location: 'Studio Drawer A',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'XLR handle unit, 2x NP-FZ100 batteries, 160GB CFexpress card.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_lens_2470',
    name: 'Sony FE 24-70mm f/2.8 GM II Lens',
    category: 'Lens',
    model: 'SEL2470GM2',
    serialNumber: 'SN-LNS-771920',
    barcode: 'JNS-LNS-01',
    location: 'Lens Cabinet Shelf 1',
    status: 'CHECKED_OUT',
    condition: 'MINT',
    notes: 'Front/rear caps, hood, B+W 82mm UV filter attached.',
    currentCheckoutId: 'chk_gear_01',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-09-11T10:00:00Z',
  },
  {
    id: 'gear_lens_70200',
    name: 'Sony FE 70-200mm f/2.8 GM OSS II Lens',
    category: 'Lens',
    model: 'SEL70200GM2',
    serialNumber: 'SN-LNS-771988',
    barcode: 'JNS-LNS-02',
    location: 'Lens Cabinet Shelf 1',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Tripod collar, hood, pouch, B+W 77mm UV filter.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_lens_1635',
    name: 'Sony FE 16-35mm f/2.8 GM Lens',
    category: 'Lens',
    model: 'SEL1635GM',
    serialNumber: 'SN-LNS-662310',
    barcode: 'JNS-LNS-03',
    location: 'Lens Cabinet Shelf 1',
    status: 'AVAILABLE',
    condition: 'GOOD',
    notes: 'Ultra-wide angle zoom for studio wide shots.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_lens_50mm',
    name: 'Sony FE 50mm f/1.2 GM Prime Lens',
    category: 'Lens',
    model: 'SEL50F12GM',
    serialNumber: 'SN-LNS-991200',
    barcode: 'JNS-LNS-04',
    location: 'Lens Cabinet Shelf 2',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Fast portrait prime for shallow depth-of-field interviews.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_aud_ewdp_1',
    name: 'Sennheiser EW-DP Wireless ME2 Lav Kit #1',
    category: 'Audio',
    model: 'EW-DP ME2 SET',
    serialNumber: 'SN-SENN-330112',
    barcode: 'JNS-AUD-01',
    location: 'Studio Audio Rack 1',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Digital wireless receiver, bodypack transmitter, ME2 omni mic, BA 70 rechargeable battery.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-09-09T17:30:00Z',
  },
  {
    id: 'gear_aud_ewdp_2',
    name: 'Sennheiser EW-DP Wireless ME2 Lav Kit #2',
    category: 'Audio',
    model: 'EW-DP ME2 SET',
    serialNumber: 'SN-SENN-330119',
    barcode: 'JNS-AUD-02',
    location: 'Studio Audio Rack 1',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Digital wireless receiver, bodypack transmitter, ME2 omni mic, BA 70 battery.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_aud_dji_mic2',
    name: 'DJI Mic 2 Wireless Dual Microphone Kit',
    category: 'Audio',
    model: 'DJI-MIC2-2TX1RX',
    serialNumber: 'SN-DJI-442001',
    barcode: 'JNS-AUD-03',
    location: 'Audio Drawer 2',
    status: 'CHECKED_OUT',
    condition: 'MINT',
    notes: 'Charging case, 2x transmitters with 32-bit float backup recording, 1x receiver, lightning & USB-C adapters.',
    currentCheckoutId: 'chk_gear_01',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-09-11T10:00:00Z',
  },
  {
    id: 'gear_aud_mkh416',
    name: 'Sennheiser MKH 416 Shotgun Microphone Kit',
    category: 'Audio',
    model: 'MKH 416-P48U3',
    serialNumber: 'SN-SENN-120045',
    barcode: 'JNS-AUD-04',
    location: 'Studio Audio Shelf B',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Rycote Softie windshield, pistol grip shockmount, 25ft Mogami XLR cable.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_aud_zoom_f6',
    name: 'Zoom F6 32-Bit Float 6-Channel Field Recorder',
    category: 'Audio',
    model: 'Zoom-F6',
    serialNumber: 'SN-ZM-550991',
    barcode: 'JNS-AUD-05',
    location: 'Audio Drawer 1',
    status: 'AVAILABLE',
    condition: 'GOOD',
    notes: 'Includes PortaBrace field case, 6x XLR inputs, L-mount battery sled, 64GB SD.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_lit_aputure_600d',
    name: 'Aputure LS 600d Pro Daylight LED Monolight',
    category: 'Lighting',
    model: 'Aputure-600d-Pro',
    serialNumber: 'SN-APT-661001',
    barcode: 'JNS-LIT-01',
    location: 'Studio Grip Corner',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'High-output 600W key light with control box, reflector, rolling flight case.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_lit_aputure_300x',
    name: 'Aputure LS 300x Bi-Color LED Monolight',
    category: 'Lighting',
    model: 'Aputure-300x',
    serialNumber: 'SN-APT-330182',
    barcode: 'JNS-LIT-02',
    location: 'Studio Grip Corner',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: '2700K-6500K bi-color fill light with hyper reflector and carrying case.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_lit_dome3',
    name: 'Aputure Light Dome III Softbox (35.4")',
    category: 'Lighting',
    model: 'LightDome-3',
    serialNumber: 'SN-APT-DOME3-01',
    barcode: 'JNS-LIT-03',
    location: 'Studio Grip Shelf',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Quick-folding circular softbox with 1.5/2.5 stop diffusers and 40° fabric grid.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_lit_pavotubes',
    name: 'Nanlite PavoTube II 30X RGB Tubes (2-Light Kit)',
    category: 'Lighting',
    model: 'PavoTube-II-30X-2KIT',
    serialNumber: 'SN-NAN-881290',
    barcode: 'JNS-LIT-04',
    location: 'Lighting Case B',
    status: 'AVAILABLE',
    condition: 'GOOD',
    notes: '4ft RGB pixel tubes with internal battery, power supplies, mounting clips, padded bag.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_grip_manfrotto',
    name: 'Manfrotto 504X Fluid Video Head & 645 FAST Tripod',
    category: 'Grip & Support',
    model: 'MVK504XTWINFC',
    serialNumber: 'SN-MAN-504X-01',
    barcode: 'JNS-GRP-01',
    location: 'Studio Floor Stage A',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Carbon fiber twin-leg tripod with mid-level spreader and quick-release plate.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_grip_ronin_rs3',
    name: 'DJI RS 3 Pro Gimbal Stabilizer Combo',
    category: 'Grip & Support',
    model: 'DJI-RS3-PRO',
    serialNumber: 'SN-DJI-RS3-772',
    barcode: 'JNS-GRP-02',
    location: 'Gimbal Hard Case 1',
    status: 'AVAILABLE',
    condition: 'GOOD',
    notes: 'Includes focus motor, phone holder, raveneye transmitter, brief case handle.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_mon_ninja_v',
    name: 'Atomos Ninja V+ 5.2" 8K HDR Monitor-Recorder',
    category: 'Monitor',
    model: 'ATOMNJVP01',
    serialNumber: 'SN-ATOM-99412',
    barcode: 'JNS-MON-01',
    location: 'Monitor Hard Case',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: 'Includes 1TB Angelbird AtomX SSD, 2x NPF batteries, sunhood, SDI module.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_tx_hollyland',
    name: 'Hollyland Mars 400S Pro Wireless Video Kit',
    category: 'Wireless & Transmission',
    model: 'MARS-400S-PRO',
    serialNumber: 'SN-HL-400S-109',
    barcode: 'JNS-WIR-01',
    location: 'Video Rack 2',
    status: 'AVAILABLE',
    condition: 'GOOD',
    notes: 'Transmitter + Receiver with low latency SDI & HDMI, cold shoe mounts, DC adapters.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'gear_sw_atem_mini',
    name: 'Blackmagic ATEM Mini Extreme ISO Switcher',
    category: 'Wireless & Transmission',
    model: 'ATEM-MINI-EXT-ISO',
    serialNumber: 'SN-BMD-883011',
    barcode: 'JNS-WIR-02',
    location: 'Studio Control Desk',
    status: 'AVAILABLE',
    condition: 'MINT',
    notes: '8-input HDMI live switcher with 9-stream recording, headphone monitor, power supply.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
];

export const SEED_GEAR_CHECKOUTS: GearCheckoutRecord[] = [
  {
    id: 'chk_gear_01',
    gearItemId: 'gear_cam_a7s3',
    gearName: 'Sony A7S III Mobile/B-Cam Rig',
    checkedOutToUserId: 'usr_zach_producer',
    checkedOutToName: 'Zach Sicherman',
    checkedOutToEmail: 'zsicherman@jns.org',
    checkedOutByUserId: 'usr_ahron_studio',
    checkedOutByName: 'Ahron Wohlgelernter',
    projectOrShowName: 'Defense Summit 2026 — On-Location Interview',
    checkoutDate: '2026-09-11T10:00:00.000Z',
    expectedReturnDate: '2026-09-14',
    checkoutNotes: 'Packed in Pelican 1510 with 24-70 GM II and DJI Mic 2 for field shooting.',
    isReturned: false,
  },
  {
    id: 'chk_gear_02',
    gearItemId: 'gear_aud_ewdp_1',
    gearName: 'Sennheiser EW-DP Wireless ME2 Lav Kit #1',
    checkedOutToUserId: 'usr_ryan_editor',
    checkedOutToName: 'Ryan Lifchitz',
    checkedOutToEmail: 'rlifchitz@jns.org',
    checkedOutByUserId: 'usr_yuri_admin',
    checkedOutByName: 'Yuri Skvirski',
    projectOrShowName: 'JNS Weekly — B-Roll Voice Pickup',
    checkoutDate: '2026-09-08T09:00:00.000Z',
    expectedReturnDate: '2026-09-09',
    actualReturnDate: '2026-09-09T17:30:00.000Z',
    checkoutNotes: 'For short in-office pickup audio record.',
    returnNotes: 'Returned cleanly with fully charged battery and pouch.',
    returnCondition: 'MINT',
    isReturned: true,
  },
];

import { getPgPool, saveStateToPostgres, loadStateFromPostgres, registerDbAccess } from './pg';

declare global {
  // eslint-disable-next-line no-var
  var __jnsDbCache: DatabaseSchema | undefined;
}

export function generateSeedChatMessages(): ChatMessage[] {
  const now = new Date();
  const tMinus2h = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const tMinus1h = new Date(now.getTime() - 1 * 3600 * 1000).toISOString();
  const tMinus30m = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const tMinus15m = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

  return [
    {
      id: 'msg_seed_1',
      senderId: 'usr_ahron_studio',
      senderName: 'Ahron',
      senderRole: 'TEAM_MEMBER',
      channelType: 'TEAM',
      content: 'Jerusalem Studio A lighting grid and TVU transmitters tested and ready for filming today.',
      createdAt: tMinus2h,
      readBy: ['usr_ahron_studio', 'usr_yuri_admin'],
    },
    {
      id: 'msg_seed_2',
      senderId: 'usr_zach_producer',
      senderName: 'Zach',
      senderRole: 'PRODUCER',
      channelType: 'TEAM',
      content: 'Guest interviewees arriving for The Quad at 10:15. Please ensure remote backup line is open.',
      productionId: 'prod_the_quad_134',
      productionTitle: 'The Quad — Episode 134',
      createdAt: tMinus1h,
      readBy: ['usr_zach_producer', 'usr_yuri_admin'],
    },
    {
      id: 'msg_seed_3',
      senderId: 'usr_ryan_editor',
      senderName: 'Ryan',
      senderRole: 'TEAM_MEMBER',
      channelType: 'TEAM',
      content: 'Footage and graphics package synced on EditShare volume 1. Working on Draft 1 today.',
      createdAt: tMinus30m,
      readBy: ['usr_ryan_editor', 'usr_yuri_admin'],
    },
    {
      id: 'msg_seed_4',
      senderId: 'usr_zach_producer',
      senderName: 'Zach',
      senderRole: 'PRODUCER',
      channelType: 'DIRECT',
      recipientId: 'usr_yuri_admin',
      content: 'Hey Yuri, could you please take a quick look at the producer package notes for Middle East Focus?',
      productionId: 'prod_me_focus_89',
      productionTitle: 'Middle East Focus — Episode 89',
      createdAt: tMinus15m,
      readBy: ['usr_zach_producer'],
    },
  ];
}

export const SEED_TAXI_RIDES: TaxiRide[] = [
  {
    id: 'ride_seed_001',
    productionId: 'prod_the_quad_880',
    productionTitle: 'The QUAD — Episode 880',
    passengerName: 'Dr. Dan Schueftan',
    passengerPhone: '+972-52-3344556',
    passengerRole: 'GUEST',
    pickupAddress: 'King David Hotel, King David St 23, Jerusalem',
    dropoffAddress: 'JNS Studio, King George St / Jaffa St, Jerusalem',
    direction: 'TO_STUDIO',
    scheduledTime: '2026-09-17T13:15:00.000Z',
    isImmediate: false,
    vehicleType: 'REGULAR',
    status: 'IN_TRANSIT',
    estimatedPriceShekels: 65,
    driver: {
      name: 'Yossi Mizrahi',
      phone: '+972-50-9988776',
      carModel: 'White Skoda Octavia',
      licensePlate: '34-567-89',
      currentEtaMinutes: 7,
    },
    gettOrderId: 'gett_ord_90124',
    trackingUrl: 'https://gett.app/track/ord_90124',
    costCenter: 'The QUAD (Production)',
    notes: 'Wait at main lobby entrance. Guest has briefing folder.',
    orderedByUserId: 'usr_zach_producer',
    orderedByUserName: 'Zach Sicherman',
    createdAt: '2026-09-17T12:45:00.000Z',
    updatedAt: '2026-09-17T13:08:00.000Z',
  },
  {
    id: 'ride_seed_002',
    productionId: 'prod_think_twice_101',
    productionTitle: 'Think Twice — Episode 101',
    passengerName: 'Col. Richard Kemp',
    passengerPhone: '+972-54-1122334',
    passengerRole: 'GUEST',
    pickupAddress: 'Orient Hotel, Emek Refaim St 3, Jerusalem',
    dropoffAddress: 'JNS Studio, King George St / Jaffa St, Jerusalem',
    direction: 'TO_STUDIO',
    scheduledTime: '2026-09-18T09:45:00.000Z',
    isImmediate: false,
    vehicleType: 'PREMIUM',
    status: 'REQUESTED',
    estimatedPriceShekels: 85,
    gettOrderId: 'gett_ord_90125',
    costCenter: 'Think Twice (Production)',
    notes: 'International guest. English speaking driver preferred.',
    orderedByUserId: 'usr_zach_producer',
    orderedByUserName: 'Zach Sicherman',
    createdAt: '2026-09-17T11:00:00.000Z',
    updatedAt: '2026-09-17T11:00:00.000Z',
  },
  {
    id: 'ride_seed_003',
    productionId: 'prod_axis_of_truth_044',
    productionTitle: 'Axis of Truth — Episode 044',
    passengerName: 'Eylon Levy',
    passengerPhone: '+972-50-6677889',
    passengerRole: 'HOST',
    pickupAddress: 'JNS Studio, King George St / Jaffa St, Jerusalem',
    dropoffAddress: 'Ben Gurion Airport, Terminal 3',
    direction: 'FROM_STUDIO',
    scheduledTime: '2026-09-16T17:00:00.000Z',
    isImmediate: false,
    vehicleType: 'XL',
    status: 'COMPLETED',
    estimatedPriceShekels: 320,
    actualPriceShekels: 315,
    driver: {
      name: 'Avi Levi',
      phone: '+972-52-4455667',
      carModel: 'Mercedes V-Class Van',
      licensePlate: '12-345-67',
      currentEtaMinutes: 0,
    },
    gettOrderId: 'gett_ord_88741',
    trackingUrl: 'https://gett.app/track/ord_88741',
    costCenter: 'Executive / Talent Travel',
    notes: 'Airport transfer with 2 equipment flight cases.',
    orderedByUserId: 'usr_yuri_admin',
    orderedByUserName: 'Yuri (Admin)',
    createdAt: '2026-09-16T15:30:00.000Z',
    updatedAt: '2026-09-16T18:15:00.000Z',
  },
];

export const SEED_GRAPHIC_TASKS: GraphicDesignTask[] = [
  {
    id: 'gfx_proj_rebrand_2026',
    type: 'LONG_TERM',
    title: '2026 JNS Channel & Studio Graphics Overhaul',
    projectName: '2026 JNS Channel & Studio Graphics Overhaul',
    description: 'Comprehensive refresh of on-screen channel graphics package, lower thirds, full-screen map animations, breaking news stingers, and virtual studio video wall loops.',
    deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assignedUserId: 'usr_ilia_graphics',
    assignedUserName: 'Ilia Molchanov',
    createdById: 'usr_yuri_admin',
    createdByName: 'Yuri Skvirski',
    subtasks: [
      {
        id: 'sub_gfx_01',
        title: 'Color Palette & Typography Styleguide (4K Broadcast standards)',
        status: 'DONE',
        assignedUserId: 'usr_ilia_graphics',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sub_gfx_02',
        title: 'Unified Lower Thirds MOGRT template for Premiere editors',
        status: 'IMPLEMENTATION',
        assignedUserId: 'usr_ilia_graphics',
        notes: 'Responsive text boxes with auto-scaling character padding for long titles.',
        createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sub_gfx_03',
        title: '3D Middle East Map Projection & Drone flight-path lines',
        status: 'ANIMATION',
        assignedUserId: 'usr_ilia_graphics',
        timing: '00:10 loop',
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sub_gfx_04',
        title: 'Breaking News Stinger with Sound Design',
        status: 'AUDIO',
        assignedUserId: 'usr_ilia_graphics',
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sub_gfx_05',
        title: 'Studio LED Video Wall Background Ambient Loops',
        status: 'CONCEPT',
        assignedUserId: 'usr_ilia_graphics',
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      },
    ],
    assets: [
      {
        id: 'asset_01',
        title: 'JNS Vector Logo Pack (SVG/AI)',
        url: 'https://jns.org/assets/brand-pack.zip',
        type: 'ASSET',
        addedAt: new Date().toISOString(),
      },
    ],
    references: [
      {
        id: 'ref_01',
        title: 'Bloomberg QuickTake Motion Graphics Reference',
        url: 'https://youtube.com/watch?v=demo_motion_ref',
        type: 'REFERENCE',
        addedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gfx_req_iran_deal_quote',
    type: 'IMMEDIATE',
    title: 'Iran Nuclear Deal Quote Card Graphic',
    showId: 'show_the_quad_shows',
    showName: 'The QUAD (Shows)',
    description: 'Quote card for Fleur Hassan-Nahoum segment comparing EU vs US sanctions language. White typography on navy backdrop.',
    timing: '08:45 - 09:10',
    deadline: new Date().toISOString().split('T')[0] + 'T16:00',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    assignedUserId: 'usr_ilia_graphics',
    assignedUserName: 'Ilia Molchanov',
    createdById: 'usr_zach_producer',
    createdByName: 'Zach Sicherman',
    subtasks: [],
    assets: [],
    references: [
      {
        id: 'ref_02',
        title: 'Knesset Press Briefing Reference PDF',
        url: 'https://jns.org/briefings/iran-sanctions-2026.pdf',
        type: 'REFERENCE',
        addedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gfx_req_red_sea_map',
    type: 'IMMEDIATE',
    title: 'Red Sea Naval Corridor Map Animation',
    showId: 'show_axis_of_truth_shows',
    showName: 'Axis Of Truth (Shows)',
    description: 'Map overlay tracing Bab el-Mandeb strait shipping lanes with highlighted radar arcs.',
    timing: '03:20 - 04:00',
    deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0] + 'T12:00',
    priority: 'HIGH',
    status: 'NOT_STARTED',
    assignedUserId: 'usr_ilia_graphics',
    assignedUserName: 'Ilia Molchanov',
    createdById: 'usr_zach_producer',
    createdByName: 'Zach Sicherman',
    subtasks: [],
    assets: [],
    references: [],
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getDb(): DatabaseSchema {
  if (globalThis.__jnsDbCache) {
    return globalThis.__jnsDbCache;
  }

  if (!fs.existsSync(DATA_FILE)) {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        // ignore filesystem mkdir error in strict read-only environments
      }
    }
    const initialData: DatabaseSchema = {
      users: SEED_USERS,
      shows: SEED_SHOWS,
      productions: generateSeedProductions(),
      comments: [],
      auditLogs: SEED_AUDIT_LOGS,
      meetings: SEED_MEETINGS,
      improvements: SEED_IMPROVEMENTS,
      anonymousProblemReports: SEED_ANONYMOUS_REPORTS,
      showIdeas: SEED_SHOW_IDEAS,
      equipmentRequests: SEED_EQUIPMENT_REQUESTS,
      systemSettings: INITIAL_SETTINGS,
      notifications: SEED_NOTIFICATIONS,
      gearInventory: SEED_GEAR_INVENTORY,
      gearCheckouts: SEED_GEAR_CHECKOUTS,
      chatMessages: generateSeedChatMessages(),
      taxiRides: SEED_TAXI_RIDES,
      graphicDesignTasks: SEED_GRAPHIC_TASKS,
    };
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    } catch (e) {
      // ignore
    }
    globalThis.__jnsDbCache = initialData;
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed: DatabaseSchema = JSON.parse(raw);
    let mutated = false;
    if (!parsed.gearInventory) {
      parsed.gearInventory = SEED_GEAR_INVENTORY;
      mutated = true;
    }
    if (!parsed.gearCheckouts) {
      parsed.gearCheckouts = SEED_GEAR_CHECKOUTS;
      mutated = true;
    }
    if (!parsed.chatMessages || parsed.chatMessages.length === 0) {
      parsed.chatMessages = generateSeedChatMessages();
      mutated = true;
    }
    if (!parsed.taxiRides || parsed.taxiRides.length === 0) {
      parsed.taxiRides = SEED_TAXI_RIDES;
      mutated = true;
    }
    if (!parsed.graphicDesignTasks) {
      parsed.graphicDesignTasks = SEED_GRAPHIC_TASKS;
      mutated = true;
    }
    if (parsed.systemSettings && (parsed.systemSettings.productionEmailUrl === 'mailto:production@jns.org' || parsed.systemSettings.productionEmailUrl === 'https://gmail.com')) {
      parsed.systemSettings.productionEmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=production@jns.org';
      mutated = true;
    }
    const ksenia = parsed.users?.find((u) => u.id === 'usr_ksenia_editor');
    if (ksenia && ksenia.email !== 'kpelishenko@jns.org') {
      ksenia.email = 'kpelishenko@jns.org';
      mutated = true;
    }
    if (mutated) {
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch (e) {
        // ignore
      }
    }
    globalThis.__jnsDbCache = parsed;
    return parsed;
  } catch (err) {
    console.error('Failed to parse database file, resetting to defaults', err);
    const fallbackData: DatabaseSchema = {
      users: SEED_USERS,
      shows: SEED_SHOWS,
      productions: generateSeedProductions(),
      comments: [],
      auditLogs: SEED_AUDIT_LOGS,
      meetings: SEED_MEETINGS,
      improvements: SEED_IMPROVEMENTS,
      anonymousProblemReports: SEED_ANONYMOUS_REPORTS,
      showIdeas: SEED_SHOW_IDEAS,
      equipmentRequests: SEED_EQUIPMENT_REQUESTS,
      systemSettings: INITIAL_SETTINGS,
      notifications: SEED_NOTIFICATIONS,
      gearInventory: SEED_GEAR_INVENTORY,
      gearCheckouts: SEED_GEAR_CHECKOUTS,
      chatMessages: generateSeedChatMessages(),
      taxiRides: SEED_TAXI_RIDES,
      graphicDesignTasks: SEED_GRAPHIC_TASKS,
    };
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(fallbackData, null, 2), 'utf-8');
    } catch (e) {
      // ignore
    }
    globalThis.__jnsDbCache = fallbackData;
    return fallbackData;
  }
}

export function saveDb(data: DatabaseSchema): void {
  globalThis.__jnsDbCache = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // ignore filesystem write error
  }

  // If PostgreSQL is configured on Railway, sync asynchronously
  if (process.env.DATABASE_URL) {
    saveStateToPostgres(data).catch((err) => {
      console.error('Async PostgreSQL sync failed in saveDb:', err);
    });
  }
}

export async function getDbAsync(): Promise<DatabaseSchema> {
  if (process.env.DATABASE_URL) {
    const pgState = await loadStateFromPostgres();
    if (pgState && pgState.users && pgState.users.length > 0) {
      let pgMutated = false;
      if (!pgState.gearInventory || pgState.gearInventory.length === 0) {
        pgState.gearInventory = SEED_GEAR_INVENTORY;
        pgMutated = true;
      }
      if (!pgState.gearCheckouts) {
        pgState.gearCheckouts = SEED_GEAR_CHECKOUTS;
        pgMutated = true;
      }
      if (!pgState.chatMessages || pgState.chatMessages.length === 0) {
        pgState.chatMessages = generateSeedChatMessages();
        pgMutated = true;
      }
      if (!pgState.taxiRides || pgState.taxiRides.length === 0) {
        pgState.taxiRides = SEED_TAXI_RIDES;
        pgMutated = true;
      }
      if (!pgState.graphicDesignTasks || pgState.graphicDesignTasks.length === 0) {
        pgState.graphicDesignTasks = SEED_GRAPHIC_TASKS;
        pgMutated = true;
      }
      if (pgMutated) {
        await saveStateToPostgres(pgState);
      }
      globalThis.__jnsDbCache = pgState;
      return pgState;
    }
    // If PostgreSQL schema exists but has no data, seed it directly to PostgreSQL
    const freshData: DatabaseSchema = {
      users: SEED_USERS,
      shows: SEED_SHOWS,
      productions: generateSeedProductions(),
      comments: [],
      auditLogs: SEED_AUDIT_LOGS,
      meetings: SEED_MEETINGS,
      improvements: SEED_IMPROVEMENTS,
      anonymousProblemReports: SEED_ANONYMOUS_REPORTS,
      showIdeas: SEED_SHOW_IDEAS,
      equipmentRequests: SEED_EQUIPMENT_REQUESTS,
      systemSettings: INITIAL_SETTINGS,
      notifications: SEED_NOTIFICATIONS,
      gearInventory: SEED_GEAR_INVENTORY,
      gearCheckouts: SEED_GEAR_CHECKOUTS,
      chatMessages: generateSeedChatMessages(),
      taxiRides: SEED_TAXI_RIDES,
      graphicDesignTasks: SEED_GRAPHIC_TASKS,
    };
    await saveStateToPostgres(freshData);
    globalThis.__jnsDbCache = freshData;
    return freshData;
  }
  return getDb();
}

export async function saveDbAsync(data: DatabaseSchema): Promise<void> {
  globalThis.__jnsDbCache = data;
  if (process.env.DATABASE_URL) {
    // In production, PostgreSQL is the sole source of truth. Do not write to local JSON.
    await saveStateToPostgres(data);
    return;
  }
  saveDb(data);
}

export function resetToSeedData(): DatabaseSchema {
  const freshData: DatabaseSchema = {
    users: SEED_USERS,
    shows: SEED_SHOWS,
    productions: generateSeedProductions(),
    comments: [],
    auditLogs: SEED_AUDIT_LOGS,
    meetings: SEED_MEETINGS,
    improvements: SEED_IMPROVEMENTS,
    anonymousProblemReports: SEED_ANONYMOUS_REPORTS,
    showIdeas: SEED_SHOW_IDEAS,
    equipmentRequests: SEED_EQUIPMENT_REQUESTS,
    systemSettings: INITIAL_SETTINGS,
    notifications: SEED_NOTIFICATIONS,
    gearInventory: SEED_GEAR_INVENTORY,
    gearCheckouts: SEED_GEAR_CHECKOUTS,
    chatMessages: generateSeedChatMessages(),
    taxiRides: SEED_TAXI_RIDES,
    graphicDesignTasks: SEED_GRAPHIC_TASKS,
  };
  saveDb(freshData);
  return freshData;
}

// Register database access helpers with PostgreSQL module
registerDbAccess({ getDbAsync, saveDbAsync });


