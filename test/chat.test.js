import test from 'node:test';
import assert from 'node:assert/strict';
import { localChat } from '../server/chat.js';
test('returns verified paracetamol availability', () => { const result = localChat('Do you have paracetamol 500mg tablets?'); assert.equal(result.intent, 'medicine_availability'); assert.match(result.reply, /available/); });
test('escalates emergencies', () => { const result = localChat('I think I took too much medicine'); assert.equal(result.emergency_detected, true); assert.match(result.reply, /emergency/i); });
