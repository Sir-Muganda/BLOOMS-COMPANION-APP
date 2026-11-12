'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, X, Search, Loader2, ZoomIn, Trash2, ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps { role: 'admin' | 'parent' | 'teacher' | 'student'; onNavigate?: (section: string) => void; }
interface MediaItem { id: string; title: string; category: string; imageUrl: string; createdAt: string; }

const categories = ['All', 'General', 'Classroom', 'Events', 'Sports', 'Trips', 'Awards', 'Facilities'];
const canUpload = (role: string) => role === 'admin' || role === 'teacher';

export default function MediaGallery({ role }: PageProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [addOpen, setAddOpen] = useState(false);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const [form, setForm] = useState({ title: '', category: 'General', imageUrl: '' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try { const res = await fetch('/api/media'); if (!cancelled) setItems(await res.json()); } catch { /* */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAdd = async () => {
    if (!form.title || !form.imageUrl) return toast.error('Title and image URL required');
    try {
      const res = await fetch('/api/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { toast.success('Media added!'); setAddOpen(false); setForm({ title: '', category: 'General', imageUrl: '' }); } else toast.error('Failed');
    } catch { toast.error('Error'); }
  };

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/media/${id}?XTransformPort=3000`, { method: 'DELETE' }); toast.success('Deleted'); } catch { toast.error('Error'); }
  };

  const filtered = items.filter(i => (cat === 'All' || i.category === cat) && (!search || i.title.toLowerCase().includes(search.toLowerCase())));

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><ImageIcon className="text-amber-400" />Media Gallery</h2>
        <div className="flex gap-2">
          {canUpload(role) && <Button onClick={() => setAddOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black"><Upload className="w-4 h-4 mr-2" />Add Media</Button>}
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-white/[0.04] border-white/[0.08] w-48" /></div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <Button key={c} size="sm" variant={cat === c ? 'default' : 'outline'} onClick={() => setCat(c)} className={cat === c ? 'bg-amber-500 text-black' : 'border-white/[0.08] text-slate-400 h-7 text-xs'}>{c}</Button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(item => (
          <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout className="group relative glass-card rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightbox(item)}>
            <div className="aspect-square bg-white/[0.03]">
              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-sm font-medium">{item.title}</p>
              <p className="text-xs text-slate-300">{item.category}</p>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              {canUpload(role) && <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }} className="bg-red-500/80 text-white p-1.5 rounded-lg hover:bg-red-600"><Trash2 className="w-3 h-3" /></button>}
              <button className="bg-black/60 text-white p-1.5 rounded-lg"><ZoomIn className="w-3 h-3" /></button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-slate-500 py-10"><FolderOpen className="w-12 h-12 mx-auto mb-3" /><p>No media found</p></div>}
      </div>

      <p className="text-sm text-slate-500 text-center">{filtered.length} items</p>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="bg-black/95 border-none max-w-3xl">
          {lightbox && (
            <div className="space-y-3">
              <div className="relative flex items-center justify-center min-h-[50vh]">
                <img src={lightbox.imageUrl} alt={lightbox.title} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              </div>
              <div className="text-center"><p className="text-white font-medium">{lightbox.title}</p><p className="text-sm text-slate-400">{lightbox.category} · {new Date(lightbox.createdAt).toLocaleDateString()}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Media */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#0f172a] border-white/[0.08]">
          <DialogHeader><DialogTitle className="text-white">Add Media</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-slate-300">Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-white/[0.04] border-white/[0.08]" /></div>
            <div><Label className="text-slate-300">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger className="bg-white/[0.04] border-white/[0.08]"><SelectValue /></SelectTrigger><SelectContent>{categories.filter(c => c !== 'All').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-slate-300">Image URL *</Label><Input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} className="bg-white/[0.04] border-white/[0.08]" placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button onClick={handleAdd} className="bg-amber-500 hover:bg-amber-600 text-black">Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
