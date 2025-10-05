
import React, {useMemo, useState, useEffect} from "react";
import CooldownRing from "./CooldownRing";

export default function Market({market, onInspect, mode = 'all'}){
  if(!market || market.length===0) return <div className="small">No cars in market</div>;
  // featured carousel: cheapest, bestCondition, random (deduped)
  const featured = useMemo(()=>{
    if(!market || market.length===0) return [];
    const cheapest = [...market].sort((a,b)=> (a.asking||0) - (b.asking||0))[0];
    const bestCondition = [...market].sort((a,b)=> (b.condition||0) - (a.condition||0))[0];
    const rand = market[Math.floor(Math.random()*market.length)];
    const picks = [cheapest, bestCondition, rand].filter(Boolean);
    const seen = new Set();
    const dedup = [];
    for(const p of picks){ if(!seen.has(p.id)){ seen.add(p.id); dedup.push(p); } }
    return dedup;
  },[market]);

  const [featuredIndex, setFeaturedIndex] = useState(0);
  useEffect(()=>{ setFeaturedIndex(0); },[featured.length]);

  // auto-advance featured carousel when in compact/all mode every 3s
  useEffect(()=>{
    if(mode === 'market') return; // don't auto-advance in market full view
    if(!featured || featured.length <= 1) return;
    const iv = setInterval(()=> setFeaturedIndex(i => (i + 1) % featured.length), 3000);
    return ()=> clearInterval(iv);
  },[featured.length, mode]);

  const visibleFeatured = useMemo(()=>{
    if(!featured || featured.length===0) return [];
    // market mode: return all featured so CSS flex will fill width
    if(mode === 'market') return featured;
    // compact/all mode: show up to 3 around index but we will actually render a single center card
    if(featured.length <= 3) return featured;
    const out = [];
    for(let i=0;i<3;i++){ out.push(featured[(featuredIndex + i) % featured.length]); }
    return out;
  },[featured, featuredIndex, mode]);

  return (
    <>
      <div className="card" style={{marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
          <div style={{fontWeight:700}}>Featured</div>
        </div>

        <div style={{display:'flex',alignItems:'center'}}>
          <div className="carousel" style={{flex:1, overflow:'hidden', padding:'0 8px'}}>
            <div className="carousel-track" style={{display:'flex',gap:12,justifyContent:'center', alignItems:'stretch'}}>
              {mode === 'market' ? (
                // fill width: let cards flex to occupy space
                visibleFeatured.map((f)=> (
                  <div key={f.id} className={`card carousel-card`} style={{minWidth:140, flex:'1 1 0', maxWidth:400, minHeight:140, display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                      <div>
                        <div style={{fontWeight:700}}>{f.year} {f.make} {f.model}</div>
                        <div className="small">Asking: ${f.asking.toLocaleString()}</div>
                      </div>
                      <div style={{marginTop:8}}>
                        <button className="btn" onClick={()=>onInspect(f)}>Inspect</button>
                      </div>
                    </div>
                ))
              ) : (
                // compact/all mode: show a single active card centered
                featured.length > 0 ? (
                  <div key={featured[featuredIndex].id} className={`card carousel-card active`} style={{minWidth:220, maxWidth:360, margin:'0 auto', minHeight:160, display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontWeight:700}}>{featured[featuredIndex].year} {featured[featuredIndex].make} {featured[featuredIndex].model}</div>
                      <div className="small">Asking: ${featured[featuredIndex].asking.toLocaleString()}</div>
                    </div>
                    <div style={{marginTop:8}}>
                      <button className="btn" onClick={()=>onInspect(featured[featuredIndex])}>Inspect</button>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
      {market.map(car=>(
        <div key={car.id} className="car-card" style={{minHeight:140, display:'flex', justifyContent:'space-between', alignItems:'stretch'}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700}}>{car.year} {car.make} {car.model}</div>
            <div className="small">Mileage: {car.mileage.toLocaleString()} • Cond: {car.condition}/5</div>
            <div className="small">Asking: ${car.asking.toLocaleString()}</div>
            {car.damages && car.damages.length>0 ? (
              (() => {
                const total = car.damages.reduce((s,d)=>s + (d.cost||0), 0);
                const warn = total > (car.estimatedResale || car.base || 0);
                return (
                  <div className="small" style={{marginTop:6,color: warn ? '#b21f2d' : '#444'}}>
                    Damages: ${total.toLocaleString()} {warn ? '(⚠️ exceeds est. resale)' : ''}
                  </div>
                );
              })()
            ) : null}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8, alignSelf:'center', marginLeft:12}}>
            <button className="btn" onClick={()=>onInspect(car)}>Inspect</button>
          </div>
        </div>
      ))}
    </>
  )
}
