import type { Components } from "react-markdown";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-primary break-words underline underline-offset-2"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => {
    const label = alt?.trim() || "Image";
    const href = typeof src === "string" ? src : undefined;
    if (!href) {
      return <span>{label}</span>;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary break-words underline underline-offset-2"
      >
        {label}
      </a>
    );
  },
  p: ({ children }) => (
    <p className="mb-2 [overflow-wrap:anywhere] break-words last:mb-0">
      {children}
    </p>
  ),
  h1: ({ children }) => (
    <h1 className="mb-2 text-base font-semibold [overflow-wrap:anywhere] break-words last:mb-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 text-sm font-semibold [overflow-wrap:anywhere] break-words last:mb-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 text-sm font-semibold [overflow-wrap:anywhere] break-words last:mb-0">
      {children}
    </h3>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="[overflow-wrap:anywhere] break-words">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em>{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-muted-foreground/40 text-muted-foreground mb-2 border-l-2 pl-3 last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => (
    <code className={className}>{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted mb-2 max-w-full min-w-0 overflow-x-auto rounded-md p-2 font-mono text-[0.85em] whitespace-pre last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 max-w-full min-w-0 overflow-x-auto last:mb-0">
      <table className="w-max min-w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-border border-b">{children}</tr>,
  th: ({ children }) => (
    <th className="border-border px-2 py-1 font-semibold break-words">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-border px-2 py-1 break-words">{children}</td>
  ),
  input: ({ checked, disabled, type }) => (
    <input
      type={type}
      checked={checked}
      disabled={disabled ?? true}
      readOnly
      className="align-middle"
    />
  ),
};

type ChatMarkdownBodyProps = {
  body: string;
};

export function ChatMarkdownBody({ body }: ChatMarkdownBodyProps) {
  return (
    <div className="chat-markdown [&_code]:bg-muted max-w-full min-w-0 break-words [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:break-all [&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:break-normal [&_pre_code]:whitespace-pre">
      <Markdown
        remarkPlugins={[remarkGfm]}
        urlTransform={defaultUrlTransform}
        components={markdownComponents}
      >
        {body}
      </Markdown>
    </div>
  );
}
