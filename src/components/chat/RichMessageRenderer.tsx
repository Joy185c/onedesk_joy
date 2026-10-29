'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RichMessageRendererProps {
  content: string;
  className?: string;
  isCurrentUser?: boolean;
}

/**
 * Pre-processes text to protect currency (e.g. $100, $5.99) from being
 * misinterpreted as KaTeX math delimiters by remark-math.
 * Also parses structured @mentions: @[Full Name](userId) into markdown-safe links or tokens.
 */
function sanitizeMessageContent(raw: string): string {
  if (!raw) return '';

  // 1. Protect standalone currencies ($100, $20.50, $ 50) by escaping the dollar sign
  // Matches $ followed by a digit or space-digit, not followed by math operators
  let processed = raw.replace(/(^|\s)\$(\d+(?:\.\d+)?)/g, '$1\\$$2');

  // 2. Pre-process structured mentions: @[Full Name](userId) -> [MENTION:Full Name:userId]
  // We can convert @[Name](userId) into an internal markdown link or token:
  processed = processed.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    '[$1](mention://$2)'
  );

  return processed;
}

export const RichMessageRenderer: React.FC<RichMessageRendererProps> = ({
  content,
  className,
  isCurrentUser = false,
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const processedContent = sanitizeMessageContent(content);

  return (
    <div
      className={cn(
        'rich-message-renderer text-xs md:text-sm leading-relaxed break-words overflow-x-auto space-y-2',
        isCurrentUser ? 'text-[#18251D]' : 'text-[#18251D]',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[[rehypeKatex, { output: 'htmlAndMathml', strict: false }]]}
        components={{
          // Structured @Mention & Link styling
          a: ({ href, children, ...props }) => {
            if (href?.startsWith('mention://')) {
              const userId = href.replace('mention://', '');
              return (
                <span
                  data-user-id={userId}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#E9FBEA] text-[#064E24] border border-[#BCEEBF] font-bold text-[11px] select-none hover:bg-[#D5F7D8] transition-colors cursor-pointer align-baseline"
                  title={`Mentioned user ID: ${userId}`}
                >
                  <span className="text-[#20E34A]">@</span>
                  {children}
                </span>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#064E24] font-semibold underline underline-offset-2 decoration-[#20E34A] hover:text-[#082F1B] inline-flex items-center gap-0.5"
                {...props}
              >
                <span>{children}</span>
                <ExternalLink className="w-3 h-3 inline opacity-70" />
              </a>
            );
          },

          // Code blocks with syntax container & copy action
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (inline) {
              return (
                <code
                  className="font-mono text-[11px] bg-black/5 px-1.5 py-0.5 rounded border border-black/10 font-semibold"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const codeId = Math.random();

            return (
              <div className="relative my-2 rounded-xl overflow-hidden border border-[#CBD3CE] bg-[#111C18] text-[#E5E9E6] shadow-2xs">
                {/* Code Block Header */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#082F1B] border-b border-[#183A30] text-[10px] font-mono text-[#D2DFD7]">
                  <span className="uppercase font-bold tracking-wider text-[#20E34A]">
                    {match ? match[1] : 'code'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(codeString, codeId)}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    title="Copy code to clipboard"
                  >
                    {copiedCodeIdx === codeId ? (
                      <>
                        <Check className="w-3 h-3 text-[#20E34A]" />
                        <span className="text-[#20E34A]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code Block Pre */}
                <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed">
                  <code {...props}>{children}</code>
                </pre>
              </div>
            );
          },

          // Headings
          h1: ({ children }) => (
            <h1 className="text-base md:text-lg font-extrabold text-[#111C18] tracking-tight border-b border-black/10 pb-1 mt-2 mb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm md:text-base font-bold text-[#111C18] mt-2 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs md:text-sm font-bold text-[#111C18] mt-1.5 mb-0.5">
              {children}
            </h3>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 my-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 my-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-[#20E34A] pl-3 py-0.5 my-2 italic text-[#5E6962] bg-[#F7F8F8] rounded-r-lg">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-xl border border-[#CBD3CE]">
              <table className="min-w-full text-xs text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#F0F1F3] text-[#18251D] font-bold border-b border-[#CBD3CE]">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="p-2 font-bold">{children}</th>,
          td: ({ children }) => (
            <td className="p-2 border-t border-[#E5E9E6]">{children}</td>
          ),

          // Paragraphs
          p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,

          // Strong & Emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-[#111C18]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
