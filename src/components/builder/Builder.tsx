'use client';

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Block } from '@/types/pageBlocks';
import { BlockItem } from './BlockItem';
import { BlockToolbox } from './BlockToolbox';
import { BlockSettings } from './BlockSettings';

type BuilderProps = {
  initialBlocks?: Block[];
  onBlocksChange: (blocks: Block[]) => void;
};

export function Builder({ initialBlocks = [], onBlocksChange }: BuilderProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((item: Block) => item.id === active.id);
      const newIndex = blocks.findIndex((item: Block) => item.id === over.id);
      const newBlocks = arrayMove(blocks, oldIndex, newIndex) as Block[];
      setBlocks(newBlocks);
      onBlocksChange(newBlocks);
    }

    setActiveId(null);
  };

  const addBlock = (type: Block['type']) => {
    let newBlock: Block;
    switch (type) {
      case 'text':
        newBlock = { id: `block-${uuidv4()}`, type: 'text', text: 'Edit this text...', styles: {} } as Block;
        break;
      case 'button':
        newBlock = { id: `block-${uuidv4()}`, type: 'button', label: 'Click Me', href: '#', styles: {} } as Block;
        break;
      case 'image':
        newBlock = { id: `block-${uuidv4()}`, type: 'image', src: '/placeholder-image.jpg', alt: '', styles: {} } as Block;
        break;
      case 'divider':
        newBlock = { id: `block-${uuidv4()}`, type: 'divider' } as Block;
        break;
      default:
        // Fallback to a simple text block if an unsupported type is requested
        newBlock = { id: `block-${uuidv4()}`, type: 'text', text: 'Edit this text...', styles: {} } as Block;
        break;
    }

    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    onBlocksChange(newBlocks);
    setSelectedBlockId(newBlock.id);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    const newBlocks = blocks.map((block: Block) =>
      (block.id === id ? ({ ...block, ...updates } as Block) : block)
    ) as Block[];
    setBlocks(newBlocks);
    onBlocksChange(newBlocks);
  };

  const deleteBlock = (id: string) => {
    const newBlocks = blocks.filter((block: Block) => block.id !== id) as Block[];
    setBlocks(newBlocks);
    onBlocksChange(newBlocks);
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const selectedBlock = blocks.find((block: Block) => block.id === selectedBlockId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Toolbox */}
      <div className="w-64 border-r border-gray-200 bg-white p-4">
        <BlockToolbox onAddBlock={addBlock} />
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-3xl">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blocks} strategy={rectSortingStrategy}>
              <div className="space-y-4">
                {blocks.map((block: Block) => (
                  <BlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    onUpdate={(updates: Partial<Block>) => updateBlock(block.id, updates)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="opacity-75">
                  <BlockItem
                    block={blocks.find((b: Block) => b.id === activeId)!}
                    isSelected={false}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {blocks.length === 0 && (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500">
              <p>Drag blocks here or click on the left to add content</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Block Settings */}
      <div className="w-80 border-l border-gray-200 bg-white p-4">
        {selectedBlock ? (
          <BlockSettings
            block={selectedBlock}
            onUpdate={(updates: Partial<Block>) => updateBlock(selectedBlock.id, updates)}
          />
        ) : (
          <div className="text-gray-500">
            <p>Select a block to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  );
}
