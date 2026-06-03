import os
import socket
from fastapi import FastAPI, HTTPException, Query, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from typing import Optional, List
from datetime import datetime

from app.db import db, connect_db, disconnect_db
from app.services.pipeline import run_intelligence_pipeline, GithubAPIError, AnalyticsResult

# Load environment variables
load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

def is_db_port_open() -> bool:
    try:
        db_url = os.getenv("DATABASE_URL") or ""
        db_host = "localhost"
        db_port = 5432
        
        if "@" in db_url:
            after_at = db_url.split("@")[1]
            host_port = after_at.split("/")[0]
            if ":" in host_port:
                db_host, port_str = host_port.split(":")
                # Strip query parameters if present
                if "?" in port_str:
                    port_str = port_str.split("?")[0]
                db_port = int(port_str)
            else:
                db_host = host_port.split("/")[0]
                db_port = 5432
                
        with socket.create_connection((db_host, db_port), timeout=0.8):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect database safely if port is open
    if is_db_port_open():
        try:
            await connect_db()
            print("Database connected successfully!")
        except Exception as e:
            print(f"Warning: Database connection failed: {e}. Running in database-offline mode.")
    else:
        print("Warning: Database port is closed. Running in database-offline mode.")
    yield
    # Disconnect database safely
    if db.is_connected():
        try:
            await disconnect_db()
        except Exception:
            pass

app = FastAPI(
    title="RepoMind API",
    description="Backend API for GitHub Repository Intelligence Dashboard",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to RepoMind Intelligence API"}

@app.get("/api/repo/search", response_model=AnalyticsResult)
async def search_repository(query: str = Query(..., description="Full repository name: owner/repo")):
    try:
        # Run intelligence pipeline to get live data and scores
        result = await run_intelligence_pipeline(query, GITHUB_TOKEN)
        
        # Save or update repository metadata in database (only if database is connected)
        if db.is_connected():
            try:
                repo_data = result.repository
                await db.repository.upsert(
                    where={"fullName": repo_data.fullName},
                    data={
                        "create": {
                            "githubId": repo_raw_id_fallback(repo_data.fullName), # Generate a unique ID or fetch from API
                            "fullName": repo_data.fullName,
                            "name": repo_data.name,
                            "ownerName": repo_data.owner,
                            "ownerAvatarUrl": repo_data.ownerAvatarUrl,
                            "description": repo_data.description,
                            "stars": repo_data.stars,
                            "forks": repo_data.forks,
                            "watchers": repo_data.watchers,
                            "openIssues": repo_data.openIssues,
                            "defaultBranch": repo_data.defaultBranch,
                            "primaryLanguage": repo_data.primaryLanguage,
                            "license": repo_data.license,
                            "createdDate": datetime.fromisoformat(repo_data.createdDate.replace("Z", "+00:00")),
                            "lastUpdatedDate": datetime.fromisoformat(repo_data.lastUpdatedDate.replace("Z", "+00:00")),
                        },
                        "update": {
                            "stars": repo_data.stars,
                            "forks": repo_data.forks,
                            "watchers": repo_data.watchers,
                            "openIssues": repo_data.openIssues,
                            "primaryLanguage": repo_data.primaryLanguage,
                            "license": repo_data.license,
                            "lastUpdatedDate": datetime.fromisoformat(repo_data.lastUpdatedDate.replace("Z", "+00:00")),
                        }
                    }
                )
            except Exception as db_err:
                print(f"Warning: Failed to cache repository metadata in database: {db_err}")
        
        return result
    except GithubAPIError as e:
        if e.status_code == 403:
            raise HTTPException(status_code=403, detail={"message": e.message, "resetTime": e.reset_time})
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# Helper to generate unique numeric ID for upsert fallback
def repo_raw_id_fallback(fullName: str) -> int:
    return abs(hash(fullName)) % 100000000

# Create Observation
@app.post("/api/insights", status_code=201)
async def create_insight(
    repoFullName: str = Body(..., embed=True),
    note: str = Body(..., embed=True),
    priority: str = Body(..., embed=True)
):
    if priority not in ["High", "Medium", "Low"]:
        raise HTTPException(status_code=400, detail="Priority must be High, Medium, or Low")
        
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database is currently offline. Observations cannot be created.")
        
    try:
        # Check if repository metadata is cached, if not, fetch it first
        repo = await db.repository.find_unique(where={"fullName": repoFullName})
        if not repo:
            try:
                pipeline_res = await run_intelligence_pipeline(repoFullName, GITHUB_TOKEN)
                repo_data = pipeline_res.repository
                repo = await db.repository.create(
                    data={
                        "githubId": repo_raw_id_fallback(repo_data.fullName),
                        "fullName": repo_data.fullName,
                        "name": repo_data.name,
                        "ownerName": repo_data.owner,
                        "ownerAvatarUrl": repo_data.ownerAvatarUrl,
                        "description": repo_data.description,
                        "stars": repo_data.stars,
                        "forks": repo_data.forks,
                        "watchers": repo_data.watchers,
                        "openIssues": repo_data.openIssues,
                        "defaultBranch": repo_data.defaultBranch,
                        "primaryLanguage": repo_data.primaryLanguage,
                        "license": repo_data.license,
                        "createdDate": datetime.fromisoformat(repo_data.createdDate.replace("Z", "+00:00")),
                        "lastUpdatedDate": datetime.fromisoformat(repo_data.lastUpdatedDate.replace("Z", "+00:00")),
                    }
                )
            except GithubAPIError as ge:
                raise HTTPException(status_code=ge.status_code, detail=f"Failed to fetch repo metadata: {ge.message}")
        
        # Create insight note
        insight = await db.insight.create(
            data={
                "repoId": repo.id,
                "note": note,
                "priority": priority
            },
            include={"repository": True}
        )
        return insight
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Get All Observations with sorting and filtering
@app.get("/api/insights")
async def get_insights(
    query: Optional[str] = None,
    priority: Optional[str] = None,
    sortBy: Optional[str] = "createdAt"  # "createdAt" | "priority" | "repoName"
):
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database is currently offline. Saved observations cannot be loaded.")
        
    try:
        # Build query parameters
        where_clause = {}
        if priority:
            where_clause["priority"] = priority
            
        if query:
            where_clause["OR"] = [
                {"note": {"contains": query, "mode": "insensitive"}},
                {"repository": {"fullName": {"contains": query, "mode": "insensitive"}}}
            ]
            
        # Get list from Prisma
        insights = await db.insight.find_many(
            where=where_clause,
            include={"repository": True}
        )
        
        # In Prisma Python, sorting on nested relations or complex fields is often cleaner in Python
        if sortBy == "repoName":
            insights.sort(key=lambda x: x.repository.fullName.lower())
        elif sortBy == "priority":
            # Priority order: High (0), Medium (1), Low (2)
            prio_map = {"High": 0, "Medium": 1, "Low": 2}
            insights.sort(key=lambda x: prio_map.get(x.priority, 3))
        else:
            # Default sorting: Newest first
            insights.sort(key=lambda x: x.createdAt, reverse=True)
            
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Update Observation
@app.put("/api/insights/{id}")
async def update_insight(
    id: str,
    note: str = Body(..., embed=True),
    priority: str = Body(..., embed=True)
):
    if priority not in ["High", "Medium", "Low"]:
        raise HTTPException(status_code=400, detail="Priority must be High, Medium, or Low")
        
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database is currently offline. Observations cannot be updated.")
        
    try:
        # Check if exists
        exists = await db.insight.find_unique(where={"id": id})
        if not exists:
            raise HTTPException(status_code=404, detail="Observation note not found")
            
        updated = await db.insight.update(
            where={"id": id},
            data={"note": note, "priority": priority},
            include={"repository": True}
        )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Delete Observation
@app.delete("/api/insights/{id}")
async def delete_insight(id: str):
    if not db.is_connected():
        raise HTTPException(status_code=503, detail="Database is currently offline. Observations cannot be deleted.")
        
    try:
        exists = await db.insight.find_unique(where={"id": id})
        if not exists:
            raise HTTPException(status_code=404, detail="Observation note not found")
            
        await db.insight.delete(where={"id": id})
        return {"success": True, "message": "Observation note successfully deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
