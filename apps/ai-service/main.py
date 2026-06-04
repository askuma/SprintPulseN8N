from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import uvicorn

from routers.generate import router as generate_router
from routers.health import router as health_router

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("AI service starting", service="ai-service")
    yield
    log.info("AI service shutting down")


app = FastAPI(
    title="SprintPulse AI Analysis Service",
    version="1.0.0",
    description="Generates structured sprint reports using Claude claude-sonnet-4-6",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # only gateway
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(generate_router, prefix="")
app.include_router(health_router, prefix="")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
