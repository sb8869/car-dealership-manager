import React from 'react'

export default function ListingSummary({listing, hideBuyers=false}){
  // support either a full listing or a raw car object
  const pp = typeof listing.purchasePrice !== 'undefined' ? Number(listing.purchasePrice) : null;
  const repairs = Number(listing.repairSpent || 0);
  const totalSpent = (pp || 0) + repairs;
  const listPrice = (typeof listing.listPrice !== 'undefined' && listing.listPrice !== null) ? Number(listing.listPrice) : null;
  const estResale = (typeof listing.estimatedResale !== 'undefined' && listing.estimatedResale !== null) ? Number(listing.estimatedResale) : (typeof listing.base !== 'undefined' ? Number(listing.base) : null);
  const profit = (listPrice !== null && totalSpent) ? Math.round(listPrice - totalSpent) : null;
  const pct = (listPrice !== null && totalSpent) ? Math.round((profit / Math.max(1,totalSpent)) * 100) : null;
  const profitPositive = profit >= 0;

  const totalDamages = (listing && listing.damages ? (listing.damages||[]).reduce((s,d)=>s + (d.cost||0), 0) : 0);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <div style={{fontSize:16,fontWeight:800}}>{listing.year} {listing.make} {listing.model}</div>
        <div style={{fontSize:20,fontWeight:900, marginTop:6}}>{listPrice !== null ? `$${listPrice.toLocaleString()}` : (estResale !== null ? `$${estResale.toLocaleString()}` : '—')}</div>
        {profit !== null ? (
          <div style={{marginTop:6,fontSize:13,padding:'6px 10px',borderRadius:8,background: profitPositive ? '#e6ffef' : '#fff0f0', color: profitPositive ? '#147a38' : '#b21f2d', fontWeight:700, display:'inline-block'}}>
            {profitPositive ? 'Profit' : 'Loss'}: ${profit.toLocaleString()} {pct !== null ? `(${profitPositive?`+${pct}%`:`${pct}%`})` : ''}
          </div>
        ) : null}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><div style={{color:'#666'}}>Purchased</div><div style={{fontWeight:700}}>{pp !== null ? `$${pp.toLocaleString()}` : '—'}</div></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><div style={{color:'#666'}}>Repairs</div><div style={{fontWeight:700}}>${repairs.toLocaleString()}</div></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><div style={{color:'#666'}}>Est resale</div><div style={{fontWeight:700}}>{estResale !== null ? `$${estResale.toLocaleString()}` : '—'}</div></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><div style={{color:'#666'}}>Damages</div><div style={{fontWeight:700}}>${totalDamages.toLocaleString()}</div></div>
        {!hideBuyers && (
          <div style={{display:'flex',justifyContent:'space-between'}}><div style={{color:'#666'}}>Buyers</div><div style={{fontWeight:700}}>{listing && listing.buyers ? listing.buyers.length : 0}</div></div>
        )}
      </div>
    </div>
  )
}
