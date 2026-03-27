// Maintenance Mode Service for CampusHub Mobile App
// Checks backend for maintenance mode status

import axios from 'axios';
import { getApiRootUrl } from './api';

export interface MaintenanceStatus {
  maintenance_mode: boolean;
  message: string | null;
}

export const maintenanceService = {
  /**
   * Check if the app is in maintenance mode
   */
  async checkMaintenanceStatus(): Promise<MaintenanceStatus> {
    try {
      const response = await axios.get(`${getApiRootUrl()}/health/maintenance/`);
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
