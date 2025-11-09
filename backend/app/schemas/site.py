from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List, Dict, Any


class SiteBase(BaseModel):
    name: str
    area_hectares: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class SiteCreate(SiteBase):
    project_id: int
    geometry: Dict[str, Any]  # GeoJSON polygon
    carbon_sequestration_tonnes: Optional[float] = 0.0
    biodiversity_score: Optional[float] = 0.0


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    area_hectares: Optional[float] = None
    carbon_sequestration_tonnes: Optional[float] = None
    biodiversity_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class SiteResponse(SiteBase):
    id: int
    project_id: int
    geometry: Dict[str, Any]  # GeoJSON
    carbon_sequestration_tonnes: float
    biodiversity_score: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SiteAnalyticsResponse(BaseModel):
    id: int
    site_id: int
    date: date
    carbon_sequestration_tonnes: float
    biodiversity_score: float
    tree_count: int
    vegetation_cover_percentage: float
    soil_carbon_percentage: float
    created_at: datetime

    class Config:
        from_attributes = True


class SiteDetailResponse(SiteResponse):
    analytics: List[SiteAnalyticsResponse] = []

