
import React, {useState, useEffect} from "react";

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function pct(v){return Math.round(v*100)/100;}

export default function NegotiationModal({modal, cash, onCancel, onBuy, onSell}){
  const {side, subject, buyer: modalBuyer} = modal || {};
  // support older shape where `modal.car` might be present
  const car = subject || (modal && modal.car);
  const [round, setRound] = useState(1);
  const [patience, setPatience] = useState(side==="buy"? randInt(3,5): randInt(2,3));
  const [log, setLog] = useState([]);
  const [currentPlayerOffer, setCurrentPlayerOffer] = useState("");
  const [lastBuyerOffer, setLastBuyerOffer] = useState(null);
  const [sellerCounter, setSellerCounter] = useState(null);

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

  function addLog(text){
    setLog(l=>[...l, {round:round, text}]);
  }

  function computeInitialBuyerOffer(car){
    // IO = 15-25% below list price capped at buyer budget (simulate buyer budget near market)
    const L = car.listPrice || car.estimatedResale || car.base;
    const percent = 0.15 + Math.random()*0.1;
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
      // insult: chance walkaway
      if(Math.random() < 0.6){
        addLog(`You offered $${offer}. Seller is insulted and walks away.`);
        setPatience(0);
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

  function handleSellSideOffer(offer){
    // Player is selling; buyer has lastBuyerOffer and buyer budget near market
    const B = Math.round(car.estimatedResale * (0.9 + Math.random()*0.2)); // buyer max around market
    // if player over asks beyond budget, buyer walks
    if(offer > B){
      addLog(`You asked $${offer} which is above buyer's max ($${B}). Buyer walks.`);
      setPatience(0);
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

  function acceptBuyerOffer(){
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
    }
    // eslint-disable-next-line
  },[patience]);

  return (
    <div className="modal">
      <div className="card">
        <h3 style={{marginTop:0}}>{side==="buy" ? "Buying — Negotiation" : "Selling — Negotiation"}</h3>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700}}>{car.year} {car.make} {car.model}</div>
            <div className="small">Mileage: {car.mileage.toLocaleString()} • Cond: {car.condition}/5</div>
            <div className="small">Base/est: ${car.base.toLocaleString()} • Est resale: ${car.estimatedResale.toLocaleString()}</div>
            {car.damages && car.damages.length>0 ? <div className="small">Damages: {car.damages.map(d=>d.type+"($"+d.cost+")").join(", ")}</div> : null}
            <div style={{marginTop:8}} className="small">Patience: {patience}</div>
            <div style={{marginTop:8}} className="small">Round: {round}</div>
          </div>

          <div style={{width:320}}>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input className="input" placeholder="Enter offer" value={currentPlayerOffer} onChange={e=>setCurrentPlayerOffer(e.target.value)} />
              <button className="btn" onClick={handlePlayerOffer}>Make Offer</button>
              <button className="btn secondary" onClick={()=>{ onCancel(); }}>Cancel</button>
            </div>

            {side==="buy" ? (
              <>
                {sellerCounter ? (
                  <div style={{marginBottom:8}}>
                    <div className="small">Seller countered with <strong>${sellerCounter}</strong></div>
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <button className="btn" onClick={acceptSellerCounter}>Accept Counter</button>
                      <button className="btn secondary" onClick={declineCounter}>Decline</button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {lastBuyerOffer ? (
                  <div style={{marginBottom:8}}>
                    <div className="small">Buyer offered <strong>${lastBuyerOffer}</strong></div>
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <button className="btn" onClick={acceptBuyerOffer}>Accept Offer</button>
                      <button className="btn secondary" onClick={declineCounter}>Negotiate / Decline</button>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <div style={{marginTop:8}}>
              <div style={{fontWeight:700}}>Log</div>
              <div style={{maxHeight:220,overflowY:"auto",marginTop:6}}>
                {log.map((l,idx)=>(
                  <div key={idx} className="small" style={{padding:6,borderBottom:"1px solid #f1f1f1"}}>{l.text}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
