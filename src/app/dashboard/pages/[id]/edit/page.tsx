'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Block, HeroBlock, TextBlock, ButtonBlock } from '@/types/pageBlocks';

// Define PagePreview component at the top level
const PagePreview = ({ title = 'Untitled Page', blocks = [] }: { title?: string; blocks?: Block[] }) => {
  return (
    <div className="space-y-6">
      <div className="text-2xl font-semibold">{title}</div>
      {blocks?.map((b: Block) => (
        <div key={b.id} className="border rounded-lg p-4">
          {b.type === 'hero' && (
            <div className="rounded-lg p-6 bg-accent/10">
              <div className="text-xl font-semibold mb-1">{(b as HeroBlock).heading || 'Hero Heading'}</div>
              {(b as HeroBlock).subheading && <div className="text-sm text-muted-foreground">{(b as HeroBlock).subheading}</div>}
            </div>
          )}
          {b.type === 'text' && (
            <div className="prose max-w-none">
              {(b as TextBlock).text || 'Text content goes here...'}
            </div>
          )}
          {b.type === 'button' && (
            <div className="pt-2">
              <Button>
                {(b as ButtonBlock).label || 'Button'}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
// Types are already imported at the top

// UI Components
const Button = ({ children, onClick, disabled, variant = 'default', size = 'default', className = '' }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean; 
  variant?: 'default' | 'ghost' | 'outline'; 
  size?: 'default' | 'sm'; 
  className?: string;
}) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-medium ${
      variant === 'ghost' ? 'bg-transparent hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'
    } ${size === 'sm' ? 'text-sm' : 'text-base'} disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

const Input = ({ 
  id,
  value, 
  onChange, 
  placeholder, 
  className = '', 
  type = 'text' 
}: { 
  id?: string;
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string; 
  className?: string; 
  type?: string 
}) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full ${className}`}
  />
);

const Switch = ({ id, checked, onCheckedChange }: { id: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
  <div className="relative inline-block w-10 mr-2 align-middle select-none">
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
    />
    <label
      htmlFor={id}
      className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    ></label>
  </div>
);

const Label = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
    {children}
  </label>
);
import { supabaseClient } from '@/lib/supabaseClient';
// Toast notification helper
const toast = {
  success: (message: string) => console.log(`Success: ${message}`),
  error: (message: string) => console.error(`Error: ${message}`),
};

// Define BlockEditor component
const BlockEditor = ({ 
  block, 
  onChange, 
  onRemove 
}: { 
  block: Block; 
  onChange: (block: Block) => void; 
  onRemove: () => void; 
}) => {
  return (
    <div className="border rounded p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium capitalize">{block.type}</span>
        <button 
          onClick={onRemove}
          className="text-red-500 hover:text-red-700"
        >
          Remove
        </button>
      </div>
      {block.type === 'text' && (
        <textarea
          value={block.text || ''}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          className="w-full p-2 border rounded"
          rows={4}
        />
      )}
      {block.type === 'button' && (
        <div className="space-y-2">
          <input
            type="text"
            value={block.label || ''}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="Button text"
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            value={block.href || ''}
            onChange={(e) => onChange({ ...block, href: e.target.value })}
            placeholder="Button URL"
            className="w-full p-2 border rounded"
          />
        </div>
      )}
      {block.type === 'image' && (
        <div className="space-y-2">
          <input
            type="text"
            value={block.src || ''}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
            placeholder="Image URL"
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            value={block.alt || ''}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="Alt text"
            className="w-full p-2 border rounded"
          />
        </div>
      )}
    </div>
  );
};

interface PageData {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: Block[];
  theme?: Record<string, unknown>;
  branding?: Record<string, unknown>;
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

  const handleBlocksChange = (newBlocks: Block[]) => {
    setPageData(prev => ({ ...prev, blocks: newBlocks }));
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]">Edit Page</h1>
            <div className="flex items-center gap-2">
              <Button onClick={savePage} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </header>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-medium">Page Builder</h2>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop blocks to build your page
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBlocksChange([...pageData.blocks, { type: 'hero', id: crypto.randomUUID(), heading: 'Hero Heading', subheading: 'Hero subheading' }])}
                  >
                    Add Hero
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBlocksChange([...pageData.blocks, { type: 'text', id: crypto.randomUUID(), text: 'Text block content' }])}
                  >
                    Add Text
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBlocksChange([...pageData.blocks, { type: 'button', id: crypto.randomUUID(), label: 'Click me', href: '#' }])}
                  >
                    Add Button
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {pageData.blocks.map((b) => (
                  <div key={b.id} className="relative group">
                    <BlockEditor
                      block={b}
                      onChange={(nb) => handleBlocksChange(pageData.blocks.map(x => x.id === b.id ? nb : x))}
                      onRemove={() => handleBlocksChange(pageData.blocks.filter(x => x.id !== b.id))}
                    />
                  </div>
                ))}
                {pageData.blocks.length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-12 text-center">
                    <p className="text-muted-foreground">Add your first block to get started</p>
                  </div>
                )}
              </div>
              
              {/* Preview Pane */}
              <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-4">
                  <h3 className="font-medium">Preview</h3>
                  <div className="rounded-lg border p-4 bg-white">
                    <PagePreview title={pageData.title} blocks={pageData.blocks} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
