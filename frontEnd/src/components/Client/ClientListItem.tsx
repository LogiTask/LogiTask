import React, { memo, useCallback, useState } from 'react';
import { ClientDataID } from '../../types/interfaces';
import PaymentModal from '../Payment/PaymentModal';
import { useNavigate } from "react-router-dom";
import '../../styles/components/ClientListItem.css';
import EditClientModal from './EditClientModal';
import { useQueryClient } from '@tanstack/react-query';

interface ClientListItemProps {
    client: ClientDataID;
    isFocused: boolean;
    onClick: (id: number) => void;
    renderStars: (count: number) => JSX.Element[];
    onClientUpdated: (updatedClient: ClientDataID) => void;
}

const ClientListItemComponent: React.FC<ClientListItemProps> = ({ client, isFocused, onClick, renderStars, onClientUpdated }) => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const queryClient = useQueryClient();

    const handlePayClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPaymentModal(true);
    }, []);

    const handleEditClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowEditModal(true);
    }, []);

    const handlePaymentSubmit = (amount: string, method: string) => {
        console.log(`Payment recorded for ${client.firstName} ${client.lastName}: $${amount} via ${method}`);
        setShowPaymentModal(false);
    };

    const handlePaymentModalClose = useCallback(() => {
        setShowPaymentModal(false);
    }, []);

    const handleEditModalClose = useCallback(() => {
        setShowEditModal(false);
    }, []);

    const navigate = useNavigate();
    const handleClientClick = useCallback(() => {
        if (!isFocused) return;
        navigate(`client-view/`, {
            state: {
                client: client,
            }
        });
    }, [isFocused, navigate, client]);

    const handleListItemClick = useCallback(() => {
        onClick(client.id);
        handleClientClick(); 
    }, [client.id, onClick, handleClientClick]);
    
    return (
        <>
            <li
                className={`list-item ${isFocused ? 'focused' : ''}`}
                onClick={handleListItemClick}
            >
                <div className="list-item-header">
                    <div className="profile-pic-container">
                        <img
                        src={'https://i.pinimg.com/736x/c0/74/9b/c0749b7cc401421662ae901ec8f9f660.jpg'}
                        alt={`${client.firstName} ${client.lastName}`}
                        className="profile-pic"
                        />
                    </div>
                    <div className="list-item-name">{`${client.firstName} ${client.lastName || ''}`}</div>
                    {isFocused && (
                        <div className="client-action-buttons">
                            <button
                                className="payment-button client-payment-button"
                                onClick={handlePayClick}
                                title="Record payment"
                            >
                                <i className="fa-solid fa-money-bill-wave"></i>
                            </button>
                            <button
                                className="gear-button"
                                onClick={handleEditClick}
                                title="Edit Client Information"
                            >
                                <i className="fas fa-cog"></i>
                            </button>
                        </div>
                    )}
                </div>
                <div className="stars">{renderStars(3)}</div>
            </li>

            <PaymentModal 
                isOpen={showPaymentModal}
                onClose={handlePaymentModalClose}
                client={client}
                onPaymentSubmit={handlePaymentSubmit}
                onPaymentSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['todaysPayments'] })
                }}
            />
            {showEditModal && (
                <EditClientModal 
                    isOpen={showEditModal}
                    client={client}
                    onClose={handleEditModalClose}
                    onClientUpdated={onClientUpdated}
                />
            )}
        </>
    );
};

const ClientListItem = memo(ClientListItemComponent);

export default ClientListItem;