
import React, {useState, useEffect} from "react";

export default function Inventory({inventory, onList, onRepair, onSendToWorkshop, repairJobs}){
  if(!inventory || inventory.length===0) return <div className="small">No cars owned</div>;
  return (
    <>
      {inventory.map(car=>(
        <InventoryRow key={car.id} car={car} onList={onList} onRepair={onRepair} onSendToWorkshop={onSendToWorkshop} repairJobs={repairJobs} />
      ))}
    </>
  )
}

function InventoryRow({car, onList, onRepair, onSendToWorkshop, repairJobs}){
  const [sent, setSent] = useState(false);
  const job = (repairJobs || []).find(j=> j.carId === car.id && j.status !== 'done' && j.status !== 'cancelled');

  // clear the local 'sent' flag after a job completes (so status resets to Ready)
  useEffect(() => {
    const hasPendingJob = !!((repairJobs || []).find(j=> j.carId === car.id && j.status !== 'done' && j.status !== 'cancelled'));
    if(!hasPendingJob && (car.estimatedRepairCost || 0) === 0){
      setSent(false);
    }
  }, [repairJobs, car.estimatedRepairCost, car.id]);
  const canRepair = (car.estimatedRepairCost || 0) > 0;

  // determine visual status
  let status = 'ready';
  if(job) status = job.status === 'in-progress' ? 'repairing' : 'queued';
  else if(sent) status = 'queued';

  const showSendButton = onSendToWorkshop && canRepair && !sent;

  return (
    <div className="car-card">
      <div>
        <div style={{fontWeight:700}}>{car.year} {car.make} {car.model}</div>
        <div className="small">{typeof car.purchasePrice !== 'undefined' ? `Purchased: $${Number(car.purchasePrice).toLocaleString()} • ` : ''}{(car.repairSpent || 0) > 0 ? `Repairs: $${Number(car.repairSpent).toLocaleString()} • ` : ''}{(car.estimatedRepairCost || 0) > 0 ? `Est repair: $${car.estimatedRepairCost.toLocaleString()} • ` : ''}Est resale: ${car.estimatedResale.toLocaleString()}</div>
        <div className="small"><span className={`status-chip status-${status}`}>{status === 'ready' ? 'Ready' : status === 'queued' ? 'Queued' : 'Repairing'}</span></div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        {showSendButton ? (
          <button className="btn secondary" onClick={()=>{ setSent(true); onSendToWorkshop(car.id, Math.round(Math.max(200, (car.estimatedRepairCost||0)))); }}>{car.estimatedRepairCost ? 'Send to Workshop' : 'No repairs'}</button>
        ) : null}
      </div>
    </div>
  )
}
