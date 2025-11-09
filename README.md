# Darukaa.Earth

A full-stack geospatial data analytics platform for managing and visualizing carbon sequestration and biodiversity projects. This application enables users to create projects, define geospatial sites through interactive mapping, and track environmental metrics over time.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [Technology Stack](#technology-stack)
- [Setup Instructions](#setup-instructions)
- [CI/CD Pipeline](#cicd-pipeline)
- [API Documentation](#api-documentation)
- [Development](#development)

## Architecture Overview

The application follows a modern three-tier architecture:

### Frontend (React + Vite)
- **Framework**: React 19 with Vite for fast development and optimized builds
- **State Management**: React Context API for authentication state
- **Routing**: React Router v7 for client-side navigation
- **Mapping**: Leaflet with react-leaflet for interactive geospatial visualization
- **Visualization**: Highcharts for analytics and time-series data
- **HTTP Client**: Axios with interceptors for authentication and error handling

The frontend communicates with the backend through a RESTful API, using JWT tokens stored in localStorage for authentication. The application is structured with:
- Page components for main views (Login, Register, Dashboard, SiteDetail)
- Reusable components (MapView, ProtectedRoute)
- API client modules organized by resource (auth, projects, sites)
- Context providers for global state management

### Backend (FastAPI)
- **Framework**: FastAPI for high-performance async API development
- **Database**: PostgreSQL with PostGIS extension for geospatial data
- **ORM**: SQLAlchemy with GeoAlchemy2 for spatial data handling
- **Authentication**: JWT-based token authentication
- **Validation**: Pydantic for request/response validation

The backend is organized into:
- API routes grouped by version (`/api/v1/`)
- Database models with SQLAlchemy ORM
- Pydantic schemas for data validation
- Core configuration and security utilities
- Middleware for CORS and authentication

### Database (PostgreSQL + PostGIS)
- **Database**: PostgreSQL 12+ with PostGIS extension
- **Spatial Data**: PostGIS geometry types for storing polygons
- **Relationships**: Foreign keys with cascade deletes
- **Indexing**: Indexes on frequently queried columns

## Database Schema

The database consists of four main tables with the following relationships:

### Users Table
```sql
users
├── id (PK, Integer)
├── email (String, Unique, Indexed)
├── username (String, Unique, Indexed)
├── hashed_password (String)
├── full_name (String, Nullable)
├── created_at (DateTime)
└── updated_at (DateTime)
```

### Projects Table
```sql
projects
├── id (PK, Integer)
├── name (String, Indexed)
├── description (Text, Nullable)
├── user_id (FK → users.id)
├── created_at (DateTime)
└── updated_at (DateTime)
```

**Relationships**: One user can have many projects. Deleting a user would cascade delete their projects.

### Sites Table
```sql
sites
├── id (PK, Integer)
├── name (String, Indexed)
├── project_id (FK → projects.id)
├── geometry (PostGIS POLYGON, SRID 4326)
├── area_hectares (Float, Nullable)
├── carbon_sequestration_tonnes (Float, Default: 0.0)
├── biodiversity_score (Float, Default: 0.0)
├── metadata (JSON, Nullable)
├── created_at (DateTime)
└── updated_at (DateTime)
```

**Relationships**: One project can have many sites. Sites store polygon geometries using PostGIS. Deleting a project cascades to delete all associated sites.

### Site Analytics Table
```sql
site_analytics
├── id (PK, Integer)
├── site_id (FK → sites.id)
├── date (Date, Indexed)
├── carbon_sequestration_tonnes (Float, Default: 0.0)
├── biodiversity_score (Float, Default: 0.0)
├── tree_count (Integer, Default: 0)
├── vegetation_cover_percentage (Float, Default: 0.0)
├── soil_carbon_percentage (Float, Default: 0.0)
└── created_at (DateTime)
```

**Relationships**: One site can have many analytics records (time-series data). Deleting a site cascades to delete all analytics records.

### Entity Relationship Diagram
```
Users (1) ──< (Many) Projects (1) ──< (Many) Sites (1) ──< (Many) SiteAnalytics
```

## Technology Stack

### Backend
- **Python 3.8+**: Core programming language
- **FastAPI 0.115+**: Modern async web framework
- **SQLAlchemy 2.0+**: ORM for database operations
- **GeoAlchemy2 0.15+**: Spatial extension for SQLAlchemy
- **PostGIS**: PostgreSQL extension for geospatial data
- **Pydantic**: Data validation and settings management
- **python-jose**: JWT token handling
- **passlib**: Password hashing (bcrypt)
- **Shapely**: Geometric operations
- **Uvicorn**: ASGI server

### Frontend
- **React 19**: UI library
- **Vite**: Build tool and dev server
- **React Router 7**: Client-side routing
- **Leaflet 1.9+**: Mapping library
- **react-leaflet 4.2+**: React bindings for Leaflet
- **leaflet-draw 1.0+**: Drawing tools for Leaflet
- **Highcharts 12+**: Charting library
- **Axios**: HTTP client
- **react-toastify**: Toast notifications

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher with PostGIS extension
- Node.js 16 or higher and npm
- Git

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Daaruka.earth
```

### Step 2: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/darukaa_earth
SECRET_KEY=your-secret-key-here-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173
```

Replace `your_password` with your PostgreSQL password and generate a secure `SECRET_KEY`.

### Step 3: Database Setup

1. Start PostgreSQL service

2. Create the database:
```sql
CREATE DATABASE darukaa_earth;
```

3. Connect to the database and enable PostGIS:
```sql
\c darukaa_earth
CREATE EXTENSION IF NOT EXISTS postgis;
```

4. Verify PostGIS installation:
```sql
SELECT PostGIS_version();
```

### Step 4: Initialize Database Tables

The application will automatically create tables on first run. Alternatively, you can run:

```bash
cd backend
python -c "from app.database import engine, Base; from app.models import user, project, site, analytics; Base.metadata.create_all(bind=engine)"
```

### Step 5: Run Backend Server

```bash
cd backend
python run.py
```

The backend API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Step 6: Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Step 7: Run Frontend Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Step 8: Access the Application

1. Open `http://localhost:5173` in your browser
2. Register a new account
3. Create a project
4. Select the project and draw sites on the map
5. View site details and analytics

## CI/CD Pipeline

The application is designed to support continuous integration and deployment using GitHub Actions. Below is the proposed workflow configuration that would be implemented for production use.

#### Continuous Integration

1. **Backend Testing**:
   - Runs on Python 3.8, 3.9, 3.10, 3.11
   - Installs dependencies from `requirements.txt`
   - Runs linting with flake8 (if configured)
   - Validates code formatting

2. **Frontend Testing**:
   - Runs on Node.js 16+
   - Installs dependencies with `npm ci`
   - Runs linting with ESLint
   - Builds the production bundle
   - Validates TypeScript types

3. **Database Migration Validation**:
   - Validates database schema consistency
   - Checks PostGIS extension availability

#### Workflow Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

#### Deployment (Optional)

The workflow can be extended to include deployment steps:
- Build Docker images
- Push to container registry
- Deploy to cloud platform (AWS, GCP, Azure)
- Run database migrations
- Update environment variables

### Example GitHub Actions Workflow Configuration

A typical CI/CD workflow configuration for this project would look like:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:13-3.1
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: '3.10'
    - name: Install dependencies
      run: pip install -r requirements.txt
    - name: Run tests
      run: pytest

  frontend-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Build
      run: npm run build
```

This workflow would automate testing and building when code is pushed to the repository.

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password",
  "full_name": "Full Name"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=username&password=password
```

Response:
```json
{
  "access_token": "jwt-token-here",
  "token_type": "bearer"
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Project Endpoints

#### List Projects
```http
GET /api/v1/projects/
Authorization: Bearer <token>
```

#### Create Project
```http
POST /api/v1/projects/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Project Name",
  "description": "Project Description"
}
```

#### Get Project
```http
GET /api/v1/projects/{project_id}
Authorization: Bearer <token>
```

#### Update Project
```http
PUT /api/v1/projects/{project_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated Description"
}
```

#### Delete Project
```http
DELETE /api/v1/projects/{project_id}
Authorization: Bearer <token>
```

### Site Endpoints

#### Get Sites by Project
```http
GET /api/v1/sites/project/{project_id}
Authorization: Bearer <token>
```

#### Create Site
```http
POST /api/v1/sites/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Site Name",
  "project_id": 1,
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lon1, lat1], [lon2, lat2], [lon3, lat3], [lon1, lat1]]]
  },
  "carbon_sequestration_tonnes": 100.0,
  "biodiversity_score": 75.5
}
```

#### Get Site Details
```http
GET /api/v1/sites/{site_id}
Authorization: Bearer <token>
```

Returns site information with analytics data.

#### Update Site
```http
PUT /api/v1/sites/{site_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Site Name",
  "carbon_sequestration_tonnes": 150.0,
  "biodiversity_score": 80.0
}
```

#### Delete Site
```http
DELETE /api/v1/sites/{site_id}
Authorization: Bearer <token>
```

## Development

### Backend Development

```bash
cd backend

# Run development server with auto-reload
python run.py

# Access API documentation
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Code Structure

```
Daaruka.earth/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py          # Authentication endpoints
│   │   │       ├── projects.py      # Project CRUD operations
│   │   │       └── sites.py         # Site CRUD operations
│   │   ├── core/
│   │   │   ├── config.py            # Application settings
│   │   │   └── security.py         # JWT and password utilities
│   │   ├── models/
│   │   │   ├── user.py              # User database model
│   │   │   ├── project.py           # Project database model
│   │   │   ├── site.py              # Site database model
│   │   │   └── analytics.py        # Analytics database model
│   │   ├── schemas/
│   │   │   ├── user.py              # User Pydantic schemas
│   │   │   ├── project.py           # Project Pydantic schemas
│   │   │   └── site.py              # Site Pydantic schemas
│   │   ├── database.py              # Database configuration
│   │   └── main.py                  # FastAPI application
│   ├── requirements.txt
│   └── run.py                       # Application entry point
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.ts              # Authentication API client
│   │   │   ├── client.ts            # Axios configuration
│   │   │   ├── projects.ts          # Projects API client
│   │   │   └── sites.ts             # Sites API client
│   │   ├── components/
│   │   │   ├── MapView.jsx          # Interactive map component
│   │   │   └── ProtectedRoute.jsx  # Route protection
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx     # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Login page
│   │   │   ├── Register.jsx        # Registration page
│   │   │   ├── Dashboard.jsx        # Main dashboard
│   │   │   └── SiteDetail.jsx       # Site detail page
│   │   ├── App.jsx                  # Main app component
│   │   └── main.jsx                 # Application entry point
│   ├── package.json
│   └── vite.config.js               # Vite configuration
│
└── README.md
```

### Environment Variables

#### Backend (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key (minimum 32 characters)
- `ALGORITHM`: JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `CORS_ORIGINS`: Comma-separated list of allowed origins

#### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API base URL

### Testing

#### Backend Testing
```bash
cd backend
pytest  # If tests are configured
```

#### Frontend Testing
```bash
cd frontend
npm test  # If tests are configured
```

### Troubleshooting

**Database Connection Issues:**
- Verify PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure PostGIS extension is installed: `CREATE EXTENSION postgis;`

**CORS Errors:**
- Verify `CORS_ORIGINS` includes your frontend URL
- Check backend is running and accessible

**Map Not Loading:**
- Verify Leaflet CSS is imported
- Check browser console for errors
- Ensure geometry data is valid GeoJSON

**Authentication Issues:**
- Verify SECRET_KEY is set correctly
- Check token expiration time
- Clear localStorage and re-login

## License

This project is part of a technical assessment and is not licensed for commercial use.

## Contact

For questions or issues, please open an issue in the repository.

