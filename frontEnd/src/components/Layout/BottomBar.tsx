import React, { memo } from 'react';
import { FaExchangeAlt, FaUserPlus } from 'react-icons/fa';
import '../../styles/components/BottomBar.css';
import { CompanyCard } from '../Company/CompanyCard';
import { useUser } from '../../contexts/userContext';

interface BottomBarProps {
    isModeRotated: boolean;
    handleModeClick: () => void;
    openAddClientModal: () => void;
    onTeamModalOpen: () => void;
    onStatsToggle: () => void;
    modeType: string;
    showStats?: boolean;
}

const BottomBarComponent: React.FC<BottomBarProps> = ({ isModeRotated, handleModeClick, openAddClientModal, onTeamModalOpen, onStatsToggle, modeType, showStats = false}) => {
    const user = useUser();

    return (
        <div className="bottom-menu">
            <div className="bottom-menu-container">
                <div className="bottom-menu-button-container">
                    {user.role === 'BOSS' && (
                        <>
                            <button 
                                className={`action-button mode-button ${isModeRotated ? 'rotated' : ''}`} 
                                onClick={handleModeClick} 
                                title={`Switch Mode`}
                            >
                                <FaExchangeAlt />
                            </button>
                            {modeType === 'Client' && (
                                <button className="action-button" onClick={openAddClientModal} title="Add Client">
                                    <FaUserPlus />
                                </button>
                                )   
                            }
                        </>
                    )}
                    {modeType === 'Daily' && (
                        <button 
                            className={`action-button stats-button ${showStats ? 'active' : ''}`}
                            onClick={onStatsToggle}
                            title={showStats ? "Hide Daily Stats" : "Show Daily Stats"}
                        >
                            <i className="fa-solid fa-chart-column"></i>
                        </button>
                    )}
                </div>
                
                <CompanyCard 
                        image="https://art.pixilart.com/thumb/sr2e1188a7c216a.png" 
                        name="Company Name"
                        level={user.role === 'BOSS' ? 'Admin' : user.role === 'WORKER' ? 'Worker' : 'None'}
                        onTeamModalOpen={onTeamModalOpen}
                />
            </div>
        </div>
    )
}

const BottomBar = memo(BottomBarComponent);

export default BottomBar;