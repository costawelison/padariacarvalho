# Panificadora Carvalho — PRD

## Problem Statement (original)
Portuguese-speaking bakery owner needs a simple online ordering system, easy for non-tech customers. Orders forwarded via WhatsApp. Owner needs an admin panel to change prices, mark items as unavailable, edit/create/remove products, view orders, track order status, set business hours, reorder items, and upload photos.

## Personas
- Customer: chooses items, cart, checkout (retirada or entrega), WhatsApp handoff.
- Bakery owner (admin): `/admin` login to manage catalog, orders, and hours.

## Core Requirements
- Public catalog fetched from API, categorized
- Cart, checkout (delivery/pickup), address required for delivery
- WhatsApp handoff (wa.me link)
- Orders persisted in Mongo with status tracking
- Admin login (JWT + Bearer)
- Admin CRUD products + availability toggle + reordering + photo upload
- Order status management (pendente/preparando/pronto/entregue/cancelado)
- Business hours per weekday (blocks checkout when closed)

## Implemented (2026-02)
- FastAPI + React + MongoDB scaffolding
- 24 seeded products, custom images/logo, WhatsApp checkout, cart, address validation
- Admin panel at `/admin` (JWT), product CRUD, availability toggle, orders list
- **Order status tracking** — per-order dropdown + status filter tabs
- **Business hours** — 7-day schedule, "closed" banner + checkout block
- **Drag-and-drop product reorder** (only in "Todos" filter)
- **Image upload from device** via Emergent Object Storage (`/api/uploads/image` → served via `/api/files/{path}`)

## Auth
- Admin: panficadoracarvalho2017@gmail.com / Padaria2017@ (seeded from env)
- Bearer token in localStorage `padaria_admin_token`

## Key Endpoints
- Public: GET /api/products · GET /api/store/status · POST /api/orders · GET /api/files/{path}
- Auth: POST /api/auth/login · GET /api/auth/me
- Admin (Bearer): POST/PATCH/DELETE /api/products · POST /api/products/reorder · GET /api/orders · PATCH /api/orders/{id} · GET+PUT /api/settings/hours · POST /api/uploads/image

## Backlog (P1)
- Push/SMS notification to owner when new order arrives
- Daily/weekly sales report in admin
- Multi-user admin with password reset
- Product tags/labels (novidade, promoção)
- Coupon / promotion system

## Backlog (P2)
- Refactor App.js into smaller components
- Customer accounts + order history
- Print-friendly order view for kitchen

## Test reports
- /app/test_reports/iteration_1.json … iteration_8.json (all passing)
