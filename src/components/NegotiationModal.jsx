
import React, {useState, useEffect} from "react";

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pct(v){return Math.round(v*100)/100;}

export default function NegotiationModal({modal, cash, onCancel, onBuy, onSell, onRemoveBuyer, onUpdateBuyerOffer, onRemoveMarketCar, onBuyInspection}){
  const {side, subject, buyer: modalBuyer} = modal || {};
  // support older shape where `modal.car` might be present
  const car = subject || (modal && modal.car);
  const [round, setRound] = useState(1);
  // establish initial patience once; store it in state so it doesn't change across re-renders
  const [initialPatience] = useState(() => {
    if(side === 'sell' && modalBuyer && modalBuyer.persona){
      const p = modalBuyer.persona;
      if(p === 'collector') return 3 + randInt(0,2);
      if(p === 'realist') return 2 + randInt(0,2);
      if(p === 'bargain') return 1 + randInt(0,1);
      if(p === 'impulse') return 1 + randInt(0,1);
    }
    return side === "buy" ? randInt(3,5) : randInt(2,3);
  });
  const [patience, setPatience] = useState(initialPatience);
  const [log, setLog] = useState([]);
  const [currentPlayerOffer, setCurrentPlayerOffer] = useState("");
  const [lastBuyerOffer, setLastBuyerOffer] = useState(null);
  const [sellerCounter, setSellerCounter] = useState(null);
  const [buyCounterValue, setBuyCounterValue] = useState("");
  const [counterValue, setCounterValue] = useState("");
  const [buyerWalked, setBuyerWalked] = useState(false);
  const [sellerWalked, setSellerWalked] = useState(false);

  function handleSellCounterValue(val){
    const price = Math.round(Number(val));
    if(!price || price<=0){ alert('Enter a valid counter'); return; }
  // use the actual buyer budget if available; fall back to a heuristic otherwise
  const B = (modalBuyer && typeof modalBuyer.budget === 'number') ? Math.round(modalBuyer.budget) : Math.round(car.estimatedResale * (0.9 + Math.random()*0.2));
    if(price > B){
      addLog(`Countered $${price} above buyer's max ($${B}). Buyer walks.`);
      if(typeof onRemoveBuyer === 'function' && modalBuyer){ try{ onRemoveBuyer(car.id, modalBuyer.id); }catch(e){} }
      setPatience(p=>p-1);
      setRound(r=>r+1);
      setCounterValue("");
      setBuyerWalked(true);
      return;
    }
    const io = lastBuyerOffer || computeInitialBuyerOffer(car);
    // persona affects acceptance probability
    let personaFactor = 1.0;
    if(modalBuyer && modalBuyer.persona){
      const p = modalBuyer.persona;
      if(p === 'collector') personaFactor = 1.2;
      if(p === 'impulse') personaFactor = 1.15;
      if(p === 'bargain') personaFactor = 0.85;
      if(p === 'realist') personaFactor = 1.0;
    }
    const baseProb = 0.25 + 0.5*(io / price);
    const willAccept = Math.random() < Math.min(0.98, baseProb * personaFactor);
    if(willAccept){
      addLog(`Buyer ${modalBuyer?.id || ''} accepts your counter $${price}. Deal.`);
      const buyerId = modalBuyer?.id || null;
      onSell(car.id, buyerId, price);
      setCounterValue("");
      return;
    }
    const raise = Math.round(io + Math.random()*(price - io)*0.4);
    addLog(`Buyer ${modalBuyer?.id || ''} declines and counters $${raise}.`);
    setLastBuyerOffer(raise);
    // notify parent to update buyer offer live
    if(typeof onUpdateBuyerOffer === 'function' && modalBuyer){ try{ onUpdateBuyerOffer(car.id, modalBuyer.id, raise); }catch(e){} }
    setPatience(p=>p-1);
    setRound(r=>r+1);
    setCounterValue("");
  }

  useEffect(()=>{
    // initialize buyer initial offer when selling
    if(side==="sell"){
      const io = computeInitialBuyerOffer(car);
      setLastBuyerOffer(io);
      addLog(`Buyer offers $${io}`);
    } else {
      // buying: we intentionally do not auto-log the seller asking price to avoid cluttering the negotiation log
    }
    // eslint-disable-next-line
  },[]);

  // prefill counter input when a buyer offer appears (suggest +5%)
  useEffect(()=>{
    if(lastBuyerOffer){
      // prefer the listing price as the initial counter so players can quickly pick list price
      const suggestion = (car && car.listPrice) ? Math.round(car.listPrice) : Math.round(lastBuyerOffer * 1.05);
      setCounterValue(String(suggestion));
    }
  },[lastBuyerOffer]);

  // prefill buy-side counter input with seller ask or current seller counter when buying
  useEffect(()=>{
    if(side === 'buy'){
      const amount = sellerCounter || (car && car.asking) || '';
      if(amount){ setBuyCounterValue(String(Math.round(amount))); }
    }
  },[side, sellerCounter, car]);

  // helpers for UI rendering
  const starString = (n=0) => {
    const filled = '★'.repeat(Math.max(0, Math.min(5, n||0)));
    const empty = '☆'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, n||0))));
    return filled + empty;
  };
  const inspectCost = Math.round(Math.max(100, (car && car.estimatedRepairCost || 0) * 0.12));
  const patiencePct = initialPatience ? Math.round((patience / initialPatience) * 100) : 0;
  const patienceColor = patiencePct > 66 ? '#28a745' : (patiencePct > 33 ? '#fd7e14' : '#b21f2d');

  function addLog(text){
    setLog(l=>[...l, {round:round, text}]);
  }

  function computeInitialBuyerOffer(car){
    const L = car.listPrice || car.estimatedResale || car.base;
    // persona-aware initial offer if modalBuyer provided
    const persona = modalBuyer && modalBuyer.persona ? modalBuyer.persona : null;
    let percent = 0.18 + Math.random()*0.07; // default 18-25%
    if(persona === 'bargain') percent = 0.25 + Math.random()*0.15; // 25-40%
    if(persona === 'realist') percent = 0.15 + Math.random()*0.12; // 15-27%
    if(persona === 'impulse') percent = 0.06 + Math.random()*0.12; // 6-18%
    if(persona === 'collector') percent = 0.05 + Math.random()*0.15; // 5-20%
    const io = Math.round(L*(1-percent));
    return io;
  }

  function handlePlayerOffer(){
    const offer = Math.round(Number(currentPlayerOffer));
    if(!offer || offer<=0){ alert("Enter a valid offer"); return; }
    if(side==="buy"){
      // player buying from seller: delegate to existing buy-counter handler which contains the buy logic
      if(offer>cash){ alert("Not enough cash"); return; }
      // handleBuyCounterValue can accept a number/string and will run the buy-side flow
      handleBuyCounterValue(String(offer));
      return;
    }
    // selling side: delegate to sell-side handler
    handleSellSideOffer(offer);
    return;
  }

  function handleBuyCounterValue(val){
    const price = Math.round(Number(val));
    if(!price || price<=0){ alert('Enter a valid counter'); return; }
    if(price > cash){ alert('Not enough cash'); return; }
    const sc = sellerCounter || (car && car.asking) || 0;
    // if the counter is extremely low relative to seller's counter/ask, treat as insult -> walk
    const insultRatio = price / Math.max(1, sc);
    const tinyAbsolute = Math.max(50, Math.round(sc * 0.02));
    if(price <= tinyAbsolute || insultRatio < 0.03){
      addLog(`You countered $${price}. Seller is outraged and walks away.`);
      setSellerWalked(true);
      setPatience(0);
      if(typeof onRemoveMarketCar === 'function'){
        try{ onRemoveMarketCar(car.id); }catch(e){}
      }
      setBuyCounterValue("");
      return;
    }

    if(price >= sc){
      addLog(`You countered $${price}. Seller accepts. Deal done.`);
      onBuy(subject, price);
      setBuyCounterValue("");
      return;
    }

    // acceptance probability should scale with closeness to seller counter/ask and be very small for low offers
    const acceptProb = Math.max(0.02, Math.min(0.95, 0.05 + 0.9 * (price / Math.max(1, sc))));
    const willAccept = Math.random() < acceptProb;
    if(willAccept){
      addLog(`Seller accepts your counter $${price}. Deal done.`);
      onBuy(subject, price);
      setBuyCounterValue("");
      return;
    }

    const raise = Math.round(sc + Math.random()*(sc - price)*0.4);
    setSellerCounter(raise);
    addLog(`Seller declines and counters $${raise}.`);
    setPatience(p=>p-1);
    setRound(r=>r+1);
    setBuyCounterValue("");
  }

  function handleSellSideOffer(offer){
    // Player is selling; buyer has lastBuyerOffer and buyer budget near market
  // prefer the modal buyer's known budget if present
  const B = (modalBuyer && typeof modalBuyer.budget === 'number') ? Math.round(modalBuyer.budget) : Math.round(car.estimatedResale * (0.9 + Math.random()*0.2)); // buyer max around market
    // if player over asks beyond budget, buyer walks
    if(offer > B){
      addLog(`You asked $${offer} which is above buyer's max ($${B}). Buyer walks.`);
      setPatience(0);
      // inform parent to remove this buyer from the listing
      if(typeof onRemoveBuyer === 'function' && modalBuyer){
        try{ onRemoveBuyer(car.id, modalBuyer.id); }catch(e){}
      }
      return;
    }
    // if offer within small margin of buyer offer, buyer may accept
    const io = lastBuyerOffer || computeInitialBuyerOffer(car);
    const gap = offer - io;
    // if offer is large jump from io, buyer may stand firm
    if(gap > io*0.25 && Math.random() < 0.6){
      addLog(`You countered $${offer}. Buyer stands firm at $${io}.`);
      setPatience(p=>p-1);
      setRound(r=>r+1);
      return;
    }
    // otherwise buyer may increase by random 0-15% of gap toward L (capped at B)
    const raisePct = Math.random()*0.15;
    const proposed = Math.round(io + raisePct*(offer - io));
    const buyerNext = Math.min(proposed, B);
    if(buyerNext === io && Math.random() < 0.5){
      addLog(`Buyer repeats $${io}.`);
      setPatience(p=>p-1);
      setRound(r=>r+1);
      return;
    }
    setLastBuyerOffer(buyerNext);
    addLog(`Buyer counters $${buyerNext}.`);
    setPatience(p=>p-1);
    setRound(r=>r+1);
    // if buyerNext is close enough to offer, buyer may accept
    if(Math.abs(buyerNext - offer) <= Math.round(Math.max(50, offer*0.05))){
      addLog(`Buyer accepts $${buyerNext}. Deal done.`);
      const buyerId = modalBuyer?.id || null;
      onSell(car.id, buyerId, buyerNext);
      return;
    }
  }

  function acceptSellerCounter(){
    if(!sellerCounter) return;
    if(side==="buy"){
      if(sellerCounter>cash){ alert("Not enough cash"); return; }
      addLog(`You accept seller's counter $${sellerCounter}. Deal done.`);
      onBuy(subject, sellerCounter);
    }
  }

  function acceptSellerAsk(){
    const ask = car && car.asking;
    if(!ask) return;
    if(ask > cash){ alert('Not enough cash'); return; }
    addLog(`You accept seller's asking price $${ask}. Deal done.`);
    onBuy(subject, ask);
  }

  function acceptBuyerOffer(){
    if(buyerWalked){ alert('Buyer has walked away.'); return; }
    if(!lastBuyerOffer) return;
    addLog(`You accept buyer's offer $${lastBuyerOffer}. Deal done.`);
    const buyerId = modalBuyer?.id || null;
    onSell(car.id, buyerId, lastBuyerOffer);
  }

  function declineCounter(){
    if(side==="buy"){
      addLog(`You decline the counter.`);
      setSellerCounter(null);
      setPatience(p=>p-1);
      setRound(r=>r+1);
    } else {
      addLog(`You decline buyer's offer.`);
      setLastBuyerOffer(null);
      setPatience(p=>p-1);
      setRound(r=>r+1);
    }
  }

  // end conditions
  useEffect(()=>{
    if(patience<=0){
      addLog("Negotiation ended: party walked away.");
      // if selling and there is a buyer in modal, remove the buyer from the listing
      if(side === "sell" && modalBuyer && typeof onRemoveBuyer === 'function'){
        try{ onRemoveBuyer(car.id, modalBuyer.id); }catch(e){}
      }
      // if buying and seller walked (patience exhausted), mark seller walked and remove car from market
      if(side === "buy"){
        setSellerWalked(true);
        if(typeof onRemoveMarketCar === 'function'){
          try{ onRemoveMarketCar(car.id); }catch(e){}
        }
      }
    }
    // eslint-disable-next-line
  },[patience]);

  return (
    <div className="modal">
    <div className="card" style={{position:'relative'}}>
      {/* Close X in top-right */}
      <button aria-label="Close" onClick={(e)=>{ e.stopPropagation(); if(typeof onCancel==='function') onCancel(); }} style={{position:'absolute',right:10,top:8,border:'none',background:'transparent',fontSize:18,cursor:'pointer',color:'#666'}}>✕</button>
          <div style={{display:"flex",flexDirection:'column',gap:12, width: '100%'}}>
              <div style={{display:"flex",flexDirection:'column',gap:12}}>
                {side === "buy" ? (
                  <>
                    {/* Redesigned buy card per requested layout */}
                    <div style={{padding:12,border:'1px solid #eee',borderRadius:8, marginBottom:8, background:'#fff'}}>
                      {/* Header */}
                      <div style={{fontSize:18,fontWeight:800, marginBottom:4}}>{car.year} {car.make} {car.model}</div>
                      <div className="small" style={{color:'#666', marginBottom:10}}>Negotiation in progress</div>

                      {/* Section 1 — Quick Snapshot */}
                      <div style={{display:'flex',justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderTop:'1px solid #f6f6f6'}}>
                        <div style={{fontSize:14,fontWeight:700}}>Mileage
                          <div style={{fontWeight:400,fontSize:14}}>{car.mileage.toLocaleString()}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:14,fontWeight:700}}>Condition</div>
                          <div style={{color:'#f5a623',fontSize:16}}>{starString(car.condition)}</div>
                        </div>
                      </div>

                      {/* Section 2 — Financials (centered, emphasized) */}
                      <div style={{textAlign:'center', padding:'12px 0', borderTop:'1px solid #f6f6f6'}}>
                        <div style={{fontSize:28,fontWeight:800, color:'#111'}}>${(sellerCounter || car.asking).toLocaleString()}</div>
                          <div className="small" style={{color:'#666'}}>Est. Resale: ${car.estimatedResale.toLocaleString()}</div>
                      </div>

                      {/* Section 3 — Damages / Inspection */}
                      <div style={{borderTop:'1px solid #f6f6f6', paddingTop:10, marginTop:8}}>
                        <div style={{fontWeight:700, marginBottom:6}}>Damages</div>
                        {car.inspected && car.damages && car.damages.length>0 ? (
                          <div style={{paddingLeft:8}}>
                            {car.damages.map((d,idx)=> (
                              <div key={idx} className="small">{d.type === 'body' ? '🚗💥' : '🔧'} {d.type.charAt(0).toUpperCase()+d.type.slice(1)}: -${d.cost.toLocaleString()}</div>
                            ))}
                          </div>
                        ) : car.inspected && (!car.damages || car.damages.length===0) ? (
                          <div className="small" style={{color:'#666', paddingLeft:8}}>No damages reported.</div>
                        ) : (
                          <div className="small" style={{color:'#666', paddingLeft:8}}>Report unavailable — purchase Car Report to reveal damages.</div>
                        )}
                        {!car.inspected ? (
                          <div style={{marginTop:8}}>
                            <button className="btn" onClick={(e)=>{ e.stopPropagation(); if(typeof onBuyInspection === 'function'){ if(inspectCost > cash){ alert('Not enough cash for inspection'); return; } onBuyInspection(car.id, inspectCost); } }} style={{background:'#17a2b8'}} disabled={inspectCost > cash}>Purchase Car Report (${inspectCost})</button>
                          </div>
                        ) : null}
                      </div>

                      {/* Section 4 — Negotiation status / patience */}
                      <div style={{marginTop:12}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div className="small">Negotiation status</div>
                        </div>
                        <div style={{height:10, background:'#f1f1f1', borderRadius:6, marginTop:6, overflow:'hidden'}}>
                          <div style={{width: Math.max(0, Math.min(100, patiencePct)) + '%', height:'100%', background:patienceColor}} />
                        </div>
                      </div>

                      {/* Section 5 — Negotiation controls */}
                      <div style={{marginTop:12}}>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <button className="btn" onClick={sellerCounter ? acceptSellerCounter : acceptSellerAsk} style={(sellerWalked || patience<=0) ? {background:'#ddd',color:'#777',cursor:'not-allowed'} : {background:'#28a745'}} disabled={sellerWalked || patience<=0 || ((sellerCounter ? sellerCounter : car.asking) > cash)}>Accept</button>
                          <input className="input" placeholder="Counter amount" value={buyCounterValue} onChange={e=>setBuyCounterValue(e.target.value)} onFocus={e=>e.target.select()} style={{width:120}} />
                          <button className="btn" onClick={()=>handleBuyCounterValue(buyCounterValue)} style={(sellerWalked || patience<=0) ? {background:'#ddd',color:'#777',cursor:'not-allowed'} : {background:'#fd7e14',border:'none'}} disabled={sellerWalked || patience<=0}>Counter</button>
                          <button className="btn secondary" onClick={declineCounter} style={(sellerWalked || patience<=0) ? {marginLeft:8,background:'#f5f5f5',color:'#777',borderColor:'#eee',cursor:'not-allowed'} : {marginLeft:8}} disabled={sellerWalked || patience<=0}>Decline</button>
                        </div>
                      </div>
                    </div>
                    {/* end buy card */}
                  </>
                ) : (
                  <>
                    {/* Redesigned sell card (same layout as buy but no damages/inspection) */}
                    <div style={{padding:12,border:'1px solid #eee',borderRadius:8, marginBottom:8, background:'#fff'}}>
                      <div style={{fontSize:18,fontWeight:800, marginBottom:4}}>{car.year} {car.make} {car.model}</div>
                      <div className="small" style={{color:'#666', marginBottom:10}}>Negotiation in progress</div>

                      {/* Snapshot */}
                      <div style={{display:'flex',justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderTop:'1px solid #f6f6f6'}}>
                        <div style={{fontSize:14,fontWeight:700}}>Mileage
                          <div style={{fontWeight:400,fontSize:14}}>{car.mileage.toLocaleString()}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:14,fontWeight:700}}>Condition</div>
                          <div style={{color:'#f5a623',fontSize:16}}>{starString(car.condition)}</div>
                        </div>
                      </div>

                      {/* Financials (centered) */}
                      <div style={{textAlign:'center', padding:'12px 0', borderTop:'1px solid #f6f6f6'}}>
                        <div style={{fontSize:28,fontWeight:800, color:'#111'}}>${lastBuyerOffer ? lastBuyerOffer.toLocaleString() : ((car.listPrice || car.purchasePrice || 0).toLocaleString())}</div>
                        <div className="small" style={{color:'#666'}}>
                          Purchased: ${typeof car.purchasePrice !== 'undefined' ? Number(car.purchasePrice).toLocaleString() : '-'}
                          {` `}•{` `}Repairs: ${Number(car.repairSpent || 0).toLocaleString()}
                          {` `}•{` `}Total spent: ${( (Number(car.purchasePrice || 0) + Number(car.repairSpent || 0)) ).toLocaleString()}
                        </div>
                      </div>

                      {/* Profit / counters (if purchasePrice known) */}
                      {typeof car.purchasePrice !== 'undefined' ? (()=>{
                        const pp = Number(car.purchasePrice || 0);
                        const repairs = Number(car.repairSpent || 0);
                        const totalSpent = pp + repairs;
                        const offerProfit = lastBuyerOffer ? Math.round(lastBuyerOffer - totalSpent) : null;
                        const offerPct = offerProfit !== null && totalSpent ? Math.round((offerProfit/Math.max(1,totalSpent))*100) : null;
                        const counterPrice = Number(counterValue) || null;
                        const counterProfit = counterPrice ? Math.round(counterPrice - totalSpent) : null;
                        const counterPct = counterProfit !== null && totalSpent ? Math.round((counterProfit/Math.max(1,totalSpent))*100) : null;
                        const offerColor = offerProfit >= 0 ? '#28a745' : '#b21f2d';
                        const counterColor = counterProfit >= 0 ? '#28a745' : '#b21f2d';
                        return (
                          <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8,marginBottom:4}}>
                            {offerProfit !== null ? <div style={{fontSize:12,color:offerColor,background: offerColor === '#28a745' ? '#f6fff6' : '#fff6f6',padding:'4px 8px',borderRadius:6,border:`1px solid ${offerColor}33`}}>Offer vs spent: ${offerProfit.toLocaleString()} ({offerPct >= 0 ? `+${offerPct}%` : `${offerPct}%`})</div> : null}
                            {counterProfit !== null ? <div style={{fontSize:12,color:counterColor,background: counterColor === '#28a745' ? '#f6fff6' : '#fff6f6',padding:'4px 8px',borderRadius:6,border:`1px solid ${counterColor}33`}}>Counter vs spent: ${counterProfit.toLocaleString()} ({counterPct >= 0 ? `+${counterPct}%` : `${counterPct}%`})</div> : null}
                          </div>
                        );
                      })() : null}

                      {/* Negotiation status / patience */}
                      <div style={{marginTop:12}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div className="small">Negotiation status</div>
                        </div>
                        <div style={{height:10, background:'#f1f1f1', borderRadius:6, marginTop:6, overflow:'hidden'}}>
                          <div style={{width: Math.max(0, Math.min(100, patiencePct)) + '%', height:'100%', background:patienceColor}} />
                        </div>
                      </div>

                      {/* Controls */}
                      <div style={{marginTop:12}}>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <button className="btn" onClick={acceptBuyerOffer} style={buyerWalked ? {background:'#ddd',color:'#777',cursor:'not-allowed'} : {background:'#28a745'}} disabled={buyerWalked || !lastBuyerOffer}>Accept</button>
                          <input className="input" placeholder="Counter amount" value={counterValue} onChange={e=>setCounterValue(e.target.value)} onFocus={e=>e.target.select()} style={{width:120}} />
                          <button className="btn" onClick={()=>handleSellCounterValue(counterValue)} style={buyerWalked ? {background:'#ddd',color:'#777',cursor:'not-allowed',border:'none'} : {background:'#fd7e14',border:'none'}} disabled={buyerWalked}>Counter</button>
                          <button className="btn secondary" onClick={declineCounter} style={buyerWalked ? {marginLeft:8,background:'#f5f5f5',color:'#777',borderColor:'#eee',cursor:'not-allowed'} : {marginLeft:8}} disabled={buyerWalked}>Decline</button>
                        </div>
                      </div>
                    </div>
                    {/* end sell card */}
                  </>
                )}
              </div>

              {/* render log under negotiation controls */}
              {log.length > 0 ? (
                <div style={{marginTop:14}}>
                  <div style={{fontWeight:700, marginBottom:8}}>Log</div>
                  <div style={{maxHeight:220,overflowY:"auto",marginTop:6,border:'1px solid #f6f6f6',borderRadius:6,padding:6,background:'#fafafa'}}>
                    {log.map((l,idx)=>(
                      <div key={idx} className="small" style={{padding:6,borderBottom: idx===log.length-1 ? 'none' : '1px solid #f1f1f1'}}>{l.text}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
    );
  }
