import os
import sys
from fastapi.testclient import TestClient

# Ensure backend package is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_research_validation_failure():
    # Empty payload should fail
    response = client.post("/api/v1/research", json={})
    assert response.status_code == 422 # FastAPI standard validation error for unsupplied/invalid properties

def test_start_research_success():
    response = client.post("/api/v1/research", json={"company_name": "Test Company", "url": "https://example.com"})
    assert response.status_code == 202
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "PENDING"
    
    # Poll status
    task_id = data["task_id"]
    status_response = client.get(f"/api/v1/research/{task_id}")
    assert status_response.status_code == 200
    assert status_response.json()["task_id"] == task_id
