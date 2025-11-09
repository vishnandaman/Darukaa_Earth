import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { toast } from 'react-toastify';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

import { sitesApi } from '../api/sites';
import './MapView.css';

if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const activeMapContainers = new WeakMap();

function MapWrapper({ children, projectId, mapKey }) {
  const containerRef = useRef(null);
  const instanceIdRef = useRef(Symbol(`map-${projectId}-${mapKey}-${Math.random()}`));

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    return () => {
      if (container) {
        try {
          const leafletContainers = container.querySelectorAll('.leaflet-container');
          leafletContainers.forEach((leafletContainer) => {
            try {
              if (leafletContainer._leaflet_id !== undefined) {
                if (leafletContainer._leaflet && typeof leafletContainer._leaflet.remove === 'function') {
                  leafletContainer._leaflet.remove();
                }
                activeMapContainers.delete(leafletContainer);
                // Remove the element
                leafletContainer.remove();
              }
            } catch (e) {
              // Ignore cleanup errors
            }
          });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [projectId, mapKey]);

  return (
    <div 
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
      data-map-instance-id={instanceIdRef.current.toString()}
    >
      {children}
    </div>
  );
}

// Error boundary component to catch Leaflet initialization errors
class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if this is the "already initialized" error
    if (error.message && error.message.includes('already initialized')) {
      // Return a state that indicates we should retry
      return { hasError: true, error, shouldRetry: true };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error but don't crash the app
    if (error.message && error.message.includes('already initialized')) {
      console.warn('Leaflet map initialization error (React 19 StrictMode):', error);
      // Retry after a short delay
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 100);
    }
  }

  render() {
    if (this.state.hasError && !this.state.shouldRetry) {
      return <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Map loading...</div>;
    }

    return this.props.children;
  }
}

// Component to handle map updates and site rendering
function MapContent({ sites, onSiteClick, drawingMode, onDrawCreate, onDrawDelete }) {
  const map = useMap();
  const sitesLayerRef = useRef(null);
  const drawControlRef = useRef(null);
  const drawnItemsRef = useRef(new L.FeatureGroup());

  // Verify leaflet-draw is loaded when component mounts
  useEffect(() => {
    if (!L.Draw) {
      console.error('leaflet-draw is not loaded. Please ensure it is properly imported.');
      console.log('L object:', L);
      console.log('Available L properties:', Object.keys(L));
    }
  }, []);

  // Initialize drawn items layer
  useEffect(() => {
    drawnItemsRef.current.addTo(map);
    
    return () => {
      map.removeLayer(drawnItemsRef.current);
    };
  }, [map]);

  // Update sites layer
  useEffect(() => {
    // Remove existing sites layer
    if (sitesLayerRef.current) {
      map.removeLayer(sitesLayerRef.current);
    }

    if (sites.length > 0) {
      const geoJsonData = {
        type: 'FeatureCollection',
        features: sites.map((site) => ({
          type: 'Feature',
          geometry: site.geometry,
          properties: {
            id: site.id,
            name: site.name,
            carbon: site.carbon_sequestration_tonnes,
            biodiversity: site.biodiversity_score,
          },
        })),
      };

      const sitesLayer = L.geoJSON(geoJsonData, {
        style: {
          fillColor: '#667eea',
          fillOpacity: 0.3,
          color: '#667eea',
          weight: 2,
        },
        onEachFeature: (feature, layer) => {
          layer.on({
            click: () => {
              if (feature.properties?.id) {
                onSiteClick(feature.properties.id);
              }
            },
            mouseover: (e) => {
              const layer = e.target;
              layer.setStyle({
                fillOpacity: 0.5,
                weight: 3,
              });
            },
            mouseout: (e) => {
              const layer = e.target;
              layer.setStyle({
                fillOpacity: 0.3,
                weight: 2,
              });
            },
          });

          if (feature.properties?.name) {
            const siteId = feature.properties.id;
            const siteName = feature.properties.name;
            const carbon = (feature.properties.carbon || 0).toFixed(2);
            const biodiversity = (feature.properties.biodiversity || 0).toFixed(1);
            
            // Create popup with site information
            const popupContent = `
              <div style="padding: 8px; min-width: 200px;">
                <strong style="font-size: 16px; display: block; margin-bottom: 8px; color: #333;">${siteName}</strong>
                <div style="margin-bottom: 8px; font-size: 14px; color: #666;">
                  <div style="margin-bottom: 4px;">🌱 Carbon: ${carbon} tonnes</div>
                  <div>🦋 Biodiversity: ${biodiversity}</div>
                </div>
                <div style="font-size: 12px; color: #999; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                  Click site to view details
                </div>
              </div>
            `;
            
            layer.bindPopup(popupContent, {
              className: 'custom-popup'
            });
          }
        },
      });

      sitesLayer.addTo(map);
      sitesLayerRef.current = sitesLayer;

      const bounds = sitesLayer.getBounds();
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([20, 0], 2);
    }
  }, [sites, onSiteClick, map]);

  useEffect(() => {
    if (!L.Draw || !L.Control || !L.Control.Draw) {
      console.warn('leaflet-draw is not available. Drawing functionality will be disabled.');
      return;
    }

    // Remove existing draw control
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    // Remove existing draw event listeners (only if L.Draw.Event exists)
    if (L.Draw && L.Draw.Event) {
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.DELETED);
    }

    if (drawingMode) {
      // Clear any previously drawn items
      drawnItemsRef.current.clearLayers();

      // Create draw control
      // Note: showArea is set to false to avoid the "type is not defined" error
      // This is a known issue with leaflet-draw when bundled by Vite
      const drawControl = new L.Control.Draw({
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: false, // Disabled to avoid Vite bundling issue
          },
          circle: false,
          rectangle: false,
          marker: false,
          circlemarker: false,
          polyline: false,
        },
        edit: {
          featureGroup: drawnItemsRef.current,
          remove: true,
        },
      });

      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      // Handle draw events
      const handleDrawCreate = (e) => {
        const { layer } = e;
        const geoJson = layer.toGeoJSON();
        if (geoJson.geometry.type === 'Polygon') {
          drawnItemsRef.current.addLayer(layer);
          onDrawCreate(geoJson.geometry);
        }
      };

      const handleDrawDelete = () => {
        drawnItemsRef.current.clearLayers();
        onDrawDelete();
      };

      if (L.Draw && L.Draw.Event) {
        map.on(L.Draw.Event.CREATED, handleDrawCreate);
        map.on(L.Draw.Event.DELETED, handleDrawDelete);
      }

      // Auto-start polygon drawing when drawing mode is enabled
      setTimeout(() => {
        const polygonButton = document.querySelector('.leaflet-draw-draw-polygon');
        if (polygonButton) {
          polygonButton.click();
        }
      }, 100);

      return () => {
        if (drawControlRef.current) {
          map.removeControl(drawControlRef.current);
          if (L.Draw && L.Draw.Event) {
            map.off(L.Draw.Event.CREATED, handleDrawCreate);
            map.off(L.Draw.Event.DELETED, handleDrawDelete);
          }
        }
        drawnItemsRef.current.clearLayers();
      };
    }
  }, [drawingMode, map, onDrawCreate, onDrawDelete]);

  return null;
}

export const MapView = ({ project, onSiteClick }) => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawingMode, setDrawingMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [drawnGeometry, setDrawnGeometry] = useState(null);
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    if (project?.id) {
      loadSites();
      // Force remount of map when project changes
      setMapKey(prev => prev + 1);
    }
  }, [project?.id]);

  const loadSites = async () => {
    try {
      setLoading(true);
      const data = await sitesApi.getSitesByProject(project.id);
      setSites(data);
      
      if (data.length > 0) {
        const firstSite = data[0];
        if (firstSite.geometry?.coordinates?.[0]?.[0]) {
          const coords = firstSite.geometry.coordinates[0][0];
          setMapCenter([coords[1], coords[0]]);
          setMapZoom(10);
        }
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
      toast.error('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const handleDrawCreate = (geometry) => {
    setDrawnGeometry(geometry);
    setShowCreateModal(true);
    setDrawingMode(false);
  };

  const handleDrawDelete = () => {
    setDrawnGeometry(null);
  };

  const handleDrawToggle = () => {
    setDrawingMode(!drawingMode);
    if (drawingMode) {
      // Exit drawing mode
      setDrawnGeometry(null);
    }
  };

  const handleCreateSite = async () => {
    if (!drawnGeometry) return;

    try {
      await sitesApi.createSite({
        name: newSiteName || `Site ${sites.length + 1}`,
        project_id: project.id,
        geometry: {
          type: 'Polygon',
          coordinates: drawnGeometry.coordinates,
        },
      });

      setDrawnGeometry(null);
      setNewSiteName('');
      setShowCreateModal(false);
      setDrawingMode(false);

      toast.success('Site created successfully');
      
      // Reload sites
      await loadSites();
    } catch (error) {
      console.error('Failed to create site:', error);
      toast.error('Failed to create site. Please try again.');
    }
  };

  return (
    <div className="map-view-container">
      <div className="map-controls">
        <div className="map-info">
          <h3>{project.name}</h3>
          <span className="site-count">{sites.length} sites</span>
        </div>
        <div className="map-actions">
          <button
            onClick={loadSites}
            className="refresh-button"
            title="Refresh sites"
            disabled={loading}
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleDrawToggle}
            className={`draw-button ${drawingMode ? 'active' : ''}`}
          >
            {drawingMode ? '✓ Done Drawing' : '+ Draw Site'}
          </button>
        </div>
      </div>
      
      <div className="map-container" style={{ height: '100%', width: '100%' }}>
        {project?.id && (
          <MapErrorBoundary>
            <MapWrapper 
              key={`wrapper-${project.id}-${mapKey}`}
              projectId={project.id} 
              mapKey={mapKey}
            >
              <MapContainer
                key={`map-${project.id}-${mapKey}`}
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapContent
                  sites={sites}
                  onSiteClick={onSiteClick}
                  drawingMode={drawingMode}
                  onDrawCreate={handleDrawCreate}
                  onDrawDelete={handleDrawDelete}
                />
              </MapContainer>
            </MapWrapper>
          </MapErrorBoundary>
        )}
      </div>

      {loading && (
        <div className="map-loading">
          <div>Loading sites...</div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Site</h2>
            <div className="form-group">
              <label htmlFor="site-name">Site Name</label>
              <input
                id="site-name"
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder={`Site ${sites.length + 1}`}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setDrawnGeometry(null);
                  setShowCreateModal(false);
                }}
                className="secondary-button"
              >
                Cancel
              </button>
              <button onClick={handleCreateSite} className="primary-button">
                Create Site
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
