import { inventory, pharmacy } from './data.js';
import { detectEmergencyIntent, emergencyReply } from './safety.js';

const medicineReply = (message) => {
  const item = inventory.find((medicine) => message.toLowerCase().includes(medicine.name.toLowerCase()) || message.toLowerCase().includes(medicine.generic.toLowerCase()));
  if (!item) return null;
  const available = item.quantity > 0;
  let reply = available ? `${item.name} ${item.strength} ${item.form} is currently available.` : `${item.name} ${item.strength} ${item.form} is currently out of stock.`;
  reply += item.prescription ? ' A valid prescription is required.' : ' It is available without a prescription.';
  if (item.category === 'Antibiotic') reply += ' Antibiotics should only be used with professional guidance; please do not self-medicate.';
  if (!available && item.alternatives.length) reply += ` Approved listed alternative: ${item.alternatives.join(', ')}.`;
  return { reply, data: item, intent: 'medicine_availability' };
};
export function localChat(message) {
  if (detectEmergencyIntent(message)) return { reply: emergencyReply, intent: 'emergency', data: {}, escalate_to_pharmacist: true, emergency_detected: true };
  const lower = message.toLowerCase();
  if (/open|hour|closing/.test(lower)) {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: process.env.PHARMACY_TIMEZONE || 'Africa/Nairobi' }).format(new Date());
    const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: process.env.PHARMACY_TIMEZONE || 'Africa/Nairobi' }).format(new Date()));
    const range = weekday === 'Saturday' ? [9, 18] : weekday === 'Sunday' ? [10, 16] : [8, 20];
    const open = hour >= range[0] && hour < range[1];
    return { reply: `We are ${open ? 'currently open' : 'currently closed'} based on our regular ${weekday} hours. Mon–Fri ${pharmacy.hours.weekday}, Saturday ${pharmacy.hours.saturday}, Sunday ${pharmacy.hours.sunday}. Public holidays: ${pharmacy.hours.holidays}.`, intent: 'opening_hours', data: { ...pharmacy.hours, open } };
  }
  if (/where|location|address|map/.test(lower)) return { reply: `We are at ${pharmacy.address}. ${pharmacy.accessibility} Map: ${pharmacy.mapLink}`, intent: 'location', data: pharmacy };
  if (/contact|phone|email|whatsapp|call/.test(lower)) return { reply: `Call ${pharmacy.phone}, WhatsApp ${pharmacy.whatsapp}, or email ${pharmacy.email}.`, intent: 'contact', data: pharmacy };
  if (/deliver|delivery/.test(lower)) return { reply: pharmacy.delivery ? 'Delivery is available. Please contact the pharmacy to confirm your area and eligible items.' : 'Delivery is currently unavailable.', intent: 'delivery', data: { delivery: pharmacy.delivery } };
  const match = medicineReply(message);
  if (match) return { ...match, escalate_to_pharmacist: match.data.prescription, emergency_detected: false };
  if (/doctor|diagnos|dose|dosage|treatment|symptom/.test(lower)) return { reply: 'I can provide pharmacy information, but cannot diagnose or give personalised treatment or dosage advice. A pharmacist or doctor can help with this.', intent: 'medical_safety', data: {}, escalate_to_pharmacist: true, emergency_detected: false };
  return { reply: 'I can help with opening hours, medicine availability, location, contacts, delivery, or a pharmacist callback. What would you like to know?', intent: 'general', data: {}, escalate_to_pharmacist: false, emergency_detected: false };
}
