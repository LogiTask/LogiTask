import React, { memo, useCallback, useMemo, useState } from "react";
import "../../styles/components/ClientProperties.css";
import AddPropertyModal from "../Property/AddPropertyModal";
import { useNavigate } from "react-router-dom";
import { ClientDataID} from "../../types/interfaces";

interface ClientPropertiesProps {
  client: ClientDataID;
  visible: boolean;
  onPropertyModalStateChange?: (isOpen: boolean) => void;
}

const ClientPropertiesComponent: React.FC<ClientPropertiesProps> = ({
  client,
  visible,
  onPropertyModalStateChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleModalState = useCallback((isOpen: boolean) => {
    setIsModalOpen(isOpen);
    if (isOpen && onPropertyModalStateChange) {
      onPropertyModalStateChange(true);
    }
    else {
      onPropertyModalStateChange?.(false);
    }
  }, [onPropertyModalStateChange]);
  
  const handlePropertyClick = useCallback((propertyIndex: number) => {

    const property = client.properties[propertyIndex];
    
    navigate(`/property-view/`, {
      state: {
        property: property,
        client: client,
      }
    });
  }, [client, navigate]);

  const properties = useMemo(() => client.properties || [], [client.properties]);
  
  if (!visible) return null;

  return (
    <div className="properties-container">
      {properties.length > 0 ? (
        properties.map((property, index: number) => (
          <div
            key={index}
            className="property-item"
            style={{
              animationDelay: `${100 + index * 100}ms`,
            }}
          >
            <button
              onClick={() => handlePropertyClick(index)}
              className="property-button"
            >
              <div className="property-content">
                <div className="property-address">{property.street}</div>
                <div className="property-location">
                  {property.city}, {property.state || "TX"} {property.zipCode}
                </div>
              </div>
            </button>
          </div>
        ))
      ) : (
        <div className="no-properties">No properties found for this client</div>
      )}
      <div
        className="add-property-item"
        onClick={() => handleModalState(true)}
        style={{
          animationDelay: `${100 + properties.length * 100}ms`,
        }}
      >
        <div className="add-property-icon">
        <div className="fa-solid fa-house"></div>
        </div>
        <div className="add-property-text">Add New Property</div>
      </div>

      <AddPropertyModal
        isOpen={isModalOpen}
        onClose={() => handleModalState(false)}
        clientId={client.id}
      />
            
    </div>
  );
};

const ClientProperties = memo(ClientPropertiesComponent);

export default ClientProperties;
