import { useMemo } from 'react';

const WORDS_PER_READING_MINUTE = 200;
const WORDS_PER_NARRATION_MINUTE = 150;

export function useEpisodeContentMetrics(content: string) {
  return useMemo(() => {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    const readingTime = wordCount > 0 ? Math.ceil(wordCount / WORDS_PER_READING_MINUTE) : 0;
    const listeningTime = wordCount > 0 ? Math.ceil(wordCount / WORDS_PER_NARRATION_MINUTE) : 0;
    return { wordCount, readingTime, listeningTime };
  }, [content]);
}
