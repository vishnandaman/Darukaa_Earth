import apiClient from './client';

export interface Site {
  id: number;
  name: string;
  project_id: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area_hectares?: number;
  carbon_sequestration_tonnes: number;
  biodiversity_score: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface SiteAnalytics {
  id: number;
  site_id: number;
  date: string;
  carbon_sequestration_tonnes: number;
  biodiversity_score: number;
  tree_count: number;
  vegetation_cover_percentage: number;
  soil_carbon_percentage: number;
  created_at: string;
}

export interface SiteDetail extends Site {
  analytics: SiteAnalytics[];
}

export interface SiteCreate {
  name: string;
  project_id: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area_hectares?: number;
  carbon_sequestration_tonnes?: number;
  biodiversity_score?: number;
  metadata?: Record<string, any>;
}

export const sitesApi = {
  getSitesByProject: async (projectId: number): Promise<Site[]> => {
    const response = await apiClient.get(`/api/v1/sites/project/${projectId}`);
    return response.data;
  },

  getSite: async (id: number): Promise<SiteDetail> => {
    const response = await apiClient.get(`/api/v1/sites/${id}`);
    return response.data;
  },

  createSite: async (data: SiteCreate): Promise<Site> => {
    const response = await apiClient.post('/api/v1/sites/', data);
    return response.data;
  },

  updateSite: async (id: number, data: Partial<SiteCreate>): Promise<Site> => {
    const response = await apiClient.put(`/api/v1/sites/${id}`, data);
    return response.data;
  },

  deleteSite: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/sites/${id}`);
  },
};

