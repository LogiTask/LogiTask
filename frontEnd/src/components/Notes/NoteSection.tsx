import React, { useState } from "react";
import { Job } from "../../types/interfaces";
import "../../styles/components/NoteSection.css";
import NoteFormModal from "./NoteFormModal";

interface NotesSectionProps {
  selectedJob: Job | null;
  isDragging?: boolean;
}

const NotesSection: React.FC<NotesSectionProps> = ({ selectedJob, isDragging }) => {
  const [editingType, setEditingType] = useState<"property" | "schedule" | null>(null);

  if (!selectedJob) return null;

  const propertyNote = selectedJob.property.propertynote;
  const scheduleNote = selectedJob.schedule.schedulenote;

  return (
    <div className={`notes-section`}>
      {propertyNote && (
          <div className={`note-card${isDragging ? " hide" : ""} property`}>
            <div className="note-header">
              <span><i className="fa-solid fa-house-user"></i>Property</span>
              <button className="note-edit-btn" onClick={() => setEditingType("property")}>
                <i className="fa-solid fa-pen"></i>
              </button>
            </div>
            <div className="note-content">
              <h1>{propertyNote.title}</h1>
              <p>{propertyNote.content}</p>
            </div>
          </div>
      )}
      {scheduleNote && (
          <div className={`note-card${isDragging ? " hide" : ""} schedule`}>
            <div className="note-header">
              <span><i className="fa-solid fa-calendar-days"></i>Schedule</span>
              <button className="note-edit-btn" onClick={() => setEditingType("schedule")}>
                <i className="fa-solid fa-pen"></i>
              </button>
            </div>
            <div className="note-content">
              <h1>{scheduleNote.title}</h1>
              <p>{scheduleNote.content}</p>
            </div>
          </div>
      )}
      <NoteFormModal
        isOpen={!!editingType}
        onClose={() => setEditingType(null)}
        noteType={editingType as "property" | "schedule"}
        targetId={
          editingType === "property"
            ? selectedJob.property.id
            : selectedJob.schedule.id
        }
        existingNote={
          editingType === "property"
            ? propertyNote
            : scheduleNote
        }
      />
    </div>
  );
};

export default NotesSection;
