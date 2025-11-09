from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class SiteAnalytics(Base):
    __tablename__ = "site_analytics"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    carbon_sequestration_tonnes = Column(Float, default=0.0)
    biodiversity_score = Column(Float, default=0.0)
    tree_count = Column(Integer, default=0)
    vegetation_cover_percentage = Column(Float, default=0.0)
    soil_carbon_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    site = relationship("Site", back_populates="analytics")

