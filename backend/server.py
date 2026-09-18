from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import requests
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# ---------- Config ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ['ADMIN_EMAIL'].lower()
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
BR_TZ = ZoneInfo("America/Belem")  # GMT-3, no DST

# Object storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "padaria-carvalho"
_storage_key = None

app = FastAPI()
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# ---------- Storage helpers ----------
def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Auth helpers ----------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(email: str) -> str:
    payload = {"sub": email, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def require_admin(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    email = payload.get("sub")
    user = await db.users.find_one({"email": email, "role": "admin"})
    if not user:
        raise HTTPException(status_code=401, detail="Administrador não encontrado")
    return {"email": email}


# ---------- Business hours helpers ----------
DEFAULT_HOURS = {
    str(i): {"enabled": True, "open": "06:00", "close": "20:00"} for i in range(7)
}
# Sunday closed by default
DEFAULT_HOURS["6"] = {"enabled": False, "open": "06:00", "close": "12:00"}


async def get_hours() -> dict:
    doc = await db.settings.find_one({"key": "hours"})
    if not doc:
        return DEFAULT_HOURS
    return doc.get("value", DEFAULT_HOURS)


def check_open(hours: dict) -> dict:
    now = datetime.now(BR_TZ)
    # Python weekday: Monday=0..Sunday=6
    day = str(now.weekday())
    schedule = hours.get(day, {})
    if not schedule.get("enabled"):
        return {"is_open": False, "day": day, "schedule": schedule}
    try:
        oh, om = map(int, schedule["open"].split(":"))
        ch, cm = map(int, schedule["close"].split(":"))
    except Exception:
        return {"is_open": False, "day": day, "schedule": schedule}
    minutes_now = now.hour * 60 + now.minute
    open_min = oh * 60 + om
    close_min = ch * 60 + cm
    is_open = open_min <= minutes_now < close_min
    return {"is_open": is_open, "day": day, "schedule": schedule, "server_time": now.strftime("%H:%M")}


# ---------- Models ----------
class LoginRequest(BaseModel):
    email: str
    password: str


class OrderItem(BaseModel):
    name: str
    variant: Optional[str] = None
    quantity: int
    unit_price: float


class OrderCreate(BaseModel):
    customer_name: str
    phone: str
    fulfillment: str
    address: Optional[str] = None
    payment: str
    items: List[OrderItem]
    total: float
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str  # pendente | preparando | pronto | entregue | cancelado


class ProductCreate(BaseModel):
    category: str
    name: str
    price: float
    description: str = ""
    image_url: str = ""
    available: bool = True


class ProductUpdate(BaseModel):
    category: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    available: Optional[bool] = None


class ReorderRequest(BaseModel):
    ids: List[str]  # in the desired display order


class HoursUpdate(BaseModel):
    hours: Dict[str, Dict[str, Any]]


VALID_STATUSES = {"pendente", "preparando", "pronto", "entregue", "cancelado"}


# ---------- Seed ----------
SEED_PRODUCTS = [
    ("Bolos", "Bolo caseiro", 9, "Laranja · Formigueiro · Queijo · Mesclado · Chocolate", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/ghqodvxd_bolos%20caseiros.png"),
    ("Bolos", "Bolo especial", 10, "Milho · Leite · Coco · Amendoim · Abacaxi", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/pz468eiu_bolos%20especiais.png"),
    ("Bolos", "Bolo de fatia", 6, "Chocolate · Cupuaçu · Milho", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/nscsk1nd_torta%20em%20fatia.png"),
    ("Bolos", "Bolo de aniversário", 60, "Por quilo · massa branca ou chocolate", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/xc9ja1jx_bolos%20de%20aniversario.png"),
    ("Bolos", "Bolo no pote", 10, "Maracujá · Cupuaçu · Morango", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/ruvj78yj_bolos%20de%20pote.png"),
    ("Salgados", "Salgado frito", 5, "Carne · Frango · Queijo e presunto · Queijo", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/1vm3sjs7_salgado%20frito.png"),
    ("Salgados", "Salgado assado", 5, "Queijo e presunto · Frango · Carne", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/835v4ghe_salgado%20assado.png"),
    ("Salgados", "Salgado massa de batata", 5, "Queijo e presunto · Salsicha · Queijo", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/6lt01mds_salgado%20massa%20de%20batata.png"),
    ("Salgados", "Salgado de festa", 50, "Centro · Frango · Carne · Queijo e presunto", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/rrp2f99m_salgado%20para%20festas.png"),
    ("Salgados", "Empadinha / mini pizza", 1.5, "Assados", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/x277necx_empadinha%20e%20mini%20pizza.png"),
    ("Pães", "Pão francês e variedades", 0.75, "Francês · Caseirinho · Tatu · Massa fina · Hambúrguer", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/9qr3f7w9_p%C3%A3o%20frances%20e%20variedades.png"),
    ("Pães", "Pão doce", 0.75, "Goiabada · Creme · Chocolate · Coco · Rosquinha", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/yr5f3kho_p%C3%A3o%20doce.png"),
    ("Pães", "Pão Vitória / baguete / caseirão", 2, "Escolha sua variedade", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/hgt70wg2_baguete.png"),
    ("Pães", "Pão de forma", 10, "Tradicional", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/6715vw4g_p%C3%A3o%20de%20forma.png"),
    ("Pães", "Pão integral", 5, "Tradicional", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/zwc4zvzk_p%C3%A3o%20integral.png"),
    ("Doces", "Canudo", 60, "Frango · Doce de leite · Chocolate", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/aznbdhx6_canudos.png"),
    ("Doces", "Doces para festa", 70, "Cento · Beijinho · Brigadeiro", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/6y1einkr_doces%20para%20festas.png"),
    ("Doces", "Cupcake", 1, "Unidade (opção especial R$ 3,00)", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/zsxx3yh0_cupcake.png"),
    ("Doces", "Pudim", 8, "Pequeno", "https://images.unsplash.com/photo-1711141326113-e6b607fd78ef?auto=format&fit=crop&w=700&q=85"),
    ("Lanches", "Lanche natural", 5, "Queijo · Presunto · Requeijão · Alface", "https://images.pexels.com/photos/36863863/pexels-photo-36863863.jpeg?auto=compress&cs=tinysrgb&w=700"),
    ("Lanches", "Pão de queijo assado", 1, "Também disponível por R$ 0,50", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/fhzfnov8_p%C3%A3o%20de%20queijo%20assado.png"),
    ("Lanches", "Pão de queijo frito / Chipa", 1, "Unidade", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/8j919zs9_p%C3%A3o%20de%20queijo%20frito%20e%20chipa.png"),
    ("Lanches", "Rosquinha doce", 2, "Chocolate branco · Chocolate", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/6rpsogij_rosquinhas.png"),
    ("Lanches", "Torta em fatia", 8, "Fatia", "https://customer-assets-v7afamib.emergentagent.net/job_padaria-pedidos/artifacts/nscsk1nd_torta%20em%20fatia.png"),
]


async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_pw(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_pw(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_pw(ADMIN_PASSWORD)}})


async def seed_products():
    count = await db.products.count_documents({})
    if count == 0:
        docs = []
        for idx, (cat, name, price, desc, img) in enumerate(SEED_PRODUCTS):
            docs.append({
                "id": str(uuid.uuid4()),
                "category": cat, "name": name, "price": float(price),
                "description": desc, "image_url": img, "available": True,
                "order_index": idx,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        await db.products.insert_many(docs)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("order_index")
    await db.settings.create_index("key", unique=True)
    await seed_admin()
    await seed_products()
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


# ---------- Public routes ----------
@api.get("/")
async def root():
    return {"message": "Panificadora Carvalho API"}


@api.get("/products")
async def list_products():
    docs = await db.products.find({}, {"_id": 0}).sort("order_index", 1).to_list(500)
    return docs


@api.get("/store/status")
async def store_status():
    hours = await get_hours()
    return {**check_open(hours), "hours": hours}


@api.post("/orders")
async def create_order(order: OrderCreate):
    # Block if store is closed
    hours = await get_hours()
    status = check_open(hours)
    if not status["is_open"]:
        raise HTTPException(status_code=409, detail="A padaria está fechada no momento. Tente novamente durante o horário de funcionamento.")
    order_dict = order.model_dump()
    order_dict["order_id"] = str(uuid.uuid4())
    order_dict["status"] = "pendente"
    order_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.orders.insert_one(order_dict)
    order_dict.pop("_id", None)
    return order_dict


# ---------- Auth ----------
@api.post("/auth/login")
async def login(body: LoginRequest):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = create_token(email)
    return {"token": token, "email": email}


@api.get("/auth/me")
async def me(user=Depends(require_admin)):
    return user


# ---------- Admin: products ----------
@api.post("/products")
async def create_product(p: ProductCreate, user=Depends(require_admin)):
    last = await db.products.find_one({}, sort=[("order_index", -1)])
    next_idx = (last.get("order_index", -1) + 1) if last else 0
    doc = {
        "id": str(uuid.uuid4()),
        "category": p.category, "name": p.name, "price": float(p.price),
        "description": p.description, "image_url": p.image_url, "available": p.available,
        "order_index": next_idx,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/products/reorder")
async def reorder_products(body: ReorderRequest, user=Depends(require_admin)):
    for idx, pid in enumerate(body.ids):
        await db.products.update_one({"id": pid}, {"$set": {"order_index": idx}})
    docs = await db.products.find({}, {"_id": 0}).sort("order_index", 1).to_list(500)
    return docs


@api.patch("/products/{product_id}")
async def update_product(product_id: str, p: ProductUpdate, user=Depends(require_admin)):
    updates = {k: v for k, v in p.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    result = await db.products.update_one({"id": product_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, user=Depends(require_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"ok": True}


# ---------- Admin: image upload ----------
@api.post("/uploads/image")
async def upload_image(file: UploadFile = File(...), user=Depends(require_admin)):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    ct = (file.content_type or "").lower()
    if ct not in allowed:
        raise HTTPException(status_code=400, detail="Envie uma imagem JPG, PNG, WEBP ou GIF.")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo maior que 10 MB.")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ct.split("/")[-1]
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/products/{file_id}.{ext}"
    try:
        result = put_object(path, data, ct)
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="Falha ao enviar imagem. Tente novamente.")
    stored_path = result.get("path", path)
    await db.uploads.insert_one({
        "id": file_id,
        "storage_path": stored_path,
        "content_type": ct,
        "size": result.get("size"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # Return a URL our backend can serve
    from fastapi import Request  # noqa
    public_url = f"/api/files/{stored_path}"
    return {"path": stored_path, "url": public_url}


# ---------- Public: file proxy (for uploaded product images) ----------
from fastapi import Response


@api.get("/files/{path:path}")
async def files(path: str):
    record = await db.uploads.find_one({"storage_path": path})
    if not record:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    try:
        data, ct = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return Response(content=data, media_type=record.get("content_type") or ct, headers={"Cache-Control": "public, max-age=86400"})


# ---------- Admin: orders ----------
@api.get("/orders")
async def list_orders(user=Depends(require_admin)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Ensure status default for old orders
    for d in docs:
        d.setdefault("status", "pendente")
    return docs


@api.patch("/orders/{order_id}")
async def update_order_status(order_id: str, body: OrderStatusUpdate, user=Depends(require_admin)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {', '.join(sorted(VALID_STATUSES))}")
    result = await db.orders.update_one({"order_id": order_id}, {"$set": {"status": body.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    doc = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    return doc


# ---------- Admin: business hours ----------
@api.get("/settings/hours")
async def get_settings_hours(user=Depends(require_admin)):
    return {"hours": await get_hours()}


@api.put("/settings/hours")
async def put_settings_hours(body: HoursUpdate, user=Depends(require_admin)):
    # Validate keys 0..6
    for k in body.hours.keys():
        if k not in {"0", "1", "2", "3", "4", "5", "6"}:
            raise HTTPException(status_code=400, detail=f"Dia inválido: {k}")
    await db.settings.update_one({"key": "hours"}, {"$set": {"value": body.hours}}, upsert=True)
    return {"hours": body.hours}


# ---------- Wire up ----------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
