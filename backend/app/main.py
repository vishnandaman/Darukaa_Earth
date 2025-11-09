from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, projects, sites
from app.database import engine, Base
from app.core.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Darukaa.Earth API",
    description="Geospatial data analytics platform for carbon and biodiversity projects",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(sites.router, prefix="/api/v1/sites", tags=["sites"])


@app.get("/")
def root():
    return {"message": "Welcome to Darukaa.Earth API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}

