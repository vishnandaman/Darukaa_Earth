import apiClient from './client';

export interface Project {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
  site_count?: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export const projectsApi = {
  getProjects: async (): Promise<ProjectListResponse> => {
    const response = await apiClient.get('/api/v1/projects/');
    return response.data;
  },

  getProject: async (id: number): Promise<Project> => {
    const response = await apiClient.get(`/api/v1/projects/${id}`);
    return response.data;
  },

  createProject: async (data: ProjectCreate): Promise<Project> => {
    const response = await apiClient.post('/api/v1/projects/', data);
    return response.data;
  },

  updateProject: async (id: number, data: Partial<ProjectCreate>): Promise<Project> => {
    const response = await apiClient.put(`/api/v1/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/projects/${id}`);
  },
};

