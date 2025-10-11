
import React, {useState, useEffect} from "react";
import { InventoryCarCard } from "./CarCard";
import { Button, Badge } from "./ui";
import { SPACING } from "../constants";

export default function Inventory({inventory, onList, onRepair, onSendToWorkshop, repairJobs}){
  if(!inventory || inventory.length===0) {
    return (
      <div style={{
        padding: SPACING.xl,
        textAlign: 'center',
        background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: '12px',
        border: '2px dashed #cbd5e1'
      }}>
        <div style={{ fontSize: '48px', marginBottom: SPACING.md }}>🚗</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#475569', marginBottom: SPACING.sm }}>
          No Cars in Inventory
        </div>
        <div className="small" style={{ color: '#64748b' }}>
          Purchase cars from the market to get started
        </div>
      </div>
    );
  }

  // Separate cars by status
  const readyCars = inventory.filter(car => {
    const job = (repairJobs || []).find(j=> j.carId === car.id && j.status !== 'done' && j.status !== 'cancelled');
    return !job && (!car.damages || car.damages.length === 0);
  });

  const damagedCars = inventory.filter(car => {
    const job = (repairJobs || []).find(j=> j.carId === car.id && j.status !== 'done' && j.status !== 'cancelled');
    return !job && car.damages && car.damages.length > 0;
  });

  const carsInWorkshop = inventory.filter(car => {
    const job = (repairJobs || []).find(j=> j.carId === car.id && j.status !== 'done' && j.status !== 'cancelled');
    return !!job;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: SPACING.md,
        marginBottom: SPACING.md
      }}>
        <div style={{
          background: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)',
          padding: SPACING.md,
          borderRadius: '10px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0369a1' }}>
            {readyCars.length}
          </div>
          <div style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: 600 }}>
            Ready to Sell
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, #fef3c7 0%, #fed7aa 100%)',
          padding: SPACING.md,
          borderRadius: '10px',
          border: '1px solid #fcd34d'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#d97706' }}>
            {damagedCars.length}
          </div>
          <div style={{ fontSize: '14px', color: '#92400e', fontWeight: 600 }}>
            Need Repairs
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(145deg, #f3e8ff 0%, #e9d5ff 100%)',
          padding: SPACING.md,
          borderRadius: '10px',
          border: '1px solid #c4b5fd'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#7c3aed' }}>
            {carsInWorkshop.length}
          </div>
          <div style={{ fontSize: '14px', color: '#5b21b6', fontWeight: 600 }}>
            In Workshop
          </div>
        </div>
      </div>

      {/* Ready Cars Section */}
      {readyCars.length > 0 && (
        <div>
          <h3 style={{ 
            color: '#1e293b', 
            marginBottom: SPACING.md,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm
          }}>
            ✅ Ready to Sell ({readyCars.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            {readyCars.map(car => (
              <InventoryRow 
                key={car.id} 
                car={car} 
                onList={onList} 
                onRepair={onRepair} 
                onSendToWorkshop={onSendToWorkshop} 
                repairJobs={repairJobs}
                showWorkshopButton={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Damaged Cars Section */}
      {damagedCars.length > 0 && (
        <div>
          <h3 style={{ 
            color: '#1e293b', 
            marginBottom: SPACING.md,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm
          }}>
            🔧 Need Repairs ({damagedCars.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            {damagedCars.map(car => (
              <InventoryRow 
                key={car.id} 
                car={car} 
                onList={onList} 
                onRepair={onRepair} 
                onSendToWorkshop={onSendToWorkshop} 
                repairJobs={repairJobs}
                showWorkshopButton={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cars in Workshop Section */}
      {carsInWorkshop.length > 0 && (
        <div>
          <h3 style={{ 
            color: '#1e293b', 
            marginBottom: SPACING.md,
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm
          }}>
            ⚙️ In Workshop ({carsInWorkshop.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            {carsInWorkshop.map(car => (
              <InventoryRow 
                key={car.id} 
                car={car} 
                onList={onList} 
                onRepair={onRepair} 
                onSendToWorkshop={onSendToWorkshop} 
                repairJobs={repairJobs}
                showWorkshopButton={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InventoryRow({car, onList, onRepair, onSendToWorkshop, repairJobs, showWorkshopButton = true}){
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
  let statusVariant = 'success';
  let statusBg = '#dcfce7';
  let statusColor = '#166534';
  
  if(job) {
    if (job.status === 'in-progress') {
      status = 'repairing';
      statusVariant = 'warning';
      statusBg = '#fef3c7';
      statusColor = '#92400e';
    } else {
      status = 'queued';
      statusVariant = 'info';
      statusBg = '#dbeafe';
      statusColor = '#1e40af';
    }
  } else if(sent) {
    status = 'queued';
    statusVariant = 'info';
    statusBg = '#dbeafe';
    statusColor = '#1e40af';
  }

  const displayWorkshopButton = showWorkshopButton && onSendToWorkshop && canRepair && !sent && !job;

  return (
    <div style={{
      position: 'relative',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    }}>
      {/* Status Banner */}
      <div style={{
        background: statusBg,
        color: statusColor,
        padding: `${SPACING.xs} ${SPACING.md}`,
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>
          {status === 'ready' ? '✅ Ready' : 
           status === 'queued' ? '⏳ Queued for Repair' : 
           '🔧 Repairing'}
        </span>
        
        {job && (
          <Badge variant={statusVariant} style={{
            background: 'rgba(255, 255, 255, 0.8)',
            border: 'none',
            fontSize: '10px'
          }}>
            {job.status === 'in-progress' ? 'In Progress' : 'Waiting'}
          </Badge>
        )}
      </div>

      {/* Car Card Content */}
      <div style={{ padding: SPACING.md }}>
        <InventoryCarCard
          car={car}
          onRepair={displayWorkshopButton ? (() => { 
            setSent(true); 
            onSendToWorkshop(car.id, Math.round(Math.max(200, (car.estimatedRepairCost||0)))); 
          }) : null}
          onCreateListing={onList}
          showActions={true}
        />
      </div>
    </div>
  )
}
