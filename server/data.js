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
  { id: 8, name: 'Insulin glargine', generic: 'Insulin glargine', strength: '100 units/mL', form: 'pen', quantity: 8, prescription: true, category: 'Diabetes', alternatives: [] },
  { id: 9, name: 'Adhesive bandages', generic: 'Adhesive bandages', strength: 'assorted', form: 'box of 20', quantity: 35, prescription: false, category: 'Wound care', alternatives: [] },
  { id: 10, name: 'Sterile gauze pads', generic: 'Sterile gauze', strength: '10cm x 10cm', form: 'pack of 10', quantity: 28, prescription: false, category: 'Wound care', alternatives: [] },
  { id: 11, name: 'Nitrile examination gloves', generic: 'Nitrile gloves', strength: 'medium', form: 'box of 100', quantity: 18, prescription: false, category: 'Hospital supplies', alternatives: [] },
  { id: 12, name: 'Surgical face masks', generic: 'Surgical masks', strength: 'three-ply', form: 'box of 50', quantity: 24, prescription: false, category: 'Hospital supplies', alternatives: [] },
  { id: 13, name: 'Digital thermometer', generic: 'Digital thermometer', strength: 'fast-read', form: 'device', quantity: 12, prescription: false, category: 'Diagnostics', alternatives: [] },
  { id: 14, name: 'Automatic blood pressure monitor', generic: 'Blood pressure monitor', strength: 'upper arm', form: 'device', quantity: 7, prescription: false, category: 'Diagnostics', alternatives: [] },
  { id: 15, name: 'Disposable syringes', generic: 'Sterile syringes', strength: '5mL', form: 'pack of 10', quantity: 20, prescription: true, category: 'Clinical supplies', alternatives: [] },
  { id: 16, name: 'Saline wound wash', generic: 'Sodium chloride', strength: '0.9%', form: '250mL spray', quantity: 16, prescription: false, category: 'Wound care', alternatives: [] }
];
