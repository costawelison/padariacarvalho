from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field


# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ['ADMIN_EMAIL'].lower()
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']

app = FastAPI()
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# ---------- Helpers ----------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
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
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_pw(ADMIN_PASSWORD)}},
        )


async def seed_products():
    count = await db.products.count_documents({})
    if count == 0:
        docs = []
        for idx, (cat, name, price, desc, img) in enumerate(SEED_PRODUCTS):
            docs.append({
                "id": str(uuid.uuid4()),
                "category": cat,
                "name": name,
                "price": float(price),
                "description": desc,
                "image_url": img,
                "available": True,
                "order_index": idx,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        await db.products.insert_many(docs)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("order_index")
    await seed_admin()
    await seed_products()


# ---------- Public routes ----------
@api.get("/")
async def root():
    return {"message": "Panificadora Carvalho API"}


@api.get("/products")
async def list_products():
    docs = await db.products.find({}, {"_id": 0}).sort("order_index", 1).to_list(500)
    return docs


@api.post("/orders")
async def create_order(order: OrderCreate):
    order_dict = order.model_dump()
    order_dict["order_id"] = str(uuid.uuid4())
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


# ---------- Admin routes ----------
@api.post("/products")
async def create_product(p: ProductCreate, user=Depends(require_admin)):
    last = await db.products.find_one({}, sort=[("order_index", -1)])
    next_idx = (last.get("order_index", -1) + 1) if last else 0
    doc = {
        "id": str(uuid.uuid4()),
        "category": p.category,
        "name": p.name,
        "price": float(p.price),
        "description": p.description,
        "image_url": p.image_url,
        "available": p.available,
        "order_index": next_idx,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


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


@api.get("/orders")
async def list_orders(user=Depends(require_admin)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


# ---------- Wire up ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
