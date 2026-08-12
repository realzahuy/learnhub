import { Fragment, ReactNode } from 'react';

const renderInlineMarkdown = (text: string): ReactNode[] => {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  return text.split(tokenPattern).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="chatbot-inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
};

const renderMarkdownLine = (line: string): ReactNode => {
  const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
  if (heading) return <strong className="chatbot-markdown-heading">{renderInlineMarkdown(heading[1])}</strong>;
  const unorderedItem = line.match(/^\s*[-*]\s+(.+)$/);
  if (unorderedItem) return <span className="chatbot-markdown-list-item">• {renderInlineMarkdown(unorderedItem[1])}</span>;
  const orderedItem = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
  if (orderedItem) {
    return <span className="chatbot-markdown-list-item">{orderedItem[1]}. {renderInlineMarkdown(orderedItem[2])}</span>;
  }
  return renderInlineMarkdown(line);
};

export const renderMessageContent = (content: string): ReactNode => {
  const normalized = content
    .replace(/\$\\+(?:rightarrow|longrightarrow|Rightarrow)\$/g, '→')
    .replace(/\$\\+(?:leftarrow|longleftarrow|Leftarrow)\$/g, '←')
    .replace(/\\+(?:rightarrow|longrightarrow|Rightarrow)/g, '→')
    .replace(/\\+(?:leftarrow|longleftarrow|Leftarrow)/g, '←')
    .replace(/##([^#\n]+)##/g, '**$1**')
    .replace(/__([^_\n]+)__/g, '**$1**')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?(?:p|div|section|article)\s*>/gi, '\n')
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`');

  return normalized.split('\n').map((line, index, lines) => (
    <Fragment key={index}>
      {renderMarkdownLine(line)}
      {index < lines.length - 1 && <br />}
    </Fragment>
  ));
};
