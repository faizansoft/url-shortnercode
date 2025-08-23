'use client';

import { Plus } from 'lucide-react';

type BlockToolboxProps = {
  onAddBlock: (type: string) => void;
};

const blockTypes = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'button', label: 'Button', icon: '🆒' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'divider', label: 'Divider', icon: '―' },
  { type: 'spacer', label: 'Spacer', icon: '↕️' },
  { type: 'social', label: 'Social Links', icon: '🔗' },
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
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Templates</h3>
        <button
          onClick={() => onAddBlock('header')}
          className="w-full flex items-center justify-between p-3 text-sm text-left border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <span>Header Section</span>
          <Plus size={16} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
