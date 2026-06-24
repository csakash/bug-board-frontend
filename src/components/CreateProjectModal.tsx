import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Paperclip, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { api, uploadFile } from '../lib/api';
import { AttachmentUploadSkeleton } from './Skeleton';

interface PendingFile {
  fileId: string;
  name: string;
  kind: 'attachment' | 'screenshot';
}

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      const fileIds = files.filter((f) => f.kind === 'attachment').map((f) => f.fileId);
      const screenshotIds = files.filter((f) => f.kind === 'screenshot').map((f) => f.fileId);
      const { data } = await api.post('/api/projects', {
        name,
        description,
        fileIds,
        screenshotIds,
      });
      return data.project as { id: string };
    },
    onSuccess: (project) => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      onClose();
      navigate(`/projects/${project.id}`);
    },
  });

  async function onPick(kind: 'attachment' | 'screenshot', list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    setUploadError('');
    try {
      const uploaded = await Promise.all(
        Array.from(list).map(async (file) => ({
          fileId: await uploadFile(file),
          name: file.name,
          kind,
        })),
      );
      setFiles((prev) => [...prev, ...uploaded]);
    } catch (error) {
      setUploadError(
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ??
          'Attachment upload failed. Check your R2 configuration and try again.',
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-lg animate-slide-up-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">New project</h2>
          <button onClick={onClose} className="premium-focus text-muted hover:text-ink hover:scale-105">
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs font-medium text-muted">Project name</label>
        <input
          className="premium-focus mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.12)]"
          placeholder="e.g. Checkout Web"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="mt-4 block text-xs font-medium text-muted">
          What is this project about?
        </label>
        <textarea
          className="premium-focus mt-1 h-24 w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-rust focus:shadow-[0_0_0_3px_rgba(192,85,45,0.12)]"
          placeholder="Describe the product area, who uses it, and what matters most."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="mt-4 flex gap-2">
          <label className="premium-focus flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99]">
            <Paperclip size={14} /> Attachments
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onPick('attachment', e.target.files)}
            />
          </label>
          <label className="premium-focus flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99]">
            <ImageIcon size={14} /> Screenshots
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onPick('screenshot', e.target.files)}
            />
          </label>
          {uploading && <AttachmentUploadSkeleton label="Uploading" />}
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-1">
            {files.map((f) => (
              <li
                key={f.fileId}
                className="premium-focus flex items-center justify-between rounded-md border border-line bg-white px-2.5 py-1.5 text-xs animate-fade-up"
              >
                <span className="truncate">{f.name}</span>
                <span className="text-muted">{f.kind}</span>
              </li>
            ))}
          </ul>
        )}
        {uploadError && <p className="mt-2 text-xs text-rust">{uploadError}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="premium-focus rounded-md border border-line px-4 py-2 text-sm text-muted hover:border-rust/30 hover:text-ink active:scale-[0.99]"
          >
            Cancel
          </button>
          <button
            disabled={!name || !description || create.isPending}
            onClick={() => create.mutate()}
            className="premium-focus flex items-center gap-2 rounded-md bg-rust px-4 py-2 text-sm font-medium text-white hover:bg-rust-dark active:scale-[0.99] disabled:opacity-50"
          >
            {create.isPending && <Loader2 size={14} className="animate-spin" />}
            {create.isPending ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  );
}
