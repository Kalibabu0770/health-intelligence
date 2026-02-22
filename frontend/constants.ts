
import { Drug } from './types';

export const DRUG_DATABASE: Drug[] = [
  {
    id: 'paracetamol',
    name: 'Paracetamol',
    maxDailyDoseMg: 4000,
    liverWarning: 'High risk of hepatotoxicity. Severe liver damage if exceeded.',
    kidneyWarning: 'Relatively safe for kidneys at therapeutic doses.',
    alcoholInteraction: true,
    elderlyCaution: false,
    longTermRiskFlag: true,
    class: 'Analgesic'
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen',
    maxDailyDoseMg: 1200,
    liverWarning: 'Moderate risk with long term use.',
    kidneyWarning: 'NSAIDS can reduce blood flow to kidneys. High risk for kidney disease patients.',
    alcoholInteraction: true,
    elderlyCaution: true,
    longTermRiskFlag: true,
    class: 'NSAID'
  },
  {
    id: 'diclofenac',
    name: 'Diclofenac',
    maxDailyDoseMg: 150,
    liverWarning: 'Elevated liver enzymes possible.',
    kidneyWarning: 'Increased risk of acute kidney injury.',
    alcoholInteraction: true,
    elderlyCaution: true,
    longTermRiskFlag: true,
    class: 'NSAID'
  },
  {
    id: 'tramadol',
    name: 'Tramadol',
    maxDailyDoseMg: 400,
    liverWarning: 'Metabolized in liver; requires adjustment in liver disease.',
    kidneyWarning: 'Requires dose adjustment for impaired renal function.',
    alcoholInteraction: true,
    elderlyCaution: true,
    longTermRiskFlag: true,
    class: 'Opioid'
  },
  {
    id: 'codeine',
    name: 'Codeine',
    maxDailyDoseMg: 240,
    liverWarning: 'Active metabolite morphine processed in liver.',
    kidneyWarning: 'Renal failure can lead to accumulation of toxic metabolites.',
    alcoholInteraction: true,
    elderlyCaution: true,
    longTermRiskFlag: true,
    class: 'Opioid'
  }
];

export const SYMPTOM_OVERDOSE_THRESHOLD = 3; // Trigger emergency if 3+ critical symptoms
