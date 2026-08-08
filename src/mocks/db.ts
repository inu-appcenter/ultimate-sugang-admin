export type Term = 'FIRST' | 'SECOND' | 'SUMMER' | 'WINTER';
export type Strategy = 'INITIAL' | 'UPSERT' | 'REPLACE';
export type JobStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';
export type Phase = 'COURSE_FETCH' | 'TIMETABLE_FETCH' | 'PERSIST';
export type ChangeType = 'CREATED' | 'UPDATED' | 'CLOSED' | 'WARNING';

export interface SemesterRef {
  academicYear: number;
  term: Term;
}

export interface JobProgress {
  phase: Phase;
  current: number;
  total: number | null;
}

export interface JobRecord {
  jobId: number;
  academicYear: number;
  term: Term;
  strategy: Strategy;
  status: JobStatus;
  executedBy: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  fetchedCourseCount: number | null;
  fetchedScheduleCount: number | null;
  createdCount: number | null;
  updatedCount: number | null;
  closedCount: number | null;
  warningCount: number | null;
  progress: JobProgress | null;
  partiallyApplied: boolean;
  failureReason: string | null;
}

export interface DetailRecord {
  changeType: ChangeType;
  haksuCode: string;
  courseName: string | null;
  changedFields: Array<{ field: string; before: string; after: string }> | null;
  reason: string | null;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const pad2 = (n: number) => String(n).padStart(2, '0');

export function toKstLocalString(epochMs: number): string {
  const totalSeconds = Math.floor((epochMs + KST_OFFSET_MS) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const secondOfDay = totalSeconds - days * 86400;

  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);

  const hh = pad2(Math.floor(secondOfDay / 3600));
  const mm = pad2(Math.floor((secondOfDay % 3600) / 60));
  const ss = pad2(secondOfDay % 60);
  return `${year}-${pad2(month)}-${pad2(day)}T${hh}:${mm}:${ss}`;
}

export const nowKst = () => toKstLocalString(Date.now());

const ADMIN_NAME = '김학사';

const successJob = (
  jobId: number,
  startedAt: string,
  overrides: Partial<JobRecord> = {},
): JobRecord => ({
  jobId,
  academicYear: 2026,
  term: 'FIRST',
  strategy: 'UPSERT',
  status: 'SUCCESS',
  executedBy: ADMIN_NAME,
  startedAt,
  finishedAt: `${startedAt.slice(0, 17)}47`,
  durationSeconds: 107,
  fetchedCourseCount: 1215,
  fetchedScheduleCount: 2891,
  createdCount: 4,
  updatedCount: 18,
  closedCount: 1,
  warningCount: 0,
  progress: null,
  partiallyApplied: false,
  failureReason: null,
  ...overrides,
});

const seedJobs = (): JobRecord[] => [
  successJob(41, '2026-08-05T14:22:00', {
    createdCount: 12,
    updatedCount: 45,
    closedCount: 3,
    warningCount: 2,
  }),
  {
    jobId: 40,
    academicYear: 2026,
    term: 'FIRST',
    strategy: 'UPSERT',
    status: 'FAILED',
    executedBy: ADMIN_NAME,
    startedAt: '2026-07-28T16:40:00',
    finishedAt: '2026-07-28T16:40:12',
    durationSeconds: 12,
    fetchedCourseCount: null,
    fetchedScheduleCount: null,
    createdCount: null,
    updatedCount: null,
    closedCount: null,
    warningCount: null,
    progress: null,
    partiallyApplied: false,
    failureReason: '학교 API 호출 실패 (429 Too Many Requests) — PAGE 7',
  },
  successJob(39, '2026-07-20T09:05:00', {
    strategy: 'REPLACE',
    createdCount: 1203,
    updatedCount: 0,
    closedCount: 0,
    partiallyApplied: true,
  }),
  successJob(38, '2026-07-15T11:30:00'),
  successJob(37, '2026-07-10T10:12:00'),
  successJob(36, '2026-07-03T17:44:00'),
  successJob(35, '2026-06-27T13:08:00'),
  successJob(34, '2026-06-20T15:51:00'),
  successJob(33, '2026-06-13T09:37:00'),
  successJob(32, '2026-06-06T14:02:00'),
  successJob(31, '2026-05-30T16:19:00'),
  successJob(30, '2026-05-23T10:45:00', {
    strategy: 'INITIAL',
    createdCount: 1180,
    updatedCount: 0,
    closedCount: 0,
  }),
];

const UPDATED_SAMPLES: Array<[string, string, string, string, string]> = [
  ['0000018001', '신소재공학실험(1)', 'schedule', '월1,2 (4호관301)', '월1,2 (4호관305)'],
  ['0000018014', '유기화학', 'credits', '2', '3'],
  ['0000018027', '컴퓨터구조', 'department', '컴퓨터공학부', '정보통신공학과'],
  ['0000018033', '이산수학', 'grade', '2', '1'],
  ['0000018049', '자료구조', 'titleKr', '자료구조론', '자료구조'],
  ['0000018050', '알고리즘', 'schedule', '화3,4 (7호관102)', '화3,4 (7호관205)'],
  ['0000018061', '운영체제', 'classification', '전공선택', '전공필수'],
  ['0000018072', '데이터베이스', 'type', '이론', '이론+실습'],
  ['0000018088', '네트워크', 'isEnglishCourse', 'false', 'true'],
  ['0000018090', '소프트웨어공학', 'courseCode', 'CSE301', 'CSE302'],
  ['0000018103', '기계학습', 'college', '정보기술대학', '공과대학'],
  ['0000018117', '영상처리', 'area', '핵심교양', '일반교양'],
];

const seedDetails = (): DetailRecord[] => [
  ...UPDATED_SAMPLES.map(([haksuCode, courseName, field, before, after]) => ({
    changeType: 'UPDATED' as const,
    haksuCode,
    courseName,
    changedFields: [{ field, before, after }],
    reason: null,
  })),
  ...['0000019001', '0000019002', '0000019003'].map((haksuCode, i) => ({
    changeType: 'CREATED' as const,
    haksuCode,
    courseName: `신규개설과목${i + 1}`,
    changedFields: null,
    reason: null,
  })),
  {
    changeType: 'CLOSED',
    haksuCode: '0000017005',
    courseName: '폐강된교양',
    changedFields: null,
    reason: null,
  },
  {
    changeType: 'WARNING',
    haksuCode: '0000017911',
    courseName: '미매핑이수구분과목',
    changedFields: null,
    reason: '미등록 이수구분 코드: 99',
  },
  {
    changeType: 'WARNING',
    haksuCode: '0000017912',
    courseName: null,
    changedFields: null,
    reason: '미등록 단과대학 코드: 77',
  },
];

interface MockState {
  displaySemester: SemesterRef | null;
  loadedSemester: SemesterRef | null;
  courseCount: number;
  scheduleCount: number;
  jobs: JobRecord[];
  details: Map<number, DetailRecord[]>;
  validTokens: Set<string>;
  refreshBlocked: boolean;
  nextJobId: number;
  nextTokenId: number;
}

const initialState = (): MockState => ({
  displaySemester: { academicYear: 2026, term: 'SECOND' },
  loadedSemester: { academicYear: 2026, term: 'FIRST' },
  courseCount: 1203,
  scheduleCount: 2847,
  jobs: seedJobs(),
  details: new Map([[41, seedDetails()]]),
  validTokens: new Set<string>(),
  refreshBlocked: false,
  nextJobId: 42,
  nextTokenId: 1,
});

let state = initialState();

const JOB_TIMELINE: Array<{ atMs: number; progress: JobProgress }> = [
  { atMs: 0, progress: { phase: 'COURSE_FETCH', current: 0, total: null } },
  { atMs: 2_000, progress: { phase: 'COURSE_FETCH', current: 1, total: 12 } },
  { atMs: 8_000, progress: { phase: 'TIMETABLE_FETCH', current: 3, total: 28 } },
  { atMs: 16_000, progress: { phase: 'PERSIST', current: 450, total: 1203 } },
];
const JOB_FINISH_MS = 22_000;
const JOB_DURATION_SECONDS = JOB_FINISH_MS / 1000;

function finishJob(job: JobRecord): void {
  job.status = 'SUCCESS';
  job.progress = null;
  job.finishedAt = toKstLocalString(Date.now());
  job.durationSeconds = JOB_DURATION_SECONDS;
  job.fetchedCourseCount = 1215;
  job.fetchedScheduleCount = 2891;
  job.createdCount = job.strategy === 'UPSERT' ? 12 : 1215;
  job.updatedCount = job.strategy === 'UPSERT' ? 45 : 0;
  job.closedCount = job.strategy === 'UPSERT' ? 3 : 0;
  job.warningCount = 2;

  state.details.set(job.jobId, seedDetails());
  state.loadedSemester = { academicYear: job.academicYear, term: job.term };
  state.courseCount = 1215;
  state.scheduleCount = 2891;
}

function runJob(job: JobRecord): void {
  for (const step of JOB_TIMELINE) {
    setTimeout(() => {
      if (job.status === 'RUNNING') job.progress = step.progress;
    }, step.atMs);
  }
  setTimeout(() => {
    if (job.status === 'RUNNING') finishJob(job);
  }, JOB_FINISH_MS);
}

export const mockDb = {
  get state() {
    return state;
  },

  reset: () => {
    state = initialState();
  },

  issueToken: () => {
    const token = `mock-access-token-${state.nextTokenId}`;
    state.nextTokenId += 1;
    state.validTokens.add(token);
    return token;
  },
  isValidToken: (token: string) => state.validTokens.has(token),
  expireTokens: () => {
    state.validTokens.clear();
  },
  setRefreshBlocked: (blocked: boolean) => {
    state.refreshBlocked = blocked;
  },

  findJob: (jobId: number) => state.jobs.find((job) => job.jobId === jobId),
  findRunningJob: () => state.jobs.find((job) => job.status === 'RUNNING'),

  decideStrategy: (target: SemesterRef): Strategy => {
    const current = state.loadedSemester;
    if (current === null) return 'INITIAL';
    const same = current.academicYear === target.academicYear && current.term === target.term;
    return same ? 'UPSERT' : 'REPLACE';
  },

  deleteCounts: (strategy: Strategy) =>
    strategy === 'REPLACE'
      ? { courses: state.courseCount, schedules: state.scheduleCount, carts: 87, registrations: 41 }
      : { courses: 0, schedules: 0, carts: 0, registrations: 0 },

  createJob: (target: SemesterRef, strategy: Strategy, executedBy: string): JobRecord => {
    const job: JobRecord = {
      jobId: state.nextJobId,
      academicYear: target.academicYear,
      term: target.term,
      strategy,
      status: 'RUNNING',
      executedBy,
      startedAt: nowKst(),
      finishedAt: null,
      durationSeconds: null,
      fetchedCourseCount: null,
      fetchedScheduleCount: null,
      createdCount: null,
      updatedCount: null,
      closedCount: null,
      warningCount: null,
      progress: { phase: 'COURSE_FETCH', current: 0, total: null },
      partiallyApplied: false,
      failureReason: null,
    };
    state.nextJobId += 1;
    state.jobs.unshift(job);
    runJob(job);
    return job;
  },

  detailsOf: (jobId: number, changeType: ChangeType) =>
    (state.details.get(jobId) ?? [])
      .filter((detail) => detail.changeType === changeType)
      .sort((a, b) => a.haksuCode.localeCompare(b.haksuCode)),
};

export const MOCK_ADMIN = { loginId: 'haksa01', password: 'uss1234!', name: ADMIN_NAME };
