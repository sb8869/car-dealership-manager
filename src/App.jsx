import React, {useState, useEffect, useRef} from "react";
import Market from "./components/Market";
import Inventory from "./components/Inventory";
import Workshop from "./components/Workshop";
import ListingModal from "./components/ListingModal";
import NewListingModal from "./components/NewListingModal";
import ListingSummary from "./components/ListingSummary";
import NegotiationModal from "./components/NegotiationModal";
import CooldownRing from "./components/CooldownRing";
import { ToastContainer } from "./components/Toast";
import modelsData from "./data/models.json";
import { useLocalStorage, useGameTime, useToasts, useTimedEvents, useCooldown } from "./hooks";
import { GAME_CONFIG } from "./constants/index";
import { 
  uid, 
  randInt, 
  clamp,
  generateCarInstance,
  evaluateDeal 
} from "./utils/gameLogic";

export default function App(){
  // Use new hooks for better state management
  const [cash, setCash] = useLocalStorage("cash", 7000);
  const [inventory, setInventory] = useLocalStorage("inventory", []);
  const [listings, setListings] = useLocalStorage("listings", []);
  const [repairJobs, setRepairJobs] = useLocalStorage("repairJobs", []);
  const [gameEpoch] = useLocalStorage("gameEpoch", Date.now());
  
  const [market, setMarket] = useState([]);
  const [modal, setModal] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCarForListing, setSelectedCarForListing] = useState(null);

  // Custom hooks for game logic
  const { toasts, addToast, removeToast } = useToasts();
  const { scheduleEvent, cancelEvent, clearAllEvents } = useTimedEvents();
  const priceCooldown = useCooldown(GAME_CONFIG.PRICE_UPDATE_COOLDOWN);
  const refreshCooldown = useCooldown(GAME_CONFIG.REFRESH_COOLDOWN);

  // Game time management
  const { now, nextRefreshSeconds } = useGameTime(gameEpoch, () => {
    refreshMarket(true);
    addToast({ text: `A new morning has arrived — market refreshed.`, type: 'info' });
  });

  const buyerTimers = useRef({});
  const repairTimers = useRef({});

  // Initialize market on mount
  useEffect(() => { 
    refreshMarket(true); 
  }, []);

  // Set up buyer timers when listings change
  useEffect(() => {
    Object.values(buyerTimers.current).forEach(arr => arr.forEach(t => clearTimeout(t)));
    buyerTimers.current = {};
    
    listings.forEach(listing => {
      if (listing.waveSchedule && listing.waveSchedule.length > 0) {
        buyerTimers.current[listing.id] = [];
        listing.waveSchedule.forEach(entry => {
          const delay = Math.max(0, entry.dueAt - Date.now());
          const t = setTimeout(() => runScheduledWave(listing.id, entry.id), delay);
          buyerTimers.current[listing.id].push(t);
        });
      }
    });
  }, [listings]);

  // Modal functions
  function openNegotiation(side, car) { 
    setModal({ side, subject: car }); 
  }
  
  function openSellNegotiation(listing, buyer) { 
    setModal({ side: "sell", subject: listing, buyer }); 
  }
  
  function closeModal() { 
    setModal(null); 
  }

  // Purchase functions
  function finalizePurchase(car, price) { 
    setCash(c => c - price); 
    setInventory(prev => [{ ...car, purchasePrice: price, status: "owned" }, ...prev]); 
    setMarket(prev => prev.filter(c => c.id !== car.id)); 
    setModal(null); 
  }

  function finalizePurchaseWithToast(car, price) { 
    finalizePurchase(car, price); 
    addToast({ 
      text: `Purchased ${car.year} ${car.make} ${car.model} for $${price}`, 
      type: 'success' 
    }); 
  }

  function removeMarketCar(carId) {
    setMarket(prev => prev.filter(c => c.id !== carId));
    addToast({ 
      text: `Seller removed ${carId} from the market.`, 
      type: 'warning' 
    });
  }

  function buyInspection(carId, cost) {
    const car = market.find(c => c.id === carId);
    if (!car) return;
    if (cost > cash) { 
      addToast({ text: `Not enough cash for inspection.`, type: 'bad' }); 
      return; 
    }
    setCash(c => c - cost);
    setMarket(prev => prev.map(c => c.id === carId ? { ...c, inspected: true } : c));
    addToast({ 
      text: `Inspection purchased for ${car.year} ${car.make} ${car.model} ($${cost})`, 
      type: 'info' 
    });
  }

  function refreshMarket(bypassCooldown = false) {
    if (!bypassCooldown && refreshCooldown.isOnCooldown('market')) return;
    
    refreshCooldown.startCooldown('market');
    
    if (!market || market.length === 0) {
      const full = [];
      for (let i = 0; i < GAME_CONFIG.MARKET_SIZE; i++) {
        const template = modelsData[Math.floor(Math.random() * modelsData.length)];
        const car = generateCarInstance(template);
        if (i < Math.floor(GAME_CONFIG.MARKET_SIZE * 0.08)) {
          car.asking = Math.round(car.asking * (0.55 + Math.random() * 0.6));
          car.reserve = Math.round(car.reserve * (0.45 + Math.random() * 0.6));
        }
        full.push(car);
      }
      setMarket(full);
      return;
    }
    
    const keepCount = Math.max(1, Math.floor(market.length * (1 - GAME_CONFIG.MARKET_CHURN)));
    const kept = market.slice(0, keepCount);
    const replaced = [];
    
    while (kept.length + replaced.length < GAME_CONFIG.MARKET_SIZE) {
      const template = modelsData[Math.floor(Math.random() * modelsData.length)];
      const car = generateCarInstance(template);
      if (Math.random() < 0.06) {
        car.asking = Math.round(car.asking * (0.6 + Math.random() * 0.35));
        car.reserve = Math.round(car.reserve * (0.5 + Math.random() * 0.35));
      }
      replaced.push(car);
    }
    
    setMarket([...kept, ...replaced]);
  }

  function openNegotiation(side, car){ setModal({side, subject: car}); }
  function openSellNegotiation(listing, buyer){ setModal({side: "sell", subject: listing, buyer}); }
  function closeModal(){ setModal(null); }

  function finalizePurchase(car, price){ setCash(c=>c-price); setInventory(prev=>[ {...car, purchasePrice:price, status:"owned"}, ...prev ]); setMarket(prev=>prev.filter(c=>c.id!==car.id)); setModal(null); }

  // show toast when player purchases from market
  function finalizePurchaseWithToast(car, price){ finalizePurchase(car, price); addToast({ text: `Purchased ${car.year} ${car.make} ${car.model} for $${price}`, type: 'success' }); }

  function removeMarketCar(carId){
    setMarket(prev => prev.filter(c => c.id !== carId));
    addToast({ text: `Seller removed ${carId} from the market.`, type: 'warning' });
  }

  function buyInspection(carId, cost){
    const car = market.find(c => c.id === carId);
    if(!car) return;
    if(cost > cash){ addToast({ text: `Not enough cash for inspection.`, type: 'bad' }); return; }
    setCash(c=>c-cost);
    setMarket(prev=> prev.map(c=> c.id===carId ? {...c, inspected:true} : c));
    addToast({ text: `Inspection purchased for ${car.year} ${car.make} ${car.model} ($${cost})`, type: 'info' });
  }

  function repairCar(carId, cost){
    // repair car in inventory: deduct cash and reduce damages, update condition and est resale
    const car = inventory.find(c=>c.id===carId);
    if(!car) return;
    if(cost > cash){ addToast({ text: `Not enough cash for repair.`, type: 'bad' }); return; }
    setCash(c=>c-cost);
    setInventory(prev => prev.map(ic => {
      if(ic.id !== carId) return ic;
      // perform full repair: clear all damages and bump condition
      const newDamages = [];
      const totalDamage = 0;
      const damageDiscount = 0;
      const newEstimatedResale = Math.max(300, Math.round(ic.base * (1.1 + Math.random()*0.4) - damageDiscount));
      const newCondition = Math.min(5, ic.condition + 1);
      const newEstimatedRepairCost = 0;
      const prevRepairSpent = Number(ic.repairSpent || 0);
      const newRepairSpent = prevRepairSpent + Number(cost || 0);
      return {...ic, damages: newDamages, condition: newCondition, estimatedResale: newEstimatedResale, estimatedRepairCost: newEstimatedRepairCost, repairSpent: newRepairSpent };
    }));
    addToast({ text: `Repaired car ${car.year} ${car.make} ${car.model} for $${cost}`, type: 'success' });
  }

  // ----- Repair job queue (single bay) -----
  const REPAIR_MIN_COST = 200;
  const TIME_PER_DOLLAR = 1000/50; // ms per $
  const MIN_DURATION = 5000;
  const MAX_DURATION = 120000;

  function getJobForCar(carId){
    return repairJobs.find(j=> j.carId === carId && j.status !== 'done' && j.status !== 'cancelled');
  }

  function startNextJob(){
    // only one in-progress at a time
    const inProgress = repairJobs.find(j=>j.status === 'in-progress');
    if(inProgress) return;
    const next = repairJobs.find(j=>j.status === 'queued');
    if(!next) return;
    // if player can't pay, keep queued (auto-retry will attempt again later)
    if(next.cost > cash){ return; }

    const started = {...next, status:'in-progress', startAt: Date.now()};
    setRepairJobs(prev => prev.map(j=> j.id===started.id ? started : j));
    // charge immediately
    setCash(c => c - started.cost);
    const remaining = Math.max(0, started.durationMs);
    const t = setTimeout(()=>{
      // complete job
      completeJob(started.id);
    }, remaining);
    repairTimers.current[started.id] = t;
  }

  // Rehydrate any in-progress job timers on load and when repairJobs change
  useEffect(()=>{
    // clear existing timers
    Object.values(repairTimers.current || {}).forEach(t=>clearTimeout(t));
    repairTimers.current = {};
    (repairJobs || []).forEach(j => {
      if(j.status === 'in-progress'){
        // if job already completed according to timestamps, finish immediately
        const endAt = (j.startAt || 0) + (j.durationMs || 0);
        const remaining = Math.max(0, endAt - Date.now());
        if(remaining <= 0){
          // complete synchronously
          setTimeout(()=> completeJob(j.id), 50);
        } else {
          const t = setTimeout(()=> completeJob(j.id), remaining);
          repairTimers.current[j.id] = t;
        }
      }
    });
    // try to start next job in case bay free and cash available
    setTimeout(()=> startNextJob(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairJobs]);

  // whenever cash changes, attempt to start next job (auto-retry)
  useEffect(()=>{
    startNextJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cash]);

  function createRepairJob(carId, cost){
    if(getJobForCar(carId)) { addToast({ text: `Car already has a repair job.`, type: 'warning' }); return; }
    const id = uid('job');
    const durationMs = Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(cost * TIME_PER_DOLLAR)));
    const job = { id, carId, cost, status:'queued', createdAt: Date.now(), durationMs };
    setRepairJobs(prev => [ ...prev, job ]);
    // try to start immediately if bay free
    setTimeout(()=> startNextJob(), 50);
  }

  function completeJob(jobId){
    const job = repairJobs.find(j=>j.id===jobId);
    if(!job) return;
    // apply repair effects to inventory (similar logic to repairCar but without charging)
    setInventory(prev => prev.map(ic => {
      if(ic.id !== job.carId) return ic;
      const newDamages = [];
      const totalDamage = 0;
      const damageDiscount = 0;
      const newEstimatedResale = Math.max(300, Math.round(ic.base * (1.1 + Math.random()*0.4) - damageDiscount));
      const newCondition = Math.min(5, ic.condition + 1);
      const newEstimatedRepairCost = 0;
      const prevRepairSpent = Number(ic.repairSpent || 0);
      const newRepairSpent = prevRepairSpent + Number(job.cost || 0);
      return {...ic, damages: newDamages, condition: newCondition, estimatedResale: newEstimatedResale, estimatedRepairCost: newEstimatedRepairCost, repairSpent: newRepairSpent };
    }));
    setRepairJobs(prev => prev.map(j=> j.id===jobId ? {...j, status:'done', completedAt: Date.now()} : j));
    // clear timer
    if(repairTimers.current[jobId]){ clearTimeout(repairTimers.current[jobId]); delete repairTimers.current[jobId]; }
    addToast({ text: `Repair completed for ${job.carId}`, type: 'success' });
    // start next
    setTimeout(()=> startNextJob(), 50);
  }

  function cancelJob(jobId){
    const job = repairJobs.find(j=>j.id===jobId);
    if(!job) return;
    // if in-progress, refund partial? For simplicity, do not refund if started. If queued, remove and refund nothing (we didn't charge yet)
    if(job.status === 'in-progress'){
      addToast({ text: `Cannot cancel an in-progress repair.`, type: 'warning' });
      return;
    }
    setRepairJobs(prev => prev.map(j=> j.id===jobId ? {...j, status:'cancelled'} : j));
    addToast({ text: `Cancelled repair for ${job.carId}`, type: 'info' });
  }

  function createListing(carId, listPrice){
    const car = inventory.find(c=>c.id===carId);
    if(!car) return;
    const listing = {...car, listPrice: Number(listPrice), id: "listing_"+Math.random().toString(36).slice(2,9), createdAt: Date.now(), waves: 0, buyers: []};
    setListings(prev=>[listing, ...prev]);
    setInventory(prev=>prev.filter(c=>c.id!==carId));
    scheduleBuyerWaves(listing);
  }

  function generateBuyerWave(listingId, waveSize = null){
    setListings(prev=>{
      return prev.map(listing=>{
        if(listing.id!==listingId) return listing;
        const buyers = [];
        const M = listing.estimatedResale || listing.base;
        let wavesize = 0;
        if(waveSize !== null) wavesize = waveSize;
        else {
          const ratio = listing.listPrice / Math.max(1, M);
          if(ratio <= 0.95) wavesize = 3 + Math.floor(Math.random()*2);
          else if(ratio <= 1.05) wavesize = 2 + Math.floor(Math.random()*2);
          else if(ratio <= 1.15) wavesize = 1;
          else wavesize = Math.random() < 0.25 ? 1 : 0;
        }
        for(let i=0;i<wavesize;i++){
          // buyer persona: bargain, realist, impulse, collector
          const personaRoll = Math.random();
          let persona = 'realist';
          if(personaRoll < 0.35) persona = 'bargain';
          else if(personaRoll < 0.70) persona = 'realist';
          else if(personaRoll < 0.95) persona = 'impulse';
          else persona = 'collector';

          // persona influences budget multiplier
          let budgetMult = 0.9;
          if(persona === 'bargain') budgetMult = 0.7 + Math.random()*0.25; // 0.70-0.95
          if(persona === 'realist') budgetMult = 0.8 + Math.random()*0.3; // 0.80-1.10
          if(persona === 'impulse') budgetMult = 0.9 + Math.random()*0.4; // 0.90-1.30
          if(persona === 'collector') budgetMult = 1.05 + Math.random()*0.6; // 1.05-1.65

          const budget = Math.round(M * budgetMult);

          // initial offer depends on persona (fraction below list)
          let ioPct = 0.18 + Math.random()*0.07; // default 18-25% below
          if(persona === 'bargain') ioPct = 0.25 + Math.random()*0.15; // 25-40%
          if(persona === 'realist') ioPct = 0.15 + Math.random()*0.12; // 15-27%
          if(persona === 'impulse') ioPct = 0.06 + Math.random()*0.12; // 6-18%
          if(persona === 'collector') ioPct = 0.05 + Math.random()*0.15; // 5-20%

          const io = Math.min(Math.round(listing.listPrice * (1 - ioPct)), budget);

          // patience: collectors more patient, bargain/impulse less
          let patience = 2 + Math.floor(Math.random()*2);
          if(persona === 'bargain') patience = 1 + Math.floor(Math.random()*2);
          if(persona === 'realist') patience = 2 + Math.floor(Math.random()*2);
          if(persona === 'impulse') patience = 1 + Math.floor(Math.random()*2);
          if(persona === 'collector') patience = 3 + Math.floor(Math.random()*2);

          const interest = Math.random();
          buyers.push({ id: "b_"+Math.random().toString(36).slice(2,8), budget, offer: io, patience, interest, persona });
        }
        // buyers appended to listing
        const nowt = Date.now();
        const waveSchedule = (listing.waveSchedule||[]).filter(s => s.dueAt > nowt);
        return {...listing, buyers: [...(listing.buyers||[]), ...buyers], waves: (listing.waves||0)+1, waveSchedule };
      });
    });
  }

  function runScheduledWave(listingId, waveId){
    const listing = listings.find(l=>l.id===listingId);
    if(!listing || !listing.waveSchedule) return;
    const entry = listing.waveSchedule.find(s=>s.id===waveId);
    if(!entry) return;
    generateBuyerWave(listingId, entry.size);
    setListings(prev=>prev.map(l=> l.id===listingId ? {...l, waveSchedule: (l.waveSchedule||[]).filter(s=>s.id!==waveId)} : l));
    const current = listings.find(l=>l.id===listingId);
    if(current){
      const M = current.estimatedResale || current.base;
      const ratio = current.listPrice / Math.max(1, M);
      if(ratio <= 0.95){ if(Math.random() < 0.6){ const delay = 15000 + Math.floor(Math.random()*20000); createAndScheduleWave(listingId, 1 + Math.floor(Math.random()*2), delay); } }
      else if(ratio <= 1.05){ if(Math.random() < 0.25){ const delay = 25000 + Math.floor(Math.random()*30000); createAndScheduleWave(listingId, 1, delay); } }
    }
  }

  function createAndScheduleWave(listingId, size, delayMs){
    const entry = { id: uid('wave'), dueAt: Date.now() + Math.max(0, delayMs), size };
    setListings(prev => prev.map(l => l.id===listingId ? {...l, waveSchedule: [ ...(l.waveSchedule||[]), entry ] } : l));
    if(!buyerTimers.current[listingId]) buyerTimers.current[listingId] = [];
    const t = setTimeout(()=> runScheduledWave(listingId, entry.id), delayMs);
    buyerTimers.current[listingId].push(t);
  }

  function scheduleBuyerWaves(listing){
    if(!listing) return;
    if(buyerTimers.current[listing.id]) buyerTimers.current[listing.id].forEach(t=>clearTimeout(t));
    buyerTimers.current[listing.id] = [];
    const M = listing.estimatedResale || listing.base;
    const ratio = listing.listPrice / Math.max(1, M);
    const schedule = [];
    if(ratio <= 0.95){ schedule.push({delay:0, size:3}); schedule.push({delay:4000 + Math.floor(Math.random()*3000), size:2}); schedule.push({delay:8000 + Math.floor(Math.random()*4000), size:1}); }
    else if(ratio <= 1.05){ schedule.push({delay:0, size:2}); schedule.push({delay:5000 + Math.floor(Math.random()*4000), size:1}); }
    else if(ratio <= 1.15){ schedule.push({delay:0, size:1}); if(Math.random() < 0.4) schedule.push({delay:6000 + Math.floor(Math.random()*4000), size:1}); }
    else { if(Math.random() < 0.25) schedule.push({delay:0, size:1}); }
    const nowt = Date.now();
    const entries = schedule.map(s=>({ id: uid('wave'), dueAt: nowt + s.delay, size: s.size }));
    setListings(prev=>prev.map(l=> l.id===listing.id ? {...l, waveSchedule: entries} : l ));
    // waves scheduled (no debug toasts)
    entries.forEach(entry => { const delay = Math.max(0, entry.dueAt - Date.now()); const t = setTimeout(()=> runScheduledWave(listing.id, entry.id), delay); buyerTimers.current[listing.id].push(t); });
  }

  function removeBuyer(listingId, buyerId){ setListings(prev=> prev.map(l=> l.id!==listingId ? l : {...l, buyers: (l.buyers||[]).filter(b=>b.id!==buyerId) })); }

  // provide a wrapper that also shows a toast when a buyer is removed
  function handleRemoveBuyer(listingId, buyerId){
    const listing = listings.find(l=>l.id===listingId);
    removeBuyer(listingId, buyerId);
    if(listing){ addToast({ text: `Buyer ${buyerId} left the listing for ${listing.year} ${listing.make} ${listing.model}`, type: 'warning' }); }
  }

  // update a buyer's offer on a listing (called from negotiation modal counters)
  function updateBuyerOffer(listingId, buyerId, newOffer){
    setListings(prev=> prev.map(l => {
      if(l.id !== listingId) return l;
      return {...l, buyers: (l.buyers||[]).map(b => b.id===buyerId ? {...b, offer: Math.round(Number(newOffer))} : b)};
    }));
  }

  function openListingModal(listing){ setModal({side:"listing", subject: listing}); }

  function finalizeSale(listingId, buyerId, price){ const listing = listings.find(l=>l.id===listingId); if(!listing) return; setCash(c=>c+price); setListings(prev=>prev.filter(l=>l.id!==listingId)); if(buyerTimers.current[listingId]){ buyerTimers.current[listingId].forEach(t=>clearTimeout(t)); delete buyerTimers.current[listingId]; } addToast({ text: `Sold ${listing.year} ${listing.make} ${listing.model} for $${price}`, type: 'success' }); setModal(null); }

  function updateListingPrice(listingId, newPrice){ 
    if(priceCooldown.isOnCooldown(listingId)) return; 
    priceCooldown.startCooldown(listingId); 
    setListings(prev=>{ 
      const next = prev.map(l=> l.id===listingId ? {...l, listPrice: newPrice} : l); 
      const updated = next.find(x=>x.id===listingId); 
      if(updated) scheduleBuyerWaves(updated); 
      return next; 
    }); 
    addToast({ text: `Updated listing price to $${newPrice}`, type: 'info' }); 
  }

  function getPriceCooldownRemaining(listingId){ 
    return Math.ceil(priceCooldown.getRemainingTime(listingId) / 1000); 
  }
  function getRefreshCooldownRemaining(){ return Math.ceil(refreshCooldown.getRemainingTime('market') / 1000); }

  return (
    <div className="app">
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '24px',
        marginBottom: '32px',
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: 900,
              color: 'white',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '-0.5px'
            }}>
              🚗 AutoFlip Dealership
            </h1>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500
            }}>
              Buy, repair, and sell cars for profit
            </p>
          </div>
          
          {/* Cash Counter */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            padding: '16px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            textAlign: 'right'
          }}>
            <div style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 600,
              marginBottom: '4px'
            }}>
              Available Cash
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 900,
              color: 'white',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              ${cash.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '8px',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          {[
            { id: 'all', label: '🏠 Overview', icon: '🏠' },
            { id: 'market', label: '🛒 Market', icon: '🛒' },
            { id: 'listings', label: '📋 Listings', icon: '📋' },
            { id: 'inventory', label: '🏭 Inventory', icon: '🏭' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id 
                  ? 'rgba(255, 255, 255, 0.25)' 
                  : 'transparent',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
                color: activeTab === tab.id 
                  ? 'white' 
                  : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: activeTab === tab.id ? 'blur(10px)' : 'none',
                textShadow: activeTab === tab.id ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                }
              }}
            >
              <span style={{ fontSize: '18px' }}>{tab.icon}</span>
              {tab.label.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'all' ? (
        <div className="grid cols-3">
          <div className="card market-card">
            <h3>Market</h3>
            <div className="list scrollable" style={{marginTop:10}}>
                <Market mode="all" market={market} onInspect={(car)=>openNegotiation("buy", car)} onBuyInspection={(carId,cost)=>buyInspection(carId,cost)} getRefreshCooldownRemaining={getRefreshCooldownRemaining} nextRefreshSeconds={nextRefreshSeconds} />
            </div>
          </div>

          <div className="card">
            <h3>Listings</h3>
            <div className="list scrollable" style={{marginTop:10}}>
              {listings.length===0 ? (
                <div className="small">No active listings. List cars from inventory.</div>
              ) : (
                listings.map(l => (
                  <div key={l.id} style={{marginBottom: '12px'}}>
                    <ListingSummary 
                      listing={l} 
                      clickable={true}
                      onClick={() => openListingModal(l)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3>Inventory</h3>
            <div className="list scrollable" style={{marginTop:10}}>
              <Inventory inventory={inventory} onList={(car) => setSelectedCarForListing(car)} onRepair={(carId,cost)=>repairCar(carId,cost)} onSendToWorkshop={(carId,cost)=>createRepairJob(carId,cost)} repairJobs={repairJobs} />
              <div style={{marginTop:12}}>
                <Workshop inventory={inventory} repairJobs={repairJobs} onCancelJob={(jobId)=>cancelJob(jobId)} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid cols-1">
          {activeTab === 'market' && (
            <div className="card market-card full-width">
              <h3>Market</h3>
              <div className="list scrollable" style={{marginTop:10}}>
                  <Market mode="market" market={market} onInspect={(car)=>openNegotiation("buy", car)} onBuyInspection={(carId,cost)=>buyInspection(carId,cost)} getRefreshCooldownRemaining={getRefreshCooldownRemaining} nextRefreshSeconds={nextRefreshSeconds} />
              </div>
            </div>
          )}
          {activeTab === 'listings' && (
            <div className="card full-width">
              <h3>Listings</h3>
                <div className="list scrollable" style={{marginTop:10}}>
                {listings.length===0 ? <div className="small">No active listings. List cars from inventory.</div> : listings.map(l=>(
                  <div key={l.id} style={{marginBottom: '12px'}}>
                    <ListingSummary 
                      listing={l} 
                      clickable={true}
                      onClick={() => openListingModal(l)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'inventory' && (
            <div className="card full-width">
              <h3>Inventory</h3>
              <div className="list scrollable" style={{marginTop:10}}>
                <Inventory inventory={inventory} onList={(car) => setSelectedCarForListing(car)} onRepair={(carId,cost)=>repairCar(carId,cost)} onSendToWorkshop={(carId,cost)=>createRepairJob(carId,cost)} repairJobs={repairJobs} />
                <div style={{marginTop:12}}>
                  <Workshop inventory={inventory} repairJobs={repairJobs} onCancelJob={(jobId)=>cancelJob(jobId)} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(() => {
        // ensure modals reference the live objects so inspection and buyer updates are reflected
        if(!modal) return null;
        let resolvedModal = modal;

        if(modal.side === 'listing' || modal.side === 'sell'){
          const listingId = modal.subject && modal.subject.id;
          if(listingId){
            const live = listings.find(l => l.id === listingId);
            if(!live){
              // listing no longer exists (sold/removed): close modal
              return null;
            }
            resolvedModal = {...modal, subject: live};
          }
        } else if(modal.side === 'buy'){
          // for buy-side negotiation, reference the live market car so inspection flags update
          const carId = modal.subject && modal.subject.id;
          if(carId){
            const live = market.find(c => c.id === carId);
            if(!live){
              // market car was removed
              return null;
            }
            resolvedModal = {...modal, subject: live};
          }
        }

        return resolvedModal.side === "listing" ? (
          <ListingModal modal={resolvedModal} cash={cash} onCancel={()=>setModal(null)} onBuy={(car,price)=>finalizePurchaseWithToast(car,price)} onSell={finalizeSale} refreshMarket={refreshMarket} onNegotiate={openSellNegotiation} onRemoveBuyer={handleRemoveBuyer} onUpdatePrice={updateListingPrice} onUpdateBuyerOffer={updateBuyerOffer} getPriceCooldownRemaining={getPriceCooldownRemaining} getRefreshCooldownRemaining={getRefreshCooldownRemaining} now={now} />
        ) : (
          <NegotiationModal modal={resolvedModal} cash={cash} onCancel={()=>setModal(null)} onBuy={(car,price)=>finalizePurchaseWithToast(car,price)} onSell={finalizeSale} onRemoveBuyer={handleRemoveBuyer} onUpdateBuyerOffer={updateBuyerOffer} onRemoveMarketCar={removeMarketCar} onBuyInspection={(carId,cost)=>buyInspection(carId,cost)} />
        );
      })()}

      {/* Car-specific listing modal */}
      {selectedCarForListing && (
        <NewListingModal 
          open={!!selectedCarForListing} 
          preSelectedCar={selectedCarForListing}
          inventory={inventory} 
          repairJobs={repairJobs} 
          onCancel={() => setSelectedCarForListing(null)} 
          onCreateListing={(carId, price) => { 
            createListing(carId, price); 
            setSelectedCarForListing(null); 
          }} 
        />
      )}

      <div style={{position:'fixed',right:20,bottom:20,display:'flex',flexDirection:'column',gap:8,zIndex:9999}}>
        {toasts.map(t=>(
          <div key={t.id} style={{background: t.type==='success' ? '#28a745' : (t.type==='warning' ? '#fd7e14' : '#333'), color:'#fff', padding:'8px 12px', borderRadius:6, boxShadow:'0 2px 6px rgba(0,0,0,0.15)'}}>{t.text}</div>
        ))}
      </div>
    </div>
  )
}

function HeatBadge({listing}){
  const M = listing.estimatedResale || listing.base || 1;
  const ratio = listing.listPrice / M;
  const score = ratio <= 0.95 ? 3 : (ratio <= 1.05 ? 2 : (ratio <= 1.15 ? 1 : 0));
  const colors = ['#dc3545','#fd7e14','#ffc107','#28a745'];
  return (
    <div style={{display:'flex',gap:4}}>
      {[0,1,2].map(i=>{
        const filled = i < score;
        const bg = filled ? colors[Math.min(score,3)] : '#eee';
        return <div key={i} style={{width:12,height:12,borderRadius:3,background:bg}} />;
      })}
    </div>
  );
}
