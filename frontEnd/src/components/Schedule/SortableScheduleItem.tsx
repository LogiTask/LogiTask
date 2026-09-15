import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScheduleForManagement } from '../../types/interfaces';
import ScheduleListItem from './ScheduleListItem';
import { motion } from 'framer-motion';

interface SortableScheduleItemProps {
  schedule: ScheduleForManagement;
  index: number;
  isDragging?: boolean;
}

const SortableScheduleItem: React.FC<SortableScheduleItemProps> = ({
  schedule,
  index,
  isDragging: externalIsDragging = false
}) => {
  const [rotation, setRotation] = useState(0);
  const movementBufferRef = useRef<number[]>([0, 0, 0]);
  const rafIdRef = useRef<number>();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging: internalIsDragging = false,
  } = useSortable({ id: schedule.id });

  const effectiveIsDragging = externalIsDragging || internalIsDragging;

  // Update rotation based on pointer movement
  const updateRotation = useCallback((movementX: number) => {
    if (rafIdRef.current) return;

    rafIdRef.current = requestAnimationFrame(() => {
      const buffer = movementBufferRef.current;
      buffer.shift();
      buffer.push(movementX);

      const weightedMovement = buffer[0] * 0.2 + buffer[1] * 0.3 + buffer[2] * 0.5;
      const newRotation = Math.max(-6, Math.min(6, weightedMovement * 1.2));
      
      setRotation(newRotation);
      rafIdRef.current = undefined;
    });
  }, []);

  // Handle pointer movement for rotation effect
  useEffect(() => {
    if (!effectiveIsDragging) {
      setRotation(0);
      return;
    }

    let lastClientX = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const movementX = clientX - lastClientX;
      lastClientX = clientX;
      
      if (movementX !== 0) {
        updateRotation(movementX);
      }
    };

    const handlePointerStart = (e: MouseEvent | TouchEvent) => {
      lastClientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      
      if ('touches' in e) {
        document.body.style.touchAction = 'none';
        document.body.style.overflow = 'hidden';
      }
    };
 
    const handlePointerEnd = () => {
      document.body.style.touchAction = '';
      document.body.style.overflow = '';
      setRotation(0);
    };

    // Add event listeners
    window.addEventListener('mousemove', handlePointerMove, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('mousedown', handlePointerStart);
    window.addEventListener('touchstart', handlePointerStart);
    window.addEventListener('mouseup', handlePointerEnd);
    window.addEventListener('touchend', handlePointerEnd);

    return () => {
      // Clean up event listeners
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mousedown', handlePointerStart);
      window.removeEventListener('touchstart', handlePointerStart);
      window.removeEventListener('mouseup', handlePointerEnd);
      window.removeEventListener('touchend', handlePointerEnd);
      
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      document.body.style.touchAction = '';
      document.body.style.overflow = '';
    };
  }, [effectiveIsDragging, updateRotation]);

  const dragStyle = effectiveIsDragging ? {
    rotate: rotation,
    boxShadow: "20px 10px 25px rgba(0,0,0,0.3), 0px 4px 10px rgba(0,0,0,0.2)",
  } : {
    rotate: 0,
    boxShadow: "0px 2px 5px rgba(0,0,0,0.1)"
  };

  return (
    <div 
      ref={setNodeRef} 
      style={{
        transform: CSS.Transform.toString(transform), 
        transition,
      }}
      className={internalIsDragging ? "hidden-during-drag" : ""}
    >
      <motion.div 
        className={`sortable-schedule-wrapper${internalIsDragging ? ' draggable' : ''}`}
        animate={dragStyle}
        transition={{
          rotate: {
            type: "spring",
            stiffness: 300,    
            damping: 25,       
            mass: 0.6,         
            velocity: 1       
          },
          scale: {
            type: "spring",
            stiffness: 350,
            damping: 20
          },
          default: {
            duration: 0.3
          }
        }}
      >
        <ScheduleListItem 
          schedule={schedule}
          index={index}
          dragHandleProps={{
            ref: setActivatorNodeRef,
            listeners,
            ...attributes
          }}
        />
      </motion.div>
    </div>
  );
};

export default SortableScheduleItem;