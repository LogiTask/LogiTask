import React from 'react';
import '../../styles/components/modal.css';
import '../../styles/components/NoteSelectionModal.css';

export type NoteType = 'property' | 'schedule';

interface NoteSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNoteType: (noteType: "property" | "schedule") => void; 
}

const NoteSelectionModal: React.FC<NoteSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectNoteType,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container note-selection-container">
        <button className="modal-close-btn" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>
        
        <h3> Select Note Type </h3>
        
        <div className="modal-btn-container">
          <button
            className="modal-btn note-type-btn property-note-btn"
            onClick={() => {
              onSelectNoteType('property');  
              onClose();}
            }
          >
            <i className="fa-solid fa-house-user note-symbol"></i>
            Property Note
          </button>
          
          <button 
            className="modal-btn note-type-btn schedule-note-btn"
            onClick={() => {
              onSelectNoteType('schedule');  
              onClose();}
            }
          >
            <i className="fa-solid fa-briefcase note-symbol"></i>
            Schedule Note
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteSelectionModal;