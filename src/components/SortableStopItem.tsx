"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PlaceStop } from "@/types/itinerary";
import type { StopItemProps } from "@/components/StopItem";
import StopItem from "@/components/StopItem";

interface SortableStopItemProps extends StopItemProps {
  id: string;
}

export default function SortableStopItem({ id, ...props }: SortableStopItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: props.stop.pinned });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <StopItem {...props} dragListeners={props.stop.pinned ? undefined : listeners} />
    </div>
  );
}
