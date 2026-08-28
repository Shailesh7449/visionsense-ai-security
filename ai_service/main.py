import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ai_service.video.pipeline import VideoPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VisionSense AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_pipelines = {}

@app.websocket("/ws/telemetry/{session_id}")
async def websocket_telemetry(websocket: WebSocket, session_id: str):
    await websocket.accept()
    logger.info(f"WebSocket connected for session: {session_id}")
    
    # Ensure any existing pipeline for this session is stopped
    if session_id in active_pipelines:
        active_pipelines[session_id].stop()
        
    pipeline = VideoPipeline(session_id)
    active_pipelines[session_id] = pipeline
    
    try:
        async for telemetry in pipeline.stream_telemetry():
            if "error" in telemetry:
                await websocket.send_text(json.dumps(telemetry))
                break
            await websocket.send_text(json.dumps(telemetry))
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logger.error(f"Error in telemetry stream: {e}")
    finally:
        pipeline.stop()
        if session_id in active_pipelines:
            del active_pipelines[session_id]
        logger.info(f"Cleaned up pipeline for session: {session_id}")

@app.get("/")
def health_check():
    return {"status": "ok", "service": "VisionSense AI Service"}
