'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Builder } from '@/components/builder/Builder';
import { Block } from '@/types/pageBlocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabaseClient } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface PageData {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: Block[] | null;
  theme?: any;
  branding?: any;
}

export default function PageEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageData, setPageData] = useState<PageData>({
    id: '',
    title: 'Untitled Page',
    slug: '',
    published: false,
    blocks: [],
    theme: {},
    branding: {},
  });

  // Load page data
  useEffect(() => {
    if (!id) {
      router.push('/dashboard/pages');
      return;
    }

    const loadPage = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('pages')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        setPageData({
          id: data.id,
          title: data.title || 'Untitled Page',
          slug: data.slug || '',
          published: data.published || false,
          blocks: data.blocks || [],
          theme: data.theme || {},
          branding: data.branding || {},
        });
      } catch (error) {
        console.error('Error loading page:', error);
        toast.error('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [id, router]);

  // Save page data
  const savePage = async () => {
    try {
      setSaving(true);
      const { error } = await supabaseClient
        .from('pages')
        .update({
          title: pageData.title,
          slug: pageData.slug,
          published: pageData.published,
          blocks: pageData.blocks,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Page saved successfully');
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleBlocksChange = (blocks: Block[]) => {
    setPageData({ ...pageData, blocks });
  };

  const handlePublishToggle = async () => {
    const newPublishedState = !pageData.published;
    setPageData({ ...pageData, published: newPublishedState });
    
    try {
      const { error } = await supabaseClient
        .from('pages')
        .update({ published: newPublishedState })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Page ${newPublishedState ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error('Error updating publish status:', error);
      toast.error(`Failed to ${newPublishedState ? 'publish' : 'unpublish'} page`);
      // Revert on error
      setPageData({ ...pageData, published: !newPublishedState });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/pages')}
            >
              ← Back to Pages
            </Button>
            <h1 className="text-xl font-semibold">
              {pageData.title || 'Untitled Page'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="publish-toggle"
                checked={pageData.published}
                onCheckedChange={handlePublishToggle}
              />
              <Label htmlFor="publish-toggle">
                {pageData.published ? 'Published' : 'Draft'}
              </Label>
            </div>
            <Button onClick={savePage} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </header>

      {/* Page Settings */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-4">
          <div className="w-64">
            <Input
              type="text"
              placeholder="Page Title"
              value={pageData.title}
              onChange={(e) =>
                setPageData({ ...pageData, title: e.target.value })
              }
              className="w-full"
            />
          </div>
          <div className="w-64">
            <Input
              type="text"
              placeholder="Slug"
              value={pageData.slug}
              onChange={(e) =>
                setPageData({ ...pageData, slug: e.target.value })
              }
              className="w-full"
            />
          </div>
          {pageData.published && pageData.slug && (
            <a
              href={`/p/${pageData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View Live Page →
            </a>
          )}
        </div>
      </div>

      {/* Main Builder Area */}
      <div className="flex-1 overflow-hidden">
        <Builder
          initialBlocks={pageData.blocks || []}
          onBlocksChange={handleBlocksChange}
        />
      </div>
    </div>
  );
}
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Edit Page</h1>
        <div className="flex items-center gap-2">
          <a className="btn btn-secondary h-9" href={`/dashboard/pages/${id}/templates`}>Select template</a>
          <a className="btn btn-secondary h-9" href={publicUrl} target="_blank" rel="noreferrer">View</a>
          <button className="btn btn-primary h-9" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </header>

      {loading ? (
        <div className="p-4 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <section className="rounded-xl glass p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Title</div>
                <input className="h-10 w-full px-3 rounded border" value={title} onChange={(e) => setTitle(e.target.value)} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
              </div>
              <div>
                <div className="text-xs text-[var(--muted)] mb-1">Slug</div>
                <input className="h-10 w-full px-3 rounded border font-mono" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span>Published</span>
            </label>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Blocks</div>
                <div className="inline-flex gap-2">
                  <button className="btn btn-secondary h-8" onClick={() => addBlock('hero')}>Add Hero</button>
                  <button className="btn btn-secondary h-8" onClick={() => addBlock('text')}>Add Text</button>
                  <button className="btn btn-secondary h-8" onClick={() => addBlock('button')}>Add Button</button>
                </div>
              </div>
              <div className="space-y-3">
                {blocks.map((b) => (
                  <BlockEditor key={b.id} block={b} onChange={(nb) => setBlocks((p) => p.map(x => x.id === b.id ? nb as Block : x))} onRemove={() => rmBlock(b.id)} />
                ))}
                {blocks.length === 0 && <div className="text-sm text-[var(--muted)]">No blocks yet. Use the buttons above to add content.</div>}
              </div>
            </div>
          </section>

          <aside className="rounded-xl glass p-5">
            <div className="font-medium mb-2">Preview</div>
            <div className="rounded border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <PagePreview title={title} blocks={blocks} />
            </div>
            <div className="h-px my-5" style={{ background: 'var(--border)' }} />
            {/* Tabs: Theme | Customize */}
            <Tabs
              theme={theme}
              onApplyPreset={(id: string)=> {
                const p = themePresets.find(x=> x.id === id)
                if (p) setTheme(p.theme)
              }}
              branding={branding}
              setBranding={setBranding}
              saving={saving}
              onSave={handleSave}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
              <div className="text-xs text-[var(--muted)] mb-1">Brand Color</div>
              <input type="color" className="h-9 w-full rounded border p-0" value={branding.brandColor} onChange={(e)=> setBranding({ ...branding, brandColor: e.target.value })} />
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Accent Color</div>
              <input type="color" className="h-9 w-full rounded border p-0" value={branding.accentColor} onChange={(e)=> setBranding({ ...branding, accentColor: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-[var(--muted)]">Logo URL</div>
            <input className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.logoUrl ?? ''} onChange={(e)=> setBranding({ ...branding, logoUrl: e.target.value || null })} placeholder="https://…/logo.png" />
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-[var(--muted)]">Cover Image URL</div>
            <input className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.coverUrl ?? ''} onChange={(e)=> setBranding({ ...branding, coverUrl: e.target.value || null })} placeholder="https://…/cover.jpg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Hero Height (px)</div>
              <input type="number" min={200} max={600} className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.hero.height} onChange={(e)=> setBranding({ ...branding, hero: { ...branding.hero, height: Number(e.target.value) } })} />
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Hero Align</div>
              <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.hero.align} onChange={(e)=> setBranding({ ...branding, hero: { ...branding.hero, align: e.target.value as Branding['hero']['align'] } })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Background Type</div>
              <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.type} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, type: e.target.value as Branding['bg']['type'] } })}>
                <option value="none">None</option>
                <option value="image">Image</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">BG Image URL</div>
              <input className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.imageUrl ?? ''} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, imageUrl: e.target.value || null } })} placeholder="https://…/background.jpg" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">BG Size</div>
              <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.size} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, size: e.target.value as Branding['bg']['size'] } })}>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">BG Repeat</div>
              <select className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.repeat} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, repeat: e.target.value as Branding['bg']['repeat'] } })}>
                <option value="no-repeat">No repeat</option>
                <option value="repeat">Repeat</option>
                <option value="repeat-x">Repeat X</option>
                <option value="repeat-y">Repeat Y</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">BG Position</div>
              <input className="h-9 w-full rounded border px-2" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={branding.bg.position} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, position: e.target.value } })} placeholder="center" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Overlay Color</div>
              <input type="color" className="h-9 w-full rounded border p-0" value={branding.bg.overlay.color} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, overlay: { ...branding.bg.overlay, color: e.target.value } } })} />
            </div>
            <div>
              <div className="text-xs text-[var(--muted)] mb-1">Overlay Opacity</div>
              <input type="range" min={0} max={1} step={0.05} value={branding.bg.overlay.opacity} onChange={(e)=> setBranding({ ...branding, bg: { ...branding.bg, overlay: { ...branding.bg.overlay, opacity: Number(e.target.value) } } })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary h-8" onClick={()=> setBranding(defaultBranding)}>Reset</button>
            <button className="btn btn-primary h-8" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function PagePreview({ title, blocks }: { title: string; blocks: Block[] }) {
  return (
    <div className="space-y-6">
      <div className="text-2xl font-semibold">{title || 'Untitled Page'}</div>
      {blocks.map((b) => {
        if (b.type === 'hero') {
          return (
            <div key={b.id} className="rounded-lg p-6" style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)' }}>
              <div className="text-xl font-semibold mb-1">{b.heading}</div>
              {b.subheading && <div className="text-sm text-[var(--muted)]">{b.subheading}</div>}
            </div>
          )
        }
        if (b.type === 'text') {
          return <div key={b.id} className="prose prose-invert max-w-none" style={{ color: 'var(--foreground)' }}>{b.text}</div>
        }
        if (b.type === 'button') {
          return (
            <div key={b.id}>
              <a href={b.href} target="_blank" rel="noreferrer" className="btn btn-primary h-9">{b.label}</a>
            </div>
          )
        }
        if (b.type === 'image') {
          return (
            <div key={b.id} className="rounded overflow-hidden" style={{ borderRadius: b.rounded ? 12 : 6 }}>
              <Image src={b.src} alt={b.alt || ''} width={800} height={450} className="w-full h-auto" unoptimized />
            </div>
          )
        }
        if (b.type === 'product-card') {
          return (
            <div key={b.id} className="rounded border p-3 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3" style={{ borderColor: 'var(--border)' }}>
              <div className="rounded overflow-hidden"><Image src={b.image} alt={b.title} width={600} height={600} className="w-full h-auto" unoptimized /></div>
              <div>
                <div className="font-medium">{b.title}</div>
                {b.subtitle && <div className="text-xs text-[var(--muted)] mb-2">{b.subtitle}</div>}
                {b.ctaHref && b.ctaLabel && <a href={b.ctaHref} className="btn btn-secondary h-8">{b.ctaLabel}</a>}
              </div>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
