import React, {useState, useEffect} from 'react';
import ListingSummary from './ListingSummary';
import CooldownRing from './CooldownRing';

export default function NewListingModal({open, inventory, repairJobs, onCancel, onCreateListing}){
  if(!open) return null;
  const [selectedId, setSelectedId] = useState('');
  const [price, setPrice] = useState('');
  const [marginPct, setMarginPct] = useState(10);
  const selected = inventory.find(c=>c.id===selectedId);

  useEffect(()=>{
    if(selected){
      const base = Number(selected.estimatedResale || selected.base || 0);
      const suggested = Math.round(base * (1 + marginPct/100));
      setPrice(suggested);
    } else {
      setPrice('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedId]);

  useEffect(()=>{
    if(selected){
      const base = Number(selected.estimatedResale || selected.base || 0);
      const suggested = Math.round(base * (1 + marginPct/100));
      setPrice(suggested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[marginPct]);

  const canCreate = selectedId && price && !((repairJobs||[]).find(j=> j.carId===selectedId && j.status!=='done' && j.status!=='cancelled'));

  // ROI and buyer interest heuristic
  const totalSpent = selected ? (Number(selected.purchasePrice || 0) + Number(selected.repairSpent || 0)) : 0;
  const estResale = selected ? Number(selected.estimatedResale || selected.base || 0) : 0;
  const profitIfSold = price ? Math.round(Number(price) - totalSpent) : null;
  const profitPctIfSold = profitIfSold !== null && totalSpent ? Math.round((profitIfSold / Math.max(1, totalSpent)) * 100) : null;
  // buyer interest heuristic: ratio of list price to estResale
  const interestScore = estResale ? Math.max(0, Math.min(1, (estResale - Number(price || 0)) / Math.max(1, estResale))) : 0;

  return (
    <div className="modal">
      <div className="card" style={{position:'relative', width: 'min(900px, 92vw)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{margin:0}}>Create Listing</h3>
          <button onClick={onCancel} aria-label="Close" style={{background:'transparent',border:'none',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:12}}>
          <div>
            <label className="small">Select car</label>
            <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} style={{width:'100%',padding:8,marginTop:6}}>
              <option value="">Choose a car</option>
              {inventory.filter(c=> !((repairJobs||[]).find(j=> j.carId===c.id && j.status!=='done' && j.status!=='cancelled'))).map(c=> (
                <option key={c.id} value={c.id}>{c.year} {c.make} {c.model} {typeof c.purchasePrice !== 'undefined' ? ` — purchased $${Number(c.purchasePrice).toLocaleString()}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            {selected ? (
              <div>
                <ListingSummary listing={selected} hideBuyers={true} />
              </div>
            ) : (
              <div className="small">Select a car to preview details.</div>
            )}
          </div>

          <div style={{borderTop:'1px solid #f6f6f6',paddingTop:12}}>
            <div style={{fontWeight:700}}>Listing</div>
            <div style={{marginTop:8}}>
              <div className="small">List price</div>
              <input className="input" value={price} onChange={e=>setPrice(e.target.value)} style={{width:'100%',marginTop:6}} />
              <div style={{marginTop:8}} className="small">Margin: <strong>{marginPct}%</strong></div>
              <input type="range" min={0} max={40} value={marginPct} onChange={e=>setMarginPct(Number(e.target.value))} style={{width:'100%'}} />
            </div>

            {selected ? (
              <div style={{marginTop:12}}>
                <div style={{fontWeight:700}}>Estimate & ROI</div>
                <div className="small" style={{marginTop:6}}>Total spent: ${totalSpent.toLocaleString()}</div>
                <div className="small">If sold at ${Number(price).toLocaleString()} → Profit: {profitIfSold!==null ? `$${profitIfSold.toLocaleString()} (${profitPctIfSold!==null?profitPctIfSold+'%':''})` : '—'}</div>
                <div className="small" style={{marginTop:6,color: interestScore > 0.25 ? '#28a745' : (interestScore > 0.05 ? '#fd7e14' : '#b21f2d')}}>
                  Buyer interest (heuristic): {Math.round(interestScore*100)}%
                </div>
                {selected.damages && selected.damages.length>0 ? (
                  <div style={{marginTop:8,fontSize:13,color:'#666'}}>Listing a damaged car reduces buyer interest. Consider repairing for higher resale.</div>
                ) : null}
              </div>
            ) : null}

            <div style={{marginTop:12, display:'flex',gap:8}}>
              <button className="btn" disabled={!canCreate} onClick={()=>{ if(!canCreate) return; onCreateListing(selectedId, Number(price)); }}>Create Listing</button>
              <button className="btn secondary" onClick={onCancel}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}