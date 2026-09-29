from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.main import api_router
from app.core.config import settings

app = FastAPI(
    title="AI Real Estate Sales Consultant API",
    description="API for the AI Real Estate Sales Consultant Platform",
    version="1.0.0",
)

# Configure CORS
# In production, specify the exact origins allowed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is running"}
