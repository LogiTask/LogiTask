import React, { useState, memo } from 'react';
import { Job } from '../../types/interfaces';
import PaymentModal from '../Payment/PaymentModal';
import '../../styles/components/DailyListItem.css';
import '../../styles/components/listItem.css';
import { useQueryClient } from '@tanstack/react-query';

interface DailyListItemProps {
  job: Job;
  isFocused: boolean;
  onClick: (id: number) => void;
  onComplete?: (id: number) => void;
  onModalToggle?: (isOpen: boolean) => void;
}

const DailyListItemComponent: React.FC<DailyListItemProps> = ({ job, isFocused, onClick, onComplete, onModalToggle }) => {
  const isComplete = job.status === 'complete';
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const queryClient = useQueryClient();

  const handleItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only focus if not already focused
    if (!isFocused) {
      onClick(job.id);
    }
  };

  const handleIconClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isLoading) return;
    
    if (isFocused && onComplete) {
        setIsLoading(true);
        try {
          await onComplete(job.id);
        } finally {
          setIsLoading(false);
        }
    } else {
      onClick(job.id);
    }
  };

  const handlePayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowPaymentModal(true);
    if (onModalToggle) {
      onModalToggle(true);
    } 
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    if (onModalToggle) onModalToggle(false); // Re-enable dragging
  };

  const handlePaymentSubmit = (amount: string, method: string) => {
    console.log(`Payment recorded for ${job.property.street}: $${amount} via ${method}`);
  };

  return (
    <>
      <li
        className={`list-item daily-item ${isFocused ? 'focused daily-focused' : ''} ${isComplete ? 'daily-complete' : ''}`}
        onClick={handleItemClick}
        data-job-id={job.id}
      >
        <div className="list-item-header">
          <div 
            className={`daily-icon ${
              isLoading ? 'status-loading' : 
              isComplete ? 'status-complete' : 
              isFocused ? 'status-focused' : 
              'status-pending'
            }`}
            onClick={handleIconClick}
          >
            {isLoading ? (
              <i className="fa-solid fa-spinner"></i>
            ) : isComplete ? (
              <i className="fa-solid fa-check-circle"></i>
            ) : isFocused ? (
              <i className="fa-regular fa-circle-dot"></i>
            ) : (
              <i className="fa-regular fa-circle"></i>
            )}
          </div>
          <div className="daily-content">
            <div className="list-item-name daily-address">
              {job.property.street}
            </div>
            {isFocused && (
              <div className="client-action-buttons">
                <button 
                  className="client-payment-button" 
                  onClick={handlePayClick} 
                  title="Record payment"
                >
                  <i className="fa-solid fa-money-bill-wave"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </li>
      
      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={closePaymentModal}
        job={job}
        onPaymentSubmit={handlePaymentSubmit}
        onPaymentSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['todaysPayments'] })
        }}
      />
    </>
  );
};

const DailyListItem = memo(DailyListItemComponent)

export default DailyListItem;