// interfaces.ts
import { PropertyNote, ScheduleNote } from "./noteTypes";

export interface Property {
  id: number;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Visit {
  date: string;
  paid: boolean;
  complete: boolean; // Added property
  charge: number; // Added property
}

export interface ClientData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  properties: Property_list[];
}
export interface ClientDataID {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  properties: Property_list[];
}
export interface Schedule {
  frequency: string;
  nextDate: string;
  service: string;
  cost: number;
  monthly_pricing?: boolean;
}

export interface Property_list {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  schedules: Schedule[];
}

export interface Job {
  id: number;
  jobDate: string;
  status: string;
  cost: number;
  property: {
    id: number;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    propertynote?: PropertyNote;
  };
  schedule: {
    id: number;
    frequency: string;
    service: string;
    schedulenote?: ScheduleNote;
  };
  client: {
    id: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
  };
}

export interface Company {
  name: string;
  image: string;
  level: string;
  onTeamModalOpen: () => void;
}

export interface ClientSchedule {
  id: number;
  frequency: string;
  service: string;
  cost: number;
  nextDate: string;
  endDate: string | null; // Updated to allow null
  isActive: boolean;
  jobs: {
    id: number;
    jobDate: string;
    status: string;
    cost: number;
  }[];
}
[];

export interface Payment {
  id: number;
  amount: string;
  paymentType: string;
  paymentDate: string;
}

export interface clientViewJob {
  client: ClientDataID;
  complete_date: string;
  cost: number;
  id: number;
  property: Property;
  schedule: Schedule;
}

export interface PaymentWithClient {
  id: number;
  amount: string;
  paymentType: string;
  paymentDate: string;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
  };
}

export interface TodaysPaymentsResponse {
  payments: PaymentWithClient[];
}

export interface ScheduleClient {
  id: number;
  firstName: string;
  lastName: string | null;
  phoneNumber: string;
  email: string | null;
}

export interface ScheduleProperty {
  id: number;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  client: ScheduleClient;
}

export interface ScheduleForManagement {
  id: number;
  frequency: string;
  nextDate: string;
  endDate: string | null;
  service: string;
  cost: number;
  isActive: boolean;
  priority: number;
  dayOfWeek: number;
  property: ScheduleProperty;
} 

export interface Adjustment {
  id: number;
  amount: string;
  reason: string;
  created_at: string;
  adjustment_type: string;
}