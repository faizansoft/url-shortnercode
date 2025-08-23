'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Block } from '@/types/pageBlocks';

type BlockItemProps = {
  block: Block;
  isSelected: boolean;
  onClick?: () => void;
  onUpdate?: (updates: Partial<Block>) => void;
  onDelete?: () => void;
};

export function BlockItem({ block, isSelected, onClick, onUpdate, onDelete }: BlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <div 
            className="min-h-[100px] w-full p-4"
            contentEditable={isSelected}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate?.({ content: e.currentTarget.textContent || '' })}
            dangerouslySetInnerHTML={{ __html: block.content || '' }}
          />
        );
      case 'button':
        return (
          <div className="p-4">
            <a
              href={block.href || '#'}
              className="inline-block px-6 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors"
              style={block.styles}
            >
              {block.label || 'Button'}
            </a>
          </div>
        );
      case 'image':
        return (
          <div className="relative">
            <img
              src={block.src || '/placeholder-image.jpg'}
              alt={block.alt || ''}
              className="w-full h-auto rounded-lg"
            />
          </div>
        );
      case 'divider':
        return <hr className="border-t border-gray-300 my-4" />;
      default:
        return <div>Unsupported block type</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`relative group rounded-lg border-2 ${
        isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-200'
      } bg-white shadow-sm`}
    >
      {isSelected && (
        <div className="absolute -left-10 top-2 flex flex-col space-y-1">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <GripVertical size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-1 text-gray-400 hover:text-red-500"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {renderBlockContent()}
    </div>
  );
}
