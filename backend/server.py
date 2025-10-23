from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from pathlib import Path
from datetime import datetime, timedelta, timezone
import os
import uuid
import logging
import qrcode
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# App + Router (must prefix /api)
app = FastAPI()
api = APIRouter(prefix="/api")

# Security
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.environ.get("JWT_EXPIRE_DAYS", "7"))

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RegisterIn(BaseModel):
    name: str
    rollNo: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    rollNo: str
    email: EmailStr

class OutpassCreateIn(BaseModel):
    purpose: str
    dateOut: str
    returnTime: str
    destination: str

class OutpassItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    userId: str
    purpose: str
    dateOut: str
    returnTime: str
    destination: str
    status: str
    createdAt: str
    qrCodeToken: Optional[str] = None
    qrCodeDataUrl: Optional[str] = None

# Utilities
async def hash_password(p: str) -> str:
    return pwd_ctx.hash(p)

def verify_password(p: str, hp: str) -> bool:
    return pwd_ctx.verify(p, hp)

def create_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)

async def get_user_from_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid: str = payload.get("sub")
        if uid is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": uid}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def current_user(authorization: Optional[str] = None):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return await get_user_from_token(token)

# QR generation
def make_qr_data_url(text: str) -> str:
    img = qrcode.make(text)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    return f"data:image/png;base64,{b64}"

# WebSocket manager (per-user)
class WSManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        conns = self.active.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns and user_id in self.active:
            self.active.pop(user_id, None)

    async def notify_user(self, user_id: str, message: Dict[str, Any]):
        conns = self.active.get(user_id, [])
        for ws in list(conns):
            try:
                await ws.send_json(message)
            except Exception:
                try:
                    await ws.close()
                except Exception:
                    pass
                self.disconnect(user_id, ws)

ws_manager = WSManager()

# Routes
@api.get("/")
async def root():
    return {"message": "Online Out Pass API (FastAPI)"}

@api.post("/auth/register", response_model=TokenResponse)
async def register(data: RegisterIn):
    existing = await db.users.find_one({"$or": [{"email": data.email}, {"rollNo": data.rollNo}]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email or Roll No already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "name": data.name.strip(),
        "rollNo": data.rollNo.strip(),
        "email": data.email.lower(),
        "password": await hash_password(data.password),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_token({"sub": uid})
    return TokenResponse(access_token=token)

@api.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user["id"]})
    return TokenResponse(access_token=token)

@api.post("/outpass/create", response_model=OutpassItem)
async def create_outpass(data: OutpassCreateIn, user=Depends(current_user)):
    oid = str(uuid.uuid4())
    doc = {
        "id": oid,
        "userId": user["id"],
        "purpose": data.purpose.strip(),
        "dateOut": data.dateOut.strip(),
        "returnTime": data.returnTime.strip(),
        "destination": data.destination.strip(),
        "status": "PENDING",
        "qrCodeToken": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.outpasses.insert_one(doc)
    await ws_manager.notify_user(user["id"], {"type": "refresh"})
    return OutpassItem(**doc)

@api.get("/outpass/myrequests", response_model=List[OutpassItem])
async def my_requests(user=Depends(current_user)):
    items = await db.outpasses.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    # Attach QR data url if approved
    for it in items:
        if it.get("status") == "APPROVED" and it.get("qrCodeToken"):
            it["qrCodeDataUrl"] = make_qr_data_url(f"hitam:outpass:{it['qrCodeToken']}")
    return [OutpassItem(**it) for it in items]

@api.put("/outpass/approve/{req_id}")
async def approve(req_id: str):
    req = await db.outpasses.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    token = req.get("qrCodeToken") or uuid.uuid4().hex
    await db.outpasses.update_one({"id": req_id}, {"$set": {"status": "APPROVED", "qrCodeToken": token}})
    await ws_manager.notify_user(req["userId"], {"type": "refresh"})
    return {"ok": True}

@api.put("/outpass/reject/{req_id}")
async def reject(req_id: str):
    req = await db.outpasses.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.outpasses.update_one({"id": req_id}, {"$set": {"status": "REJECTED"}})
    await ws_manager.notify_user(req["userId"], {"type": "refresh"})
    return {"ok": True}

# WebSocket for live updates
@app.websocket("/api/ws")
async def ws_endpoint(websocket: WebSocket):
    # Expect query param token
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user = await get_user_from_token(token)
    except HTTPException:
        await websocket.close(code=4401)
        return

    uid = user["id"]
    await ws_manager.connect(uid, websocket)
    try:
        while True:
            # Keepalive; we also accept small client pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(uid, websocket)

# Include router
app.include_router(api)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
