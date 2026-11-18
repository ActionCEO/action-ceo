// YouTube URLs and the VideoObject node, in one place so the page, JSON-LD and video sitemap agree.
import { iso8601Duration } from './content';

type VideoData = { youtubeId: string; title: string; kind: 'video' | 'live'; publishedAt: Date; durationSeconds: number; chapters: { start: number; title: string }[] };

export const ytWatch = (id: string, t?: number) => `https://www.youtube.com/watch?v=${id}${t == null ? '' : `&t=${t}s`}`;
export const ytEmbed = (id: string) => `https://www.youtube.com/embed/${id}`;
// maxresdefault (1280x720) is missing on some videos; hqdefault (480x360) always exists.
export const ytThumb = (id: string, size: 'maxresdefault' | 'hqdefault' = 'hqdefault') => `https://i.ytimg.com/vi/${id}/${size}.jpg`;
export const ytThumbs = (id: string) => [ytThumb(id, 'maxresdefault'), ytThumb(id, 'hqdefault')];
// 250 -> "4:10", 3725 -> "1:02:05"
export const mss = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// No contentUrl: Google wants the video file there, and YouTube does not expose one. embedUrl is the player.
export function videoObject({ url, base, video, description }: { url: string; base: string; video: VideoData; description: string }) {
  const person = { '@id': `${base}/#person` };
  return {
    '@type': 'VideoObject', '@id': `${url}#video`, name: video.title, description,
    thumbnailUrl: ytThumbs(video.youtubeId),
    uploadDate: video.publishedAt.toISOString(), duration: iso8601Duration(video.durationSeconds),
    embedUrl: ytEmbed(video.youtubeId), creator: person, author: person,
    ...(video.chapters.length ? { hasPart: video.chapters.map((c, i) => ({ '@type': 'Clip', name: c.title, startOffset: c.start, endOffset: video.chapters[i + 1]?.start ?? video.durationSeconds, url: `${url}?t=${c.start}` })) } : {}),
    ...(video.kind === 'live' ? { publication: { '@type': 'BroadcastEvent', isLiveBroadcast: true, startDate: video.publishedAt.toISOString(), endDate: new Date(+video.publishedAt + video.durationSeconds * 1000).toISOString() } } : {}),
  };
}
