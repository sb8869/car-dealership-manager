import React from 'react';

export default function Workshop({inventory, onRepair}){
  if(!inventory || inventory.length===0) return <div className="small">No cars in workshop</div>;
  return (
    <div>
      <h4>Workshop</h4>
      <div className="small">Repair cars to improve resale — repairs cost money and take time.</div>
      <div style={{marginTop:8}}>
        {inventory.map(car=> (
          <div key={car.id} className="car-card">
            <div>
              <div style={{fontWeight:700}}>{car.year} {car.make} {car.model}</div>
              <div className="small">Est repair: ${car.estimatedRepairCost?.toLocaleString() || 0} • Est resale: ${car.estimatedResale.toLocaleString()}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn" onClick={()=> onRepair && onRepair(car.id, Math.round(Math.max(200, (car.estimatedRepairCost||0))))}>Repair</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
