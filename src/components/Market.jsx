
import React from "react";

export default function Market({market, onInspect}){
  if(!market || market.length===0) return <div className="small">No cars in market</div>;
  return (
    <>
      {market.map(car=>(
        <div key={car.id} className="car-card">
          <div>
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
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn" onClick={()=>onInspect(car)}>Inspect</button>
          </div>
        </div>
      ))}
    </>
  )
}
