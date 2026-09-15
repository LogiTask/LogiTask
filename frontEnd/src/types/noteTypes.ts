export interface BaseNote {
  id: number;
  title: string;
  content: string;
  created_at: string; 
  last_modified: string;
}

export interface PropertyNote extends BaseNote {}
export interface ScheduleNote extends BaseNote {}
export interface JobNote extends BaseNote {}

export type Note = PropertyNote | ScheduleNote | JobNote;
