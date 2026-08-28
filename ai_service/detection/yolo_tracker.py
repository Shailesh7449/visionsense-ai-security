from ultralytics import YOLO
from ai_service.config import config
import logging

logger = logging.getLogger(__name__)

class YOLOTracker:
    def __init__(self):
        logger.info(f"Initializing YOLO model from: {config.YOLO_MODEL}")
        self.model = YOLO(config.YOLO_MODEL)
    
    def track_frame(self, frame):
        """
        Runs YOLO + ByteTrack on a single frame.
        Returns the detections.
        """
        # We use tracker="bytetrack.yaml" which is built-in to ultralytics
        # persist=True keeps the tracker state across frames
        results = self.model.track(
            frame, 
            persist=True, 
            tracker="bytetrack.yaml", 
            conf=config.YOLO_CONFIDENCE,
            classes=config.YOLO_CLASSES,
            verbose=False
        )
        return results[0]

    def format_detections(self, result):
        """
        Formats the ultralytics result object into the JSON payload for frontend.
        """
        detections = []
        if result.boxes is None or result.boxes.id is None:
            return detections
            
        boxes = result.boxes.xyxy.cpu().numpy()
        track_ids = result.boxes.id.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy()
        
        for box, track_id, conf, cls in zip(boxes, track_ids, confidences, classes):
            x1, y1, x2, y2 = map(int, box)
            detections.append({
                "track_id": int(track_id),
                "class": result.names[int(cls)],
                "confidence": float(conf),
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2
            })
            
        return detections
