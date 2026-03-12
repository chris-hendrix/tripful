import type { ReactNode } from "react";

// Matches http(s):// URLs and bare domains with common TLDs (Gmail-style)
const URL_REGEX =
  /https?:\/\/[^\s<>"']+|(?<![/@\w.-])(?:\w[\w-]*\.)+(?:com|org|net|edu|gov|io|co|dev|app|me|info|biz|us|uk|ca|au|de|fr|jp|in|br|nl|se|no|fi|dk|it|es|pt|ch|at|be|nz|za|mx|ar|cl|kr|tw|sg|hk|ph|my|th|vn|id|pl|cz|hu|ro|bg|hr|sk|si|lt|lv|ee|ie|is|lu|mt|cy|gr)(?:\/[^\s<>"']*)?/gi;

// Punctuation that commonly trails a URL in prose but isn't part of it
const TRAILING_PUNCT = /[.,;:!?)]+$/;

interface UrlMatch {
  url: string;
  href: string;
  index: number;
}

export function linkifyText(text: string): ReactNode[] {
  const matches: UrlMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    let url = match[0];
    const index = match.index;

    // Strip trailing punctuation that's likely not part of the URL
    const trailingMatch = TRAILING_PUNCT.exec(url);
    if (trailingMatch) {
      url = url.slice(0, -trailingMatch[0].length);
    }

    // Add protocol for bare domains
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    matches.push({ url, href, index });
  }

  if (matches.length === 0) {
    return [text];
  }

  const result: ReactNode[] = [];
  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const { url, href, index } = m;

    // Text before this URL
    if (index > lastIndex) {
      result.push(text.slice(lastIndex, index));
    }

    result.push(
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline"
      >
        {url}
      </a>,
    );

    lastIndex = index + url.length;
  }

  // Text after last URL
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}
