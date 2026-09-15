import React, {useState, useEffect, useRef} from "react";
import { ClientDataID } from "../../types/interfaces";
import "../../styles/components/AdjustmentModal.css";
import api from "../../api";
import { validateCurrencyInput } from '../../utils/format';

interface AdjustmentModalProps {
    isOpen: boolean;
    client?: ClientDataID;
    onClose: () => void;
    onAdjustmentSuccess?: () => void;
}

const AdjustmentModal: React.FC<AdjustmentModalProps> = ({ client, onClose, isOpen, onAdjustmentSuccess }) => {
    const [adjustmentMethod, setAdjustmentMethod] = useState('');
    const [value, setValue] = useState('');
    const [notes, setNotes] = useState('');
    const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
    
    const autoResizeTextarea = () => {
        const textarea = notesTextareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const clientId = client?.id;
            const adjustmentResponse = await api.post(`/api/client/${clientId}/adjustments/`, {
                amount: value,
                reason: notes,
                adjustment_type:adjustmentMethod
            }, { headers: {
                'Content-Type': 'application/json'
            }});
            if (adjustmentResponse.status === 201) {
                onAdjustmentSuccess?.()
                alert("Adjustment received")
            }
        }catch (err) {
            console.error("Error adding Adjustment:", err);
            alert(`Error: ${err}`);
        }
        onClose();
  };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const validValue = validateCurrencyInput(newValue, value);
        setValue(validValue);
    };


    const handleAdjustmentMethodSelect = (method: string) => {
        setAdjustmentMethod(method);
    };

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
    }, [isOpen, notes]);

    const handleDisabledSubmit = () => {
        if (!adjustmentMethod || value === '0' || value === '') {
            return true; 
        }
            return false; 
    }

    if (!isOpen) {
        return null; 
    }

    return (
        <div className="modal-overlay">
            <div 
                className="modal-container" 
            >
                <button 
                    type="button"
                    className="modal-close-btn" 
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        setAdjustmentMethod('');
                        setValue('');
                        setNotes('');
                    }}
                    aria-label="Close"
                >
                <i className="fas fa-xmark"></i>
                </button>

                <h3>Adjust Balance</h3>
                <form onSubmit={handleSubmit}>
                    <div className="modal-form-section">
                        <div className="modal-section-title">
                            {'Client Information'}
                        </div>
                        <div className="payment-client-info">
                            <i className="fa-solid fa-user"></i>
                            <span>
                                {client ? `${client.firstName} ${client.lastName ?? ""}` : "No client selected"}
                            </span>
                        </div>
                    </div>


                    <div className="modal-form-section">
                        <label htmlFor="payment-amount" className="modal-section-title">Adjustment {adjustmentMethod}</label>
                        <div className="payment-amount-container">
                            <div className="payment-amount-input-container">
                                <span className="dollar-sign">$</span>
                                <input
                                    id="payment-amount"
                                    name="payment-amount"
                                    type="number"
                                    value={value}
                                    onChange={handleAmountChange}
                                    min="1"
                                    step="0.01"
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Amount"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="modal-form-section">
                        <div className="modal-section-title">Adjustment Method</div>
                            <div className="payment-method-options" role="radiogroup">
                                <button
                                    type="button"
                                    className={`payment-method-pill ${adjustmentMethod === 'credit' ? 'active' : ''}`}
                                    onClick={(e) => {
                                    e.stopPropagation();
                                        handleAdjustmentMethodSelect('credit');
                                    }}
                                        aria-pressed={adjustmentMethod === 'credit'}
                                >
                                    <i className="fa-solid fa-arrow-up"></i> <span>Credit</span>
                                </button>

                                <button
                                    type="button"
                                    className={`payment-method-pill ${adjustmentMethod === 'debit' ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAdjustmentMethodSelect('debit');
                                    }}
                                    aria-pressed={adjustmentMethod === 'debit'}
                                >
                                    <i className="fa-solid fa-arrow-down"></i> <span>Debit</span>
                                </button>
                            </div>

                            <input 
                                type="hidden" 
                                name="payment-method" 
                                value={adjustmentMethod} 
                                required
                            />
                    </div>
                    <div className="adjustment-form-section">
                        <label htmlFor="adjustment-notes" className="modal-section-title">Notes
                        </label>
                        <span className="optional-text">(optional)</span>
                        <textarea
                            id="adjustment-notes"
                            name="adjustment-notes"
                            rows={1}
                            placeholder="Add reason here..."
                            value={notes}
                            onChange={(e) => {
                                setNotes(e.target.value);
                                setTimeout(() => autoResizeTextarea(), 0);
                            }}
                            className="adjustment-notes"
                            ref={notesTextareaRef}
                        ></textarea>
                    </div>

                    <div className="modal-btn-container">
                        <button 
                            type="button"
                            className="modal-btn-cancel" 
                            onClick={(e) => {
                                setAdjustmentMethod('');
                                setValue('');
                                setNotes('');
                                onClose();
                                e.stopPropagation();
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
                            Adjust
                        </button>
                    
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdjustmentModal;
