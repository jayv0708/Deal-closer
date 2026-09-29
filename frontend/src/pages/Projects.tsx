import React, { useEffect, useState } from 'react';
import { Plus, Building2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Project {
  id: string;
  name: string;
  builder: string;
  city: string;
  location: string;
  status: string;
  units_available: number;
  document_count: number;
}

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data);
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projects</h1>
        <Link 
          to="/admin/projects/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-500">No projects found. Add one to get started.</div>
        ) : (
          projects.map((project) => (
          <div key={project.id} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-md">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.builder}</p>
                  </div>
                </div>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  project.status === 'UNDER_CONSTRUCTION' ? 'bg-yellow-100 text-yellow-800' :
                  project.status === 'PRE_LAUNCH' ? 'bg-purple-100 text-purple-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  {project.location}, {project.city}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">{project.units_available}</span>
                    <span className="text-gray-500 ml-1">Units</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">{project.document_count}</span>
                    <span className="text-gray-500 ml-1">Docs</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
              <Link to={`/admin/projects/${project.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                View details
              </Link>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};
