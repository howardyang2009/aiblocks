import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders a seller's README markdown on the component detail page.
export function MarkdownRenderer({ source }: { source: string }) {
  return (
    <div className="prose-aiblocks space-y-4 text-sm leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="font-display text-2xl font-bold mt-6" {...p} />,
          h2: (p) => <h2 className="font-display text-xl font-bold mt-6" {...p} />,
          h3: (p) => <h3 className="font-display text-lg font-medium mt-4" {...p} />,
          code: (p) => (
            <code className="font-mono text-[13px] bg-paper border rounded-[3px] px-1 py-0.5" {...p} />
          ),
          a: (p) => <a className="text-accent underline" {...p} />,
          ul: (p) => <ul className="list-disc pl-5 space-y-1" {...p} />,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
