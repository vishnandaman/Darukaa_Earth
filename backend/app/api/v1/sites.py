from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text
from typing import List
from shapely.geometry import shape, mapping
from shapely import wkt
from geoalchemy2.shape import to_shape, from_shape
from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.site import Site
from app.models.analytics import SiteAnalytics
from app.schemas.site import (
    SiteCreate,
    SiteUpdate,
    SiteResponse,
    SiteDetailResponse,
    SiteAnalyticsResponse
)
from app.core.security import get_current_user
from datetime import datetime, date, timedelta
import random

router = APIRouter()


def calculate_area_hectares(geometry_geojson: dict) -> float:
    """Calculate area in hectares from GeoJSON polygon"""
    try:
        geom = shape(geometry_geojson)
        # Convert to WGS84 area (approximate, for small areas)
        # Using simplified calculation: 1 degree ≈ 111 km at equator
        area_m2 = geom.area * (111000 ** 2)  # Rough conversion
        area_hectares = area_m2 / 10000
        return max(area_hectares, 0.1)  # Minimum 0.1 hectares
    except Exception as e:
        print(f"Error calculating area: {e}")
        return 1.0  # Default fallback


def geometry_to_geojson(geometry) -> dict:
    """Convert PostGIS geometry to GeoJSON"""
    try:
        shapely_geom = to_shape(geometry)
        geojson = mapping(shapely_geom)
        return geojson
    except Exception as e:
        print(f"Error converting geometry to GeoJSON: {e}")
        try:
            geom_str = str(geometry)
            shapely_geom = wkt.loads(geom_str)
            return mapping(shapely_geom)
        except Exception as e2:
            print(f"Error in fallback geometry conversion: {e2}")
            raise ValueError(f"Failed to convert geometry: {str(e2)}")


@router.post("/", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
def create_site(
    site: SiteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == site.project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Calculate area if not provided
    area_hectares = site.area_hectares
    if not area_hectares:
        area_hectares = calculate_area_hectares(site.geometry)
    
    # Convert GeoJSON to PostGIS geometry using GeoAlchemy2
    try:
        geom = shape(site.geometry)
        # Use from_shape to convert Shapely geometry to PostGIS geometry
        postgis_geom = from_shape(geom, srid=4326)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid geometry: {str(e)}"
        )
    
    # Create site
    try:
        db_site = Site(
            name=site.name,
            project_id=site.project_id,
            geometry=postgis_geom,
            area_hectares=area_hectares,
            carbon_sequestration_tonnes=site.carbon_sequestration_tonnes or 0.0,
            biodiversity_score=site.biodiversity_score or 0.0,
            site_metadata=site.metadata
        )
        db.add(db_site)
        db.commit()
        db.refresh(db_site)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create site: {str(e)}"
        )
    
    # Generate initial analytics data
    try:
        _generate_analytics_for_site(db, db_site.id, area_hectares)
    except Exception as e:
        # Log error but don't fail the site creation
        print(f"Warning: Failed to generate analytics for site {db_site.id}: {e}")
    
    # Convert geometry back to GeoJSON for response
    try:
        geom_geojson = geometry_to_geojson(db_site.geometry)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert geometry to GeoJSON: {str(e)}"
        )
    
    return SiteResponse(
        id=db_site.id,
        name=db_site.name,
        project_id=db_site.project_id,
        geometry={"type": "Polygon", "coordinates": geom_geojson["coordinates"]},
        area_hectares=db_site.area_hectares,
        carbon_sequestration_tonnes=db_site.carbon_sequestration_tonnes,
        biodiversity_score=db_site.biodiversity_score,
        metadata=db_site.site_metadata,
        created_at=db_site.created_at,
        updated_at=db_site.updated_at
    )


def _generate_analytics_for_site(db: Session, site_id: int, area_hectares: float):
    """Generate mock analytics data for a site"""
    base_date = date.today()
    # Generate 12 months of data
    for i in range(12):
        analytics_date = base_date - timedelta(days=30 * i)
        # Generate realistic-looking data
        carbon_base = area_hectares * random.uniform(2, 5) * (12 - i) / 12
        biodiversity_base = random.uniform(60, 95)
        tree_count = int(area_hectares * random.uniform(100, 300))
        vegetation_cover = random.uniform(70, 95)
        soil_carbon = random.uniform(2.5, 4.5)
        
        analytics = SiteAnalytics(
            site_id=site_id,
            date=analytics_date,
            carbon_sequestration_tonnes=round(carbon_base, 2),
            biodiversity_score=round(biodiversity_base, 1),
            tree_count=tree_count,
            vegetation_cover_percentage=round(vegetation_cover, 1),
            soil_carbon_percentage=round(soil_carbon, 2)
        )
        db.add(analytics)
    db.commit()


@router.get("/project/{project_id}", response_model=List[SiteResponse])
def get_sites_by_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    sites = db.query(Site).filter(Site.project_id == project_id).all()
    
    site_responses = []
    for site in sites:
        # Convert geometry to GeoJSON
        try:
            geom_geojson = geometry_to_geojson(site.geometry)
        except Exception as e:
            print(f"Error converting geometry for site {site.id}: {e}")
            continue  # Skip sites with geometry conversion errors
        
        site_responses.append(SiteResponse(
            id=site.id,
            name=site.name,
            project_id=site.project_id,
            geometry={"type": "Polygon", "coordinates": geom_geojson["coordinates"]},
            area_hectares=site.area_hectares,
            carbon_sequestration_tonnes=site.carbon_sequestration_tonnes,
            biodiversity_score=site.biodiversity_score,
            metadata=site.site_metadata,
            created_at=site.created_at,
            updated_at=site.updated_at
        ))
    
    return site_responses


@router.get("/{site_id}", response_model=SiteDetailResponse)
def get_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == site.project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert geometry to GeoJSON
    try:
        geom_geojson = geometry_to_geojson(site.geometry)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert geometry: {str(e)}"
        )
    
    # Get analytics
    analytics_list = db.query(SiteAnalytics).filter(
        SiteAnalytics.site_id == site_id
    ).order_by(SiteAnalytics.date.desc()).all()
    
    analytics_responses = [
        SiteAnalyticsResponse(
            id=a.id,
            site_id=a.site_id,
            date=a.date,
            carbon_sequestration_tonnes=a.carbon_sequestration_tonnes,
            biodiversity_score=a.biodiversity_score,
            tree_count=a.tree_count,
            vegetation_cover_percentage=a.vegetation_cover_percentage,
            soil_carbon_percentage=a.soil_carbon_percentage,
            created_at=a.created_at
        )
        for a in analytics_list
    ]
    
    return SiteDetailResponse(
        id=site.id,
        name=site.name,
        project_id=site.project_id,
        geometry={"type": "Polygon", "coordinates": geom_geojson["coordinates"]},
        area_hectares=site.area_hectares,
        carbon_sequestration_tonnes=site.carbon_sequestration_tonnes,
        biodiversity_score=site.biodiversity_score,
        metadata=site.site_metadata,
        created_at=site.created_at,
        updated_at=site.updated_at,
        analytics=analytics_responses
    )


@router.put("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: int,
    site_update: SiteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Verify project belongs to user
    project = db.query(Project).filter(
        and_(
            Project.id == site.project_id,
            Project.user_id == current_user.id
        )
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if site_update.name is not None:
        site.name = site_update.name
    if site_update.area_hectares is not None:
        site.area_hectares = site_update.area_hectares
    if site_update.carbon_sequestration_tonnes is not None:
        site.carbon_sequestration_tonnes = site_update.carbon_sequestration_tonnes
    if site_update.biodiversity_score is not None:
        site.biodiversity_score = site_update.biodiversity_score
    if site_update.metadata is not None:
        site.site_metadata = site_update.metadata
    
    db.commit()
    db.refresh(site)
    
    # Convert geometry to GeoJSON
    try:
        geom_geojson = geometry_to_geojson(site.geometry)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert geometry: {str(e)}"
        )
    
    return SiteResponse(
        id=site.id,
        name=site.name,
        project_id=site.project_id,
        geometry={"type": "Polygon", "coordinates": geom_geojson["coordinates"]},
        area_hectares=site.area_hectares,
        carbon_sequestration_tonnes=site.carbon_sequestration_tonnes,
        biodiversity_score=site.biodiversity_score,
        metadata=site.site_metadata,
        created_at=site.created_at,
        updated_at=site.updated_at
    )


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Verify project belongs to user
    project = db.query(Project).filter(
        Project.id == site.project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    db.delete(site)
    db.commit()
    return None

