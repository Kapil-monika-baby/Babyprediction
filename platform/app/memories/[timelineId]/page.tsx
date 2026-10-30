'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase-browser';
import { MEMORY_LANGUAGES, useMemoryLanguage } from '../memory-language';

type Timeline = { id: string; title: string; owner_id: string };
type Memory = { id: string; kind: string; caption: string; occurred_on: string; milestone_type: string | null; created_at: string; created_by: string };
type Media = { id: string; memory_id: string; storage_path: string; mime_type: string };
type MemoryShare = { id: string; url?: string };

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];

export default function MemoryTimelinePage() {
  const params = useParams<{ timelineId: string }>();
  const timelineId = params.timelineId;
  const { language, setLanguage, t } = useMemoryLanguage();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [items, setItems] = useState<Memory[]>([]);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [caption, setCaption] = useState('');
  const [kind, setKind] = useState('story');
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [milestone, setMilestone] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [notice, setNotice] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviting, setInviting] = useState(false);
  const [sharingMemory, setSharingMemory] = useState('');
  const [shareLinks, setShareLinks] = useState<Record<string, MemoryShare>>({});

  const load = useCallback(async () => {
    // Clear prior timeline state before checking access. This prevents controls
    // from a previously loaded timeline lingering if the next timeline is denied.
    setLoading(true); setError(''); setNotice(''); setAccessDenied(false);
    setTimeline(null); setItems([]); setMedia({}); setShareLinks({});
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.replace('/login?next=' + encodeURIComponent('/memories/' + timelineId)); return; }
    setCurrentUser(user.id);
    const { data: timelineData, error: timelineError } = await supabase.from('memory_timelines').select('id,title,owner_id').eq('id', timelineId).single();
    // A readable timeline row alone is not proof of authorization. Check the
    // database's owner-or-accepted-member helper before rendering any private
    // content or controls. Pending/revoked invitations do not grant access.
    const { data: isMember, error: membershipError } = timelineData
      ? await supabase.rpc('is_memory_timeline_member', { p_timeline_id: timelineId })
      : { data: false, error: null };
    if (timelineError || !timelineData || membershipError || isMember !== true) {
      setTimeline(null); setItems([]); setMedia({}); setAccessDenied(true);
      setError('This timeline is unavailable, or you do not have permission to view it.');
      setLoading(false); return;
    }
    setTimeline(timelineData); setAccessDenied(false);
    const { data: memoryData, error: memoryError } = await supabase.from('memory_items').select('id,kind,caption,occurred_on,milestone_type,created_at,created_by').eq('timeline_id', timelineId).is('deleted_at', null).order('occurred_on', { ascending: false });
    if (memoryError) { setError(memoryError.message); setLoading(false); return; }
    const rows = memoryData ?? [];
    setItems(rows);
    if (timelineData.owner_id === user.id && rows.length) {
      const { data: activeShares } = await supabase.from('memory_share_links').select('id,memory_id').in('memory_id', rows.map(x => x.id)).is('revoked_at', null).gt('expires_at', new Date().toISOString());
      const existing: Record<string, MemoryShare> = {};
      for (const share of activeShares ?? []) existing[share.memory_id] = { id: share.id };
      setShareLinks(existing);
    }
    const nextMedia: Record<string, string> = {};
    if (rows.length) {
      const { data: mediaRows } = await supabase.from('memory_media').select('id,memory_id,storage_path,mime_type').in('memory_id', rows.map(x => x.id));
      for (const m of (mediaRows ?? []) as Media[]) {
        const { data } = await supabase.storage.from('memory-media').createSignedUrl(m.storage_path, 300);
        if (data?.signedUrl) nextMedia[m.memory_id] = data.signedUrl;
      }
    }
    setMedia(nextMedia); setLoading(false);
  }, [timelineId]);

  useEffect(() => { void load(); }, [load]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected); setError('');
    if (selected && (!ACCEPTED.includes(selected.type) || selected.size > MAX_FILE_BYTES)) {
      setError('Choose a JPG, PNG, WebP, MP4 or MOV file no larger than 50 MB.');
      setFile(null); event.target.value = '';
    }
  }

  async function addMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timeline || saving) return;
    if ((kind === 'photo' || kind === 'video') && !file) { setError('Choose a photo or video for this memory.'); return; }
    if (file && ((kind === 'photo' && !file.type.startsWith('image/')) || (kind === 'video' && !file.type.startsWith('video/')))) { setError('The selected file does not match the memory type.'); return; }
    setSaving(true); setError(''); setNotice('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); window.location.replace('/login?next=' + encodeURIComponent('/memories/' + timelineId)); return; }
    const { data: memory, error: insertError } = await supabase.from('memory_items').insert({
      timeline_id: timeline.id, created_by: user.id, kind, caption: caption.trim(),
      occurred_on: occurredOn, milestone_type: kind === 'milestone' ? (milestone.trim() || null) : null, visibility: 'private'
    }).select('id').single();
    if (insertError || !memory) { setError(insertError?.message ?? 'Could not save this memory.'); setSaving(false); return; }
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'upload';
      const path = timeline.id + '/' + memory.id + '/' + crypto.randomUUID() + '-' + safeName;
      const { error: uploadError } = await supabase.storage.from('memory-media').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        await supabase.from('memory_items').delete().eq('id', memory.id);
        setError('The memory could not upload its media. ' + uploadError.message); setSaving(false); return;
      }
      const { error: mediaError } = await supabase.from('memory_media').insert({ memory_id: memory.id, storage_path: path, mime_type: file.type, byte_size: file.size });
      if (mediaError) {
        await supabase.storage.from('memory-media').remove([path]);
        await supabase.from('memory_items').delete().eq('id', memory.id);
        setError('The media upload could not be registered. Please retry.'); setSaving(false); return;
      }
    }
    setCaption(''); setKind('story'); setMilestone(''); setFile(null);
    const input = document.getElementById('memory-file') as HTMLInputElement | null;
    if (input) input.value = '';
    setNotice('Memory saved privately.'); setSaving(false); await load();
  }

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timeline || timeline.owner_id !== currentUser || inviting) return;
    setInviting(true); setError(''); setNotice(''); setInviteLink('');
    const { data, error: inviteError } = await supabase.functions.invoke('create-memory-invitation', {
      body: { timelineId: timeline.id, email: inviteEmail.trim().toLowerCase() },
    });
    if (inviteError || !data?.token) {
      setError(data?.error || inviteError?.message || 'Could not create the invitation. Please retry.');
      setInviting(false); return;
    }
    const link = window.location.origin + '/memories/invite?token=' + encodeURIComponent(data.token);
    setInviteLink(link);
    setNotice('Invitation link created. It expires ' + new Date(data.expiresAt).toLocaleString() + ' and only the invited email can accept it.');
    setInviteEmail('');
    setInviting(false);
  }

  async function copyInvitationLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setError('');
      setNotice('Invitation link copied. Share it privately with the invited person only.');
    } catch {
      setError('Automatic copy was blocked. Select the invitation link and copy it manually.');
    }
  }

  async function createMemoryShare(memory: Memory) {
    if (timeline?.owner_id !== currentUser || sharingMemory) return;
    setSharingMemory(memory.id); setError(''); setNotice('');
    const { data, error: shareError } = await supabase.functions.invoke('create-memory-share', { body: { memoryId: memory.id } });
    if (shareError || !data?.token || !data?.shareId) {
      setError(data?.error || shareError?.message || 'Could not create a private guest link.');
      setSharingMemory(''); return;
    }
    const url = window.location.origin + '/memories/share?token=' + encodeURIComponent(data.token);
    setShareLinks(previous => ({ ...previous, [memory.id]: { id: data.shareId, url } }));
    setNotice('A private link for this one memory is ready. It expires in 30 days.');
    setSharingMemory('');
  }

  async function copyMemoryShare(memoryId: string) {
    const link = shareLinks[memoryId];
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setNotice('Private memory link copied. Share it only with the intended guest.');
    } catch {
      setError('Copy was blocked. Select the link and copy it manually.');
    }
  }

  async function revokeMemoryShare(memoryId: string) {
    const link = shareLinks[memoryId];
    if (!link) return;
    if (!window.confirm('Revoke this guest link? The guest will no longer be able to open this memory.')) return;
    const { data, error: revokeError } = await supabase.functions.invoke('revoke-memory-share', { body: { shareId: link.id } });
    if (revokeError || !data?.success) {
      setError(data?.error || revokeError?.message || 'Could not revoke this link.');
      return;
    }
    setShareLinks(previous => { const next = { ...previous }; delete next[memoryId]; return next; });
    setNotice('Guest access to this memory has been revoked.');
  }

  async function deleteMemory(memory: Memory) {
    if (timeline?.owner_id !== currentUser && memory.created_by !== currentUser) return;
    if (!window.confirm('Delete this memory? This cannot be undone.')) return;
    setError(''); setNotice('');
    const { data: mediaRows } = await supabase.from('memory_media').select('storage_path').eq('memory_id', memory.id);
    if (mediaRows?.length) {
      const { error: removeError } = await supabase.storage.from('memory-media').remove(mediaRows.map(row => row.storage_path));
      if (removeError) { setError('Could not remove the media file. Nothing was deleted. ' + removeError.message); return; }
    }
    const { error: deleteError } = await supabase.from('memory_items').delete().eq('id', memory.id);
    if (deleteError) { setError('Could not delete this memory. ' + deleteError.message); return; }
    setNotice('Memory deleted.'); await load();
  }

  if (accessDenied) {
    return <main className="min-h-screen bg-[#fffaf7] px-4 py-8 text-slate-900 sm:px-6 sm:py-12"><div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3"><Link href="/memories" className="text-sm font-semibold text-slate-500 hover:text-slate-800">{t('allTimelines')}</Link><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><span>{t('language')}</span><select aria-label={t('language')} value={language} onChange={e => setLanguage(e.target.value as (typeof MEMORY_LANGUAGES)[number]['code'])} className="rounded-lg border border-slate-200 bg-white px-2 py-2">{MEMORY_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.nativeName}</option>)}</select></label></div>
      <header className="mt-6 rounded-[2rem] bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[.22em] text-rose-700">{t('familyStory')}</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">{t('memories')}</h1><p className="mt-3 max-w-2xl leading-7 text-slate-700">{t('privateIntro')}</p></header>
      <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'This timeline is unavailable, or you do not have permission to view it.'}</div>
    </div></main>;
  }

  return <main className="min-h-screen bg-[#fffaf7] px-4 py-8 text-slate-900 sm:px-6 sm:py-12"><div className="mx-auto max-w-4xl">
    <div className="flex items-center justify-between gap-3"><Link href="/memories" className="text-sm font-semibold text-slate-500 hover:text-slate-800">{t('allTimelines')}</Link><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><span>{t('language')}</span><select aria-label={t('language')} value={language} onChange={e => setLanguage(e.target.value as 'en' | 'hi')} className="rounded-lg border border-slate-200 bg-white px-2 py-2"><option value="en">{t('english')}</option><option value="hi">{t('hindi')}</option></select></label></div>
    <header className="mt-6 rounded-[2rem] bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-7 sm:p-9"><p className="text-xs font-bold uppercase tracking-[.22em] text-rose-700">{t('familyStory')}</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">{timeline?.title ?? 'Memories'}</h1><p className="mt-3 max-w-2xl leading-7 text-slate-700">{t('privateIntro')}</p></header>
    {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    {!accessDenied && timeline?.owner_id === currentUser && <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-amber-100 sm:p-7">
      <h2 className="text-xl font-extrabold">{t('inviteFamily')}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t('inviteDescription')}</p>
      <form onSubmit={createInvitation} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="memory-invite-email" className="sr-only">Family member email address</label>
        <input id="memory-invite-email" type="email" autoComplete="email" required maxLength={320} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="family.member@example.com" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"/>
        <button disabled={inviting || loading} className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-white hover:bg-amber-600 disabled:opacity-50">{inviting ? t('creatingInvite') : t('createInvite')}</button>
      </form>
      {inviteLink && <div className="mt-4 rounded-2xl bg-amber-50 p-4">
        <label htmlFor="memory-invite-link" className="block text-sm font-bold">{t('inviteLinkLabel')}</label>
        <input id="memory-invite-link" readOnly value={inviteLink} onFocus={e => e.currentTarget.select()} className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"/>
        <button type="button" onClick={() => void copyInvitationLink()} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">{t('copyInvite')}</button>
      </div>}
    </section>}
    {!loading && !error && !accessDenied && timeline && <><section className="mt-7 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100 sm:p-7">
      <h2 className="text-xl font-extrabold">{t('addMemory')}</h2><p className="mt-1 text-sm text-slate-600">{t('addMemoryDescription')}</p>
      <form onSubmit={addMemory} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="memory-kind" className="block text-sm font-bold">{t('memoryType')}</label><select id="memory-kind" value={kind} onChange={e => setKind(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="story">{t('writtenStory')}</option><option value="milestone">{t('milestone')}</option><option value="photo">{t('photo')}</option><option value="video">{t('video')}</option></select></div>
        <div><label htmlFor="memory-date" className="block text-sm font-bold">{t('dateHappened')}</label><input id="memory-date" type="date" value={occurredOn} onChange={e => setOccurredOn(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"/></div>
        {kind === 'milestone' && <div className="sm:col-span-2"><label htmlFor="memory-milestone" className="block text-sm font-bold">{t('milestoneName')}</label><input id="memory-milestone" value={milestone} onChange={e => setMilestone(e.target.value)} maxLength={80} placeholder="First smile, first steps…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"/></div>}
        {(kind === 'photo' || kind === 'video') && <div className="sm:col-span-2"><label htmlFor="memory-file" className="block text-sm font-bold">{kind === 'photo' ? t('choosePhoto') : t('chooseVideo')}</label><input id="memory-file" type="file" accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/quicktime'} onChange={onFileChange} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-2 file:font-bold file:text-rose-700"/><p className="mt-1 text-xs text-slate-500">JPG, PNG, WebP, MP4 or MOV · up to 50 MB.</p></div>}
        <div className="sm:col-span-2"><label htmlFor="memory-caption" className="block text-sm font-bold">{t('captionStory')}</label><textarea id="memory-caption" value={caption} onChange={e => setCaption(e.target.value)} maxLength={5000} rows={4} placeholder={t('captionPlaceholder')} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"/></div>
        <div className="sm:col-span-2"><button disabled={saving || loading || !timeline} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-700 disabled:opacity-50">{saving ? t('saving') : t('savePrivate')}</button></div>
      </form>
    </section>
    <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">{t('timeline')}</h2><span className="text-sm text-slate-500">{items.length} {items.length === 1 ? 'memory' : 'memories'}</span></div>
      {loading ? <p className="mt-5 text-sm text-slate-500">{t('loadingTimeline')}</p> : items.length === 0 ? <div className="mt-4 rounded-3xl border border-dashed border-rose-200 bg-white/70 p-8 text-center"><div className="text-4xl">✨</div><h3 className="mt-3 font-bold">{t('firstMemory')}</h3><p className="mt-2 text-sm text-slate-600">{t('firstMemoryDescription')}</p></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{items.map(item => <article key={item.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-rose-100">
        {media[item.id] && (item.kind === 'video' ? <video controls preload="metadata" src={media[item.id]} className="max-h-72 w-full bg-slate-100 object-contain"/> : <img src={media[item.id]} alt="Family memory" className="max-h-72 w-full bg-rose-50 object-cover"/> )}
        <div className="p-5"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold capitalize text-rose-700">{item.kind === 'milestone' ? item.milestone_type || t('milestone') : item.kind}</span><time className="text-xs text-slate-500">{new Date(item.occurred_on + 'T12:00:00').toLocaleDateString()}</time></div>
        {item.caption && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.caption}</p>}
        {timeline?.owner_id === currentUser && <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-xs font-bold text-amber-900">{t('shareOne')}</p>{shareLinks[item.id] ? <>{shareLinks[item.id].url ? <><input aria-label="Private guest link" readOnly value={shareLinks[item.id].url} onFocus={e => e.currentTarget.select()} className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-2 py-2 text-xs"/><button onClick={() => void copyMemoryShare(item.id)} className="mt-2 mr-4 text-xs font-bold text-slate-800 underline">{t('copyGuestLink')}</button></> : <p className="mt-2 text-xs text-slate-700">An active guest link exists. Its URL was shown only when it was created.</p>}<button onClick={() => void revokeMemoryShare(item.id)} className="mt-2 text-xs font-bold text-red-700 underline">{t('revokeAccess')}</button></> : <button disabled={sharingMemory === item.id} onClick={() => void createMemoryShare(item)} className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{sharingMemory === item.id ? t('creatingGuestLink') : t('createGuestLink')}</button>}<p className="mt-2 text-[11px] leading-4 text-slate-600">{t('shareNote')}</p></div>}
        {(timeline?.owner_id === currentUser || item.created_by === currentUser) && <button onClick={() => void deleteMemory(item)} className="mt-4 text-sm font-bold text-red-600 hover:text-red-800">{t('deleteMemory')}</button>}</div></article>)}</div>}
    </section>
    <p className="mt-8 text-center text-xs leading-5 text-slate-500">{t('privateFooter')}</p>
    </>}
  </div></main>;
}
