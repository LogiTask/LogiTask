import React, { useState, useEffect, useRef} from 'react';
import { PropertyNote, ScheduleNote } from '../../types/noteTypes';
import '../../styles/components/modal.css';
import '../../styles/components/NoteFormModal.css';
import api from '../../api';
import { formatUTCtoLocal } from '../../utils/format';
import { useQueryClient } from '@tanstack/react-query';

export type NoteType = 'property' | 'schedule';

interface NoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteType: NoteType;
  targetId: number;
  existingNote?: PropertyNote | ScheduleNote | null;
}

const NoteFormModal: React.FC<NoteFormModalProps> = ({
  isOpen,
  onClose,
  noteType,
  targetId,
  existingNote
}) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const userTimeZone = localStorage.getItem("userTimeZone") ?? "UTC";

  useEffect(() => {
    if (isOpen) {
      if (existingNote) {
        setContent(existingNote.content);
        setTitle(existingNote.title);
      } else {
        setContent('');
        setTitle('');
      }
    }
  }, [isOpen, existingNote]);

  useEffect(() => {
      if (isOpen) {
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = 'auto';
      }

      return () => {
          document.body.style.overflow = 'auto';
      };
  }, [isOpen]);

  useEffect(() => {
      if (isOpen) {
          setTimeout(autoResizeTextarea, 0);
      }
  }, [isOpen, content]);

  const autoResizeTextarea = () => {
      const textarea = notesTextareaRef.current;
      if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
      }
  };

  const queryClient = useQueryClient();

  const handleClose = () => {
      onClose();
      setContent('');
  }


  const handleSubmit = async () => {
    try {
      if (existingNote) {
          await api.patch(`/api/${noteType}-note/modify/${existingNote.id}/`, { title, content });
      } else {
          await api.post(`/api/${noteType}/${targetId}/notes/`, { title, content });
      }
      queryClient.invalidateQueries({ queryKey: ['todaysJobs'] });
      handleClose();

      } catch (error) {
        console.error('Error submitting note:', error);
    }
  };

  const handleValidSubmit = () => { 
    if (!noteType) return false;
    if (existingNote) {
      return (
        content.trim().length > 0 && (content.trim() !== existingNote.content || title.trim() !== existingNote.title)
      );
    }
    return content.trim().length > 0;
  };

  const handleDelete = async () => {
    if (!existingNote) return;
    try {
      if (window.confirm('Are you sure you want to delete this note?')){
        await api.delete(`/api/${noteType}-note/modify/${existingNote.id}/`);
        queryClient.invalidateQueries({ queryKey: ['todaysJobs'] });
        handleClose();
      }
      else {
        return;
      }

    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }
   

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container note-form-container">
        <button className="modal-close-btn" onClick={handleClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>
        {existingNote && (
          <button className="note-btn-delete" onClick={handleDelete} title="Delete Note">
            <i className="fa-solid fa-trash"></i>
          </button>
        )}

        <h3>{existingNote ? `Edit ${noteType} Note` : `Create ${noteType} Note`}</h3>

        {existingNote && (
          <div className="note-timestamp">
            Last modified: <i>{formatUTCtoLocal(existingNote.last_modified, userTimeZone)}</i>
            <br />
            Created: <i>{formatUTCtoLocal(existingNote.created_at, userTimeZone)}</i>
          </div>
          
        )}
        <div modal-form-section>
          <div className="note-input-title">
            <div className='modal-section-title'>Title</div>
            <input 
              className= "adjustment-notes" 
              type="text" 
              value={title} 
              placeholder='Enter title (optional)'
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
        </div>
        
        <div className ="modal-form-section">
          <div className='modal-section-title'>Content</div>
          <textarea
            className="adjustment-notes"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setTimeout(() => autoResizeTextarea(), 0);
            }
            }
            placeholder={`Enter ${noteType} note here...`}
            maxLength={100}
            ref={notesTextareaRef}
          />
        </div>
        <div className="modal-btn-container">
          <button className="modal-btn modal-btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="modal-btn modal-btn-submit"
            disabled={!handleValidSubmit()}
            onClick={handleSubmit}
          >
            {existingNote ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteFormModal;
