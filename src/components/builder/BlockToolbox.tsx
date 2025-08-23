'use client';

import { Block } from '@/types/pageBlocks';

type BlockToolboxProps = {
  onAddBlock: (type: Block['type']) => void;
};

const blockTypes: Array<{ type: Block['type']; label: string; icon: string }> = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'button', label: 'Button', icon: '🆒' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'divider', label: 'Divider', icon: '―' },
];

export function BlockToolbox({ onAddBlock }: BlockToolboxProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Blocks</h2>
      <div className="grid grid-cols-2 gap-3">
        {blockTypes.map((block) => (
          <button
            key={block.type}
            onClick={() => onAddBlock(block.type)}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mb-1">{block.icon}</span>
            <span className="text-sm text-gray-600">{block.label}</span>
          </button>
        ))}
      </div>
      {/* Templates section removed to avoid unsupported block types */}
    </div>
  );
}
