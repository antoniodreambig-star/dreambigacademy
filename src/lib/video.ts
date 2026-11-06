export interface VideoInfo {
  provider: 'youtube' | 'vimeo' | 'other';
  /** Address to put in an iframe (YouTube and Vimeo only). */
  embed?: string;
  /** Preview picture (YouTube only). */
  thumb?: string;
}

/** Adds https:// if missing and makes sure it's a real web address. Returns null if it isn't. */
export function normalizeUrl(raw: string): string | null {
  let s = raw.trim().slice(0, 500);
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Works out how to show a link: YouTube and Vimeo play right on the page, anything else opens in a new tab. */
export function parseVideo(url: string): VideoInfo {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { provider: 'other' };
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  const parts = u.pathname.split('/').filter(Boolean);

  let yt: string | null = null;
  if (host === 'youtu.be') yt = parts[0] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') yt = u.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) yt = parts[1] ?? null;
  }
  if (yt && YT_ID.test(yt)) {
    return {
      provider: 'youtube',
      embed: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`,
      thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const nums = parts.filter((p) => /^\d+$/.test(p));
    const id = nums[0];
    const hash = parts.find((p) => /^[0-9a-f]{8,}$/i.test(p) && !/^\d+$/.test(p)) ?? u.searchParams.get('h');
    if (id) return { provider: 'vimeo', embed: `https://player.vimeo.com/video/${id}?autoplay=1${hash ? `&h=${hash}` : ''}` };
  }
  return { provider: 'other' };
}
