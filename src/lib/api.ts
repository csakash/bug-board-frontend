import axios from 'axios';
import type { InvitePreview, SearchIssue } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  withCredentials: true,
});

// Upload a file via the presign -> PUT -> complete flow. Returns the file id.
export async function uploadFile(file: File, projectId?: string): Promise<string> {
  const { data } = await api.post('/api/uploads/presign', {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    projectId,
  });

  await api.post(`/api/uploads/${data.fileId}/content`, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    maxBodyLength: Infinity,
  });

  return data.fileId as string;
}

// Re-run AI context generation for a project (brief + screenshots).
export async function regenerateContext(projectId: string): Promise<void> {
  await api.post(`/api/projects/${projectId}/context/regenerate`);
}

// Permanently delete a project and all of its issues, files, and threads.
export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/api/projects/${projectId}`);
}

// Search issues across every project in the workspace.
export async function searchIssues(q: string): Promise<SearchIssue[]> {
  const { data } = await api.get('/api/search/issues', { params: { q } });
  return data.issues as SearchIssue[];
}

// ---------- Project members & invites ----------

export interface InviteResult {
  alreadyMember?: boolean;
  emailSent?: boolean;
  acceptUrl?: string;
}

// Invite a teammate by email to a project (owner-only). Returns whether the
// email was already a member and whether an email was actually dispatched.
export async function inviteMember(projectId: string, email: string): Promise<InviteResult> {
  const { data } = await api.post(`/api/projects/${projectId}/invites`, { email });
  return data as InviteResult;
}

// Revoke a pending invite (owner-only). The link stops working immediately.
export async function revokeInvite(projectId: string, inviteId: string): Promise<void> {
  await api.delete(`/api/projects/${projectId}/invites/${inviteId}`);
}

// Remove a member from a project (owner-only).
export async function removeMember(projectId: string, userId: string): Promise<void> {
  await api.delete(`/api/projects/${projectId}/members/${userId}`);
}

// Public: fetch invite details for the landing page (works while logged out).
export async function getInvite(token: string): Promise<InvitePreview> {
  const { data } = await api.get(`/api/invites/${token}`);
  return data.invite as InvitePreview;
}

// Accept an invite (requires auth; caller email must match). Returns projectId.
export async function acceptInvite(token: string): Promise<string> {
  const { data } = await api.post(`/api/invites/${token}/accept`);
  return data.projectId as string;
}
