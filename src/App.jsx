import React, {useState, useEffect} from "react";
import Market from "./components/Market";
import Inventory from "./components/Inventory";
import ListingModal from "./components/ListingModal";
import NegotiationModal from "./components/NegotiationModal";
import CooldownRing from "./components/CooldownRing";
import modelsData from "./data/models.json";

function uid(prefix="id"){ return prefix + "_" + Math.random().toString(36).slice(2,9); }
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function generateCarInstance(template){
  const year = 2000 + Math.floor(Math.random()*26);
  const mileage = randInt(5000,220000);
  let condition = randInt(1,5);
  const age = new Date().getFullYear() - year;
  // determine damages early so they affect condition and pricing
  const damageChance = Math.random() < 0.28;
  const damages = damageChance ? [{type: "body", cost: randInt(200,1200)}, {type:"mechanical", cost: randInt(300,2500)}].slice(0, randInt(0,2)) : [];
  if(damages && damages.length>0){
    condition = Math.max(1, condition - 1);
    const totalDamage = damages.reduce((s,d)=>s + (d.cost||0), 0);
    const marketAnchor = Math.max(1, template.common_market || 1000);
    const damageSeverity = totalDamage / marketAnchor;
    if(damageSeverity > 0.5) condition = Math.max(1, condition - 3);
    else if(damageSeverity > 0.25) condition = Math.max(1, condition - 2);
    else if(damageSeverity > 0.1) condition = Math.max(1, condition - 1);
  }
  let base = Math.round(template.common_market * (1 - age*0.025) - mileage/5000*150 + condition*300 + (Math.random()-0.5)*600);
  base = clamp(base, 300, Math.max(1000, template.common_market*1.4));
  const delusional = Math.random() < 0.14;
  const underpriced = Math.random() < 0.12;
  const asking = Math.round(base * (underpriced ? (0.65 + Math.random()*0.15) : (delusional ? (1.3 + Math.random()*0.6) : (1.05 + Math.random()*0.45))));
  const reserve = Math.round(base * (0.55 + Math.random()*0.45));
  const totalDamage = (damages||[]).reduce((s,d)=>s + (d.cost||0), 0);
  const damageDiscount = Math.round(totalDamage * 0.7);
  const estimatedResale = Math.max(300, Math.round(base * (1.1 + Math.random()*0.4) - damageDiscount));
  const id = uid("car");
  return { id, make: template.make, model: template.model, year, mileage, condition, base, asking, reserve, estimatedResale, damages, status:"market" };
}

export default function App(){
  const [cash, setCash] = useState(()=>Number(localStorage.getItem("cash"))||7000);
  const [market, setMarket] = useState([]);
  const [inventory, setInventory] = useState(()=>JSON.parse(localStorage.getItem("inventory")||"[]"));
  const [listings, setListings] = useState(()=>JSON.parse(localStorage.getItem("listings")||"[]"));
  const [modal, setModal] = useState(null);
  const [now, setNow] = useState(Date.now());
  const buyerTimers = React.useRef({});
  const [toasts, setToasts] = useState([]);
  const priceUpdateTimes = React.useRef({});
  const PRICE_UPDATE_COOLDOWN = 60000; // ms
  const REFRESH_COOLDOWN = 60000; // ms
  const refreshTimeRef = React.useRef(0);

  // Game clock
  const GAME_DAY_MS = 60 * 1000; // 1 minute per in-game day
  const gameEpochRef = React.useRef(Number(localStorage.getItem('gameEpoch')) || Date.now());
  const lastAutoRefreshDayRef = React.useRef(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(()=>{ localStorage.setItem("cash", cash); },[cash]);
  useEffect(()=>{ localStorage.setItem("inventory", JSON.stringify(inventory)); },[inventory]);
  useEffect(()=>{ localStorage.setItem("listings", JSON.stringify(listings)); },[listings]);

  useEffect(()=>{ refreshMarket(true); },[]);

  useEffect(()=>{ const t = setInterval(()=> setNow(Date.now()), 1000); return ()=> clearInterval(t); },[]);

  useEffect(()=>{
    Object.values(buyerTimers.current).forEach(arr=>arr.forEach(t=>clearTimeout(t)));
    buyerTimers.current = {};
    listings.forEach(listing=>{
      if(listing.waveSchedule && listing.waveSchedule.length>0){
        buyerTimers.current[listing.id] = [];
        listing.waveSchedule.forEach(entry=>{
          const delay = Math.max(0, entry.dueAt - Date.now());
          const t = setTimeout(()=> runScheduledWave(listing.id, entry.id), delay);
          buyerTimers.current[listing.id].push(t);
        });
      }
    });
  },[listings]);

  // Market config
  const MARKET_SIZE = 24;
  const MARKET_CHURN = 0.30;

  function refreshMarket(bypassCooldown = false){
    const nowTs = Date.now();
    if(!bypassCooldown && (nowTs - refreshTimeRef.current < REFRESH_COOLDOWN)) return;
    refreshTimeRef.current = nowTs;
    if(!market || market.length === 0){
      const full = [];
      for(let i=0;i<MARKET_SIZE;i++){
        const template = modelsData[Math.floor(Math.random()*modelsData.length)];
        const car = generateCarInstance(template);
        if(i < Math.floor(MARKET_SIZE * 0.08)){
          car.asking = Math.round(car.asking * (0.55 + Math.random()*0.6));
          car.reserve = Math.round(car.reserve * (0.45 + Math.random()*0.6));
        }
        full.push(car);
      }
      setMarket(full);
      return;
    }
    const keepCount = Math.max(1, Math.floor(market.length * (1 - MARKET_CHURN)));
    const kept = market.slice(0, keepCount);
    const replaced = [];
    while(kept.length + replaced.length < MARKET_SIZE){
      const template = modelsData[Math.floor(Math.random()*modelsData.length)];
      const car = generateCarInstance(template);
      if(Math.random() < 0.06){
        car.asking = Math.round(car.asking * (0.6 + Math.random()*0.35));
        car.reserve = Math.round(car.reserve * (0.5 + Math.random()*0.35));
      }
      replaced.push(car);
    }
    setMarket([ ...kept, ...replaced ]);
  }

  function getNextRefreshRemaining(){
    const epoch = gameEpochRef.current;
    const elapsed = Date.now() - epoch;
    const dayIndex = Math.floor(elapsed / GAME_DAY_MS);
    const nextDue = epoch + (dayIndex + 1) * GAME_DAY_MS;
    const rem = Math.ceil(Math.max(0, (nextDue - Date.now())/1000));
    return rem;
  }

  useEffect(()=>{
    const epoch = gameEpochRef.current;
    const elapsed = now - epoch;
    const dayIndex = Math.floor(elapsed / GAME_DAY_MS);
    if(lastAutoRefreshDayRef.current === null) lastAutoRefreshDayRef.current = dayIndex;
    if(dayIndex > lastAutoRefreshDayRef.current){
      refreshMarket(true);
      lastAutoRefreshDayRef.current = dayIndex;
      addToast({ text: `A new morning has arrived — market refreshed.`, type: 'info' });
    }
  },[now]);

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

  function updateListingPrice(listingId, newPrice){ const last = priceUpdateTimes.current[listingId] || 0; const nowt = Date.now(); if(nowt - last < PRICE_UPDATE_COOLDOWN) return; priceUpdateTimes.current[listingId] = nowt; setListings(prev=>{ const next = prev.map(l=> l.id===listingId ? {...l, listPrice: newPrice} : l); const updated = next.find(x=>x.id===listingId); if(updated) scheduleBuyerWaves(updated); return next; }); addToast({ text: `Updated listing price to $${newPrice}`, type: 'info' }); }

  function getPriceCooldownRemaining(listingId){ const last = priceUpdateTimes.current[listingId] || 0; const rem = Math.ceil(Math.max(0, (last + PRICE_UPDATE_COOLDOWN - now)/1000)); return rem; }
  function getRefreshCooldownRemaining(){ const rem = Math.ceil(Math.max(0, (refreshTimeRef.current + REFRESH_COOLDOWN - now)/1000)); return rem; }

  function addToast(t){ const id = Math.random().toString(36).slice(2,9); const entry = { id, ...t }; setToasts(prev=>[...prev, entry]); const timeout = t.timeout || 3500; setTimeout(()=>{ setToasts(prev=>prev.filter(x=>x.id!==id)); }, timeout); }

  return (
    <div className="app">
      <div className="header">
        <h2>🚗 Car Dealer — Phase 1 Prototype (v2)</h2>
        <div>
          <span className="small">Cash: </span> <span className="cash">${cash.toLocaleString()}</span>
          {" "}
          <button className="btn secondary" style={{marginLeft:12, position:'relative', display:'inline-flex', alignItems:'center'}} disabled>
            Market updates automatically
            <span style={{marginLeft:8}}>
              <CooldownRing remaining={getNextRefreshRemaining()} duration={Math.ceil(GAME_DAY_MS/1000)} size={18} stroke={3} color="#007bff" bg="#eee" />
            </span>
          </button>
        </div>
      </div>

      <div className="tabs" style={{marginBottom:12}}>
        <button className={`tab-button ${activeTab==='all' ? 'active' : ''}`} onClick={()=>setActiveTab('all')}>All</button>
        <button className={`tab-button ${activeTab==='market' ? 'active' : ''}`} onClick={()=>setActiveTab('market')}>Market</button>
        <button className={`tab-button ${activeTab==='listings' ? 'active' : ''}`} onClick={()=>setActiveTab('listings')}>Listings</button>
        <button className={`tab-button ${activeTab==='inventory' ? 'active' : ''}`} onClick={()=>setActiveTab('inventory')}>Inventory</button>
      </div>

      {activeTab === 'all' ? (
        <div className="grid cols-3">
          <div className="card market-card">
            <h3>Market</h3>
            <div className="list scrollable" style={{marginTop:10}}>
              <Market mode="all" market={market} onInspect={(car)=>openNegotiation("buy", car)} getRefreshCooldownRemaining={getRefreshCooldownRemaining} nextRefreshSeconds={getNextRefreshRemaining()} />
            </div>
          </div>

          <div className="card">
            <h3>Listings</h3>
            <div className="list scrollable" style={{marginTop:10}}>
              {listings.length===0 ? (
                <div className="small">No active listings. List cars from inventory.</div>
              ) : (
                listings.map(l => (
                  <div key={l.id} className="car-card">
                    <div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <div style={{fontWeight:700}}>{l.year} {l.make} {l.model}</div>
                        <HeatBadge listing={l} />
                      </div>
                      <div className="small">List: ${l.listPrice.toLocaleString()} • Est resale: ${l.estimatedResale.toLocaleString()}</div>
                      {typeof l.purchasePrice !== 'undefined' ? (
                        <> 
                          <div className="small">Purchased for: ${Number(l.purchasePrice).toLocaleString()}</div>
                          {(() => { const pp = Number(l.purchasePrice); const profit = Math.round(l.listPrice - pp); const pct = pp ? Math.round((profit/pp)*100) : 0; const color = profit >= 0 ? '#28a745' : '#b21f2d'; return (<div className="small" style={{color,fontWeight:700}}>Profit: ${profit.toLocaleString()} ({pct >= 0 ? `+${pct}%` : `${pct}%`})</div>); })()}
                        </>
                      ) : null}
                      <div className="small">Buyers: {l.buyers?.length || 0}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <button className="btn" onClick={()=>openListingModal(l)}>View</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3>Inventory</h3>
            <div className="list scrollable" style={{marginTop:10}}>
              <Inventory inventory={inventory} onList={(car,price)=>createListing(car.id,price)} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid cols-1">
          {activeTab === 'market' && (
            <div className="card market-card full-width">
              <h3>Market</h3>
              <div className="list scrollable" style={{marginTop:10}}>
                <Market mode="market" market={market} onInspect={(car)=>openNegotiation("buy", car)} getRefreshCooldownRemaining={getRefreshCooldownRemaining} nextRefreshSeconds={getNextRefreshRemaining()} />
              </div>
            </div>
          )}
          {activeTab === 'listings' && (
            <div className="card full-width">
              <h3>Listings</h3>
              <div className="list scrollable" style={{marginTop:10}}>
                {listings.length===0 ? <div className="small">No active listings. List cars from inventory.</div> : listings.map(l=>(
                  <div key={l.id} className="car-card">
                    <div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <div style={{fontWeight:700}}>{l.year} {l.make} {l.model}</div>
                        <HeatBadge listing={l} />
                      </div>
                      <div className="small">List: ${l.listPrice.toLocaleString()} • Est resale: ${l.estimatedResale.toLocaleString()}</div>
                      {typeof l.purchasePrice !== 'undefined' ? (
                        <> 
                          <div className="small">Purchased for: ${Number(l.purchasePrice).toLocaleString()}</div>
                          {(() => { const pp = Number(l.purchasePrice); const profit = Math.round(l.listPrice - pp); const pct = pp ? Math.round((profit/pp)*100) : 0; const color = profit >= 0 ? '#28a745' : '#b21f2d'; return (<div className="small" style={{color,fontWeight:700}}>Profit: ${profit.toLocaleString()} ({pct >= 0 ? `+${pct}%` : `${pct}%`})</div>); })()}
                        </>
                      ) : null}
                      <div className="small">Buyers: {l.buyers?.length || 0}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <button className="btn" onClick={()=>openListingModal(l)}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'inventory' && (
            <div className="card full-width">
              <h3>Inventory</h3>
              <div className="list scrollable" style={{marginTop:10}}>
                <Inventory inventory={inventory} onList={(car,price)=>createListing(car.id,price)} />
              </div>
            </div>
          )}
        </div>
      )}

      {(() => {
        // ensure modals that reference listings receive the live listing object
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
        }

        return resolvedModal.side === "listing" ? (
          <ListingModal modal={resolvedModal} cash={cash} onCancel={()=>setModal(null)} onBuy={(car,price)=>finalizePurchaseWithToast(car,price)} onSell={finalizeSale} refreshMarket={refreshMarket} onNegotiate={openSellNegotiation} onRemoveBuyer={handleRemoveBuyer} onUpdatePrice={updateListingPrice} onUpdateBuyerOffer={updateBuyerOffer} getPriceCooldownRemaining={getPriceCooldownRemaining} getRefreshCooldownRemaining={getRefreshCooldownRemaining} now={now} />
        ) : (
          <NegotiationModal modal={resolvedModal} cash={cash} onCancel={()=>setModal(null)} onBuy={(car,price)=>finalizePurchaseWithToast(car,price)} onSell={finalizeSale} onRemoveBuyer={handleRemoveBuyer} onUpdateBuyerOffer={updateBuyerOffer} onRemoveMarketCar={removeMarketCar} />
        );
      })()}

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
