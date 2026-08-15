"""Safety-first MVP services. Replace memory stores with encrypted database services in production."""
from datetime import datetime, timezone
from uuid import uuid4

CITATIONS = {
    "medication_safety": [
        {"title": "WHO: Medication Without Harm", "url": "https://www.who.int/initiatives/medication-without-harm"},
        {"title": "WHO: Medication without harm policy brief", "url": "https://www.who.int/publications/i/item/9789240062764/"},
    ],
    "warfarin_nsaid": [{"title": "Warfarin + NSAID bleeding risk meta-analysis", "url": "https://pubmed.ncbi.nlm.nih.gov/32455439/"}],
    "anaphylaxis": [{"title": "NHS: Anaphylaxis", "url": "https://www.nhs.uk/conditions/anaphylaxis/"}],
}
SESSIONS, REMINDERS = {}, []
TRANSLATIONS = {
    "en": {"title": "Pharmacy Assistant", "welcome": "How can I help?"},
    "sw": {"title": "Msaidizi wa Famasia", "welcome": "Ninawezaje kukusaidia?"},
}

def create_guest_session(language="en"):
    session_id = uuid4().hex
    SESSIONS[session_id] = {"id": session_id, "language": language if language in TRANSLATIONS else "en", "messages": [], "created_at": datetime.now(timezone.utc).isoformat()}
    return SESSIONS[session_id]

def add_message(session_id, role, text):
    session = SESSIONS.get(session_id)
    if session:
        session["messages"].append({"role": role, "text": text, "timestamp": datetime.now(timezone.utc).isoformat()})

def interaction_check(medicines, allergies):
    normalized = {str(item).strip().lower() for item in medicines}
    allergy_set = {str(item).strip().lower() for item in allergies}
    findings = []
    if {"warfarin", "ibuprofen"}.issubset(normalized):
        findings.append({"severity": "high", "message": "Warfarin and ibuprofen may increase bleeding risk. Do not start, stop, or change medicine based on this screen; contact a pharmacist or prescriber promptly.", "citations": CITATIONS["warfarin_nsaid"]})
    if "amoxicillin" in normalized and any(term in allergy_set for term in ("penicillin", "amoxicillin", "beta-lactam")):
        findings.append({"severity": "high", "message": "An amoxicillin/penicillin allergy was reported. Do not take it until a pharmacist or prescriber checks it. If there is trouble breathing, swelling, collapse, or severe rash, seek emergency help now.", "citations": CITATIONS["anaphylaxis"]})
    return {"screening_only": True, "requires_pharmacist_review": bool(findings), "findings": findings, "citations": CITATIONS["medication_safety"]}

def triage(symptoms):
    text = symptoms.lower()
    emergency_terms = ("chest pain", "difficulty breathing", "cannot breathe", "severe allergic", "face swelling", "overdose", "suicid")
    urgent_terms = ("high fever", "persistent vomiting", "severe pain", "blood in", "faint")
    if any(term in text for term in emergency_terms):
        return {"urgency": "emergency", "guidance": "This may be an emergency. Contact local emergency services now or go to the nearest emergency department. Do not wait for chat advice.", "citations": CITATIONS["anaphylaxis"]}
    if any(term in text for term in urgent_terms):
        return {"urgency": "urgent", "guidance": "Please contact a pharmacist or clinician today for assessment. If symptoms worsen or emergency warning signs appear, contact emergency services.", "citations": CITATIONS["medication_safety"]}
    return {"urgency": "routine", "guidance": "This tool cannot diagnose. For new, persistent, or worrying symptoms, contact a pharmacist or clinician for individualized advice.", "citations": CITATIONS["medication_safety"]}

def create_reminder(payload):
    reminder = {"id": uuid4().hex, "status": "queued_demo", "created_at": datetime.now(timezone.utc).isoformat(), **payload}
    REMINDERS.append(reminder)
    return reminder

def fhir_demo_summary(patient_reference):
    return {"mode": "demo", "patient_reference": patient_reference, "resources": ["MedicationRequest", "MedicationKnowledge", "AllergyIntolerance"], "message": "No live clinical data is connected. Configure a FHIR server and OAuth 2.0 before production use."}
