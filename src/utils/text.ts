export type TruncateTextOptions = {
  maxLength: number;
  ellipsis?: string;
  wordBoundary?: boolean;
};

const clampMaxLength = (value: number) => Math.max(1, Math.round(value));

export const truncateText = (input: string, options: TruncateTextOptions): string => {
  const text = String(input ?? "");
  const ellipsis = options.ellipsis ?? "…";
  const maxLength = clampMaxLength(options.maxLength);
  const wordBoundary = options.wordBoundary ?? true;

  if (text.length <= maxLength) return text;
  if (maxLength <= ellipsis.length + 1) return ellipsis.slice(0, maxLength);

  const sliceLength = maxLength - ellipsis.length;
  let head = text.slice(0, sliceLength);

  if (wordBoundary) {
    const trimmed = head.replace(/\s+$/g, "");
    const lastSpace = trimmed.lastIndexOf(" ");
    if (lastSpace > 0) {
      head = trimmed.slice(0, lastSpace);
    } else {
      head = trimmed;
    }
  }

  return `${head}${ellipsis}`;
};
