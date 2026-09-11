# CarePoint Pharmacy

A privacy-conscious pharmacy storefront and information assistant for verified medicines, hospital supplies, prescriptions, orders, and pharmacist support. It is deliberately not a diagnosis or prescribing service.

## Stack
React + Vite frontend, Flask Python API, in-memory demo data, and the official `google-genai` Gemini SDK. The Python server keeps the API key in `.env`; verified local tools provide pharmacy facts and inventory so stock is never invented.

## Features

- Customer registration and sign-in.
- Searchable online catalog with medicines, hospital supplies, wound care, diagnostics, and clinical supplies.
- Product category filters, prices, stock labels, cart, and order creation.
- Prescription image/PDF upload for signed-in customers, limited to 10 MB.
- Order status workflow: `Pending` -> `Processing` -> `Completed`.
- Floating Pip pharmacy assistant with blinking eyes and pharmacist callback support.
- Separate staff portal for prescription review and operational analytics.

## Run locally

```bash
npm install
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm run dev
```

Set `GEMINI_API_KEY` in `.env` to enable Gemini's server-side automatic function calling; without it, the safe local pharmacy handlers continue to work. Open `http://localhost:5173`. The Flask API runs on port `5000`. Create a production bundle with `npm run build`.

On Windows, start the API with the workspace interpreter if Flask is not available from the system Python:

```powershell
.\.venv\Scripts\python.exe api.py
```

## Demo accounts

Customer accounts are created from the **Sign in** dialog. Demo accounts and uploaded prescriptions are stored in memory and reset when the API restarts.

The staff portal is available from the **Staff** button:

- Email: `admin@carepoint.test`
- Password: `admin123`

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables before deployment. Never use the demo credentials in production.

## API

- `POST /api/chat` with `{ "message": "Do you have paracetamol 500mg tablets?" }`
- `POST /api/callback` with `name`, `phone`, `reason`, and `consent: true`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/admin-login`
- `GET /api/catalog?search=gloves` for the searchable product catalog
- `POST /api/prescriptions` as multipart form data with a `file` field
- `POST /api/orders` and `GET /api/orders` for signed-in customers
- `POST /api/orders/<order_id>/advance` to move a demo order to its next status
- `GET /api/admin/prescriptions` and `POST /api/admin/prescriptions/<id>/review` for staff
- `GET /api/admin/analytics` for protected staff metrics
- `GET /api/pharmacy`, `GET /api/inventory`, `GET /api/analytics`

Try: “Are you open now?”, “Where are you located?”, “Do I need a prescription for amoxicillin?”, “I think I took too much medicine.” Search the catalog for `gloves`, `thermometer`, or `wound care`.

## Safety and privacy

Emergency phrases immediately direct the user to emergency services. The assistant avoids diagnosis, dosing, prescribing, and unsafe acquisition advice. Callback information is accepted only with consent. Demo accounts, order records, prescription metadata, and tokens are held in memory; uploaded file content is not persisted by this MVP. Do not log full health messages or store prescription files without appropriate security controls in production.

## Production path

Replace the in-memory stores with a secure database, use a managed identity provider or hardened session service, store prescription files in encrypted object storage with access controls, connect orders to a real fulfillment system, and replace demo status advancement with staff-controlled transitions. Add audit logs, rate limiting, malware scanning for uploads, secret management, localization, and clinical, accessibility, security, and privacy reviews before launch. This design addresses access barriers, stock shortages, antimicrobial misuse, misinformation, digital accessibility, and privacy by limiting responses to approved pharmacy facts.
