
export interface Device {
  device_id: string;
  is_empty: boolean;
  last_updated: string;
  battery_level: number;
  status: 'normal' | 'empty' | 'low_battery' | 'offline';
  // New fields for Saline 2.0
  bottle_ml?: number;
  flow_rate?: number;
  time_remaining?: string;
  bottle_hours?: number;
  start_time?: string;
  percentage?: number;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  doctor_name: string | null;
  diagnosis: string | null;
  bed_number?: string | null;
  status: 'admitted' | 'discharged';
  device_id: string | null;
  admission_date?: string;
  // New fields
  notes?: string;
  medication_details?: string;
  discharge_date?: string;
  device_link_time?: string;
  // Infusion config stored locally with patient
  infusion_start_time?: string;
  bottle_ml?: number;
  flow_rate?: number;
  smart_belt_id?: string;
  // Biometrics for AI personalization
  weight?: number;
  height?: number;
  gender?: 'male' | 'female' | 'other';
  medical_problem?: string;
}

export interface AppState {
  patients: Patient[];
  devices: Record<string, Device>;
  isLoading: boolean;
  isConnected: boolean;
  isMuted: boolean;
}
