
import React, {useState, useEffect} from "react";

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pct(v){return Math.round(v*100)/100;}

export default function NegotiationModal({modal, cash, onCancel, onBuy, onSell, onRemoveBuyer, onUpdateBuyerOffer, onRemoveMarketCar}){
  const {side, subject, buyer: modalBuyer} = modal || {};
  // support older shape where `modal.car` might be present
  const car = subject || (modal && modal.car);
  const [round, setRound] = useState(1);
  // establish initial patience; if modalBuyer has a persona, bias patience accordingly
  const initialPatience = (() => {
    if(side === 'sell' && modalBuyer && modalBuyer.persona){
      const p = modalBuyer.persona;
      if(p === 'collector') return 3 + randInt(0,2);
      if(p === 'realist') return 2 + randInt(0,2);
      if(p === 'bargain') return 1 + randInt(0,1);
      if(p === 'impulse') return 1 + randInt(0,1);
    }
    return side === "buy" ? randInt(3,5) : randInt(2,3);
  })();
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
      // buying: show initial seller stance
      addLog(`Seller asks $${car.asking}`);
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
      // player buying from seller
      if(offer>cash){ alert("Not enough cash"); return; }
      handleBuySideOffer(offer);
    } else {
      // player selling to buyer
      handleSellSideOffer(offer);
    }
  }

  function handleBuySideOffer(offer){
    // Apply buyer-side negotiation matrix
    const A = car.asking;
    const R = car.reserve;
    const gapPercent = (R - offer)/Math.max(1, R);
    // insulting
    if(offer <= R*0.6){
      // insult: if the offer is extremely low relative to asking -> instant walk
      const insultRatio = offer / Math.max(1, A);
      const tinyAbsolute = Math.max(50, Math.round(A * 0.05));
      if(offer <= tinyAbsolute || insultRatio < 0.05){
        addLog(`You offered $${offer}. Seller is outraged and walks away immediately.`);
        setPatience(0);
        setSellerWalked(true);
        // remove market car immediately if parent provided handler
        if(typeof onRemoveMarketCar === 'function'){
          try{ onRemoveMarketCar(car.id); }catch(e){}
        }
        return;
      }

      // otherwise a strong chance to walk, otherwise they may scoff and counter
      if(Math.random() < 0.9){
        addLog(`You offered $${offer}. Seller is insulted and walks away.`);
        setPatience(0);
        setSellerWalked(true);
        if(typeof onRemoveMarketCar === 'function'){
          try{ onRemoveMarketCar(car.id); }catch(e){}
        }
        return;
      } else {
        const counter = Math.round(A - (Math.random()*0.05*A));
        setSellerCounter(counter);
        addLog(`You offered $${offer}. Seller scoffs and counters $${counter}.`);
        setPatience(p=>p-2);
        setRound(r=>r+1);
        return;
      }
    }

    // If offer >= ask -> instant accept maybe (but per rules seller may still counter)
    if(offer >= A){
      // seller accepts surprisingly
      addLog(`You offered $${offer}. Seller accepts. Deal done.`);
      onBuy(subject, offer);
      return;
    }

    // If offer >= R and early round seller may still counter above R (not auto-accept)
    if(offer >= R){
      // seller attempts to push for more unless patience low
      if(patience > 1 && Math.random() < 0.7){
        // counter somewhere between A and offer, biased to A
        const gap = A - offer;
        const dropPct = 0.05 + Math.random()*0.15;
        const counter = Math.round(A - dropPct* (A - offer));
        setSellerCounter(counter);
        addLog(`You offered $${offer}. Seller doesn't accept yet and counters $${counter}.`);
        setPatience(p=>p-1);
        setRound(r=>r+1);
        return;
      } else {
        addLog(`You offered $${offer}. Seller accepts. Deal done.`);
        onBuy(subject, offer);
        return;
      }
    }

    // offer < R and not insulting
    // acceptance probability based on closeness to reserve
    const acceptProb = clamp(0.05 + 0.9*(offer/R), 0, 0.95);
    if(Math.random() < acceptProb){
      addLog(`You offered $${offer}. Seller surprisingly accepts. Deal done.`);
      onBuy(subject, offer);
      return;
    } else {
      // seller counters towards asking, random 5-15% of gap
      const gap = A - offer;
      const pct = 0.05 + Math.random()*0.10; // 5-15%
      const counter = Math.round(A - pct*gap);
      setSellerCounter(counter);
      addLog(`You offered $${offer}. Seller declines and counters $${counter}.`);
      setPatience(p=>p-1);
      setRound(r=>r+1);
      return;
    }
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
        <h3 style={{marginTop:0}}>{side==="buy" ? "Buying — Negotiation" : "Selling — Negotiation"}</h3>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700}}>{car.year} {car.make} {car.model}</div>
            <button onClick={onCancel} aria-label="Close" style={{position:'absolute',top:12,right:12,background:'transparent',border:'none',fontSize:18,cursor:'pointer'}}>✕</button>
            <div className="small">Mileage: {car.mileage.toLocaleString()} • Cond: {car.condition}/5</div>
            <div className="small">Base/est: ${car.base.toLocaleString()} • Est resale: ${car.estimatedResale.toLocaleString()}</div>
            {side === 'sell' && typeof car.purchasePrice !== 'undefined' ? (
              <div className="small">Purchased for: ${Number(car.purchasePrice).toLocaleString()}</div>
            ) : null}
            {car.damages && car.damages.length>0 ? <div className="small">Damages: {car.damages.map(d=>d.type+"($"+d.cost+")").join(", ")}</div> : null}
            <div style={{marginTop:8}} className="small">Patience: {patience}</div>
            <div style={{marginTop:8}} className="small">Round: {round}</div>
          </div>

          <div style={{width:360, minWidth:260}}>
            <div style={{display:"flex",flexDirection:'column',gap:12}}>
              {side === "buy" ? (
                <>
                  {/* Seller ask / counter card (mirrors sell-side buyer card) */}
                  <div style={{padding:8,border:'1px solid #eee',borderRadius:6, marginBottom:8}}>
                    <div style={{fontWeight:700, marginBottom:6}}>{sellerCounter ? 'Seller countered' : 'Seller asks'}</div>
                    <div style={{fontSize:20,fontWeight:700, marginBottom:8}}>${sellerCounter || car.asking}</div>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <button className="btn" onClick={sellerCounter ? acceptSellerCounter : acceptSellerAsk} style={(sellerWalked || patience<=0) ? {background:'#ddd',color:'#777',cursor:'not-allowed'} : {background:'#28a745'}} disabled={sellerWalked || patience<=0 || ((sellerCounter ? sellerCounter : car.asking) > cash)}>Accept</button>
                      <input className="input" placeholder="Counter amount" value={buyCounterValue} onChange={e=>setBuyCounterValue(e.target.value)} onFocus={e=>e.target.select()} style={{width:120}} />
                      <button className="btn" onClick={()=>handleBuyCounterValue(buyCounterValue)} style={(sellerWalked || patience<=0) ? {background:'#ddd',color:'#777',cursor:'not-allowed'} : {background:'#fd7e14',border:'none'}} disabled={sellerWalked || patience<=0}>Counter</button>
                      <button className="btn secondary" onClick={declineCounter} style={(sellerWalked || patience<=0) ? {marginLeft:8,background:'#f5f5f5',color:'#777',borderColor:'#eee',cursor:'not-allowed'} : {marginLeft:8}} disabled={sellerWalked || patience<=0}>Decline</button>
                    </div>
                  </div>

                  {/* Quick offer removed — use Accept/Counter/Decline controls only */}
                </>
              ) : (
                <>
                  {lastBuyerOffer ? (
                    <div style={{padding:8,border:'1px solid #eee',borderRadius:6}}>
                      <div style={{fontWeight:700, marginBottom:6}}>Buyer offered</div>
                      <div style={{fontSize:20,fontWeight:700, marginBottom:8}}>${lastBuyerOffer}</div>
                      {modalBuyer && typeof modalBuyer.budget === 'number' ? (
                        <div className="small" style={{marginBottom:8}}>Budget (max): ${modalBuyer.budget.toLocaleString()}</div>
                      ) : (car.estimatedResale ? (
                        <div className="small" style={{marginBottom:8}}>Budget (est): ${Math.round(car.estimatedResale).toLocaleString()}</div>
                      ) : null)}
                      {typeof car.purchasePrice !== 'undefined' ? (()=>{
                        const pp = Number(car.purchasePrice);
                        const offerProfit = lastBuyerOffer ? Math.round(lastBuyerOffer - pp) : null;
                        const offerPct = offerProfit !== null && pp ? Math.round((offerProfit/pp)*100) : null;
                        const counterPrice = Number(counterValue) || null;
                        const counterProfit = counterPrice ? Math.round(counterPrice - pp) : null;
                        const counterPct = counterProfit !== null && pp ? Math.round((counterProfit/pp)*100) : null;
                        const offerColor = offerProfit >= 0 ? '#28a745' : '#b21f2d';
                        const counterColor = counterProfit >= 0 ? '#28a745' : '#b21f2d';
                        return (
                          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                            {offerProfit !== null ? <div style={{fontSize:12,color:offerColor,background: offerColor === '#28a745' ? '#f6fff6' : '#fff6f6',padding:'4px 8px',borderRadius:6,border:`1px solid ${offerColor}33`}}>Offer: ${offerProfit.toLocaleString()} ({offerPct >= 0 ? `+${offerPct}%` : `${offerPct}%`})</div> : null}
                            {counterProfit !== null ? <div style={{fontSize:12,color:counterColor,background: counterColor === '#28a745' ? '#f6fff6' : '#fff6f6',padding:'4px 8px',borderRadius:6,border:`1px solid ${counterColor}33`}}>Counter: ${counterProfit.toLocaleString()} ({counterPct >= 0 ? `+${counterPct}%` : `${counterPct}%`})</div> : null}
                          </div>
                        );
                      })() : null}
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <button className="btn" onClick={acceptBuyerOffer} style={buyerWalked ? {background:'#ddd',color:'#777',cursor:'not-allowed'} : {background:'#28a745'}} disabled={buyerWalked}>Accept</button>
                        <input className="input" placeholder="Counter amount" value={counterValue} onChange={e=>setCounterValue(e.target.value)} onFocus={e=>e.target.select()} style={{width:120}} />
                        <button className="btn" onClick={()=>handleSellCounterValue(counterValue)} style={buyerWalked ? {background:'#ddd',color:'#777',cursor:'not-allowed',border:'none'} : {background:'#fd7e14',border:'none'}} disabled={buyerWalked}>Counter</button>
                        <button className="btn secondary" onClick={declineCounter} style={buyerWalked ? {marginLeft:8,background:'#f5f5f5',color:'#777',borderColor:'#eee',cursor:'not-allowed'} : {marginLeft:8}} disabled={buyerWalked}>Decline</button>
                      </div>
                    </div>
                  ) : (
                    <div className="small">No buyer offer available.</div>
                  )}
                  {buyerWalked ? <div style={{marginTop:8,color:'#b21f2d',fontWeight:700}}>Buyer walked away.</div> : null}
                </>
              )}
            </div>

          </div>
        </div>

        <div style={{marginTop:14}}>
          <div style={{fontWeight:700, marginBottom:8}}>Log</div>
          <div style={{maxHeight:220,overflowY:"auto",marginTop:6,border:'1px solid #f6f6f6',borderRadius:6,padding:6,background:'#fafafa'}}>
            {log.map((l,idx)=>(
              <div key={idx} className="small" style={{padding:6,borderBottom: idx===log.length-1 ? 'none' : '1px solid #f1f1f1'}}>{l.text}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
