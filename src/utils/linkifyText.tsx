import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

interface LinkifiedTextProps {
  text: string;
  linkClassName?: string;
}

export function LinkifiedText({ text, linkClassName = "text-primary underline break-all" }: LinkifiedTextProps) {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
