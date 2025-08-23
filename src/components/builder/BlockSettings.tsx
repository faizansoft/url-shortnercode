'use client';

import { useState, useEffect } from 'react';
import { Block, TextBlock, ButtonBlock, ImageBlock } from '@/types/pageBlocks';

type BlockWithStyles = Block & {
  styles?: {
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: string;
    width?: string;
    maxWidth?: string;
    height?: string;
  };
};

type BlockSettingsProps = {
  block: BlockWithStyles;
  onUpdate: (updates: Partial<Block>) => void;
};

export function BlockSettings({ block, onUpdate }: BlockSettingsProps) {
  const [localBlock, setLocalBlock] = useState<BlockWithStyles>(block);

  useEffect(() => {
    setLocalBlock(block);
  }, [block]);

  const handleChange = (
    field: string,
    value: string | undefined
  ) => {
    const updates = { ...localBlock, [field]: value } as BlockWithStyles;
    setLocalBlock(updates);
    onUpdate(updates);
  };

  const handleStyleChange = (
    field: keyof NonNullable<BlockWithStyles['styles']>,
    value: string
  ) => {
    const currentStyles = localBlock.styles || {};
    const newStyles = {
      ...currentStyles,
      [field]: value,
    };
    
    // Special handling for image dimensions
    if (field === 'width' && localBlock.type === 'image') {
      if (value === '100%') {
        newStyles.maxWidth = '100%';
        newStyles.height = 'auto';
      } else {
        newStyles.maxWidth = '100%';
        newStyles.height = 'auto';
      }
    }

    const updates = {
      ...localBlock,
      styles: newStyles,
    };
    
    setLocalBlock(updates);
    onUpdate(updates);
  };

  const renderSettings = () => {
    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Content
              </label>
              <textarea
                value={(block as TextBlock).text}
                onChange={(e) => handleChange('text', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Size
              </label>
              <select
                value={localBlock.styles?.fontSize || '16px'}
                onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="14px">Small</option>
                <option value="16px">Normal</option>
                <option value="20px">Large</option>
                <option value="24px">Extra Large</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Color
              </label>
              <input
                type="color"
                value={localBlock.styles?.color || '#000000'}
                onChange={(e) => handleStyleChange('color', e.target.value)}
                className="w-full h-10"
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={(block as ButtonBlock).label}
                onChange={(e) => handleChange('label', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link URL
              </label>
              <input
                type="text"
                value={(block as ButtonBlock).href}
                onChange={(e) => handleChange('href', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Button Color
              </label>
              <input
                type="color"
                value={localBlock.styles?.backgroundColor || '#3b82f6'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-full h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Color
              </label>
              <input
                type="color"
                value={localBlock.styles?.color || '#ffffff'}
                onChange={(e) => handleStyleChange('color', e.target.value)}
                className="w-full h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Border Radius
              </label>
              <select
                value={localBlock.styles?.borderRadius || '0.375rem'}
                onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="0">None</option>
                <option value="0.25rem">Small</option>
                <option value="0.375rem">Medium</option>
                <option value="0.5rem">Large</option>
                <option value="9999px">Pill</option>
              </select>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={(block as ImageBlock).src}
                onChange={(e) => handleChange('src', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt Text
              </label>
              <input
                type="text"
                value={(block as ImageBlock).alt || ''}
                onChange={(e) => handleChange('alt', e.target.value || undefined)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Description of the image"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image Size
              </label>
              <select
                value={localBlock.styles?.width || '100%'}
                onChange={(e) => handleStyleChange('width', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="100%">Full Width</option>
                <option value="75%">Large</option>
                <option value="50%">Medium</option>
                <option value="25%">Small</option>
              </select>
            </div>
          </div>
        );

      default:
        return <div>No settings available for this block type.</div>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {block.type.charAt(0).toUpperCase() + block.type.slice(1)} Settings
        </h3>
        <p className="text-sm text-gray-500">
          Customize the appearance of this block
        </p>
      </div>
      {renderSettings()}
    </div>
  );
}
