'use client';

import type { ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ChartPaneId } from './chartColors';
import CollapsibleChartPane from './CollapsibleChartPane';

interface Props {
  paneOrder: ChartPaneId[];
  collapsedPanes: Record<ChartPaneId, boolean>;
  onToggleCollapse: (id: ChartPaneId) => void;
  onReorder: (from: number, to: number) => void;
  renderPane: (id: ChartPaneId) => ReactNode;
  renderToggles?: (id: ChartPaneId) => ReactNode;
}

function SortablePane({
  id,
  collapsed,
  onToggleCollapse,
  toggleButtons,
  children,
}: {
  id: ChartPaneId;
  collapsed: boolean;
  onToggleCollapse: () => void;
  toggleButtons?: ReactNode;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <CollapsibleChartPane
        id={id}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        toggleButtons={toggleButtons}
        dragHandleProps={listeners}
      >
        {children}
      </CollapsibleChartPane>
    </div>
  );
}

export default function DraggableChartStack({
  paneOrder,
  collapsedPanes,
  onToggleCollapse,
  onReorder,
  renderPane,
  renderToggles,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = paneOrder.indexOf(active.id as ChartPaneId);
    const to = paneOrder.indexOf(over.id as ChartPaneId);
    if (from !== -1 && to !== -1) onReorder(from, to);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={paneOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {paneOrder.map(id => (
            <SortablePane
              key={id}
              id={id}
              collapsed={collapsedPanes[id]}
              onToggleCollapse={() => onToggleCollapse(id)}
              toggleButtons={renderToggles?.(id)}
            >
              {renderPane(id)}
            </SortablePane>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
