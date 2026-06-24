export type IssueStatus = 'open' | 'in_progress' | 'resolved';
export type IssueType =
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'task'
  | 'regression'
  | 'investigation'
  | 'design'
  | 'documentation'
  | 'support'
  | 'question';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ReviewState = 'commented' | 'approved' | 'requested_changes';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  description: string;
  color?: string | null;
  contextStatus: 'pending' | 'generating' | 'ready' | 'failed';
  issueCount: number;
  activeCount: number;
}

export interface Label {
  id: string;
  name: string;
  color?: string | null;
}

export interface Issue {
  id: string;
  projectId: string;
  issueKey: string;
  type: IssueType;
  title: string;
  description: string;
  status: IssueStatus;
  severity?: Severity | null;
  priority?: string | null;
  environment?: string | null;
  expectedResult?: string | null;
  actualResult?: string | null;
  acceptanceCriteria: string[];
  stepsToReproduce: string[];
  labels: Label[];
  reporter?: User | null;
  assignee?: User | null;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number; files: number };
  files?: { file: FileRef; purpose: string }[];
  comments?: Comment[];
  project?: { id: string; key: string; name: string };
}

export interface FileRef {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: string;
}

export interface Comment {
  id: string;
  body: string;
  reviewState?: ReviewState | null;
  author?: User | null;
  createdAt: string;
}

export interface GroupedIssues {
  open: Issue[];
  in_progress: Issue[];
  resolved: Issue[];
}

export interface SuggestionDraft {
  type: IssueType;
  title: string;
  description: string;
  status: IssueStatus;
  severity: Severity | null;
  priority: string | null;
  labels: string[];
  environment: string | null;
  stepsToReproduce: string[];
  expectedResult: string | null;
  actualResult: string | null;
  acceptanceCriteria: string[];
  relatedIssueIds: string[];
  confidence: number;
  clarifyingQuestions: string[];
  fileIds?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatThreadSummary {
  id: string;
  title: string | null;
  updatedAt: string;
  messageCount: number;
}
