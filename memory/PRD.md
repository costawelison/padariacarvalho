# Panificadora Carvalho — PRD

## Problem Statement (original)
User (Portuguese-speaking bakery owner) wants a simple online ordering system that even non-tech-savvy customers can use. Catalog covers cakes, breads, savory snacks, party items, drinks. Orders should be forwarded to the bakery's WhatsApp. On top of the storefront, the owner needs an admin panel to change prices, mark items as unavailable, edit/create/remove products, and view orders received.

## Personas
- Customer: Chooses items, adds to cart, checks out (retirada or entrega), completes order via WhatsApp handoff.
- Bakery owner (admin): Logs in at `/admin` to manage catalog and view orders.

## Core Requirements
- Public catalog fetched from API, categorized (Bolos, Salgados, Pães, Doces, Lanches)
- Cart, checkout (delivery/pickup), address required for delivery
- WhatsApp handoff with formatted order message (wa.me link)
- Orders persisted in Mongo
- Admin login (JWT + Bearer token)
- Admin CRUD products + availability toggle (Esgotado badge on storefront)
- Admin orders list

## Implemented (2026-02)
- FastAPI + React + MongoDB scaffolding (session 1)
- 24 seeded products, real user-uploaded product images, custom logo
- Cart, checkout with WhatsApp handoff, delivery address validation
- **Admin panel** at `/admin` (JWT login, product CRUD, availability toggle, orders view)
- 24 catalog items now stored in MongoDB, seeded on startup only if empty
- Storefront shows "Esgotado" badge + disables Add button for unavailable products

## Auth
- Admin: panficadoracarvalho2017@gmail.com / Padaria2017@ (seeded from env)
- Bearer token in localStorage `padaria_admin_token`

## Key Endpoints
- Public: GET /api/products · POST /api/orders
- Auth: POST /api/auth/login · GET /api/auth/me
- Admin (Bearer): POST/PATCH/DELETE /api/products · GET /api/orders

## Backlog (P1)
- Order status tracking (pending / preparing / ready / delivered) — admin flags orders as completed
- Print-friendly order view for the kitchen
- Business hours block (reject orders outside opening hours)
- Reorder / drag-to-sort products in admin panel
- Product image upload (Emergent Object Storage) instead of URL paste
- Multi-user admin with password reset

## Backlog (P2)
- Refactor App.js into smaller components
- Coupon / promotion system
- Customer accounts + order history

## Test reports
- /app/test_reports/iteration_1.json … iteration_7.json
