import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Shared markdown renderer used everywhere we display model- or user-authored
// rich text (AI chat, issue descriptions, comments, project briefs).
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`md-body ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {content ?? ''}
      </ReactMarkdown>
    </div>
  );
}
