
import React, {useState, useEffect} from "react";
import Market from "./components/Market";
import Inventory from "./components/Inventory";
import ListingModal from "./components/ListingModal";
import NegotiationModal from "./components/NegotiationModal";
import CooldownRing from "./components/CooldownRing";
import modelsData from "./data/models.json";

function uid(prefix="id"){
  return prefix + "_" + Math.random().toString(36).slice(2,9);
}
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
  // reduce condition if there are damages; scale further down when damages are large
  if(damages && damages.length>0){
    // base decrement for any damage
    condition = Math.max(1, condition - 1);
    // compute total damage cost and severity relative to model market
    const totalDamage = damages.reduce((s,d)=>s + (d.cost||0), 0);
    const marketAnchor = Math.max(1, template.common_market || 1000);
    const damageSeverity = totalDamage / marketAnchor; // how large damages are relative to the model's market value
    // apply additional condition penalties for large damage totals
    if(damageSeverity > 0.5) {
      condition = Math.max(1, condition - 3);
    } else if(damageSeverity > 0.25) {
      condition = Math.max(1, condition - 2);
    } else if(damageSeverity > 0.1) {
      condition = Math.max(1, condition - 1);
    }
  }
  // rebalance: base anchored to template.common_market, but give room for upside
  let base = Math.round(template.common_market * (1 - age*0.025) - mileage/5000*150 + condition*300 + (Math.random()-0.5)*600);
  base = clamp(base, 300, Math.max(1000, template.common_market*1.4));
  const delusional = Math.random() < 0.14; // 14% delusional
  // asking: some above base, delusional could be high; allow some sellers underprice as well
  const underpriced = Math.random() < 0.12; // 12% underpriced gems
  const asking = Math.round(base * (underpriced ? (0.65 + Math.random()*0.15) : (delusional ? (1.3 + Math.random()*0.6) : (1.05 + Math.random()*0.45))));
  const reserve = Math.round(base * (0.55 + Math.random()*0.45)); // seller floor
  // estimated resale improved: base * (1.1 - 1.5) so flips can be profitable
  // but large damages should reduce the realistic resale value
  const totalDamage = (damages||[]).reduce((s,d)=>s + (d.cost||0), 0);
  const damageDiscount = Math.round(totalDamage * 0.7); // assume ~70% of repair cost eats resale value
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

  useEffect(()=>{ localStorage.setItem("cash", cash); },[cash]);
  useEffect(()=>{ localStorage.setItem("inventory", JSON.stringify(inventory)); },[inventory]);
  useEffect(()=>{ localStorage.setItem("listings", JSON.stringify(listings)); },[listings]);

  useEffect(()=>{ refreshMarket(); },[]);

  // tick every second so cooldown UIs update
  useEffect(()=>{
    const t = setInterval(()=> setNow(Date.now()), 1000);
    return ()=> clearInterval(t);
  },[]);

  // when listings load/change, restore any scheduled waves that were persisted
  useEffect(()=>{
    // clear all existing timers
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
    // eslint-disable-next-line
  },[listings]);

  function refreshMarket(){
    // enforce refresh cooldown (no toast on block; UI shows cooldown)
    const nowTs = Date.now();
    if(nowTs - refreshTimeRef.current < REFRESH_COOLDOWN){
      return;
    }
    refreshTimeRef.current = nowTs;

    const list = [];
    for(let i=0;i<7;i++){
      const template = modelsData[Math.floor(Math.random()*modelsData.length)];
      const car = generateCarInstance(template);
      if(i<2){
        car.asking = Math.round(car.asking * (0.55 + Math.random()*0.6));
        car.reserve = Math.round(car.reserve * (0.45 + Math.random()*0.6));
      }
      list.push(car);
    }
    setMarket(list);
  }

  function openNegotiation(side, car){ // side can be "buy" to buy from market
    setModal({side, subject: car});
  }
  function openSellNegotiation(listing, buyer){
    // open negotiation modal for a specific buyer on a listing
    setModal({side: "sell", subject: listing, buyer});
  }
  function closeModal(){ setModal(null); }

  function finalizePurchase(car, price){
    setCash(c=>c-price);
    setInventory(prev=>[ {...car, purchasePrice:price, status:"owned"}, ...prev ]);
    setMarket(prev=>prev.filter(c=>c.id!==car.id));
    setModal(null);
  }

  function createListing(carId, listPrice){
    // move car from inventory to listings pool
    const car = inventory.find(c=>c.id===carId);
    if(!car) return;
    const listing = {...car, listPrice, id: "listing_"+Math.random().toString(36).slice(2,9), createdAt: Date.now(), waves: 0, buyers: []};
    setListings(prev=>[listing, ...prev]);
    setInventory(prev=>prev.filter(c=>c.id!==carId));
    // schedule automatic buyer waves based on price reasonableness
    scheduleBuyerWaves(listing);
  }
  function generateBuyerWave(listingId, waveSize = null){
    setListings(prev=>{
      return prev.map(listing=>{
        if(listing.id!==listingId) return listing;
        const buyers = [];
        const M = listing.estimatedResale || listing.base;
        // determine wavesize based on provided size or listing price vs market
        let wavesize = 0;
        if(waveSize !== null){
          wavesize = waveSize;
        } else {
          const ratio = listing.listPrice / Math.max(1, M);
          if(ratio <= 0.95) wavesize = 3 + Math.floor(Math.random()*2); // attractive
          else if(ratio <= 1.05) wavesize = 2 + Math.floor(Math.random()*2); // reasonable
          else if(ratio <= 1.15) wavesize = 1; // slightly high
          else wavesize = Math.random() < 0.25 ? 1 : 0; // overpriced
        }

        for(let i=0;i<wavesize;i++){
          const budget = Math.round(M * (0.8 + Math.random()*0.4));
          const io = Math.min(Math.round(listing.listPrice * (1 - (0.15 + Math.random()*0.15))), budget);
          buyers.push({ id: "b_"+Math.random().toString(36).slice(2,8), budget, offer: io, patience: 2 + Math.floor(Math.random()*2), interest: Math.random() });
        }
        // remove any executed schedule entries that are in the past (cleanup)
        const now = Date.now();
        const waveSchedule = (listing.waveSchedule||[]).filter(s => s.dueAt > now);
        return {...listing, buyers: [...(listing.buyers||[]), ...buyers], waves: (listing.waves||0)+1, waveSchedule };
      });
    });
  }

  // run a scheduled wave by id (called by timers)
  function runScheduledWave(listingId, waveId){
    const listing = listings.find(l=>l.id===listingId);
    if(!listing || !listing.waveSchedule) return;
    const entry = listing.waveSchedule.find(s=>s.id===waveId);
    if(!entry) return;
    // generate buyers for this scheduled size
    generateBuyerWave(listingId, entry.size);
    // remove entry from schedule in state
    setListings(prev=>prev.map(l=>{
      if(l.id!==listingId) return l;
      return {...l, waveSchedule: (l.waveSchedule||[]).filter(s=>s.id!==waveId)};
    }));
    // After executing a wave, if the listing is still attractive, schedule a follow-up wave occasionally
    // This keeps hot listings receiving new waves beyond the initial finite schedule
    const current = listings.find(l=>l.id===listingId);
    if(current){
      const M = current.estimatedResale || current.base;
      const ratio = current.listPrice / Math.max(1, M);
      if(ratio <= 0.95){
        // hot listing: schedule an extra small wave with some probability
        if(Math.random() < 0.6){
          const delay = 15000 + Math.floor(Math.random()*20000); // 15-35s
          createAndScheduleWave(listingId, 1 + Math.floor(Math.random()*2), delay);
        }
      } else if(ratio <= 1.05){
        // reasonable listing: occasional single buyer
        if(Math.random() < 0.25){
          const delay = 25000 + Math.floor(Math.random()*30000); // 25-55s
          createAndScheduleWave(listingId, 1, delay);
        }
      }
    }
  }

  // helper: create a scheduled wave entry persisted on the listing and start a timer
  function createAndScheduleWave(listingId, size, delayMs){
    const entry = { id: uid('wave'), dueAt: Date.now() + Math.max(0, delayMs), size };
    // persist entry onto listing
    setListings(prev => prev.map(l => l.id===listingId ? {...l, waveSchedule: [ ...(l.waveSchedule||[]), entry ] } : l));
    // ensure buyerTimers ref exists
    if(!buyerTimers.current[listingId]) buyerTimers.current[listingId] = [];
    const t = setTimeout(()=> runScheduledWave(listingId, entry.id), delayMs);
    buyerTimers.current[listingId].push(t);
  }

  function scheduleBuyerWaves(listing){
    if(!listing) return;
    // clear existing timers
    if(buyerTimers.current[listing.id]){
      buyerTimers.current[listing.id].forEach(t=>clearTimeout(t));
    }
    buyerTimers.current[listing.id] = [];

    const M = listing.estimatedResale || listing.base;
    const ratio = listing.listPrice / Math.max(1, M);
    const schedule = [];
    if(ratio <= 0.95){
      schedule.push({delay:0, size:3});
      schedule.push({delay:4000 + Math.floor(Math.random()*3000), size:2});
      schedule.push({delay:8000 + Math.floor(Math.random()*4000), size:1});
    } else if(ratio <= 1.05){
      schedule.push({delay:0, size:2});
      schedule.push({delay:5000 + Math.floor(Math.random()*4000), size:1});
    } else if(ratio <= 1.15){
      schedule.push({delay:0, size:1});
      if(Math.random() < 0.4) schedule.push({delay:6000 + Math.floor(Math.random()*4000), size:1});
    } else {
      if(Math.random() < 0.25) schedule.push({delay:0, size:1});
    }

    schedule.forEach(s=>{
      const t = setTimeout(()=>{
        generateBuyerWave(listing.id, s.size);
      }, s.delay);
      buyerTimers.current[listing.id].push(t);
    });
  }

  function removeBuyer(listingId, buyerId){
    setListings(prev=>{
      return prev.map(l=>{
        if(l.id!==listingId) return l;
        return {...l, buyers: (l.buyers||[]).filter(b=>b.id!==buyerId)};
      });
    });
  }

  // schedule waves for a listing and persist the schedule on the listing
  function scheduleBuyerWaves(listing){
    if(!listing) return;
    // clear existing timers for the listing
    if(buyerTimers.current[listing.id]){
      buyerTimers.current[listing.id].forEach(t=>clearTimeout(t));
    }
    buyerTimers.current[listing.id] = [];

    const M = listing.estimatedResale || listing.base;
    const ratio = listing.listPrice / Math.max(1, M);
    const schedule = [];
    if(ratio <= 0.95){
      schedule.push({delay:0, size:3});
      schedule.push({delay:4000 + Math.floor(Math.random()*3000), size:2});
      schedule.push({delay:8000 + Math.floor(Math.random()*4000), size:1});
    } else if(ratio <= 1.05){
      schedule.push({delay:0, size:2});
      schedule.push({delay:5000 + Math.floor(Math.random()*4000), size:1});
    } else if(ratio <= 1.15){
      schedule.push({delay:0, size:1});
      if(Math.random() < 0.4) schedule.push({delay:6000 + Math.floor(Math.random()*4000), size:1});
    } else {
      if(Math.random() < 0.25) schedule.push({delay:0, size:1});
    }

    // convert to entries with dueAt and id and persist on listing
    const now = Date.now();
    const entries = schedule.map(s=>({ id: uid('wave'), dueAt: now + s.delay, size: s.size }));

    setListings(prev=>prev.map(l=> l.id===listing.id ? {...l, waveSchedule: entries} : l ));

    // create timers for each entry
    entries.forEach(entry => {
      const delay = Math.max(0, entry.dueAt - Date.now());
      const t = setTimeout(()=> runScheduledWave(listing.id, entry.id), delay);
      buyerTimers.current[listing.id].push(t);
    });
  }

  function openListingModal(listing){
    setModal({side:"listing", subject: listing});
  }

  function finalizeSale(listingId, buyerId, price){
    const listing = listings.find(l=>l.id===listingId);
    if(!listing) return;
    setCash(c=>c+price);
    // remove listing
    setListings(prev=>prev.filter(l=>l.id!==listingId));
    // clear scheduled buyer timers for this listing
    if(buyerTimers.current[listingId]){
      buyerTimers.current[listingId].forEach(t=>clearTimeout(t));
      delete buyerTimers.current[listingId];
    }
    addToast({ text: `Sold ${listing.year} ${listing.make} ${listing.model} for $${price}`, type: 'success' });
    setModal(null);
  }

  function updateListingPrice(listingId, newPrice){
    const now = Date.now();
    const last = priceUpdateTimes.current[listingId] || 0;
    if(now - last < PRICE_UPDATE_COOLDOWN){
      // blocked due to cooldown; UI disables the Update button and shows a visual indicator instead of a toast
      return;
    }
    priceUpdateTimes.current[listingId] = now;
    setListings(prev=>{
      const next = prev.map(l=> l.id===listingId ? {...l, listPrice: newPrice} : l);
      const updated = next.find(x=>x.id===listingId);
      // reschedule waves based on new price
      if(updated) scheduleBuyerWaves(updated);
      return next;
    });
    addToast({ text: `Updated listing price to $${newPrice}`, type: 'info' });
  }

  // helpers for UI: cooldown remaining in seconds
  function getPriceCooldownRemaining(listingId){
    const last = priceUpdateTimes.current[listingId] || 0;
    const rem = Math.ceil(Math.max(0, (last + PRICE_UPDATE_COOLDOWN - now)/1000));
    return rem;
  }
  function getRefreshCooldownRemaining(){
    const rem = Math.ceil(Math.max(0, (refreshTimeRef.current + REFRESH_COOLDOWN - now)/1000));
    return rem;
  }

  // no global exposure; we'll pass cooldown helpers via props to children that need them

  function addToast(t){
    const id = Math.random().toString(36).slice(2,9);
    const entry = { id, ...t };
    setToasts(prev=>[...prev, entry]);
    const timeout = t.timeout || 3500;
    setTimeout(()=>{ setToasts(prev=>prev.filter(x=>x.id!==id)); }, timeout);
  }

  return (
    <div className="app">
      <div className="header">
        <h2>🚗 Car Dealer — Phase 1 Prototype (v2)</h2>
        <div>
          <span className="small">Cash: </span> <span className="cash">${cash.toLocaleString()}</span>
          {" "}
          <button className="btn secondary" style={{marginLeft:12, position:'relative', display:'inline-flex', alignItems:'center'}} onClick={()=>{ refreshMarket(); }}>
            Refresh Market
            <span style={{marginLeft:8}}>
              <CooldownRing remaining={getRefreshCooldownRemaining()} duration={60} size={18} stroke={3} color="#007bff" bg="#eee" />
            </span>
          </button>
        </div>
      </div>

      <div className="grid cols-3">
        <div className="card">
          <h3>Market</h3>
          <div className="list" style={{marginTop:10}}>
            <Market market={market} onInspect={(car)=>openNegotiation("buy", car)} getRefreshCooldownRemaining={getRefreshCooldownRemaining} />
          </div>
        </div>

        <div className="card">
          <h3>Listings</h3>
            <div className="list" style={{marginTop:10}}>
            {listings.length===0 ? <div className="small">No active listings. List cars from inventory.</div> : listings.map(l=>(
              <div key={l.id} className="car-card">
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <div style={{fontWeight:700}}>{l.year} {l.make} {l.model}</div>
                    <HeatBadge listing={l} />
                  </div>
                  <div className="small">List: ${l.listPrice.toLocaleString()} • Est resale: ${l.estimatedResale.toLocaleString()}</div>
                  <div className="small">Buyers: {l.buyers?.length || 0}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <button className="btn" onClick={()=>openListingModal(l)}>View</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Inventory</h3>
          <div className="list" style={{marginTop:10}}>
            <Inventory inventory={inventory} onList={(car,price)=>createListing(car.id,price)} />
          </div>
        </div>
      </div>

      {modal ? (
        modal.side === "listing" ? (
            <ListingModal modal={modal} cash={cash} onCancel={()=>setModal(null)} onBuy={(car,price)=>finalizePurchase(car,price)} onSell={finalizeSale} refreshMarket={refreshMarket} onNegotiate={openSellNegotiation} onRemoveBuyer={removeBuyer} onUpdatePrice={updateListingPrice} getPriceCooldownRemaining={getPriceCooldownRemaining} getRefreshCooldownRemaining={getRefreshCooldownRemaining} now={now} />
        ) : (
          <NegotiationModal modal={modal} cash={cash} onCancel={()=>setModal(null)} onBuy={(car,price)=>finalizePurchase(car,price)} onSell={finalizeSale} onRemoveBuyer={removeBuyer} />
        )
      ) : null}
      {/* Toast container */}
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
  // visual heat bar: 3 segments filled based on how attractive the price is
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
