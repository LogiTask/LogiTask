import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DailyListItem from './DailyListItem';
import { Job } from '../../types/interfaces';
import '../../styles/components/SortableDailyList.css';
import { motion } from 'framer-motion';

interface SortableDailyListItemProps {
  job: Job;
  isFocused: boolean;
  onClick: (id: number) => void;
  onComplete?: (id: number) => void;
  isDisabled: boolean;
  isDragging?: boolean;
  onModalToggle?: (isOpen: boolean) => void;
}

const SortableDailyListItemComponent: React.FC<SortableDailyListItemProps> = ({
  job,
  isFocused,
  onClick,
  onComplete,
  isDisabled = false,
  isDragging: externalIsDragging = false,
  onModalToggle
}) => {
  const [rotation, setRotation] = useState(0);
  const movementBufferRef = useRef<number[]>([0, 0, 0]);
  const rafIdRef = useRef<number>();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: internalIsDragging = false,
  } = useSortable({ 
    id: job.id,
    disabled: !isFocused || isDisabled 
  });

  const effectiveIsDragging = externalIsDragging || internalIsDragging;

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

    window.addEventListener('mousemove', handlePointerMove, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('mousedown', handlePointerStart);
    window.addEventListener('touchstart', handlePointerStart);
    window.addEventListener('mouseup', handlePointerEnd);
    window.addEventListener('touchend', handlePointerEnd);

    return () => {
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
    boxShadow: isFocused ? "0px 2px 5px rgba(0,0,0,0.1)" : "none",
  };

  return (
    <div 
      ref={setNodeRef} 
      style={{
        transform: CSS.Transform.toString(transform), 
        transition,
        cursor: isDisabled ? 'default' : undefined
      }}
      className={internalIsDragging ? "hidden-during-drag" : ""}
      {...attributes}
      {...listeners}  
    >
      <motion.div 
        className={`sortable-job-wrapper ${isDisabled ? 'disabled' : ''} ${isFocused ? 'draggable' : ''}`}
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
        <DailyListItem
          job={job}
          isFocused={isFocused}
          onClick={onClick}
          onComplete={onComplete}
          onModalToggle={onModalToggle}
        />
      </motion.div>
    </div>
  );
};

const SortableListItem = memo(SortableDailyListItemComponent);

export default SortableListItem;