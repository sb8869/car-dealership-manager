import React from 'react';
import CooldownRing from './CooldownRing';
import { Button, Badge, Card } from './ui';
import { SPACING, COLORS } from '../constants';

const formatCurrency = (amount) => `$${amount?.toLocaleString() || '0'}`;

export default function Workshop({inventory, repairJobs, onCancelJob}){
  const queued = (repairJobs || []).filter(j=> j.status === 'queued');
  const inProgress = (repairJobs || []).find(j=> j.status === 'in-progress');
  
  const getCarTitle = (carId) => {
    const c = (inventory||[]).find(x=> x.id === carId);
    return c ? `${c.year} ${c.make} ${c.model}` : carId;
  };

  const getCar = (carId) => {
    return (inventory||[]).find(x=> x.id === carId);
  };

  const hasAnyJobs = inProgress || queued.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
      {/* Workshop Header */}
      <div style={{
        background: 'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
        color: 'white',
        padding: SPACING.lg,
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: SPACING.sm }}>
          🔧 Auto Workshop
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Professional car repair services • One car at a time
        </div>
      </div>

      {!hasAnyJobs ? (
        /* Empty State */
        <div style={{
          padding: SPACING.xl,
          textAlign: 'center',
          background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: '12px',
          border: '2px dashed #cbd5e1'
        }}>
          <div style={{ fontSize: '48px', marginBottom: SPACING.md }}>🛠️</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#475569', marginBottom: SPACING.sm }}>
            Workshop is Empty
          </div>
          <div className="small" style={{ color: '#64748b' }}>
            Send damaged cars from your inventory to start repairs
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          {/* Current Repair */}
          {inProgress && (
            <div>
              <h3 style={{ 
                color: '#1e293b', 
                marginBottom: SPACING.md,
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.sm
              }}>
                ⚙️ Repair in Progress
              </h3>
              
              <Card style={{
                background: 'linear-gradient(145deg, #fef3c7 0%, #fed7aa 100%)',
                border: '1px solid #fcd34d',
                borderRadius: '12px',
                padding: SPACING.lg
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '18px', color: '#92400e', marginBottom: SPACING.sm }}>
                      {getCarTitle(inProgress.carId)}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
                      <div>
                        <div className="small" style={{ color: '#92400e', fontWeight: 600 }}>
                          Repair Cost
                        </div>
                        <div style={{ fontWeight: 700, color: '#ea580c' }}>
                          {formatCurrency(inProgress.cost)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="small" style={{ color: '#92400e', fontWeight: 600 }}>
                          Time Remaining
                        </div>
                        <div style={{ fontWeight: 700, color: '#ea580c' }}>
                          {Math.max(0, Math.ceil((inProgress.startAt + inProgress.durationMs - Date.now())/1000))}s
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: SPACING.lg }}>
                    <CooldownRing 
                      remaining={Math.max(0, Math.ceil((inProgress.startAt + inProgress.durationMs - Date.now())/1000))} 
                      duration={Math.ceil(inProgress.durationMs/1000)} 
                      size={64} 
                      stroke={6} 
                      color="#ea580c" 
                      bg="#fed7aa" 
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Repair Queue */}
          {queued.length > 0 && (
            <div>
              <h3 style={{ 
                color: '#1e293b', 
                marginBottom: SPACING.md,
                display: 'flex',
                alignItems: 'center',
                gap: SPACING.sm
              }}>
                ⏳ Repair Queue ({queued.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
                {queued.map((job, index) => {
                  const car = getCar(job.carId);
                  return (
                    <Card key={job.id} style={{
                      background: 'linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%)',
                      border: '1px solid #93c5fd',
                      borderRadius: '12px',
                      padding: SPACING.lg
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
                            <Badge style={{
                              background: '#1e40af',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              fontSize: '12px'
                            }}>
                              #{index + 1} in Queue
                            </Badge>
                          </div>
                          
                          <div style={{ fontWeight: 700, fontSize: '18px', color: '#1e40af', marginBottom: SPACING.sm }}>
                            {getCarTitle(job.carId)}
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.md }}>
                            <div>
                              <div className="small" style={{ color: '#1e40af', fontWeight: 600 }}>
                                Estimated Cost
                              </div>
                              <div style={{ fontWeight: 700, color: '#1d4ed8' }}>
                                {formatCurrency(job.cost)}
                              </div>
                            </div>
                            
                            {car && (
                              <div>
                                <div className="small" style={{ color: '#1e40af', fontWeight: 600 }}>
                                  Condition
                                </div>
                                <div style={{ fontWeight: 700, color: '#1d4ed8' }}>
                                  {car.condition}/5
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ marginLeft: SPACING.lg }}>
                          <Button 
                            variant="secondary"
                            size="medium"
                            style={{
                              background: 'white',
                              border: '2px solid #dc2626',
                              color: '#dc2626',
                              borderRadius: '8px',
                              fontWeight: 600,
                              padding: '8px 16px'
                            }}
                            onClick={() => onCancelJob && onCancelJob(job.id)}
                          >
                            ❌ Cancel
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
