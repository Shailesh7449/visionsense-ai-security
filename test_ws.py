import asyncio
import websockets
import json
import os

async def test_websocket():
    uri = "ws://localhost:8000/ws/telemetry/demo"
    print(f"Connecting to {uri}")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Waiting for telemetry frames...")
            for i in range(3):
                response = await websocket.recv()
                data = json.loads(response)
                print(f"Frame {i+1}:")
                if "error" in data:
                    print(f"Error received: {data['error']}")
                    break
                print(f"  Frame: {data.get('frame_number')}")
                print(f"  People Count: {data.get('people_count')}")
                print(f"  Detections: {data.get('detections')}")
                if data.get('people_count', 0) > 0:
                    print("SUCCESS: Real detection telemetry works!")
    except Exception as e:
        print(f"Websocket failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
