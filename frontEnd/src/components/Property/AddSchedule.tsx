import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/components/AddScheduleModal.css';
import api from '../../api';
import { ClientSchedule } from '../../types/interfaces';
import { validateCurrencyInput } from '../../utils/format';

interface AddPropertyModalProps {
    isOpen: boolean;
    onClose: (newSchedule?: ClientSchedule) => void;
    propertyId: number;
}

interface schedule{
    frequency:string;
    nextDate:string;
    service:string;
    cost:number
    monthly_pricing?:boolean;
}

const AddSchedule: React.FC<AddPropertyModalProps> = ({ 
    isOpen, 
    onClose, 
    propertyId,
}) => {
 
    const [clientData, setClientData] = useState<schedule>({
            frequency: "",
            nextDate: "",
            service: "",
            cost: 0.00,
            monthly_pricing: false
    });
    const [jobList, setJobList] = useState<string[]>(["mow"]);

    const resetForm = () => {
        setClientData({
            frequency: "",
            nextDate: "",
            service: "",
            cost: 0.00,
            monthly_pricing: false
        });
        onClose();
    }

    const isScheduleFormComplete = useMemo(() => {
        return clientData.frequency && clientData.nextDate && clientData.service && clientData.cost >
            0;
    }, [clientData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const { name, value, type } = e.target;
            const inputValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
            
            setClientData((prevData) => ({
              ...prevData,
              [name]: inputValue,
            }));
        };
    
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const currentCost = clientData.cost.toString();
        const validValue = validateCurrencyInput(newValue, currentCost);
        
        setClientData((prevData) => ({
            ...prevData,
            cost: parseFloat(validValue) || 0
        }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Create the property associated with the client
            const propertyResponse = await api.post("/api/createSchedule/", {
                ...clientData,
                property_id: propertyId
            }, { headers:{
                'Content-Type': 'application/json'
            }});

            if (propertyResponse.status === 201) {
                // Reset form fields
                setClientData({
                        frequency: "",
                        nextDate: "",
                        service: "",
                        cost: 0.00,
                        monthly_pricing: false
                });

                onClose(propertyResponse.data);
                
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
    useEffect(() => {
        getJobsNames();
    }, []);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="schedule-container modal-container">
                <button className="modal-close-btn" onClick={resetForm}>
                    <i className="fas fa-times"></i>
                </button>
                
                <h3>Add New Schedule</h3>
                
                <form onSubmit={handleSubmit}>

                    <div className="modal-form-section">
                        <div className="modal-section-title">Service Information</div>
                        <div className="form-row">
                            <div className="form-group">
                                <input 
                                    list="service-options"
                                    name="service"
                                    value={clientData.service}
                                    onChange={(e) => handleInputChange(e)}
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
                                        name="cost"
                                        min="1"
                                        step="0.01"
                                        value={clientData.cost === 0 ? '' : clientData.cost.toString()}
                                        onChange={handleAmountChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="monthly_pricing"
                                        checked={clientData.monthly_pricing || false}
                                        onChange={handleInputChange}
                                    />
                                    <span className="checkbox-text">Monthly<br />Pricing?</span>
                                </label>
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <input 
                                    placeholder='Start Date'
                                    className='date-input' 
                                    type="date"
                                    name="nextDate"
                                    value={clientData.nextDate}
                                    onChange={(e) => handleInputChange(e)}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <select
                                    name="frequency"
                                    value={clientData.frequency}
                                    onChange={(e) => handleInputChange(e)}
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
                    
                    <div className="modal-btn-container">
                        <button type="button" className="modal-btn-cancel" onClick={resetForm}>
                            Cancel
                        </button>
                        <button type="submit" disabled={!isScheduleFormComplete} className="modal-btn-submit">
                            Add Schedule
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSchedule;