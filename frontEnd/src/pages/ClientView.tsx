import React, { useEffect, useState } from "react";
import api from "../api";
import { useLocation } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import { updateClientInCaches } from '../utils/cacheUpdates';
import { ClientDataID, clientViewJob, Payment, Adjustment } from "../types/interfaces";
import "../styles/pages/ClientView.css";
import { formatPhoneNumber, formatUTCtoLocal }  from "../utils/format";
import PaymentModal from '../components/Payment/PaymentModal';
import AdjustmentModal from '../components/Payment/AdjustmentModal';
import EditClientModal from "../components/Client/EditClientModal";
import { useNavigate } from "react-router-dom";


const ClientView: React.FC = () => {
    const location = useLocation();
    const queryClient = useQueryClient();
    const { client: initialClient} = location.state as {
        client: ClientDataID;
    };

    const [client, setClient] = useState<ClientDataID>(initialClient);
    const [newBalance, setNewBalance] = useState<number>(0);
    const [allPayments, setTotalPayments] = useState<(Payment & { invoiced: boolean })[]>([]);
    const [allPaymentsTotal, setAllPaymentsTotal] = useState<number>(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [allJobsCompleted, setAllJobsCompleted] = useState<(clientViewJob & { invoiced: boolean })[]>([]);
    const [allJobsTotal, setAllJobsTotal] = useState<number>(0);
    const [allAdjustments, setAllAdjustments] = useState<(Adjustment & { invoiced: boolean })[]>([]);
    const [allAdjustmentsTotal, setAllAdjustmentsTotal] = useState<number>(0);
    const [adjustmentDebits, setAdjustmentDebits] = useState<number>(0);
    const [adjustmentCredits, setAdjustmentCredits] = useState<number>(0);
    

    const timezone = localStorage.getItem("userTimeZone") || "UTC";

    const navigate = useNavigate();

    const fetchClientData = async () => {
        const combinedJobs: (clientViewJob & { invoiced: boolean })[] = [];
        let combinedJobTotalCents = 0;

        const combinedPayments: (Payment & { invoiced: boolean })[] = [];
        let combinedPaymentsTotalCents = 0;

        const combinedAdjustments: (Adjustment & { invoiced: boolean })[] = [];
        let combinedAdjustmentsTotalCents = 0;

        let combinedBalance = 0;
        let debitSum = 0;
        let creditSum = 0;

        try {
            const unappliedRes = await api.get(`/api/client/${client.id}/unapplied/`);

            combinedBalance += parseFloat(unappliedRes.data.delta);

            for (const job of [...(unappliedRes.data.unapplied_jobs || [])].reverse()) {
            combinedJobs.push({ ...job, invoiced: false });
            combinedJobTotalCents += parseFloat(job.cost) * 100;
            }

            for (const payment of [...(unappliedRes.data.unapplied_payments || [])].reverse()) {
            combinedPayments.push({ ...payment, invoiced: false });
            combinedPaymentsTotalCents += parseFloat(payment.amount) * 100;
            }

            for (const adjustment of [...(unappliedRes.data.unapplied_adjustments || [])].reverse()) {
            const amt = Math.abs(parseFloat(adjustment.amount));
            adjustment.adjustment_type === "debit" ? debitSum += amt : creditSum += amt;
            combinedAdjustments.push({ ...adjustment, invoiced: false });
            combinedAdjustmentsTotalCents += parseFloat(adjustment.amount) * 100;
            }

            const historyRes = await api.get(`/api/balance-history/${client.id}/`);

            if (historyRes.data?.length) {
            combinedBalance += parseFloat(
                historyRes.data[historyRes.data.length - 1].new_balance
            );

            for (const item of historyRes.data) {
                for (const job of [...(item.jobs || [])].reverse()) {
                combinedJobs.push({ ...job, invoiced: true });
                combinedJobTotalCents += parseFloat(job.cost) * 100;
                }

                for (const payment of [...(item.payments || [])].reverse()) {
                combinedPayments.push({ ...payment, invoiced: true });
                combinedPaymentsTotalCents += parseFloat(payment.amount) * 100;
                }
            }
            }

            // 🔽 single state commit
            setAllJobsCompleted(combinedJobs);
            setAllJobsTotal(combinedJobTotalCents / 100);
            setTotalPayments(combinedPayments);
            setAllPaymentsTotal(combinedPaymentsTotalCents / 100);
            setAllAdjustments(combinedAdjustments);
            setAllAdjustmentsTotal(combinedAdjustmentsTotalCents / 100);
            setAdjustmentDebits(debitSum);
            setAdjustmentCredits(creditSum);
            setNewBalance(combinedBalance);

        } catch (err) {
            console.error("Error fetching client data:", err);
        }
    };

    useEffect(() => {
        fetchClientData();
    }, [client.id]);

    const handleClientUpdated = (updatedClient: ClientDataID) => {
        setClient(updatedClient);
        updateClientInCaches(queryClient, updatedClient);
    }

    const getGradientFromBalance = (newBalance: number): [string, number] => {

        if (newBalance >= 0 || allJobsTotal === 0) {
            const fullGreen = "linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)";
            return [fullGreen, 100];
        }

        const paid = Math.max(0, allPaymentsTotal);
        const percentPaid = Math.min(100, (((paid +  Math.abs(adjustmentCredits)) / (allJobsTotal + Math.abs(adjustmentDebits))) * 100));

        const eased = Math.pow(percentPaid / 100, 0.85);    
        const hue = eased * 80;                                                    

        const start = `hsl(${hue}, 100%, 40%)`          
        const end   = `hsl(${hue}, 100%, 50%)`;

        return [`linear-gradient(90deg,${start} 0%,${end} 100%)`, percentPaid];
    }

    const gradientAndPercentage = getGradientFromBalance(newBalance);

    const handleEditClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            setShowEditModal(true);
    };

    const handlePropertyClick = (propertyIndex: number) => {
        const property = client.properties[propertyIndex];
        navigate(`/property-view/`, { state: { property, client } });
    }

    return (
        <div className="client-view-container">
            {/* Top Section */}
            <div className="return-button-container">
                <button className="return-button" onClick={() => window.history.back()}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                </button>
            </div>

            <div className="client-header-section">
                {/* Client Info Card */}
                <div className="client-info-card">
                    <div className="client-avatar-and-details">
                        <div className="client-avatar">
                            <img src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png" alt="Client avatar" />
                        </div>
                    
                        <div className="client-details">
                            <h2 className="client-name">{client.firstName} {client.lastName}</h2>
                            <div className="client-contact">
                                <div className="contact-item">
                                    <span><a href={`tel:${formatPhoneNumber(client.phoneNumber)}`}>{formatPhoneNumber(client.phoneNumber)}</a></span>
                                </div>
                                <div className="contact-item">
                                    {client.email ? (
                                        <span><a href={`mailto:${client.email}`}>{client.email}</a></span>
                                    ) : (
                                        <span className="noEmail">No email provided</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button className="client-settings-button gear-button" onClick={handleEditClick} title="Edit Client Information">
                        <i className="fas fa-cog"></i>
                    </button>
                </div>
                
                {/* Balance Card */}
                <div className="client-balance-card">
                    <div className="balance-header">
                        <div className="balance-text">
                            {newBalance >= 0 ? (
                                <span className="balance-status">Credit: <span className="balance-amount" style={{  backgroundImage: gradientAndPercentage[0]}}>${(newBalance)}  </span></span>
                            ) : (
                                <>
                                    <span>Balance Due:</span> <span className="balance-amount" style={{  backgroundImage: gradientAndPercentage[0]}}>${(Math.abs(newBalance)).toFixed(2)}</span>
                                </>
                            )}
                        </div>
                        <div className="header-buttons">
                            <button 
                                className="payment-button-secondary" 
                                onClick={() => setShowPaymentModal(true)}
                                title="Record Payment"
                            >
                                <i className="fa-solid fa-money-bill-wave"></i> 
                            </button>
                            <button 
                                className="balance-adjustment-button"
                                onClick={() => setShowAdjustmentModal(true)}
                                title="Adjust Balance"
                            >
                                <i className="fa-solid fa-wrench"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="balance-progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ 
                                width: `${gradientAndPercentage[1]}%`,
                                background: gradientAndPercentage[0]
                            }}
                        >
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Bottom Section */}
            <div className="client-details-section">
                {/* Addresses */}
                <div className="client-panel addresses-panel">
                    <h3 className="panel-header">Addresses</h3>
                    <ul className="address-list">
                        {client.properties.map((property, i) => (
                            <li key={i} className="client-address-item" onClick={() => handlePropertyClick(i)}>
                                    {property.street}
                            </li>
                        ))}
                    </ul>
                </div>
                
                {/* Services */}
                <div className="client-panel services-panel">
                    <h3 className="panel-header">Completed Jobs ( {allJobsCompleted.length} )<span className="total-amount">${allJobsTotal.toFixed(2)}</span></h3>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Address</th>
                                    <th>Service</th>
                                    <th className="date-column">Date</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allJobsCompleted.map((job, i) => (
                                    <tr className={job.invoiced ? "invoiced-job" : "unapplied-job"} key={i}>
                                        <td>{job.property.street}</td>
                                        <td>{job.schedule.service}</td>
                                        <td className="date-column">{formatUTCtoLocal(job.complete_date, timezone)}</td>
                                        <td>${job.cost}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Payments */}
                <div className="client-panel payments-panel">
                    <h3 className="panel-header">Payments ( {allPayments.length} )<span className="total-amount">${allPaymentsTotal.toFixed(2)}</span></h3>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="date-column">Date</th>
                                    <th>Method</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allPayments.map((payment, i) => (
                                    <tr className={payment.invoiced ? "invoiced-payment" : "unapplied-payment"} key={i}>
                                        <td className="date-column">{formatUTCtoLocal(payment.paymentDate, timezone)}</td>
                                        <td>{payment.paymentType}</td>
                                        <td>${payment.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {allAdjustmentsTotal !== 0 && (
                <div className="client-panel adjustments-panel">
                    <h3 className="panel-header">Adjustments ( {allAdjustments.length} )<span className="total-amount">${Math.abs(allAdjustmentsTotal).toFixed(2)}</span></h3>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="date-column">Date</th>
                                    <th>Type</th>
                                    <th>Reason</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allAdjustments.map((adjustment, i) => (
                                    <tr className={adjustment.invoiced ? "invoiced-adjustment" : "unapplied-adjustment"} key={i}>
                                        <td className="date-column">{formatUTCtoLocal(adjustment.created_at, timezone)}</td>
                                        <td>{adjustment.adjustment_type.charAt(0).toUpperCase() + adjustment.adjustment_type.slice(1)}</td>
                                        <td>{adjustment.reason ? adjustment.reason : "none"}</td>
                                        <td>${Math.abs(parseFloat(adjustment.amount))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div> 
            )}
            </div>
            <PaymentModal 
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                client={client}
                onPaymentSubmit={() => setShowPaymentModal(false)}
                onPaymentSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['todaysPayments'] })
                    fetchClientData();
                }}
            />
            <AdjustmentModal
                isOpen={showAdjustmentModal}
                client={client}
                onClose={() => setShowAdjustmentModal(false)}
                onAdjustmentSuccess={() => {
                    fetchClientData();
                }}
            />
            <EditClientModal 
                isOpen={showEditModal}
                client={client}
                onClose={() => setShowEditModal(false)}
                onClientUpdated={handleClientUpdated}
            />
        </div>
    );
};

export default ClientView;