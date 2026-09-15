import React, { memo, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/components/CompanyCard.css';
import { FaCog, FaSignOutAlt, FaChevronUp, FaChevronDown,  } from 'react-icons/fa';
import { RiCalendarScheduleFill } from "react-icons/ri";
import { BsPeopleFill } from "react-icons/bs";
import { Company } from '../../types/interfaces';

const CompanyCardComponent: React.FC<Company> = ({image, name, level, onTeamModalOpen }) => {
    const [showMenu, setShowMenu] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setShowMenu(prev => !prev);
    }, []);

    const handleLogout = useCallback(() => {
        navigate('/logout');
    }, [navigate]);

    const handleTeamClick = useCallback(() => {
        onTeamModalOpen();
        setShowMenu(false);
    }, [onTeamModalOpen]);

    const handleSettings = useCallback(() => {
        console.log('Settings clicked');
        setShowMenu(false);
    }, []);

    const storedLogo = localStorage.getItem("companyLogo");

    const logoSrc = useMemo(() => {
        if (!storedLogo) {
            return image;
        }
        if (storedLogo.startsWith("http")) {
            return storedLogo;
        }
        return `${import.meta.env.VITE_MEDIA_URL}${storedLogo}`;
    }, [image, storedLogo]);
    

    return (
        <div className="company-card-wrapper">
            <div className={`company-popup-menu ${showMenu ? 'visible' : ''}`}>
                <button 
                    className="popup-menu-button my-team-button"
                    onClick={handleTeamClick}
                >
                    <BsPeopleFill  />
                    <span>Team</span>
                </button>

                <button 
                    className="popup-menu-button schedules-button"
                    onClick={() => {navigate('/schedule-management/'); setShowMenu(false);}}
                >
                    <RiCalendarScheduleFill />
                    <span>Schedule</span>
                </button>

                <button 
                    className="popup-menu-button settings-button"
                    onClick={handleSettings}
                >
                    <FaCog />
                    <span>Settings</span>
                </button>

                <button 
                    className="popup-menu-button logout-button"
                    onClick={handleLogout}
                >
                    <FaSignOutAlt />
                    <span>Logout</span>
                </button>
            </div>
            
            <button 
                className={`company-profile-card ${showMenu ? 'active' : ''}`}
                onClick={toggleMenu}
                aria-expanded={showMenu}
                title="Click to open menu"
            >
                <div className="toggle-indicator">
                    {showMenu ? <FaChevronUp /> : <FaChevronDown />}
                </div>
                <div id="company-image">
                    <img
                        src={logoSrc}
                        alt="Company Logo"
                    />
                </div>
                <div className="company-info">
                    <div className="company-info-text">
                        <p className="company-name">{localStorage.getItem("companyName") || name}</p>
                        <p className="level">{level}</p>
                    </div>
                    <div className="xp-bar-container">
                        <div className="xp-bar"></div>
                        <div className="xp-glow"></div>
                    </div>
                </div>
            </button>
        </div>
    );
};

const CompanyCard = memo(CompanyCardComponent);

export { CompanyCard };
