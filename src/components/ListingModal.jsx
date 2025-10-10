
import React, {useState, useEffect} from "react";
import CooldownRing from "./CooldownRing";
import ListingSummary from "./ListingSummary";

export default function ListingModal({modal, cash, onCancel, onBuy, onSell, refreshMarket, onNegotiate, onRemoveBuyer, onUpdatePrice, getPriceCooldownRemaining, now}){
  if (!modal) return null;
  const {side} = modal;
  const listing = modal.subject;
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [log, setLog] = useState([]);
  const [priceEdit, setPriceEdit] = useState(listing.listPrice || 0);

  useEffect(()=>{
    if (side === "listing" && listing) {
      setLog([`Listing ${listing.year} ${listing.make} ${listing.model} at $${listing.listPrice}`]);
    }
  },[listing]);

  function addLog(t){ setLog(l=>[...l, t]); }

  function negotiateWith(buyer){
    setSelectedBuyer(buyer);
    addLog(`Selected buyer ${buyer.id} offering $${buyer.offer} (budget ${buyer.budget})`);
    if(onNegotiate){
      onNegotiate(listing, buyer);
    }
  }

  function acceptOffer(buyer){
    addLog(`Accepted offer $${buyer.offer}.`);
    onSell(listing.id, buyer.id, buyer.offer);
  }

  function counterBuyer(buyer, newPrice){
    const price = Math.round(Number(newPrice));
    if(!price) return;
    if(price > buyer.budget){
      addLog(`Countered ${buyer.id} at $${price} above budget. Buyer walks.`);
      if(typeof onRemoveBuyer === 'function') onRemoveBuyer(listing.id, buyer.id);
      return;
    }
    const willAccept = Math.random() < (0.25 + 0.5*(buyer.offer / price));
    if(willAccept){
      addLog(`Buyer ${buyer.id} accepts your counter $${price}. Deal.`);
      onSell(listing.id, buyer.id, price);
    } else {
      const raise = Math.round(buyer.offer + Math.random()*(price - buyer.offer)*0.4);
      addLog(`Buyer ${buyer.id} declines and counters $${raise}.`);
      refreshMarket();
    }
  }

  const totalDamages = (listing.damages||[]).reduce((s,d)=>s + (d.cost||0), 0);
  const damageWarn = totalDamages > (listing.estimatedResale || listing.base || 0);

  return (
    <div className="modal">
      <div className="card" style={{position:'relative', width: 'min(1000px, 92vw)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{margin:0}}>Listing — {listing.year} {listing.make} {listing.model}</h3>
          <button onClick={onCancel} aria-label="Close" style={{background:'transparent',border:'none',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{display:"flex",gap:12,marginTop:12}}>
            <div style={{flex:1}}>
            <ListingSummary listing={listing} />
            {listing.damages && listing.damages.length>0 ? (
              <div style={{marginTop:6,color: damageWarn ? '#b21f2d' : '#444'}} className="small">Damages: ${totalDamages.toLocaleString()} {damageWarn ? '(⚠️ exceeds est. resale)' : ''}</div>
            ) : null}

            <div style={{marginTop:8}} className="buyer-list">
              <div style={{fontWeight:700}}>Buyer Offers</div>
              {(!listing.buyers || listing.buyers.length===0) ? (
                <div className="small">No offers yet.</div>
              ) : (
                <div style={{maxHeight:420, overflowY:'auto', paddingRight:6}}>
                  {listing.buyers.map(b => (
                    <div key={b.id} className="car-card" style={{marginTop:8}}>
                      <div>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <div style={{fontWeight:700}}>Buyer {b.id}</div>
                          <div style={{fontSize:11, padding:'2px 8px', borderRadius:10, background:'#f1f5f9', color:'#0f172a'}}>{b.persona || 'realist'}</div>
                        </div>
                        <div className="small">Offer: ${b.offer} • Budget: ${b.budget} • Patience: {b.patience}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <button className="btn" onClick={()=>negotiateWith(b)}>Negotiate</button>
                        <button className="btn secondary" onClick={()=>acceptOffer(b)}>Accept</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div style={{width:420, minWidth:320}}>
            <div style={{fontWeight:700}}>Actions</div>
            <div style={{marginTop:8}} className="small">You can accept an existing offer or negotiate with a buyer — buyers appear automatically when the price is reasonable.</div>
            <div style={{marginTop:12}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input className="input" value={priceEdit} onChange={e=>setPriceEdit(Number(e.target.value))} style={{width:140}} />
                  {(()=>{
                    const rem = (typeof getPriceCooldownRemaining === 'function') ? getPriceCooldownRemaining(listing.id) : 0;
                    const disabled = rem > 0;
                    const frac = Math.max(0, Math.min(1, rem > 0 ? (rem / 60) : 0));
                    const progressStyle = {
                      width: 36,
                      height: 12,
                      borderRadius: 6,
                      background: '#eee',
                      overflow: 'hidden',
                      display: 'inline-block',
                      verticalAlign: 'middle',
                      marginLeft: 8
                    };
                    const fillStyle = {
                      width: `${Math.round((1-frac)*100)}%`,
                      height: '100%',
                      background: disabled ? '#6c757d' : '#28a745',
                      transition: 'width 300ms linear'
                    };

                    return (
                      <>
                        <button className="btn" disabled={disabled} onClick={()=>{ if(typeof onUpdatePrice === 'function'){ onUpdatePrice(listing.id, Math.round(Number(priceEdit))); addLog(`Updated price to $${Math.round(Number(priceEdit))}`); } }}>{'Update Price'}</button>
                        <span style={{marginLeft:8}}>
                          <CooldownRing remaining={rem} duration={60} size={18} stroke={3} color="#28a745" bg="#eee" />
                        </span>
                      </>
                    );
                  })()}
                </div>
            </div>

            <div style={{marginTop:12}}>
              <div style={{fontWeight:700}}>Log</div>
              <div style={{maxHeight:420,overflowY:"auto",marginTop:6}}>
                {log.map((l,idx)=>(<div key={idx} className="small" style={{padding:6,borderBottom:"1px solid #f1f1f1"}}>{l}</div>))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

