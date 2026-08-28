import cv2
import asyncio
import time
import os
import logging
from ai_service.config import config
from ai_service.detection.yolo_tracker import YOLOTracker

logger = logging.getLogger(__name__)

class VideoPipeline:
    def __init__(self, filename: str):
        self.filename = filename
        if filename == "demo":
            self.video_path = os.path.join(config.FRONTEND_ASSETS_DIR, "demo_tracked_store.mp4")
        else:
            self.video_path = os.path.join(config.UPLOADS_DIR, filename)
            
        self.tracker = YOLOTracker()
        self.is_running = False

    async def stream_telemetry(self):
        """
        An async generator that yields JSON telemetry dictionaries.
        Throttled to match the video's actual framerate to sync with frontend playback.
        """
        if not os.path.exists(self.video_path):
            logger.error(f"Video file not found: {self.video_path}")
            yield {"error": "Video file not found"}
            return

        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            logger.error("Failed to open video")
            yield {"error": "Failed to open video"}
            return

        video_fps = cap.get(cv2.CAP_PROP_FPS)
        if video_fps <= 0:
            video_fps = 30.0

        video_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        video_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Calculate how many frames to skip based on requested AI_INFERENCE_FPS
        frame_interval = max(1, int(round(video_fps / config.AI_INFERENCE_FPS)))
        
        self.is_running = True
        frame_number = 0
        start_time = time.time()
        
        try:
            while self.is_running:
                # Real-time syncing: ensure we don't process faster than the video plays natively
                # This keeps the telemetry in sync with the frontend HTML5 video player
                expected_time = frame_number / video_fps
                current_time = time.time() - start_time
                if current_time < expected_time:
                    await asyncio.sleep(expected_time - current_time)

                ret, frame = cap.read()
                if not ret:
                    break

                # Process only every Nth frame to maintain AI_INFERENCE_FPS
                if frame_number % frame_interval == 0:
                    inference_start = time.time()
                    
                    # Run AI
                    result = self.tracker.track_frame(frame)
                    detections = self.tracker.format_detections(result)
                    
                    inference_time_ms = (time.time() - inference_start) * 1000
                    
                    telemetry = {
                        "session_id": self.filename,
                        "frame_number": frame_number,
                        "timestamp": round(frame_number / video_fps, 2),
                        "video_width": video_width,
                        "video_height": video_height,
                        "people_count": len(detections),
                        "detections": detections,
                        "metrics": {
                            "inference_time_ms": round(inference_time_ms, 2)
                        }
                    }
                    yield telemetry
                
                frame_number += 1
                
        finally:
            cap.release()
            self.is_running = False
            logger.info(f"Finished processing {self.filename}")

    def stop(self):
        self.is_running = False
