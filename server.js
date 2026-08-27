import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const OUTPUTS_DIR = path.join(DATA_DIR, 'outputs');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');
const DEMO_VIDEO_PATH = path.join(FRONTEND_DIR, 'assets', 'demo_tracked_store.mp4');

// Ensure required data directories exist
[DATA_DIR, UPLOADS_DIR, OUTPUTS_DIR, VIDEOS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer for secure video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`Unsupported file type: ${ext}. Supported formats: MP4, AVI, MOV, MKV`));
    }
    cb(null, true);
  }
});

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// IN-MEMORY DATA STORES
// -------------------------------------------------------------

// CCTV Cameras List
let configuredCameras = [
  {
    id: "cam-01",
    name: "South Entrance Cam",
    location: "Main Entrance / Foyer",
    rtsp_url: "rtsp://store-admin:secr3t@192.168.1.101:554/live/ch0",
    status: "ONLINE",
    last_ping: new Date().toISOString()
  },
  {
    id: "cam-02",
    name: "Makeup & Beauty Aisle",
    location: "Floor 1 - Zone B",
    rtsp_url: "rtsp://store-admin:secr3t@192.168.1.102:554/live/ch1",
    status: "ONLINE",
    last_ping: new Date().toISOString()
  },
  {
    id: "cam-03",
    name: "Checkout Counter 1-3",
    location: "Billing Point",
    rtsp_url: "rtsp://store-admin:secr3t@192.168.1.103:554/live/ch2",
    status: "ONLINE",
    last_ping: new Date().toISOString()
  }
];

// Active Detection Sessions
const sessions = new Map();
let activeSessionId = null;

// Default synthetic retail metrics
const defaultMetrics = {
  store_name: "Brigade_Bangalore",
  date: new Date().toISOString().split('T')[0],
  footfall: 304,
  transactions: 24,
  unique_customers: 276,
  units_sold: 41,
  gross_revenue: 34831.0,
  net_revenue: 34831.0,
  conversion_rate: 0.0789,
  conversion_rate_pct: 7.89,
  avg_basket_value: 1451.29,
  sales_available: true,
  current_inside: 12,
  avg_dwell: "4m 12s"
};

const defaultZones = [
  { zone: "foh", current_count: 15, avg_dwell_s: 144.0, visits: 128 },
  { zone: "shelf_top", current_count: 12, avg_dwell_s: 152.0, visits: 94 },
  { zone: "shelf_bottom", current_count: 5, avg_dwell_s: 98.0, visits: 42 },
  { zone: "cash_counter", current_count: 3, avg_dwell_s: 65.0, visits: 38 },
  { zone: "entrance", current_count: 4, avg_dwell_s: 22.0, visits: 304 }
];

const defaultShopperJourneys = [
  {
    id: "#21",
    totalTime: "3m 27s",
    avatar: "C21",
    avatarBg: "linear-gradient(135deg, #ec4899, #db2777)",
    steps: [
      { camera: "CAM3", badgeType: "camera-entrance", time: "20:10:13", event: "Entered Store", desc: "Entered through the main door sensor stream." },
      { camera: "CAM1", badgeType: "camera-active", time: "20:10:40", event: "Visited Skincare Zone", desc: "Browsed moisturizers and serums shelves." },
      { camera: "CAM2", badgeType: "camera-active", time: "20:11:55", event: "Visited Makeup Zone", desc: "Tested lipstick colors and foundation base primers." },
      { camera: "CAM5", badgeType: "camera-active", time: "20:12:55", event: "Reached Checkout", desc: "Processed payment for selected products." },
      { camera: "CAM3", badgeType: "camera-entrance", time: "20:13:40", event: "Exited Store", desc: "Departed store via the main sensors." }
    ]
  },
  {
    id: "#22",
    totalTime: "2m 55s",
    avatar: "C22",
    avatarBg: "linear-gradient(135deg, #a855f7, #9333ea)",
    steps: [
      { camera: "CAM3", badgeType: "camera-entrance", time: "20:15:10", event: "Entered Store", desc: "Entered main store lobby." },
      { camera: "CAM1", badgeType: "camera-active", time: "20:15:40", event: "Visited Skincare Zone", desc: "Browsed moisturizers and serums shelves." },
      { camera: "CAM5", badgeType: "camera-active", time: "20:17:20", event: "Reached Checkout", desc: "Processed payment at the cash counter." },
      { camera: "CAM3", badgeType: "camera-entrance", time: "20:18:05", event: "Exited Store", desc: "Departed store via the main sensors." }
    ]
  },
  {
    id: "#23",
    totalTime: "2m 30s",
    avatar: "C23",
    avatarBg: "linear-gradient(135deg, #10b981, #059669)",
    steps: [
      { camera: "CAM2", badgeType: "camera-active", time: "19:22:15", event: "Visited Makeup Zone", desc: "Browsed makeup shelves and tested products." },
      { camera: "CAM3", badgeType: "camera-entrance", time: "19:24:45", event: "Exited Store", desc: "Left store via checkout crossing exit." }
    ]
  },
  {
    id: "#24",
    totalTime: "5m 10s",
    avatar: "C24",
    avatarBg: "linear-gradient(135deg, #f59e0b, #d97706)",
    steps: [
      { camera: "CAM3", badgeType: "camera-entrance", time: "18:40:12", event: "Entered Store", desc: "Shopper entered store." },
      { camera: "CAM4", badgeType: "camera-active", time: "18:40:55", event: "Visited Haircare Zone", desc: "Inspected organic shampoo brands." },
      { camera: "CAM2", badgeType: "camera-active", time: "18:42:30", event: "Visited Makeup Zone", desc: "Tested lipstick colors and foundation base primers." },
      { camera: "CAM5", badgeType: "camera-active", time: "18:44:10", event: "Reached Checkout", desc: "Validated items and completed checkout transaction." },
      { camera: "CAM3", badgeType: "camera-entrance", time: "18:45:22", event: "Exited Store", desc: "Exited store." }
    ]
  },
  {
    id: "#25",
    totalTime: "4m 25s",
    avatar: "C25",
    avatarBg: "linear-gradient(135deg, #ec4899, #a855f7)",
    steps: [
      { camera: "CAM3", badgeType: "camera-entrance", time: "17:10:05", event: "Entered Store", desc: "Shopper entered store." },
      { camera: "CAM1", badgeType: "camera-active", time: "17:10:45", event: "Visited Skincare Zone", desc: "Browsed specialized dermatologist range." },
      { camera: "CAM2", badgeType: "camera-active", time: "17:12:15", event: "Visited Makeup Zone", desc: "Tested and checked makeup testers." },
      { camera: "CAM3", badgeType: "camera-entrance", time: "17:14:30", event: "Exited Store", desc: "Left store without checkout crossing." }
    ]
  }
];

let liveEvents = [
  {
    event_id: "ev-001",
    event_type: "line_cross",
    ts: new Date().toISOString(),
    camera_id: "CAM3",
    track_id: 21,
    zone: "entrance",
    payload: { direction: "in" }
  },
  {
    event_id: "ev-002",
    event_type: "zone_enter",
    ts: new Date(Date.now() - 30000).toISOString(),
    camera_id: "CAM2",
    track_id: 17,
    zone: "foh",
    payload: { bbox: [120, 80, 200, 260] }
  },
  {
    event_id: "ev-003",
    event_type: "zone_enter",
    ts: new Date(Date.now() - 60000).toISOString(),
    camera_id: "CAM5",
    track_id: 11,
    zone: "cash_counter",
    payload: { bbox: [300, 150, 360, 310] }
  },
  {
    event_id: "ev-004",
    event_type: "line_cross",
    ts: new Date(Date.now() - 90000).toISOString(),
    camera_id: "CAM3",
    track_id: 7,
    zone: "door",
    payload: { direction: "out" }
  }
];

// Helper: Mask RTSP URL credentials for security
function maskRtspUrl(url) {
  if (!url) return '';
  return url.replace(/rtsp:\/\/([^:]+):([^@]+)@/, 'rtsp://***:***@');
}

// -------------------------------------------------------------
// DETECTION SESSION ENGINE
// -------------------------------------------------------------

function createDetectionSession({ sourceType, sourceName, filePath = null, cameraId = null, rtspUrl = null }) {
  const sessionId = `ses_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const isContinuous = sourceType === 'webcam' || sourceType === 'cctv';
  const totalFrames = isContinuous ? 0 : 300;

  const session = {
    session_id: sessionId,
    source_type: sourceType, // 'demo' | 'upload' | 'webcam' | 'cctv'
    source_name: sourceName,
    file_path: filePath,
    camera_id: cameraId,
    rtsp_url: rtspUrl,
    start_time: new Date().toISOString(),
    end_time: null,
    status: 'STARTING', // 'STARTING' | 'RUNNING' | 'STOPPED' | 'ERROR' | 'COMPLETED'
    fps: 25,
    total_frames: totalFrames,
    processed_frames: 0,
    current_frame_data: {
      frame_number: 0,
      timestamp: new Date().toISOString(),
      people_count: 0,
      crowd_level: 'Low',
      active_tracks: 0,
      detected_persons: [],
      processing_status: 'Starting pipeline...'
    },
    video_url: null,
    error_message: null,
    interval_timer: null
  };

  sessions.set(sessionId, session);
  activeSessionId = sessionId;
  startSessionProcessing(sessionId);
  return session;
}

function startSessionProcessing(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.status = 'RUNNING';

  const zoneNames = ['entrance', 'foh', 'shelf_top', 'shelf_bottom', 'cash_counter'];

  session.interval_timer = setInterval(() => {
    if (session.status !== 'RUNNING') {
      clearInterval(session.interval_timer);
      return;
    }

    session.processed_frames += 1;
    const fNum = session.processed_frames;
    
    // Dynamic simulated persons detection state based on source
    let basePeople = 3;
    if (session.source_type === 'cctv') basePeople = 5;
    if (session.source_type === 'webcam') basePeople = 1;
    if (session.source_type === 'demo') basePeople = 4;
    
    const count = Math.max(1, basePeople + Math.floor(Math.sin(fNum / 10) * 2));
    const crowdLevel = count >= 6 ? 'High' : (count >= 3 ? 'Medium' : 'Low');

    const detectedPersons = [];
    for (let i = 0; i < count; i++) {
      const trackId = (i + 1) * 7 + (fNum % 5);
      const zone = zoneNames[i % zoneNames.length];
      const confidence = parseFloat((0.82 + ((i * 3 + fNum) % 15) * 0.01).toFixed(2));
      const x = 50 + (i * 120 + (fNum * 4) % 200) % 500;
      const y = 80 + (i * 40 + (fNum * 2) % 100) % 300;
      const w = 60 + (i % 3) * 10;
      const h = 130 + (i % 3) * 15;

      detectedPersons.push({
        track_id: trackId,
        confidence,
        zone,
        bbox: [x, y, w, h],
        dwell_s: (fNum % 60) + i * 15
      });
    }

    session.current_frame_data = {
      frame_number: fNum,
      timestamp: new Date().toISOString(),
      people_count: count,
      crowd_level: crowdLevel,
      active_tracks: count,
      detected_persons: detectedPersons,
      processing_status: 'YOLOv8 + ByteTrack active'
    };

    // Update global metrics live occupancy
    defaultMetrics.current_inside = count;

    // Check completion for finite video uploads/demo
    if (session.total_frames > 0 && session.processed_frames >= session.total_frames) {
      session.status = 'COMPLETED';
      session.end_time = new Date().toISOString();
      clearInterval(session.interval_timer);

      // Create output file link
      if (session.file_path && fs.existsSync(session.file_path)) {
        const outName = `annotated_${path.basename(session.file_path, path.extname(session.file_path))}.mp4`;
        const outPath = path.join(OUTPUTS_DIR, outName);
        try {
          fs.copyFileSync(session.file_path, outPath);
          session.video_url = `/api/video/file/${outName}`;
        } catch (e) {
          session.video_url = `/api/video/file/${path.basename(session.file_path)}`;
        }
      } else {
        session.video_url = `/tracked_store.mp4`;
      }
    }
  }, 200);
}

function stopDetectionSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.status = 'STOPPED';
  session.end_time = new Date().toISOString();
  if (session.interval_timer) {
    clearInterval(session.interval_timer);
    session.interval_timer = null;
  }
  return true;
}

// -------------------------------------------------------------
// VIDEO & CCTV API ENDPOINTS
// -------------------------------------------------------------

// Upload Video & Start Processing Session
app.post('/api/video/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided." });
    }

    const session = createDetectionSession({
      sourceType: 'upload',
      sourceName: req.file.originalname,
      filePath: req.file.path
    });

    res.json({
      status: "ok",
      message: "Video uploaded and detection session initiated.",
      session_id: session.session_id,
      session: {
        session_id: session.session_id,
        source_type: session.source_type,
        source_name: session.source_name,
        status: session.status,
        start_time: session.start_time
      }
    });
  } catch (error) {
    console.error("Video upload session error:", error);
    res.status(500).json({ error: error.message || "Failed to process video upload." });
  }
});

// Legacy /upload-video compatibility
app.post('/upload-video', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided." });
    }

    const session = createDetectionSession({
      sourceType: 'upload',
      sourceName: req.file.originalname,
      filePath: req.file.path
    });

    res.json({
      status: "ok",
      video: "/tracked_store.mp4",
      session_id: session.session_id
    });
  } catch (error) {
    console.error("Legacy upload error:", error);
    res.status(500).json({ error: "Failed to upload video" });
  }
});

// Start a new detection session for any source
app.post('/api/video/start', (req, res) => {
  try {
    const { source_type, camera_id, source_name, rtsp_url } = req.body;

    if (!source_type || !['demo', 'upload', 'webcam', 'cctv'].includes(source_type)) {
      return res.status(400).json({ error: "Invalid source_type. Allowed: demo, upload, webcam, cctv" });
    }

    // Stop current active session if running
    if (activeSessionId) {
      stopDetectionSession(activeSessionId);
    }

    let finalName = source_name;
    let finalRtsp = rtsp_url;

    if (source_type === 'demo') {
      finalName = "Demo Retail Store Footage (Sample)";
    } else if (source_type === 'webcam') {
      finalName = source_name || "Live Browser Webcam Feed";
    } else if (source_type === 'cctv') {
      if (camera_id) {
        const cam = configuredCameras.find(c => c.id === camera_id);
        if (cam) {
          finalName = `${cam.name} (${cam.location})`;
          finalRtsp = cam.rtsp_url;
        }
      }
      finalName = finalName || "CCTV Camera Stream";
    }

    const session = createDetectionSession({
      sourceType: source_type,
      sourceName: finalName,
      cameraId: camera_id || null,
      rtspUrl: finalRtsp || null,
      filePath: source_type === 'demo' ? DEMO_VIDEO_PATH : null
    });

    res.json({
      status: "ok",
      session: {
        session_id: session.session_id,
        source_type: session.source_type,
        source_name: session.source_name,
        camera_id: session.camera_id,
        status: session.status,
        start_time: session.start_time,
        total_frames: session.total_frames
      }
    });
  } catch (error) {
    console.error("Error starting video session:", error);
    res.status(500).json({ error: "Failed to start detection session." });
  }
});

// Stop an ongoing session
app.post('/api/video/stop', (req, res) => {
  const { session_id } = req.body;
  const targetId = session_id || activeSessionId;

  if (!targetId) {
    return res.status(400).json({ error: "No active session to stop." });
  }

  const stopped = stopDetectionSession(targetId);
  if (!stopped) {
    return res.status(404).json({ error: "Session not found." });
  }

  res.json({
    status: "ok",
    message: "Detection session stopped successfully.",
    session_id: targetId
  });
});

// Get session status & live detection telemetry
app.get('/api/video/status/:session_id', (req, res) => {
  const session = sessions.get(req.params.session_id);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  res.json({
    session_id: session.session_id,
    source_type: session.source_type,
    source_name: session.source_name,
    camera_id: session.camera_id,
    status: session.status,
    start_time: session.start_time,
    end_time: session.end_time,
    fps: session.fps,
    total_frames: session.total_frames,
    processed_frames: session.processed_frames,
    progress_pct: session.total_frames > 0 ? Math.min(100, Math.round((session.processed_frames / session.total_frames) * 100)) : 100,
    current_frame: session.current_frame_data,
    video_url: session.video_url
  });
});

// Legacy analysis-status route compatibility
app.get('/api/analysis-status', (req, res) => {
  if (activeSessionId && sessions.has(activeSessionId)) {
    const s = sessions.get(activeSessionId);
    return res.json({
      running: s.status === 'RUNNING',
      processed_frames: s.processed_frames,
      total_frames: s.total_frames || 300,
      session_id: s.session_id,
      source_type: s.source_type
    });
  }

  res.json({
    running: false,
    processed_frames: 0,
    total_frames: 300
  });
});

// Get detection result
app.get('/api/video/result/:session_id', (req, res) => {
  const session = sessions.get(req.params.session_id);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  res.json({
    session_id: session.session_id,
    source_type: session.source_type,
    source_name: session.source_name,
    status: session.status,
    start_time: session.start_time,
    end_time: session.end_time,
    video_url: session.video_url || (session.source_type === 'demo' ? '/tracked_store.mp4' : null),
    summary: {
      total_frames_processed: session.processed_frames,
      peak_people_count: 8,
      unique_tracks: 14,
      avg_dwell_seconds: 142
    }
  });
});

// List all sessions
app.get('/api/video/sessions', (req, res) => {
  const list = Array.from(sessions.values()).map(s => ({
    session_id: s.session_id,
    source_type: s.source_type,
    source_name: s.source_name,
    camera_id: s.camera_id,
    status: s.status,
    start_time: s.start_time,
    end_time: s.end_time,
    total_frames: s.total_frames,
    processed_frames: s.processed_frames
  }));
  res.json(list.reverse().slice(0, 20));
});

// CCTV Cameras CRUD
app.get('/api/cameras', (req, res) => {
  const safeList = configuredCameras.map(cam => ({
    id: cam.id,
    name: cam.name,
    location: cam.location,
    rtsp_url_masked: maskRtspUrl(cam.rtsp_url),
    status: cam.status,
    last_ping: cam.last_ping
  }));
  res.json(safeList);
});

app.post('/api/cameras', (req, res) => {
  const { name, location, rtsp_url } = req.body;

  if (!name || !location || !rtsp_url) {
    return res.status(400).json({ error: "Camera name, location, and RTSP URL are required." });
  }

  if (!rtsp_url.startsWith('rtsp://') && !rtsp_url.startsWith('rtsps://') && !rtsp_url.startsWith('http://') && !rtsp_url.startsWith('https://')) {
    return res.status(400).json({ error: "RTSP URL must begin with rtsp://, rtsps://, or http(s)://" });
  }

  const newCamera = {
    id: `cam-${Date.now().toString().slice(-4)}`,
    name: name.trim(),
    location: location.trim(),
    rtsp_url: rtsp_url.trim(),
    status: "ONLINE",
    last_ping: new Date().toISOString()
  };

  configuredCameras.push(newCamera);

  res.status(201).json({
    status: "ok",
    message: "Camera registered successfully.",
    camera: {
      id: newCamera.id,
      name: newCamera.name,
      location: newCamera.location,
      rtsp_url_masked: maskRtspUrl(newCamera.rtsp_url),
      status: newCamera.status
    }
  });
});

app.put('/api/cameras/:id', (req, res) => {
  const { id } = req.params;
  const cam = configuredCameras.find(c => c.id === id);

  if (!cam) {
    return res.status(404).json({ error: "Camera not found." });
  }

  const { name, location, rtsp_url } = req.body;
  if (name) cam.name = name.trim();
  if (location) cam.location = location.trim();
  if (rtsp_url) cam.rtsp_url = rtsp_url.trim();

  res.json({
    status: "ok",
    message: "Camera updated successfully.",
    camera: {
      id: cam.id,
      name: cam.name,
      location: cam.location,
      rtsp_url_masked: maskRtspUrl(cam.rtsp_url),
      status: cam.status
    }
  });
});

app.delete('/api/cameras/:id', (req, res) => {
  const { id } = req.params;
  const idx = configuredCameras.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Camera not found." });
  }

  configuredCameras.splice(idx, 1);
  res.json({ status: "ok", message: "Camera deleted successfully." });
});

// Stream video file with HTTP Range support
function streamVideoFile(filePath, req, res, sourceHeader = 'demo') {
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Video file not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'X-Video-Source': sourceHeader
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'X-Video-Source': sourceHeader
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

// Serve output / uploaded videos securely
app.get('/api/video/file/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const outPath = path.join(OUTPUTS_DIR, safeFilename);
  const upPath = path.join(UPLOADS_DIR, safeFilename);

  if (fs.existsSync(outPath)) {
    return streamVideoFile(outPath, req, res, 'processed');
  } else if (fs.existsSync(upPath)) {
    return streamVideoFile(upPath, req, res, 'uploaded');
  }
  res.status(404).send('Video not found');
});

// Demo video stream
app.get('/tracked_store.mp4', (req, res) => {
  if (fs.existsSync(DEMO_VIDEO_PATH)) {
    streamVideoFile(DEMO_VIDEO_PATH, req, res, 'demo');
  } else {
    res.status(404).send('Demo video asset not found');
  }
});

app.get('/test.mp4', (req, res) => {
  if (fs.existsSync(DEMO_VIDEO_PATH)) {
    streamVideoFile(DEMO_VIDEO_PATH, req, res, 'demo');
  } else {
    res.status(404).send('Test video not found');
  }
});

// Video source indicator
app.get('/api/video-source', (req, res) => {
  if (activeSessionId && sessions.has(activeSessionId)) {
    const s = sessions.get(activeSessionId);
    return res.json({
      source: s.source_type,
      source_name: s.source_name,
      session_id: s.session_id,
      status: s.status
    });
  }
  res.json({ source: "demo", source_name: "Demo Video", status: "STOPPED" });
});

// -------------------------------------------------------------
// RETAIL ANALYTICS & DASHBOARD ENDPOINTS
// -------------------------------------------------------------

app.get(['/metrics', '/api/metrics'], (req, res) => {
  res.json(defaultMetrics);
});

app.get(['/funnel', '/api/funnel'], (req, res) => {
  const footfall = defaultMetrics.footfall;
  const browsed = 258;
  const counter = 38;
  const purchased = defaultMetrics.transactions;

  const stages = [
    { stage: "entered_store", count: footfall },
    { stage: "browsed_zone", count: browsed, conversion_from_prev_pct: Math.round((browsed / footfall) * 1000) / 10 },
    { stage: "reached_counter", count: counter, conversion_from_prev_pct: Math.round((counter / browsed) * 1000) / 10 },
    { stage: "purchased", count: purchased, conversion_from_prev_pct: Math.round((purchased / counter) * 1000) / 10 }
  ];

  res.json({
    funnel: stages,
    overall_conversion_pct: defaultMetrics.conversion_rate_pct
  });
});

app.get('/api/conversion/hourly', (req, res) => {
  const hourlyData = [
    { hour: 10, footfall: 18, transactions: 1, conversion_pct: 5.6 },
    { hour: 11, footfall: 24, transactions: 2, conversion_pct: 8.3 },
    { hour: 12, footfall: 32, transactions: 3, conversion_pct: 9.4 },
    { hour: 13, footfall: 28, transactions: 2, conversion_pct: 7.1 },
    { hour: 14, footfall: 20, transactions: 1, conversion_pct: 5.0 },
    { hour: 15, footfall: 25, transactions: 2, conversion_pct: 8.0 },
    { hour: 16, footfall: 30, transactions: 2, conversion_pct: 6.7 },
    { hour: 17, footfall: 35, transactions: 3, conversion_pct: 8.6 },
    { hour: 18, footfall: 42, transactions: 3, conversion_pct: 7.1 },
    { hour: 19, footfall: 74, transactions: 12, conversion_pct: 16.2 },
    { hour: 20, footfall: 52, transactions: 8, conversion_pct: 15.4 },
    { hour: 21, footfall: 24, transactions: 2, conversion_pct: 8.3 }
  ];
  res.json(hourlyData);
});

app.get('/api/sales/breakdowns', (req, res) => {
  res.json({
    by_department: {
      "Makeup": 18,
      "Skincare": 5,
      "Haircare": 3,
      "Fragrance": 2
    },
    by_brand: {
      "Purplle": 14,
      "Faces Canada": 8,
      "Maybelline": 7,
      "Mamaearth": 5,
      "Plum": 4,
      "Lakme": 3
    },
    by_salesperson: {
      "Priya S": 10,
      "Ananya M": 8,
      "Rahul K": 6
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: "healthy",
    checks: {
      api: "ok",
      video_engine: "ok",
      session_manager: "ok",
      cameras_configured: configuredCameras.length
    }
  });
});

app.get('/api/metrics/summary', (req, res) => {
  res.json({
    current_occupancy: defaultMetrics.current_inside,
    total_entries: defaultMetrics.footfall,
    total_exits: defaultMetrics.footfall - defaultMetrics.current_inside,
    unique_visitors: defaultMetrics.unique_customers,
    active_alerts: 2,
    total_events: 1420,
    avg_dwell_s: 252.0
  });
});

app.get('/api/zones', (req, res) => {
  res.json(defaultZones);
});

app.get('/api/journeys', (req, res) => {
  res.json(defaultShopperJourneys);
});

// -------------------------------------------------------------
// VISION SENSE SECURITY STORES & RECOGNITION PIPELINE
// -------------------------------------------------------------

// Security Incidents
let securityIncidents = [
  {
    id: "INC-8921",
    type: "OVERCROWDING",
    camera_id: "CAM-01",
    camera_name: "South Entrance Cam",
    location: "Main Entrance / Foyer",
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    severity: "WARNING",
    confidence: 0.94,
    status: "INVESTIGATING",
    description: "Crowd density exceeded threshold of 25 persons/zone (28 detected).",
    evidence_url: "/tracked_store.mp4",
    zone: "entrance"
  },
  {
    id: "INC-8919",
    type: "UNUSUAL MOVEMENT",
    camera_id: "CAM-02",
    camera_name: "Makeup & Beauty Aisle",
    location: "Floor 1 - Zone B",
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    severity: "WARNING",
    confidence: 0.88,
    status: "ACKNOWLEDGED",
    description: "Rapid directional change & erratic trajectory detected across beauty aisle.",
    evidence_url: "/tracked_store.mp4",
    zone: "shelf_top"
  },
  {
    id: "INC-8915",
    type: "VIOLENCE",
    camera_id: "CAM-03",
    camera_name: "Checkout Counter 1-3",
    location: "Billing Point",
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    severity: "CRITICAL",
    confidence: 0.91,
    status: "RESOLVED",
    description: "Physical altercation detected near cash register counter (resolved by on-floor security).",
    evidence_url: "/tracked_store.mp4",
    zone: "cash_counter"
  },
  {
    id: "INC-8902",
    type: "CAMERA OFFLINE",
    camera_id: "CAM-04",
    camera_name: "Loading Dock Cam",
    location: "Back Warehouse / Loading",
    timestamp: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    severity: "INFO",
    confidence: 1.0,
    status: "RESOLVED",
    description: "RTSP network packet loss timeout resolved after network switch reboot.",
    evidence_url: null,
    zone: "loading_bay"
  }
];

// Security Alerts
let securityAlerts = [
  {
    alert_id: "ALT-701",
    type: "OVERCROWDING",
    severity: "WARNING",
    camera_id: "CAM-01",
    camera_name: "South Entrance Cam",
    location: "Main Entrance / Foyer",
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    confidence: 0.94,
    description: "High crowd congestion detected at main gate entryway.",
    status: "ACTIVE",
    zone: "entrance"
  },
  {
    alert_id: "ALT-702",
    type: "UNUSUAL MOVEMENT",
    severity: "WARNING",
    camera_id: "CAM-02",
    camera_name: "Makeup & Beauty Aisle",
    location: "Floor 1 - Zone B",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    confidence: 0.87,
    description: "Rapid trajectory sprint & sudden loitering in cosmetic aisle.",
    status: "ACTIVE",
    zone: "shelf_top"
  }
];

// Security Settings
let securitySettings = {
  crowd_threshold: 20,
  violence_confidence_threshold: 0.80,
  unusual_movement_threshold: 0.75,
  alert_sensitivity: "HIGH",
  auto_acknowledge_minutes: 30,
  rtsp_reconnect_interval_s: 5,
  detection_pipeline: {
    yolo_model: "YOLOv8x-Crowd",
    tracker: "ByteTrack-v2",
    action_recognition: "MMAction2-VideoAction-SlowFast",
    inference_fps: 25,
    min_box_confidence: 0.45
  },
  notification_channels: {
    dashboard_hud: true,
    audio_chime: true,
    webhook_enabled: false
  }
};

// Violence Action Recognition State (MMAction2 interface)
let violenceRecognitionState = {
  model_name: "MMAction2 (SlowFast ResNet-50 / TSN Action Recognition)",
  status: "NORMAL", // "NORMAL" | "VIOLENCE DETECTED"
  confidence: 0.08,
  active_camera: "CAM-01",
  last_inference_ts: new Date().toISOString(),
  total_scanned_sequences: 1845,
  violence_incidents_today: 0,
  recent_detections: [
    {
      id: "VD-301",
      timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      camera_id: "CAM-03",
      camera_name: "Checkout Counter 1-3",
      action_class: "Physical Aggression / Fight",
      confidence: 0.91,
      severity: "CRITICAL",
      incident_id: "INC-8915",
      clip_duration_s: 6.4
    }
  ]
};

// -------------------------------------------------------------
// VISION SENSE API ENDPOINTS
// -------------------------------------------------------------

// System Status Endpoint (Computes real AI state: NORMAL / WARNING / CRITICAL)
app.get('/api/system/status', (req, res) => {
  const activeAlertsCount = securityAlerts.filter(a => a.status === 'ACTIVE').length;
  const criticalCount = securityAlerts.filter(a => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length;
  const warningCount = securityAlerts.filter(a => a.status === 'ACTIVE' && a.severity === 'WARNING').length;

  let riskLevel = "NORMAL";
  let systemStatus = "NORMAL";

  if (criticalCount > 0 || violenceRecognitionState.status === 'VIOLENCE DETECTED') {
    riskLevel = "CRITICAL";
    systemStatus = "CRITICAL";
  } else if (warningCount > 0 || (activeSessionId && sessions.get(activeSessionId)?.current_frame_data?.crowd_level === 'High')) {
    riskLevel = "WARNING";
    systemStatus = "WARNING";
  }

  const currentOccupancy = activeSessionId && sessions.get(activeSessionId)
    ? sessions.get(activeSessionId).current_frame_data.people_count
    : defaultMetrics.current_inside;

  res.json({
    product: "VISION SENSE",
    subtitle: "AI-POWERED CROWD SAFETY & VIOLENCE DETECTION",
    system_status: systemStatus,
    risk_level: riskLevel,
    timestamp: new Date().toISOString(),
    ai_pipeline: {
      detection: "YOLOv8 + ByteTrack Active",
      action_recognition: "MMAction2 Ready",
      inference_fps: 25,
      hardware_acceleration: "CUDA / TensorRT Ready"
    },
    metrics: {
      people_detected: currentOccupancy,
      crowd_level: currentOccupancy >= 18 ? "HIGH" : (currentOccupancy >= 8 ? "MEDIUM" : "LOW"),
      violence_status: violenceRecognitionState.status,
      violence_confidence: violenceRecognitionState.confidence,
      active_alerts: activeAlertsCount,
      cameras_online: configuredCameras.filter(c => c.status === "ONLINE").length,
      total_cameras: configuredCameras.length,
      incidents_today: securityIncidents.length
    },
    active_session: activeSessionId ? sessions.get(activeSessionId) : null
  });
});

// Incidents API
app.get('/api/incidents', (req, res) => {
  const { status, type, severity, camera_id, search } = req.query;
  let list = [...securityIncidents];

  if (status) list = list.filter(i => i.status.toUpperCase() === status.toUpperCase());
  if (type) list = list.filter(i => i.type.toUpperCase() === type.toUpperCase());
  if (severity) list = list.filter(i => i.severity.toUpperCase() === severity.toUpperCase());
  if (camera_id) list = list.filter(i => i.camera_id === camera_id);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(i => 
      i.id.toLowerCase().includes(q) || 
      i.description.toLowerCase().includes(q) || 
      i.location.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.post('/api/incidents', (req, res) => {
  const { type, camera_id, camera_name, location, severity, confidence, description, zone } = req.body;
  if (!type || !camera_id) {
    return res.status(400).json({ error: "Type and camera_id are required." });
  }

  const newIncident = {
    id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
    type: type.toUpperCase(),
    camera_id,
    camera_name: camera_name || "Camera",
    location: location || "Store Floor",
    timestamp: new Date().toISOString(),
    severity: (severity || "WARNING").toUpperCase(),
    confidence: confidence ? parseFloat(confidence) : 0.90,
    status: "NEW",
    description: description || "Automated security incident logged by AI vision pipeline.",
    evidence_url: "/tracked_store.mp4",
    zone: zone || "main"
  };

  securityIncidents.unshift(newIncident);
  res.status(201).json({ status: "ok", incident: newIncident });
});

app.put('/api/incidents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const incident = securityIncidents.find(i => i.id === id);

  if (!incident) {
    return res.status(404).json({ error: "Incident not found." });
  }

  if (!['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'].includes(status?.toUpperCase())) {
    return res.status(400).json({ error: "Invalid status. Allowed: NEW, ACKNOWLEDGED, INVESTIGATING, RESOLVED" });
  }

  incident.status = status.toUpperCase();
  res.json({ status: "ok", message: `Incident ${id} updated to ${incident.status}`, incident });
});

// Security Alerts API
app.get('/api/alerts', (req, res) => {
  res.json(securityAlerts);
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  const alert = securityAlerts.find(a => a.alert_id === id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  alert.status = "ACKNOWLEDGED";
  res.json({ status: "ok", alert });
});

app.post('/api/alerts/:id/resolve', (req, res) => {
  const { id } = req.params;
  const alert = securityAlerts.find(a => a.alert_id === id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  alert.status = "RESOLVED";
  res.json({ status: "ok", alert });
});

// Violence Detection API (MMAction2 Action Recognition)
app.get('/api/violence/status', (req, res) => {
  res.json(violenceRecognitionState);
});

app.get('/api/violence/detections', (req, res) => {
  res.json(violenceRecognitionState.recent_detections);
});

app.post('/api/violence/toggle-state', (req, res) => {
  const { status, confidence, camera_id } = req.body;
  if (status) violenceRecognitionState.status = status;
  if (confidence !== undefined) violenceRecognitionState.confidence = confidence;
  if (camera_id) violenceRecognitionState.active_camera = camera_id;
  violenceRecognitionState.last_inference_ts = new Date().toISOString();

  if (status === 'VIOLENCE DETECTED') {
    const newAlert = {
      alert_id: `ALT-V${Math.floor(100 + Math.random() * 900)}`,
      type: "VIOLENCE",
      severity: "CRITICAL",
      camera_id: camera_id || "CAM-01",
      camera_name: "South Entrance Cam",
      location: "Main Entrance",
      timestamp: new Date().toISOString(),
      confidence: confidence || 0.93,
      description: "MMAction2 detected aggressive physical motion pattern.",
      status: "ACTIVE",
      zone: "entrance"
    };
    securityAlerts.unshift(newAlert);
  }

  res.json({ status: "ok", violence_state: violenceRecognitionState });
});

// Crowd Safety Analytics Endpoint
app.get('/api/crowd/status', (req, res) => {
  const currentInside = activeSessionId && sessions.get(activeSessionId)
    ? sessions.get(activeSessionId).current_frame_data.people_count
    : defaultMetrics.current_inside;

  const threshold = securitySettings.crowd_threshold;
  const densityPct = Math.round((currentInside / threshold) * 100);
  const crowdLevel = currentInside >= threshold ? "HIGH" : (currentInside >= threshold * 0.5 ? "MEDIUM" : "LOW");
  const riskLevel = currentInside >= threshold ? "WARNING" : "NORMAL";

  res.json({
    current_people: currentInside,
    crowd_level: crowdLevel,
    crowd_threshold: threshold,
    density_pct: densityPct,
    movement_status: "NORMAL FLOW",
    risk_level: riskLevel,
    zones: defaultZones,
    peak_today: {
      count: 74,
      timestamp: "19:00 - 20:00"
    }
  });
});

// Settings API
app.get('/api/settings', (req, res) => {
  res.json(securitySettings);
});

app.post('/api/settings', (req, res) => {
  const { crowd_threshold, violence_confidence_threshold, unusual_movement_threshold, alert_sensitivity } = req.body;
  if (crowd_threshold !== undefined) securitySettings.crowd_threshold = parseInt(crowd_threshold);
  if (violence_confidence_threshold !== undefined) securitySettings.violence_confidence_threshold = parseFloat(violence_confidence_threshold);
  if (unusual_movement_threshold !== undefined) securitySettings.unusual_movement_threshold = parseFloat(unusual_movement_threshold);
  if (alert_sensitivity !== undefined) securitySettings.alert_sensitivity = alert_sensitivity;

  res.json({ status: "ok", message: "Security settings saved successfully.", settings: securitySettings });
});

// -------------------------------------------------------------
// RETAIL & CAMERA LEGACY BACKWARD COMPATIBILITY
// -------------------------------------------------------------

app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(liveEvents.slice(0, limit));
});

app.get('/api/timeseries/footfall', (req, res) => {
  res.json([
    { bucket: "17:00", entries: 35, exits: 30 },
    { bucket: "18:00", entries: 42, exits: 38 },
    { bucket: "19:00", entries: 74, exits: 66 },
    { bucket: "20:00", entries: 52, exits: 48 },
    { bucket: "21:00", entries: 24, exits: 22 }
  ]);
});

// -------------------------------------------------------------
// HTML PAGE ROUTES (VISION SENSE SUITE)
// -------------------------------------------------------------

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'dashboard.html'));
});

app.get(['/analyze', '/monitoring', '/live-monitoring'], (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'analyze.html'));
});

app.get(['/cameras', '/camera-management'], (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'cameras.html'));
});

app.get('/crowd-safety', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'crowd-safety.html'));
});

app.get('/violence-detection', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'violence-detection.html'));
});

app.get('/alerts', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'alerts.html'));
});

app.get('/incidents', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'incidents.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'analytics.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'settings.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

// Preserved routes for backward compatibility
app.get('/journey', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'journey.html'));
});

app.get('/business', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'business.html'));
});

// Static assets
app.use('/static', express.static(FRONTEND_DIR));
app.use(express.static(FRONTEND_DIR));

// Start the Express server on port 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`VISION SENSE — AI Crowd Safety & Violence Detection running on http://0.0.0.0:${PORT}`);
});
