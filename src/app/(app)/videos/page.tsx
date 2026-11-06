import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import VideoLibrary, { type LibFilter, type LibVideo } from '@/components/VideoLibrary';

export const metadata = { title: 'Video Library' };

export default async function Videos() {
  const { supabase, profile } = await requireProfile();
  const [{ data: vids }, { data: fils }, { data: links }] = await Promise.all([
    supabase.from('videos').select('id,title,url,description').order('created_at', { ascending: false }),
    supabase.from('video_filters').select('id,name').order('name'),
    supabase.from('video_filter_links').select('video_id,filter_id'),
  ]);
  const byVideo = new Map<string, string[]>();
  (links ?? []).forEach((l) => byVideo.set(l.video_id as string, [...(byVideo.get(l.video_id as string) ?? []), l.filter_id as string]));
  const videos: LibVideo[] = (vids ?? []).map((v) => ({
    id: v.id as string,
    title: v.title as string,
    url: v.url as string,
    description: (v.description as string | null) ?? null,
    filterIds: byVideo.get(v.id as string) ?? [],
  }));
  const filters = (fils ?? []) as LibFilter[];

  return (
    <>
      <div className="vhead">
        <div>
          <h1 className="page-title">Video Library</h1>
          <p className="sub">Extra videos to watch and train with outside of class.</p>
        </div>
        {profile.role === 'instructor' && <Link className="btn btn--sm vhead__btn" href="/videos/manage">Add or manage videos</Link>}
      </div>
      <VideoLibrary videos={videos} filters={filters} />
    </>
  );
}
