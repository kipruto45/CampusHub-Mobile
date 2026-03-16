// Maintenance Mode Service for CampusHub Mobile App
// Checks backend for maintenance mode status

import axios from 'axios';

export interface MaintenanceStatus {
  maintenance_mode: boolean;
  message: string | null;
}

const MAINTENANCE_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

export const maintenanceService = {
  /**
   * Check if the app is in maintenance mode
   */
  async checkMaintenanceStatus(): Promise<MaintenanceStatus> {
    try {
      const response = await axios.get(`${MAINTENANCE_API_URL}/health/maintenance/`);
      return response.data;
    } catch (error) {
      // If the endpoint fails, assume app is operational
      console.error('Failed to check maintenance status:', error);
      return {
        maintenance_mode: false,
        message: null,
      };
    }
  },
};
