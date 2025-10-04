
import React, {useState} from "react";

export default function Inventory({inventory, onList}){
  if(!inventory || inventory.length===0) return <div className="small">No cars owned</div>;
  return (
    <>
      {inventory.map(car=>(
        <InventoryRow key={car.id} car={car} onList={onList} />
      ))}
    </>
  )
}

function InventoryRow({car, onList}){
  const [price, setPrice] = useState(Math.round(car.estimatedResale*1.05));
  return (
    <div className="car-card">
      <div>
        <div style={{fontWeight:700}}>{car.year} {car.make} {car.model}</div>
        <div className="small">Paid: ${car.purchasePrice?.toLocaleString() || "N/A"} • Est resale: ${car.estimatedResale.toLocaleString()}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8, minWidth:200}}>
        <input className="input" value={price} onChange={e=>setPrice(Number(e.target.value))} />
        <div style={{display:"flex",gap:8}}>
          <button className="btn" onClick={()=>onList(car, price)}>List for Sale</button>
        </div>
      </div>
    </div>
  )
}
