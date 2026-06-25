import axios from 'axios';
import type { SearchIssue } from '../types';

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
