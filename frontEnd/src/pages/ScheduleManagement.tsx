import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableScheduleItem from '../components/Schedule/SortableScheduleItem';
import { ScheduleForManagement } from '../types/interfaces';
import api from '../api';
import '../styles/pages/ScheduleManagement.css';

const ScheduleManagement: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [schedules, setSchedules] = useState<ScheduleForManagement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fullDaysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, 
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle day selection
  const handleDaySelect = (day: number) => {
    if (day === selectedDay) return;

    if (hasChanges) {
      if (!window.confirm("Unsaved changes will be lost. Continue anyway?")) {
        return; 
      }
      setHasChanges(false);
    }

    setSelectedDay(day);
    fetchSchedules(day);
  };
  
  // Fetch schedules for the selected day
  const fetchSchedules = async (day: number) => {
    setIsLoading(true);
    try {
      // Convert day number to day name for the API
      const dayName = fullDaysOfWeek[day];
      const response = await api.get(`/api/schedules/management/?date=${dayName}`);
      
      if (response.data.schedules) {
        setSchedules(response.data.schedules);
      } else {
        setSchedules([]);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  // Handle drag end and update priorities
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      setSchedules((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        // Reorder the array
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Update priority values for all items
        const updatedItems = reorderedItems.map((item, index) => ({
          ...item,
          priority: index + 1
        }));
        
        setHasChanges(true);
        return updatedItems;
      });
    }
  };

  // Save changes to the backend
  const handleSaveChanges = async () => {
    try {
      
      const newScheduleOrder = schedules.map(schedule => schedule.id);

      await api.post('/api/schedules/reorder/', {
        schedules: newScheduleOrder
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Error saving changes. Please try again.');
    }
  };
  
  // Initial data fetch for whatever the current day is
  useEffect(() => {
    fetchSchedules(selectedDay);
  }, []);
  
  // Get active schedule for overlay
  const activeSchedule = activeId ? schedules.find(s => s.id === activeId) : null;
  
  return (
    <div className="jo-container">
      <div className="return-button-container">
          <button className="return-button" onClick={() => window.history.back()}>
              <i className="fa-solid fa-arrow-left"></i> Back
          </button>
      </div>
      <div className="jo-content-wrapper">
        <header className="jo-header">
          <h1 className="jo-title">Schedule Management</h1>
          <p className="jo-subtitle">Set the order jobs will appear in Daily Mode</p>
        </header>
        
        {/* Day selection navigation */}
        <div className="jo-day-selector">
          {daysOfWeek.map((day, index) => (
            <button
              key={index}
              className={`jo-day-button ${selectedDay === index ? 'jo-day-selected' : ''}`}
              onClick={() => handleDaySelect(index)}
            >
              {day}
            </button>
          ))}
        </div>
        <div className="jo-schedules-header">
          <h2>
            <span>{schedules.length}</span> Schedule{schedules.length !== 1 ? 's' : ''} for <span>{fullDaysOfWeek[selectedDay]}</span>
          </h2>
        </div>
        
        {/* Loading indicator */}
        {isLoading ? (
          <div className="jo-loading">
            <div className="jo-spinner"></div>
            <p>Loading schedules...</p>
          </div>
        ) : (
          <div className="jo-content">
            {schedules.length === 0 ? (
              <div className="jo-no-schedules">
                <i className="fa-solid fa-calendar-xmark"></i>
                <p>No schedules for {fullDaysOfWeek[selectedDay]} :,(</p>
              </div>
            ) : (
              <>
                {/* This is the drag and drop context */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={schedules.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="jo-schedules-list">
                      {schedules.map((schedule, index) => (
                        <SortableScheduleItem
                          key={schedule.id}
                          schedule={schedule}
                          index={index}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                  
                  {/* Drag Overlay for better UX during drag */}
                  <DragOverlay dropAnimation={null} zIndex={1000}>
                    {activeId && activeSchedule && (
                      <SortableScheduleItem
                        schedule={activeSchedule}
                        index={schedules.findIndex(s => s.id === activeId)}
                        isDragging={true}
                      />
                    )}
                  </DragOverlay>
                </DndContext>
              </>
            )}
          </div>
        )}
        
        {/* Action button */}
        <div className="jo-action-button-container">
          <button 
            className={`modal-btn-submit ${hasChanges ? 'jo-has-changes' : ''}`}
            disabled={!hasChanges}
            onClick={handleSaveChanges}
          >
            <span>{hasChanges ? 'Save Changes' : 'No Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleManagement;