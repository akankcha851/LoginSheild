from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import initialize_database
from backend.routes.auth import router as auth_router
from backend.routes.events import router as events_router
from backend.routes.dashboard import router as dashboard_router

from backend.simulator import (
    simulate_normal_login,
    simulate_brute_force,
    simulate_suspicious_success
)

app = FastAPI(
    title="LoginShield",
    description="Real-Time Authentication Threat Detection & Monitoring Platform",
    version="1.0.0"
)

# Initialize Database
initialize_database()

# Mount API Routers
app.include_router(auth_router)
app.include_router(events_router)
app.include_router(dashboard_router)

# Mount Frontend Static Files
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")

# Application Root (UI)
@app.get("/")
def serve_ui():
    return FileResponse("frontend/index.html")

# Health Check
@app.get("/health")
def health():
    return {"status": "healthy"}

# =========================================================
# SIMULATION ENDPOINTS
# =========================================================

@app.post("/simulate/normal")
def simulate_normal():
    simulate_normal_login("9999999999")
    return {"success": True, "simulation": "normal_login"}

@app.post("/simulate/brute-force")
def run_simulate_brute_force():
    simulate_brute_force("9999999999")
    return {"success": True, "simulation": "brute_force"}

@app.post("/simulate/suspicious-success")
def simulate_success():
    simulate_suspicious_success("9999999999")
    return {"success": True, "simulation": "suspicious_success"}