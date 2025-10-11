import React, {useState, useEffect} from 'react';
import ModalWrapper from './ModalWrapper';
import { Button, Badge, Card } from './ui';
import { SPACING, COLORS } from '../constants';
import { calculateTotalSpent } from '../utils/carCalculations';

const formatCurrency = (amount) => `$${amount?.toLocaleString() || '0'}`;

export default function NewListingModal({open, preSelectedCar, inventory, repairJobs, onCancel, onCreateListing}){
  if(!open) return null;
  
  // Use preSelectedCar if available, otherwise fall back to selection mode
  const [selectedId, setSelectedId] = useState(preSelectedCar?.id || '');
  const [price, setPrice] = useState('');
  const [marginPct, setMarginPct] = useState(10);
  
  const selected = preSelectedCar || inventory.find(c=>c.id===selectedId);

  useEffect(()=>{
    if(selected){
      const base = Number(selected.estimatedResale || selected.base || 0);
      const suggested = Math.round(base * (1 + marginPct/100));
      setPrice(suggested);
    } else {
      setPrice('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedId, preSelectedCar]);

  useEffect(()=>{
    if(selected){
      const base = Number(selected.estimatedResale || selected.base || 0);
      const suggested = Math.round(base * (1 + marginPct/100));
      setPrice(suggested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[marginPct]);

  const canCreate = selected && price && !((repairJobs||[]).find(j=> j.carId===selected.id && j.status!=='done' && j.status!=='cancelled'));

  // Financial calculations
  const totalSpent = selected ? calculateTotalSpent(selected) : 0;
  const estResale = selected ? Number(selected.estimatedResale || selected.base || 0) : 0;
  const repairCost = selected?.estimatedRepairCost || 0;
  const profitIfSold = price ? Math.round(Number(price) - totalSpent - repairCost) : null;
  const profitPctIfSold = profitIfSold !== null && totalSpent ? Math.round((profitIfSold / Math.max(1, totalSpent)) * 100) : null;
  
  // Buyer interest heuristic: ratio of list price to estResale
  const interestScore = estResale ? Math.max(0, Math.min(1, (estResale - Number(price || 0)) / Math.max(1, estResale))) : 0;
  const hasDamages = selected?.damages && selected.damages.length > 0;

  return (
    <ModalWrapper 
      isOpen={open} 
      onClose={onCancel} 
      title="📋 Create Listing"
      width="min(800px, 95vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
        
        {/* Car Selection (only show if no preSelected car) */}
        {!preSelectedCar && (
          <Card style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: SPACING.sm }}>
              <label style={{ fontWeight: 600, color: '#374151' }}>Select Car</label>
            </div>
            <select 
              value={selectedId} 
              onChange={e=>setSelectedId(e.target.value)} 
              style={{
                width:'100%',
                padding: SPACING.sm,
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px'
              }}
            >
              <option value="">Choose a car to list</option>
              {inventory.filter(c=> !((repairJobs||[]).find(j=> j.carId===c.id && j.status!=='done' && j.status!=='cancelled'))).map(c=> (
                <option key={c.id} value={c.id}>
                  {c.year} {c.make} {c.model} — {formatCurrency(c.purchasePrice)}
                </option>
              ))}
            </select>
          </Card>
        )}

        {/* Car Details */}
        {selected && (
          <Card style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px'
          }}>
            <div style={{ marginBottom: SPACING.md }}>
              <h3 style={{ 
                margin: 0, 
                color: '#1e293b',
                fontSize: '20px',
                fontWeight: 700 
              }}>
                {selected.year} {selected.make} {selected.model}
              </h3>
            </div>

            {/* Financial Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
              gap: SPACING.md,
              marginBottom: SPACING.md 
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                  Purchase Price
                </div>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '16px' }}>
                  {formatCurrency(selected.purchasePrice)}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                  Estimated Resale
                </div>
                <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '16px' }}>
                  {formatCurrency(selected.estimatedResale)}
                </div>
              </div>

              {repairCost > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                    Repair Cost
                  </div>
                  <div style={{ fontWeight: 700, color: '#ea580c', fontSize: '16px' }}>
                    {formatCurrency(repairCost)}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                  Total Invested
                </div>
                <div style={{ fontWeight: 700, color: '#6b7280', fontSize: '16px' }}>
                  {formatCurrency(totalSpent + repairCost)}
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' }}>
              <Badge style={{ 
                background: '#dbeafe', 
                color: '#1e40af',
                border: 'none',
                padding: '4px 12px'
              }}>
                Condition: {selected.condition}/5
              </Badge>
              
              {hasDamages && (
                <Badge style={{ 
                  background: '#fed7aa', 
                  color: '#ea580c',
                  border: 'none',
                  padding: '4px 12px'
                }}>
                  ⚠️ Has Damage
                </Badge>
              )}
            </div>
          </Card>
        )}

        {/* Pricing Section */}
        {selected && (
          <Card style={{ 
            background: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd'
          }}>
            <div style={{ marginBottom: SPACING.md }}>
              <h4 style={{ 
                margin: 0, 
                color: '#0c4a6e',
                fontSize: '18px',
                fontWeight: 700 
              }}>
                💰 Set List Price
              </h4>
            </div>

            <div style={{ marginBottom: SPACING.md }}>
              <label style={{ 
                display: 'block',
                fontSize: '14px', 
                color: '#0c4a6e', 
                fontWeight: 600,
                marginBottom: SPACING.xs 
              }}>
                List Price
              </label>
              <input 
                type="number"
                value={price} 
                onChange={e=>setPrice(e.target.value)} 
                style={{
                  width:'100%',
                  padding: SPACING.sm,
                  borderRadius: '8px',
                  border: '1px solid #7dd3fc',
                  fontSize: '16px',
                  fontWeight: 600
                }}
                placeholder="Enter listing price..."
              />
            </div>

            <div style={{ marginBottom: SPACING.md }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: SPACING.xs 
              }}>
                <label style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: 600 }}>
                  Margin
                </label>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0369a1' }}>
                  {marginPct}% above resale value
                </span>
              </div>
              <input 
                type="range" 
                min={-20} 
                max={50} 
                value={marginPct} 
                onChange={e=>setMarginPct(Number(e.target.value))} 
                style={{ width:'100%' }} 
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#64748b',
                marginTop: '4px'
              }}>
                <span>-20%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
            </div>

            {/* Profit Analysis */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              padding: SPACING.md,
              borderRadius: '8px',
              border: '1px solid rgba(186, 230, 253, 0.5)'
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 700, 
                color: '#0c4a6e',
                marginBottom: SPACING.sm 
              }}>
                📊 Profit Analysis
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: SPACING.md 
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                    Expected Profit
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 700, 
                    color: profitIfSold > 0 ? '#16a34a' : '#dc2626' 
                  }}>
                    {profitIfSold !== null ? formatCurrency(profitIfSold) : '—'}
                  </div>
                  {profitPctIfSold !== null && (
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      ({profitPctIfSold > 0 ? '+' : ''}{profitPctIfSold}% ROI)
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                    Buyer Interest
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 700, 
                    color: interestScore > 0.25 ? '#16a34a' : (interestScore > 0.05 ? '#f59e0b' : '#dc2626')
                  }}>
                    {Math.round(interestScore*100)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {interestScore > 0.25 ? 'High' : interestScore > 0.05 ? 'Medium' : 'Low'}
                  </div>
                </div>
              </div>

              {hasDamages && (
                <div style={{
                  marginTop: SPACING.sm,
                  padding: SPACING.sm,
                  background: '#fef3c7',
                  borderRadius: '6px',
                  border: '1px solid #fcd34d'
                }}>
                  <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                    ⚠️ Damaged car warning: Buyers may be less interested. Consider repairs for better resale value.
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: SPACING.md, 
          justifyContent: 'flex-end',
          paddingTop: SPACING.md,
          borderTop: '1px solid #e5e7eb'
        }}>
          <Button 
            variant="secondary"
            size="medium"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '8px'
            }}
          >
            Cancel
          </Button>
          
          <Button 
            variant="success"
            size="medium"
            disabled={!canCreate}
            onClick={() => {
              if(!canCreate) return; 
              onCreateListing(selected.id, Number(price));
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: canCreate ? '#16a34a' : '#9ca3af',
              opacity: canCreate ? 1 : 0.6,
              fontWeight: 600
            }}
          >
            🚀 Create Listing
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}