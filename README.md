# Pharmacy Assistant Chatbot

A privacy-conscious pharmacy information MVP for hours, location, verified mock stock, contact details and pharmacist callbacks. It is deliberately not a diagnosis or prescribing service.

## Stack
React + Vite frontend, Flask Python API, JSON mock data, and the official `google-genai` Gemini SDK. The Python server keeps the API key in `.env`; its verified function tools provide opening hours, location, contacts, stock and generic alternatives so inventory is never invented.

## Run locally

```bash
npm install
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm run dev
```

Set `GEMINI_API_KEY` in `.env` to enable Gemini's server-side automatic function calling; without it, the same safe local pharmacy handlers continue to work. Open `http://localhost:5173`. The Python API runs on port `5000`. Create a production bundle with `npm run build`.

## API

- `POST /api/chat` with `{ "message": "Do you have paracetamol 500mg tablets?" }`
- `POST /api/callback` with `name`, `phone`, `reason`, and `consent: true`
- `GET /api/pharmacy`, `GET /api/inventory`
- `GET /api/analytics` for the mock admin metrics (message count, requested medicines, out-of-stock items, emergencies and callbacks)

Try: “Are you open now?”, “Where are you located?”, “Do I need a prescription for amoxicillin?”, “I think I took too much medicine.”

## Safety and privacy

Emergency phrases immediately direct the user to emergency services. The assistant avoids diagnosis, dosing, prescribing, and unsafe acquisition advice. Callback information is accepted only with consent and is not persisted in this demo. Do not log full health messages in production.

## Production path

Replace `server/data.js` with an audited inventory database, add authentication and encrypted callback storage, connect Gemini tool calls to the same verified functions, localize copy, add an admin analytics dashboard, and conduct clinical, accessibility and privacy reviews before launch. This design addresses access barriers, stock shortages, antimicrobial misuse, misinformation, digital accessibility and privacy by limiting responses to approved pharmacy facts.
