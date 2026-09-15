import React, { useState, useRef, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';
import '../styles/pages/CompanySetUp.css';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const CompanySetUp: React.FC = () => {
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState('');
    const [companyImage, setCompanyImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Check if the user has a company name stored in localStorage
        // If so, redirect them to the home page 
        const companyName = localStorage.getItem("companyName");
        if (companyName) {
            navigate('/', { replace: true });
        }

        // This Fetches the user's timezone and stores it in localStorage and send it to the server
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        localStorage.setItem("userTimeZone", userTimeZone);
        api.post('/api/update-timezone/', { timezone: userTimeZone }, {
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((response) => {
            console.log('Server updated timezone:', response.data);
        }
        ).catch((error) => {
            console.error('Error updating timezone:', error);
        });

    }, [navigate]);

    const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompanyName(e.target.value);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setCompanyImage(selectedFile);
            
            const fileReader = new FileReader();
            fileReader.onload = () => {
                setPreviewUrl(fileReader.result as string);
            };
            fileReader.readAsDataURL(selectedFile);
        }
    };

    const handleReset = () => {
        setCompanyName('');
        setCompanyImage(null);
        setPreviewUrl(null);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        try {
            // Create FormData object to handle file upload
            const formData = new FormData();
            formData.append('companyName', companyName);
            
            if (companyImage) {
                formData.append('logo', companyImage);
            }
            
            const response = await api.post('/api/companySetup/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            localStorage.setItem("companyName", companyName);
            if (response.data.logo) {
                localStorage.setItem("companyLogo", response.data.logo);
            }
            
            navigate('/', { replace: true });
        } catch (err) {
            console.error('Error creating company:', err);
            setError('Failed to create company. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="company-setup-page">
            <div className="company-setup-container">
                <div className="company-setup-header">
                    <h1>Welcome to LogiTask</h1>
                    <p className="setup-description">Set up your company profile</p>
                </div>
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="company-card-preview">
                        <label htmlFor="company-image" className="company-image-upload">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Company Logo" />
                            ) : (
                                <div className="upload-placeholder">
                                    <FaPlus />
                                </div>
                            )}
                            <input 
                                type="file" 
                                id="company-image" 
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden-input"
                                ref={fileInputRef}
                            />
                        </label>
                        
                        <div className="company-info-edit">
                            <div className="company-name-input">
                                <input 
                                    type="text" 
                                    id="companyName" 
                                    value={companyName} 
                                    onChange={handleCompanyNameChange}
                                    placeholder="Company Name"
                                    required 
                                />
                            </div>
                            <p className="level-display">Lvl 5</p>
                            <div className="xp-bar-container">
                                <div className="xp-bar"></div>
                                <div className="xp-glow"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="form-buttons">
                        <button 
                            type="button" 
                            className="reset-button"
                            onClick={handleReset}
                        >
                            Reset
                        </button>
                        <button 
                            type="submit" 
                            className="complete-button"
                            disabled={isSubmitting || !companyName}
                        >
                            {isSubmitting ? 'SAVING...' : 'Complete'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanySetUp;