import React, { useState, useEffect } from 'react';
import { Job, ClientDataID } from '../../types/interfaces';
import '../../styles/components/PaymentModal.css';
import '../../styles/components/modal.css';
import api from '../../api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: Job;
  client?: ClientDataID;
  onPaymentSubmit: (amount: string, method: string) => void;
  onPaymentSuccess?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  job, 
  client, 
  onPaymentSubmit,
  onPaymentSuccess
}) => {
  // If job is provided, use its set cost, otherwise default to empty string so inputs are more user-friendly
  const [paymentAmount, setPaymentAmount] = useState(job ? job.cost.toString() : '');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Reset payment amount when job or client changes
  useEffect(() => {
    if (job) {
      setPaymentAmount(job.cost.toString());
    } else {
      setPaymentAmount('');
    }
  }, [job, client]);

  // Prevent scrolling when modal is open
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

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
   
    try {
      job?.client.id
      const propertyResponse = await api.post("/api/payments/", {
          amount:paymentAmount,
          paymentType:paymentMethod,
          client_id: client?.id || job?.client.id
      }, { headers: { // Correctly formatted object
          'Content-Type': 'application/json'
      }});
      if (propertyResponse.status === 201) {
        onPaymentSuccess?.()
        alert("Payment received")
      }
    }catch (err) {
      console.error("Error adding Payment:", err);
      alert(`Error: ${err}`);
  }   

    onPaymentSubmit(paymentAmount, paymentMethod);
    onClose();
    setPaymentMethod('');
    const cost = job?.cost || '0'
    setPaymentAmount(cost.toString())
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onClose();
    setPaymentMethod('');
    setPaymentAmount(job ? job.cost.toString() : '');
    setBalance(null);
    setRevealed(false);
  };

  const handleClearAmount = () => {
    setPaymentAmount('');
  };

  const handleDisabledSubmit = () => {
    if (!paymentMethod || paymentAmount === '') {
      return true; 
    }
    return false; 
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        setPaymentAmount(value);
    }
  };

  const handleEstimatedBalance = async () => {
    try {
      const balanceResponse = await api.get(
        `/api/get_estimated_balance/${client?.id || job?.client.id}/`
      );

      if (balanceResponse.status === 200) {
        setBalance(balanceResponse.data.estimated_balance);
        setRevealed(true);
      } else {
        alert("Failed to get balance.");
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
      alert(`Error: ${err}`);
    }
  };

  const getBalanceLabel = (balance: number | null): string => {
    if (balance === null) return "Balance unavailable";
    if (balance < 0) return `Balance Due: $${Math.abs(balance)}`;
    if (balance > 0) return `Credit: $${balance}`;
    return "No balance due";
  }
    

  if (!isOpen) return null;
  
  return (
    <div 
      className="modal-overlay" 
    >
      <div 
        className="payment-modal-container modal-container" 
      >
        <button 
          type="button"
          className="modal-close-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            handleCancel(e);
          }}
          aria-label="Close"
        >
          <i className="fas fa-xmark"></i>
        </button>
        
        <h3>Record Payment</h3>
        
        <form onSubmit={handleSubmit}>
            <div className="modal-form-section">
              <div className="modal-section-title">
                {job ? 'Property Information' : 'Client Information'}
              </div>
              
              {/* Only show property info if job is provided */}
              {job && (
                <div className="payment-property-info">
                  <i className="fa-solid fa-location-dot"></i>
                  <span>{job.property.street}</span>
                </div>
              )}
              
              <div className="payment-client-info">
                <i className="fa-solid fa-user"></i>
                <span>
                  {(() => {
                    const person = job?.client ?? client;
                    if (!person) return "No client selected";
                    return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
                  })()}
              </span>
              </div>
              <button
                type="button"
                className="payment-balance-btn"
                onClick={handleEstimatedBalance}
                title="Get Estimated Balance"
              >
                <i className="fa-solid fa-money-bills"></i>
                <span className={!revealed ? "not-revealed" : "revealed"}>
                  {!revealed 
                    ? "Click to view Balance" 
                    : getBalanceLabel(balance)
                  }
                </span>
              </button>
            </div>
            
            <div className="modal-form-section">
              <label htmlFor="payment-amount" className="modal-section-title">Payment Amount</label>
              <div className="payment-amount-container">
                <div className="payment-amount-input-container">
                  <span className="dollar-sign">$</span>
                  <input
                    id="payment-amount"
                    name="payment-amount"
                    type="number"
                    value={paymentAmount}
                    onChange={handleAmountChange}
                    min="1"
                    step="0.01"
                    pattern="[0-9]+(\.[0-9]{1,2})?"
                    required
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0.00"
                  />
                  {paymentAmount && (
                    <button
                      type="button"
                      className="clear-amount-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearAmount();
                      }}
                      aria-label="Clear amount"
                      title="Clear amount"
                    >
                      <i className="fa-regular fa-trash-can"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-form-section">
              <div className="modal-section-title">Payment Method</div>
              <div className="payment-method-options" role="radiogroup">
          <button
            type="button"
                className={`payment-method-pill ${paymentMethod === 'cash' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
                  handlePaymentMethodSelect('cash');
            }}
                aria-pressed={paymentMethod === 'cash'}
          >
                <i className="fa-solid fa-money-bill"></i> Cash
          </button>
              <button 
                type="button"
                className={`payment-method-pill ${paymentMethod === 'zelle' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePaymentMethodSelect('zelle');
                }}
                aria-pressed={paymentMethod === 'zelle'}
              >
                <i className="fa-solid fa-money-bill-transfer"></i>Zelle
              </button>
              <button 
                type="button"
                className={`payment-method-pill ${paymentMethod === 'check' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePaymentMethodSelect('check');
                }}
                aria-pressed={paymentMethod === 'check'}
              >
                <i className="fa-solid fa-money-check-dollar"></i> Check
              </button>
              <button 
                type="button"
                className={`payment-method-pill ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePaymentMethodSelect('card');
                }}
                aria-pressed={paymentMethod === 'card'}
              >
                <i className="fa-solid fa-credit-card"></i> Card
              </button>
              
              {/* Hidden input to store the selected payment method for form submission */}
              <input 
                type="hidden" 
                name="payment-method" 
                value={paymentMethod} 
                required
              />
      </div>
            </div>
            
            <div className="modal-btn-container ">
              <button 
                type="button"
                className="modal-btn-cancel" 
              onClick={(e) => {
                e.stopPropagation();
                handleCancel(e);
              }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="modal-btn-submit" 
                disabled={handleDisabledSubmit()}
                onClick={(e) => e.stopPropagation()}
              >
                 Record Payment
              </button>
              
            </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal; 