import React from 'react';
import CooldownRing from './CooldownRing';

export default function Workshop({inventory, repairJobs, onCancelJob}){
  if(!inventory || inventory.length===0) return <div className="small">No cars in workshop</div>;
  const queued = (repairJobs || []).filter(j=> j.status === 'queued');
  const inProgress = (repairJobs || []).find(j=> j.status === 'in-progress');
  const getCarTitle = (carId) => {
    const c = (inventory||[]).find(x=> x.id === carId);
    return c ? `${c.year} ${c.make} ${c.model}` : carId;
  };
  return (
    <div>
      <h4>Workshop</h4>
      <div className="small">Repair cars to improve resale — repairs cost money and take time.</div>
      <div style={{marginTop:8}}>
        {inProgress ? (
          <div className="car-card" style={{marginBottom:8}}>
            <div>
              <div style={{fontWeight:700}}>Repair in progress — {getCarTitle(inProgress.carId)}</div>
              <div className="small">Cost: ${inProgress.cost.toLocaleString()}</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <CooldownRing remaining={Math.max(0, Math.ceil((inProgress.startAt + inProgress.durationMs - Date.now())/1000))} duration={Math.ceil(inProgress.durationMs/1000)} size={32} stroke={4} color="#28a745" bg="#eee" />
            </div>
          </div>
        ) : null}

        {queued.length > 0 ? (
          <div style={{marginTop:6}}>
            <div style={{fontWeight:700}}>Queued</div>
            {queued.map(j=> (
              <div key={j.id} className="car-card" style={{marginTop:8}}>
                <div>
                  <div style={{fontWeight:700}}>{getCarTitle(j.carId)}</div>
                  <div className="small">Est repair: ${j.cost.toLocaleString()}</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn secondary" onClick={()=> onCancelJob && onCancelJob(j.id)}>Cancel</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Inventory details are shown in the main Inventory list; Workshop only shows jobs (queued/in-progress) to avoid duplication. */}
      </div>
    </div>
  )
}
