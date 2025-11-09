import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { sitesApi } from '../api/sites';
import './SiteDetail.css';

export const SiteDetailPage = () => {
  const { siteId } = useParams();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSite, setEditingSite] = useState({
    name: '',
    carbon_sequestration_tonnes: 0,
    biodiversity_score: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (siteId) {
      loadSite(parseInt(siteId));
    }
  }, [siteId]);

  const loadSite = async (id) => {
    try {
      setLoading(true);
      const data = await sitesApi.getSite(id);
      setSite(data);
      setEditingSite({
        name: data.name,
        carbon_sequestration_tonnes: data.carbon_sequestration_tonnes || 0,
        biodiversity_score: data.biodiversity_score || 0,
      });
    } catch (error) {
      console.error('Failed to load site:', error);
      toast.error('Failed to load site details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!site) return;

    setIsSaving(true);
    try {
      await sitesApi.updateSite(site.id, {
        name: editingSite.name,
        carbon_sequestration_tonnes: editingSite.carbon_sequestration_tonnes,
        biodiversity_score: editingSite.biodiversity_score,
      });
      await loadSite(site.id);
      setShowEditModal(false);
      toast.success('Site updated successfully');
    } catch (error) {
      console.error('Failed to update site:', error);
      toast.error('Failed to update site');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!site) return;

    setIsDeleting(true);
    try {
      await sitesApi.deleteSite(site.id);
      toast.success('Site deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete site:', error);
      toast.error('Failed to delete site');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="site-detail-loading">
        <div>Loading site details...</div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="site-detail-error">
        <div>Site not found</div>
        <button onClick={() => navigate('/dashboard')} className="back-button">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Prepare chart data
  const analyticsData = site.analytics.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const carbonData = analyticsData.map((a) => [
    new Date(a.date).getTime(),
    a.carbon_sequestration_tonnes,
  ]);

  const biodiversityData = analyticsData.map((a) => [
    new Date(a.date).getTime(),
    a.biodiversity_score,
  ]);

  const treeCountData = analyticsData.map((a) => [
    new Date(a.date).getTime(),
    a.tree_count,
  ]);

  const vegetationData = analyticsData.map((a) => [
    new Date(a.date).getTime(),
    a.vegetation_cover_percentage,
  ]);

  const carbonChartOptions = {
    title: { text: 'Carbon Sequestration Over Time' },
    xAxis: {
      type: 'datetime',
      title: { text: 'Date' },
    },
    yAxis: {
      title: { text: 'Carbon Sequestration (tonnes)' },
    },
    series: [
      {
        type: 'line',
        name: 'Carbon Sequestration',
        data: carbonData,
        color: '#28a745',
      },
    ],
    credits: { enabled: false },
    chart: { height: 300 },
  };

  const biodiversityChartOptions = {
    title: { text: 'Biodiversity Score Over Time' },
    xAxis: {
      type: 'datetime',
      title: { text: 'Date' },
    },
    yAxis: {
      title: { text: 'Biodiversity Score' },
      min: 0,
      max: 100,
    },
    series: [
      {
        type: 'line',
        name: 'Biodiversity Score',
        data: biodiversityData,
        color: '#17a2b8',
      },
    ],
    credits: { enabled: false },
    chart: { height: 300 },
  };

  const treeCountChartOptions = {
    title: { text: 'Tree Count Over Time' },
    xAxis: {
      type: 'datetime',
      title: { text: 'Date' },
    },
    yAxis: {
      title: { text: 'Number of Trees' },
    },
    series: [
      {
        type: 'column',
        name: 'Tree Count',
        data: treeCountData,
        color: '#28a745',
      },
    ],
    credits: { enabled: false },
    chart: { height: 300 },
  };

  const vegetationChartOptions = {
    title: { text: 'Vegetation Cover Over Time' },
    xAxis: {
      type: 'datetime',
      title: { text: 'Date' },
    },
    yAxis: {
      title: { text: 'Vegetation Cover (%)' },
      min: 0,
      max: 100,
    },
    series: [
      {
        type: 'area',
        name: 'Vegetation Cover',
        data: vegetationData,
        color: '#28a745',
        fillOpacity: 0.3,
      },
    ],
    credits: { enabled: false },
    chart: { height: 300 },
  };

  const latestAnalytics = analyticsData[analyticsData.length - 1];

  return (
    <div className="site-detail-container">
      <header className="site-detail-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back to Dashboard
        </button>
        <div className="header-actions-group">
          <h1>{site.name}</h1>
          <div className="action-buttons">
            <button onClick={handleEdit} className="edit-button">
              Edit
            </button>
            <button onClick={handleDelete} className="delete-button">
              Delete
            </button>
          </div>
        </div>
      </header>

      <div className="site-detail-content">
        <div className="site-overview">
          <div className="overview-card">
            <h3>Site Overview</h3>
            <div className="overview-grid">
              <div className="overview-item">
                <label>Area</label>
                <value>{site.area_hectares?.toFixed(2) || 'N/A'} hectares</value>
              </div>
              <div className="overview-item">
                <label>Carbon Sequestration</label>
                <value>{site.carbon_sequestration_tonnes.toFixed(2)} tonnes</value>
              </div>
              <div className="overview-item">
                <label>Biodiversity Score</label>
                <value>{site.biodiversity_score.toFixed(1)}</value>
              </div>
              <div className="overview-item">
                <label>Created</label>
                <value>{new Date(site.created_at).toLocaleDateString()}</value>
              </div>
            </div>
          </div>

          {latestAnalytics && (
            <div className="overview-card">
              <h3>Latest Metrics</h3>
              <div className="overview-grid">
                <div className="overview-item">
                  <label>Tree Count</label>
                  <value>{latestAnalytics.tree_count.toLocaleString()}</value>
                </div>
                <div className="overview-item">
                  <label>Vegetation Cover</label>
                  <value>{latestAnalytics.vegetation_cover_percentage.toFixed(1)}%</value>
                </div>
                <div className="overview-item">
                  <label>Soil Carbon</label>
                  <value>{latestAnalytics.soil_carbon_percentage.toFixed(2)}%</value>
                </div>
                <div className="overview-item">
                  <label>Last Updated</label>
                  <value>{new Date(latestAnalytics.date).toLocaleDateString()}</value>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="charts-section">
          <div className="chart-card">
            <HighchartsReact highcharts={Highcharts} options={carbonChartOptions} />
          </div>
          <div className="chart-card">
            <HighchartsReact highcharts={Highcharts} options={biodiversityChartOptions} />
          </div>
          <div className="chart-card">
            <HighchartsReact highcharts={Highcharts} options={treeCountChartOptions} />
          </div>
          <div className="chart-card">
            <HighchartsReact highcharts={Highcharts} options={vegetationChartOptions} />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Site</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label htmlFor="site-name">Site Name</label>
                <input
                  id="site-name"
                  type="text"
                  value={editingSite.name}
                  onChange={(e) =>
                    setEditingSite({ ...editingSite, name: e.target.value })
                  }
                  required
                  placeholder="Enter site name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="carbon">Carbon Sequestration (tonnes)</label>
                <input
                  id="carbon"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingSite.carbon_sequestration_tonnes}
                  onChange={(e) =>
                    setEditingSite({
                      ...editingSite,
                      carbon_sequestration_tonnes: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Enter carbon sequestration"
                />
              </div>
              <div className="form-group">
                <label htmlFor="biodiversity">Biodiversity Score</label>
                <input
                  id="biodiversity"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={editingSite.biodiversity_score}
                  onChange={(e) =>
                    setEditingSite({
                      ...editingSite,
                      biodiversity_score: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Enter biodiversity score (0-100)"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="secondary-button"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Site</h2>
            <p>Are you sure you want to delete "{site.name}"? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="secondary-button"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="danger-button"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

