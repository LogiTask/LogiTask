import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/components/AddPropertyModal.css';
import api from '../../api';
import { Property_list,Schedule } from '../../types/interfaces';
import { useQueryClient } from '@tanstack/react-query';
import { validateCurrencyInput } from '../../utils/format';

interface AddPropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: number;
}

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ 
    isOpen, 
    onClose, 
    clientId
}) => {
    const queryClient = useQueryClient();
    const [jobList, setJobList] = useState<string[]>(["mow"]);
    const [clientData, setClientData] = useState<Property_list>({
        street: "",
        city: "",
        state: "",
        zipCode: "",
        schedules: [
        {
            frequency: "",
            nextDate: "",
            service: "",
            cost: 0.00,
            monthly_pricing: false
        }
    ]
    });

    // Add keyboard event prevention for when modal is open
    useEffect(() => {
        if (!isOpen) return;
        
        getJobsNames();
        const preventKeyboardEventPropagation = (e: KeyboardEvent) => {
            e.stopPropagation();
        };

        // Capture keyboard events in the capturing phase, before they bubble up
        document.addEventListener('keydown', preventKeyboardEventPropagation, true);

        return () => {
            document.removeEventListener('keydown', preventKeyboardEventPropagation, true);
        };
    }, [isOpen]);

    const resetForm = () => {
        setClientData({
            street: "",
            city: "",
            state: "",
            zipCode: "",
            schedules: [
                {
                    frequency: "",
                    nextDate: "",
                    service: "",
                    cost: 0.00,
                    monthly_pricing: false
                }
            ]
        });
        onClose();
    }

    const isScheduleFormComplete = useMemo(() => {
        return clientData.street && clientData.city && clientData.state && clientData.zipCode &&
            clientData.schedules.every(schedule => 
                schedule.frequency && schedule.nextDate && schedule.service && schedule.cost > 0);
    }, [clientData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setClientData((prevData) => ({
          ...prevData,
          [name]: value,
        }));
    };
    
    const handlePropertyChange = (index: number, field: keyof Schedule, value: string | number | boolean) => {
      setClientData((prev) => {
        const updatedProperties = [...prev.schedules];
        updatedProperties[index] = {
        ...updatedProperties[index],
        [field]: value,
        };
        return {
        ...prev,
        schedules: updatedProperties,
        };
      });
    };

    const handleAmountChange = (index: number, field: keyof Schedule) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const currentCost = clientData.schedules[index].cost.toString();
        const validValue = validateCurrencyInput(newValue, currentCost);
        
        handlePropertyChange(index, field, parseFloat(validValue) || 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Create the property associated with the client
            const propertyResponse = await api.post("/api/PropertySetup/", {
                ...clientData,
                clientId: clientId
            }, { headers:{
                'Content-Type': 'application/json'
            }});

            if (propertyResponse.status === 201) {
                // Reset form fields
                setClientData({
                    street: "",
                    city: "",
                    state: "",
                    zipCode: "",
                    schedules: [
                        {
                            frequency: "",
                            nextDate: "",
                            service: "",
                            cost: 0.00,
                            monthly_pricing: false
                        }
                    ]
                });
                
                // Close modal first
                queryClient.invalidateQueries({ queryKey: ['clients'] }); 
                queryClient.invalidateQueries({ queryKey: ['properties'] });
                onClose();
            } else {
                alert("Failed to add property.");
            }

        } catch (err) {
            console.error("Error adding property:", err);
            alert(`Error: ${err}`);
        }   
    };

     const getJobsNames = async () =>{
        try {
        // First, create the client
        const jobList = await api.get("/api/job-names/", {
            headers: {
            'Content-Type': 'application/json'
            }
        });

        if (jobList.status === 200) {
            setJobList(jobList.data)
        }
        }
        catch(err){
        console.error("Error getting clients:", err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="property-container modal-container">
                <button className="modal-close-btn" onClick={resetForm}>
                    <i className="fas fa-times"></i>
                </button>
                
                <h3>Add New Property</h3>
                
                <form onSubmit={handleSubmit}>
                    <div className="modal-form-section">
                        <div className="modal-section-title">Property Information</div>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="Street Address"
                                value={clientData.street}
                                onChange={handleInputChange}
                                name='street'
                                required
                            />
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={clientData.city}
                                    onChange={handleInputChange}
                                    name='city'
                                    required
                                />
                            </div>
                            
                            <div className="state-zip-row">
                                <div className="state-input">
                                    <input
                                        type="text"
                                        placeholder="State"
                                        value={clientData.state}
                                        onChange={handleInputChange}
                                        name='state'
                                        maxLength={2}
                                        required
                                    />
                                </div>
                                <div className="zip-input">
                                    <input
                                        type="text"
                                        placeholder="ZIP Code"
                                        value={clientData.zipCode}
                                        onChange={handleInputChange}
                                        name='zipCode'
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {clientData.schedules.map((prop, index) => (
                        <div key={index} className="modal-form-section">
                            <div className="modal-section-title">Service Information</div>
                            <div className="form-row">
                                <div className="form-group">
                                    <input 
                                        list="service-options"
                                        name="service"
                                        value={prop.service}
                                        onChange={(e) => handlePropertyChange(index, "service", e.target.value)}
                                        placeholder="Service Type"
                                        required
                                    />
                                    <datalist id="service-options">
                                        {jobList.map((service, i) => (
                                            <option key={i} value={service} />
                                            ))}
                                    </datalist>
                                </div>
                                
                                <div className="form-group">
                                    <div className="cost-input-container">
                                        <input 
                                            type="number" 
                                            placeholder="Cost" 
                                            name='cost'
                                            step="1.00"
                                            value = {prop.cost > 0 ? prop.cost.toString() : ''}
                                            onChange={(handleAmountChange(index, "cost"))}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group checkbox-group">
                                    <label className="checkbox-label">
                                        <input 
                                        type="checkbox" 
                                        checked={prop.monthly_pricing || false}
                                        onChange={(e) => handlePropertyChange(index, "monthly_pricing", e.target.checked)}
                                        />
                                        <span className="checkbox-text"> Set Monthly<br />Billing?</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <input
                                        placeholder='Start Date'
                                        className='date-input' 
                                        type="date"
                                        value={prop.nextDate}
                                        name='nextDate'
                                        onChange={(e) => handlePropertyChange(index, "nextDate", e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <select
                                        name="frequency"
                                        value={prop.frequency}
                                        onChange={(e) => handlePropertyChange(index, "frequency", e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>
                                            How Often?
                                        </option>
                                        <option value="Once">Once</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Biweekly">Every 2 Weeks</option>
                                        <option value="Triweekly">Every 3 Weeks</option>
                                        <option value="Monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <div className="modal-btn-container">
                        <button type="button" className="modal-btn-cancel" onClick={resetForm}>
                            Cancel
                        </button>
                        <button type="submit" disabled={!isScheduleFormComplete} className="modal-btn-submit">
                            Add Property
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPropertyModal;