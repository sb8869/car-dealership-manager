
import React, {useState} from "react";

export default function Inventory({inventory, onList, onRepair}){
  if(!inventory || inventory.length===0) return <div className="small">No cars owned</div>;
  return (
    <>
      {inventory.map(car=>(
        <InventoryRow key={car.id} car={car} onList={onList} onRepair={onRepair} />
      ))}
    </>
  )
}

function InventoryRow({car, onList, onRepair}){
  const [price, setPrice] = useState(Math.round(car.estimatedResale*1.05));
  return (
    <div className="car-card">
      <div>
        <div style={{fontWeight:700}}>{car.year} {car.make} {car.model}</div>
        <div className="small">Paid: ${car.purchasePrice?.toLocaleString() || "N/A"} • Est resale: ${car.estimatedResale.toLocaleString()}</div>
        {car.estimatedRepairCost ? <div className="small">Repair est: ${car.estimatedRepairCost.toLocaleString()}</div> : null}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8, minWidth:200}}>
        <input className="input" value={price} onChange={e=>setPrice(Number(e.target.value))} />
        <div style={{display:"flex",gap:8}}>
          <button className="btn" onClick={()=>onList(car, price)}>List for Sale</button>
          {onRepair ? (
            <button className="btn secondary" onClick={()=>{ const cost = Math.round(Math.max(200, (car.estimatedRepairCost||0))); if(window.confirm(`Repair for $${cost}?`)){ onRepair(car.id, cost); } }}>Repair</button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
