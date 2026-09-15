import React from 'react';
import { ScheduleForManagement } from '../../types/interfaces';
import { formatCapitalized} from '../../utils/format';

interface DragHandleProps {
  ref?: (element: HTMLElement | null) => void;
  listeners?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

interface ScheduleListItemProps {
  schedule: ScheduleForManagement;
  index: number;
  dragHandleProps?: DragHandleProps;
}

const ScheduleListItem: React.FC<ScheduleListItemProps> = ({ schedule, index, dragHandleProps }) => {
  
  const clientName = schedule.property.client.firstName + 
    (schedule.property.client.lastName ? ` ${schedule.property.client.lastName}` : '');

  const { ref: handleRef, listeners, attributes } = dragHandleProps || {};
    
  return (
    <li className="list-item sch-item">
      <div className="sch-item-inner">
        <button
          type="button"
          className="sch-drag-handle"
          aria-label="Reorder schedule"
          ref={handleRef}
          {...(listeners || {})}
          {...(attributes || {})}
        >
          <i className="fa-solid fa-grip-lines" aria-hidden="true"></i>
        </button>
        <div className="list-item-header sch-header-row">
          <div className="sch-content">
            <div className="sch-header">
              <div className="sch-name-address">
                <div className="sch-address-inline sch-address">
                  <i className="fa-solid fa-location-dot"></i>
                  <span>
                    {schedule.property.street}, {schedule.property.zipCode}
                  </span>
                </div>
                <div className="sch-client-name sch-client">
                  <i className="fa-solid fa-user"></i>
                  <span> {clientName} </span>
                </div>
              </div>
              <div className="sch-priority" aria-label={`Priority ${index + 1}`}>
                <span>#{index + 1}</span>
              </div>
            </div>

            <div className="sch-details">
              <div className="service-tags sch-service-tags">
                <div className="service-pill service-item pill-container sch-service-pill">
                  <i className="fa-solid fa-briefcase" />
                  {formatCapitalized(schedule.service)}
                </div>
                <div className="frequency-pill service-item pill-container sch-frequency-pill">
                  <i className="fa-solid fa-calendar-days" />
                  {formatCapitalized(schedule.frequency)}
                </div>
                <div className="cost-pill service-item pill-container sch-cost-pill">
                  <i className="fa-solid fa-dollar-sign"></i>
                  {Math.floor(schedule.cost)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export default ScheduleListItem;
