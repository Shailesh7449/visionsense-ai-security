import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    AI_INFERENCE_FPS = int(os.getenv("AI_INFERENCE_FPS", "10"))
    YOLO_MODEL = os.getenv("YOLO_MODEL", "yolov8n.pt")
    YOLO_CONFIDENCE = float(os.getenv("YOLO_CONFIDENCE", "0.35"))
    
    # 0 for person in COCO
    _yolo_classes_str = os.getenv("YOLO_CLASSES", "0")
    YOLO_CLASSES = [int(c.strip()) for c in _yolo_classes_str.split(",") if c.strip()]

    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, "data")
    UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
    FRONTEND_ASSETS_DIR = os.path.join(BASE_DIR, "frontend", "assets")

config = Config()
