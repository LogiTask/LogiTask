import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import "../../styles/components/DailyResheduleStrip.css"
import { useUser } from "../../contexts/userContext";

interface DailyRescheduleProps {
  isDragging?: boolean;
}

const DailyReschedule: React.FC<DailyRescheduleProps> = ({ isDragging }) => {
  const user = useUser();

const userTimeZone = useMemo(
  () => localStorage.getItem("userTimeZone") ?? "America/Chicago",
  []
);

const nextSixDays = useMemo(() => {
  const todayInUserTZ = new Date(
    new Date().toLocaleString("en-US", { timeZone: userTimeZone })
  );
  todayInUserTZ.setHours(0, 0, 0, 0);
  const fmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: userTimeZone,
  });

  return Array.from({ length: 6 }, (_, idx) => {
    const date = new Date(todayInUserTZ);        
    date.setDate(date.getDate() + (idx + 1));        

    return {
      dayNum: idx + 1,
      date,
      formatted: fmt.format(date),
    };
  });
}, [userTimeZone]);

  // Create the droppable areas
  const droppables = [
    useDroppable({ id: "droppable-1" }),
    useDroppable({ id: "droppable-2" }),
    useDroppable({ id: "droppable-3" }),
    useDroppable({ id: "droppable-4" }),
    useDroppable({ id: "droppable-5" }),
    useDroppable({ id: "droppable-6" })
  ];

  const deleteJob = useDroppable({ id: "delete-job" });
  
  if (!isDragging || user.role !== "BOSS") {
    return null; 
  }

  return (
    <>
      <div className="daily-reschedule-strip-container">
        <div className="drag-tip">Drag and drop to reschedule to another date!</div>
        <section className="daily-reschedule-strip">
          {nextSixDays.map((day, index) => (
            <div 
              key={`day-${day.dayNum}`}
              ref={droppables[index].setNodeRef} 
              className={`box ${droppables[index].isOver ? 'is-over' : ''}`}
            >
              {/* Month and day at the bottom */}
              <span className="dates">
                {new Intl.DateTimeFormat('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  timeZone: userTimeZone 
                }).format(day.date)}
              </span>
              {/* Weekday at the top */}
              <span className="weekday">
                {new Intl.DateTimeFormat('en-US', { 
                  weekday: 'short',
                  timeZone: userTimeZone 
                }).format(day.date)}
              </span>
            </div>
          ))}
        </section>
      </div>
      <div className="daily-reschedule-delete">
        <div 
          ref={deleteJob.setNodeRef} 
          className={`trash-can ${deleteJob.isOver ? 'is-over' : ''}`}
        >
          <div className="trash-lid"></div>
          <div className="trash-container"></div>
          <div className="trash-label">Delete Job</div>
        </div>
      </div>
    </>
  );
};

export default DailyReschedule;