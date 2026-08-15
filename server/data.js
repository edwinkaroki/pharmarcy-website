export const pharmacy = {
  name: 'CarePoint Pharmacy', address: '14 Kenyatta Avenue, Nairobi, Kenya',
  phone: '+254 700 123 456', email: 'hello@carepoint.example', whatsapp: '+254 700 123 456',
  mapLink: 'https://maps.google.com/?q=Kenyatta+Avenue+Nairobi',
  hours: { weekday: '08:00–20:00', saturday: '09:00–18:00', sunday: '10:00–16:00', holidays: '10:00–14:00' },
  accessibility: 'Step-free entrance, accessible counter and customer parking.', delivery: true
};
export const inventory = [
  { id: 1, name: 'Paracetamol', generic: 'Paracetamol', strength: '500mg', form: 'tablets', quantity: 240, prescription: false, category: 'Pain relief', alternatives: ['Ibuprofen 200mg tablets'] },
  { id: 2, name: 'Ibuprofen', generic: 'Ibuprofen', strength: '200mg', form: 'tablets', quantity: 80, prescription: false, category: 'Pain relief', alternatives: ['Paracetamol 500mg tablets'] },
  { id: 3, name: 'Amoxicillin', generic: 'Amoxicillin', strength: '500mg', form: 'capsules', quantity: 30, prescription: true, category: 'Antibiotic', alternatives: [] },
  { id: 4, name: 'Cetirizine', generic: 'Cetirizine', strength: '10mg', form: 'tablets', quantity: 65, prescription: false, category: 'Allergy', alternatives: [] },
  { id: 5, name: 'Vitamin C', generic: 'Ascorbic acid', strength: '1000mg', form: 'tablets', quantity: 0, prescription: false, category: 'Supplement', alternatives: ['Vitamin C 500mg tablets'] },
  { id: 6, name: 'ORS', generic: 'Oral rehydration salts', strength: 'standard', form: 'sachets', quantity: 42, prescription: false, category: 'Hydration', alternatives: [] },
  { id: 7, name: 'Amlodipine', generic: 'Amlodipine', strength: '5mg', form: 'tablets', quantity: 25, prescription: true, category: 'Blood pressure', alternatives: [] },
  { id: 8, name: 'Insulin glargine', generic: 'Insulin glargine', strength: '100 units/mL', form: 'pen', quantity: 8, prescription: true, category: 'Diabetes', alternatives: [] }
];
