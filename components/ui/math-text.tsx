import katex from 'katex';

type MathTextProps = {
  content: string;
  className?: string;
};

const MATH_DELIMITER_REGEX = /(\$\$[\s\S]+?\$\$|\$(?:\\.|[^$])+\$)/g;

export function MathText({ content, className }: MathTextProps) {
  const parts = content.split(MATH_DELIMITER_REGEX);

  return (
    <div className={`whitespace-pre-wrap ${className ?? ''}`}>
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          return part;
        }

        const displayMode = part.startsWith('$$');
        const delimiterLength = displayMode ? 2 : 1;
        const math = part.slice(delimiterLength, -delimiterLength);
        const html = katex.renderToString(math, {
          displayMode,
          throwOnError: false,
          trust: false,
        });

        return (
          <span
            key={index}
            className={displayMode ? 'block overflow-x-auto' : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
}