// Business logic utilities for car dealership operations

import { GAME_CONFIG } from '../constants';

export function uid(prefix = "id") { 
  return prefix + "_" + Math.random().toString(36).slice(2, 9); 
}

export function randInt(min, max) { 
  return Math.floor(Math.random() * (max - min + 1)) + min; 
}

export function clamp(value, min, max) { 
  return Math.max(min, Math.min(max, value)); 
}

export function formatCurrency(amount) {
  return `$${Number(amount).toLocaleString()}`;
}

export function formatNumber(number) {
  return Number(number).toLocaleString();
}

// Car generation and valuation logic
export function calculateCarCondition(template, damages, year) {
  let condition = randInt(1, 5);
  
  if (damages && damages.length > 0) {
    condition = Math.max(1, condition - 1);
    const totalDamage = damages.reduce((sum, d) => sum + (d.cost || 0), 0);
    const marketAnchor = Math.max(1, template.common_market || 1000);
    const damageSeverity = totalDamage / marketAnchor;
    
    if (damageSeverity > 0.5) condition = Math.max(1, condition - 3);
    else if (damageSeverity > 0.25) condition = Math.max(1, condition - 2);
    else if (damageSeverity > 0.1) condition = Math.max(1, condition - 1);
  }
  
  return condition;
}

export function calculateBaseValue(template, year, mileage, condition) {
  const age = new Date().getFullYear() - year;
  let base = Math.round(
    template.common_market * (1 - age * 0.025) - 
    mileage / 5000 * 150 + 
    condition * 300 + 
    (Math.random() - 0.5) * 600
  );
  
  return clamp(base, 300, Math.max(1000, template.common_market * 1.4));
}

export function calculateAskingPrice(baseValue, isUnderpriced = false, isDelusional = false) {
  if (isUnderpriced) {
    return Math.round(baseValue * (0.65 + Math.random() * 0.15));
  }
  if (isDelusional) {
    return Math.round(baseValue * (1.3 + Math.random() * 0.6));
  }
  return Math.round(baseValue * (1.05 + Math.random() * 0.45));
}

export function calculateReservePrice(baseValue) {
  return Math.round(baseValue * (0.55 + Math.random() * 0.45));
}

export function calculateEstimatedResale(baseValue, damages = []) {
  const totalDamage = damages.reduce((sum, d) => sum + (d.cost || 0), 0);
  const damageDiscount = Math.round(totalDamage * 0.7);
  return Math.max(300, Math.round(baseValue * (1.1 + Math.random() * 0.4) - damageDiscount));
}

export function generateCarDamages() {
  const damageChance = Math.random() < 0.28;
  if (!damageChance) return [];
  
  return [
    { type: "body", cost: randInt(200, 1200) }, 
    { type: "mechanical", cost: randInt(300, 2500) }
  ].slice(0, randInt(0, 2));
}

export function generateCarInstance(template) {
  const year = 2000 + Math.floor(Math.random() * 26);
  const mileage = randInt(5000, 220000);
  const damages = generateCarDamages();
  let condition = calculateCarCondition(template, damages, year);
  const base = calculateBaseValue(template, year, mileage, condition);
  
  const delusional = Math.random() < 0.14;
  const underpriced = Math.random() < 0.12;
  const asking = calculateAskingPrice(base, underpriced, delusional);
  const reserve = calculateReservePrice(base);
  const estimatedResale = calculateEstimatedResale(base, damages);
  const estimatedRepairCost = Math.round(damages.reduce((sum, d) => sum + (d.cost || 0), 0) * 0.7);
  
  return {
    id: uid("car"),
    make: template.make,
    model: template.model,
    year,
    mileage,
    condition,
    base,
    asking,
    reserve,
    estimatedResale,
    damages,
    estimatedRepairCost,
    inspected: false,
    status: "market"
  };
}

// Deal evaluation logic
export function evaluateDeal(askingPrice, estimatedResale) {
  if (!estimatedResale) return 'unknown';
  
  const ratio = askingPrice / estimatedResale;
  if (ratio < 0.85) return 'great';
  if (ratio < 0.95) return 'good';
  if (ratio <= 1.05) return 'neutral';
  if (ratio <= 1.15) return 'bad';
  return 'overpriced';
}

export function getDealBadgeVariant(dealType) {
  const variants = {
    great: 'greatDeal',
    good: 'goodDeal', 
    neutral: 'neutral',
    bad: 'badDeal',
    overpriced: 'overpriced'
  };
  return variants[dealType] || 'neutral';
}

export function getDealBadgeText(dealType) {
  const texts = {
    great: 'Great deal',
    good: 'Good deal',
    neutral: 'Neutral', 
    bad: 'Bad deal',
    overpriced: 'Overpriced'
  };
  return texts[dealType] || 'Unknown';
}

// Game time utilities
export function getGameDay(gameEpoch) {
  const elapsed = Date.now() - gameEpoch;
  return Math.floor(elapsed / GAME_CONFIG.GAME_DAY_MS);
}

export function getNextDayRemaining(gameEpoch) {
  const elapsed = Date.now() - gameEpoch;
  const dayIndex = Math.floor(elapsed / GAME_CONFIG.GAME_DAY_MS);
  const nextDue = gameEpoch + (dayIndex + 1) * GAME_CONFIG.GAME_DAY_MS;
  return Math.ceil(Math.max(0, (nextDue - Date.now()) / 1000));
}

// Buyer behavior utilities
export function calculateBuyerInterest(listPrice, estimatedResale) {
  if (!estimatedResale) return 0;
  return Math.max(0, Math.min(1, (estimatedResale - listPrice) / Math.max(1, estimatedResale)));
}

export function shouldBuyerAcceptCounter(buyer, counterPrice) {
  if (counterPrice > buyer.budget) return false;
  return Math.random() < (0.25 + 0.5 * (buyer.offer / counterPrice));
}

export function generateBuyerCounterOffer(buyer, rejectedPrice) {
  return Math.round(buyer.offer + Math.random() * (rejectedPrice - buyer.offer) * 0.4);
}