"""Flask API for the Pharmacy Assistant Chatbot.

Gemini only receives the user message. Pharmacy facts and stock results come from
the local verified tools below, never from the model's general knowledge.
"""

import os
import re
from collections import deque
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from features import CITATIONS, REMINDERS, SESSIONS, TRANSLATIONS, add_message, create_guest_session, create_reminder, fhir_demo_summary, interaction_check, triage

load_dotenv()
print('Gemini enabled:', bool(os.getenv('GEMINI_API_KEY')), 'model:', os.getenv('GEMINI_MODEL'))
app = Flask(__name__)

PHARMACY = {
    "name": "CarePoint Pharmacy",
    "address": "14 Kenyatta Avenue, Nairobi, Kenya",
    "phone": "+254 700 123 456",
    "email": "hello@carepoint.example",
    "whatsapp": "+254 700 123 456",
    "map_link": "https://maps.google.com/?q=Kenyatta+Avenue+Nairobi",
    "hours": {"weekday": "08:00–20:00", "saturday": "09:00–18:00", "sunday": "10:00–16:00", "holidays": "10:00–14:00"},
    "accessibility": "Step-free entrance, accessible counter and customer parking.",
    "delivery_available": True,
}
INVENTORY = [
    {"name": "Paracetamol", "generic_name": "Paracetamol", "strength": "500mg", "dosage_form": "tablets", "quantity_available": 240, "prescription_required": False, "category": "Pain relief", "alternatives": ["Ibuprofen 200mg tablets"]},
    {"name": "Ibuprofen", "generic_name": "Ibuprofen", "strength": "200mg", "dosage_form": "tablets", "quantity_available": 80, "prescription_required": False, "category": "Pain relief", "alternatives": ["Paracetamol 500mg tablets"]},
    {"name": "Amoxicillin", "generic_name": "Amoxicillin", "strength": "500mg", "dosage_form": "capsules", "quantity_available": 30, "prescription_required": True, "category": "Antibiotic", "alternatives": []},
    {"name": "Cetirizine", "generic_name": "Cetirizine", "strength": "10mg", "dosage_form": "tablets", "quantity_available": 65, "prescription_required": False, "category": "Allergy", "alternatives": []},
    {"name": "Vitamin C", "generic_name": "Ascorbic acid", "strength": "1000mg", "dosage_form": "tablets", "quantity_available": 0, "prescription_required": False, "category": "Supplement", "alternatives": ["Vitamin C 500mg tablets"]},
    {"name": "ORS", "generic_name": "Oral rehydration salts", "strength": "standard", "dosage_form": "sachets", "quantity_available": 42, "prescription_required": False, "category": "Hydration", "alternatives": []},
    {"name": "Amlodipine", "generic_name": "Amlodipine", "strength": "5mg", "dosage_form": "tablets", "quantity_available": 25, "prescription_required": True, "category": "Blood pressure", "alternatives": []},
    {"name": "Insulin glargine", "generic_name": "Insulin glargine", "strength": "100 units/mL", "dosage_form": "pen", "quantity_available": 8, "prescription_required": True, "category": "Diabetes", "alternatives": []},
]
EMERGENCY_PATTERN = re.compile(r"overdose|took too much|severe allergic|anaphyla|chest pain|difficulty breathing|can't breathe|cannot breathe|poison|self.?harm|suicid|kill myself", re.I)
SYSTEM_INSTRUCTION = """You are CarePoint Pharmacy's information assistant, not a doctor.
Use the available tools for all pharmacy facts and stock. Never guess inventory.
Do not diagnose, prescribe, change doses, or give personalized treatment advice.
For emergencies, tell the user to call local emergency services immediately.
Keep responses concise, calm, and privacy-aware."""
ANALYTICS = {"messages": 0, "emergency_escalations": 0, "callback_requests": 0, "requested_medicines": {}}
EVENTS = deque(maxlen=100)
LAST_GEMINI_ERROR = None


def log_event(event_type: str, **details) -> None:
    """Store operational metadata only; never save message text, phone numbers, or clinical details."""
    EVENTS.appendleft({"type": event_type, "timestamp": datetime.now(timezone.utc).isoformat(), **details})


def get_opening_hours() -> dict:
    """Return regular pharmacy hours and current regular-hours open status."""
    now = datetime.now(ZoneInfo(os.getenv("PHARMACY_TIMEZONE", "Africa/Nairobi")))
    ranges = {5: (9, 18), 6: (10, 16)}
    start, end = ranges.get(now.weekday(), (8, 20))
    return {**PHARMACY["hours"], "open_now": start <= now.hour < end, "timezone": str(now.tzinfo)}


def get_location() -> dict:
    """Return the verified pharmacy address, map link, and accessibility details."""
    return {key: PHARMACY[key] for key in ("address", "map_link", "accessibility")}


def get_contact_details() -> dict:
    """Return verified phone, email, WhatsApp, and delivery contact information."""
    return {key: PHARMACY[key] for key in ("phone", "email", "whatsapp", "delivery_available")}


def check_medicine_availability(medicine_name: str, strength: str = "", dosage_form: str = "", quantity: int = 1) -> dict:
    """Check verified stock for a medicine name, optional strength, form and quantity."""
    name = medicine_name.lower().strip()
    matches = [item for item in INVENTORY if name in item["name"].lower() or name in item["generic_name"].lower()]
    if strength:
        matches = [item for item in matches if strength.lower() in item["strength"].lower()]
    if dosage_form:
        matches = [item for item in matches if dosage_form.lower() in item["dosage_form"].lower()]
    if not matches:
        return {"found": False, "message": "No matching medicine was found in the verified inventory."}
    item = matches[0]
    return {**item, "found": True, "available": item["quantity_available"] >= quantity, "requested_quantity": quantity}


def get_generic_equivalents(medicine_name: str) -> dict:
    """Return verified listed alternatives for a medicine; never invent alternatives."""
    result = check_medicine_availability(medicine_name)
    return {"medicine_name": medicine_name, "alternatives": result.get("alternatives", [])}


def detect_emergency_intent(message: str) -> dict:
    """Detect urgent medical or mental-health language in a message."""
    return {"emergency_detected": bool(EMERGENCY_PATTERN.search(message))}


def request_pharmacist_callback(name: str, phone: str, reason: str, consent: bool) -> dict:
    """Register a consented callback request without storing clinical details in logs."""
    if not consent or not name.strip() or not phone.strip():
        return {"success": False, "message": "Name, phone number, and consent are required."}
    ANALYTICS["callback_requests"] += 1
    log_event("callback_requested")
    return {"success": True, "message": "Your callback request has been sent to the pharmacist."}


def safe_local_reply(message: str) -> tuple[str, str, dict, bool]:
    lower = message.lower()
    if detect_emergency_intent(message)["emergency_detected"]:
        return ("This may be an emergency. Please contact local emergency services now or go to the nearest emergency department. Do not wait for a chat reply.", "emergency", {}, True)
    if re.search(r"open|hour|closing", lower):
        data = get_opening_hours()
        return (f"We are {'currently open' if data['open_now'] else 'currently closed'} based on regular hours. Mon–Fri {data['weekday']}, Saturday {data['saturday']}, Sunday {data['sunday']}.", "opening_hours", data, False)
    if re.search(r"where|location|address|map", lower):
        data = get_location(); return (f"We are at {data['address']}. {data['accessibility']} Map: {data['map_link']}", "location", data, False)
    if re.search(r"contact|phone|email|whatsapp|call", lower):
        data = get_contact_details(); return (f"Call {data['phone']}, WhatsApp {data['whatsapp']}, or email {data['email']}.", "contact", data, False)
    for item in INVENTORY:
        if item["name"].lower() in lower or item["generic_name"].lower() in lower:
            data = check_medicine_availability(item["name"])
            ANALYTICS["requested_medicines"][item["name"]] = ANALYTICS["requested_medicines"].get(item["name"], 0) + 1
            answer = f"{item['name']} {item['strength']} {item['dosage_form']} is {'currently available' if data['available'] else 'currently out of stock'}."
            answer += " A valid prescription is required." if item["prescription_required"] else " It is available without a prescription."
            if item["category"] == "Antibiotic": answer += " Antibiotics should only be used with professional guidance; please do not self-medicate."
            if not data["available"] and item["alternatives"]: answer += f" Approved listed alternative: {item['alternatives'][0]}."
            return answer, "medicine_availability", data, False
    return ("I can help with verified medicine availability, opening hours, location, contacts, delivery, or a pharmacist callback. What would you like to know?", "general", {}, False)


def gemini_reply(message: str) -> str | None:
    """Use Gemini's automatic Python function calling for non-emergency, general requests."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    global LAST_GEMINI_ERROR
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.1,
                tools=[get_opening_hours, get_location, get_contact_details, check_medicine_availability, get_generic_equivalents, detect_emergency_intent],
            ),
        )
        LAST_GEMINI_ERROR = None
        return response.text.strip() if response.text else None
    except Exception as error:
        LAST_GEMINI_ERROR = f"{type(error).__name__}: {str(error)[:160]}"
        print(f"Gemini error: {LAST_GEMINI_ERROR}")
        return None


@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    raw_message = payload.get("message", "")
    if not isinstance(raw_message, str):
        return jsonify({"error": "Message must be text."}), 400
    message = raw_message.strip()
    if not message or len(message) > 1000:
        return jsonify({"error": "Please send a message under 1,000 characters."}), 400
    ANALYTICS["messages"] += 1
    session_id = payload.get("session_id")
    if isinstance(session_id, str): add_message(session_id, "user", message)
    reply, intent, data, emergency = safe_local_reply(message)
    if emergency:
        ANALYTICS["emergency_escalations"] += 1
        log_event("emergency_escalation")
    elif intent == "general":
        gemini_response = gemini_reply(message)
        if gemini_response:
            reply = gemini_response
            intent = "gemini"
        elif os.getenv("GEMINI_API_KEY"):
            reply = "I’m having trouble reaching Gemini right now. Please try again shortly."
            intent = "gemini_error"
    if isinstance(session_id, str): add_message(session_id, "assistant", reply)
    log_event("chat_request", intent=intent, used_gemini=intent in ("gemini", "gemini_error"))
    return jsonify({"reply": reply, "intent": intent, "data": data, "escalate_to_pharmacist": emergency or intent == "medicine_availability" and data.get("prescription_required", False), "emergency_detected": emergency})


@app.post("/api/callback")
def callback():
    payload = request.get_json(silent=True) or {}
    result = request_pharmacist_callback(str(payload.get("name", "")), str(payload.get("phone", "")), str(payload.get("reason", "")), bool(payload.get("consent")))
    return jsonify(result), 201 if result["success"] else 400


@app.post("/api/interactions")
def interactions():
    payload = request.get_json(silent=True) or {}
    medicines, allergies = payload.get("medicines", []), payload.get("allergies", [])
    if not isinstance(medicines, list) or not isinstance(allergies, list): return jsonify({"error": "medicines and allergies must be lists."}), 400
    result = interaction_check(medicines, allergies)
    if result["findings"]: ANALYTICS["safety_events"] = ANALYTICS.get("safety_events", 0) + 1
    if result["findings"]: log_event("interaction_flagged", severity=result["findings"][0]["severity"])
    return jsonify(result)


@app.post("/api/triage")
def symptom_triage():
    payload = request.get_json(silent=True) or {}
    symptoms = payload.get("symptoms", "")
    if not isinstance(symptoms, str) or not symptoms.strip(): return jsonify({"error": "symptoms must be text."}), 400
    result = triage(symptoms)
    if result["urgency"] == "emergency": ANALYTICS["emergency_escalations"] += 1
    if result["urgency"] != "routine": log_event("triage", urgency=result["urgency"])
    return jsonify(result)


@app.post("/api/auth/guest")
def guest_auth():
    payload = request.get_json(silent=True) or {}
    return jsonify(create_guest_session(payload.get("language", "en"))), 201


@app.get("/api/sessions/<session_id>")
def session_history(session_id):
    session = SESSIONS.get(session_id)
    return jsonify(session) if session else (jsonify({"error": "Session not found."}), 404)


@app.post("/api/reminders")
def reminders():
    payload = request.get_json(silent=True) or {}
    if not payload.get("consent") or not payload.get("channel") or not payload.get("when"):
        return jsonify({"error": "Consent, delivery channel, and reminder time are required."}), 400
    return jsonify(create_reminder({key: payload.get(key) for key in ("channel", "when", "label", "contact")})), 201


@app.get("/api/fhir/demo/<patient_reference>")
def fhir_demo(patient_reference): return jsonify(fhir_demo_summary(patient_reference))


@app.get("/api/translations/<language>")
def translations(language): return jsonify({"language": language if language in TRANSLATIONS else "en", "strings": TRANSLATIONS.get(language, TRANSLATIONS["en"])})


@app.get("/api/citations")
def citations(): return jsonify(CITATIONS)


@app.get("/api/pharmacy")
def pharmacy(): return jsonify(PHARMACY)


@app.get("/api/inventory")
def inventory(): return jsonify(INVENTORY)


@app.get("/api/analytics")
def analytics():
    return jsonify({**ANALYTICS, "out_of_stock": [item["name"] for item in INVENTORY if not item["quantity_available"]], "events_recorded": len(EVENTS), "privacy": "Event logs exclude message text, phone numbers, and clinical details."})


@app.get("/api/analytics/events")
def analytics_events(): return jsonify({"events": list(EVENTS), "privacy": "Operational metadata only; no chat content is retained."})


@app.get("/health")
def health(): return jsonify({"status": "ok", "gemini_configured": bool(os.getenv("GEMINI_API_KEY")), "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3.6-flash"), "last_gemini_error": LAST_GEMINI_ERROR})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")))
