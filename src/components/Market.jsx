
import React, {useMemo, useState, useEffect} from "react";
import CooldownRing from "./CooldownRing";
import { CarCard } from "./CarCard";
import { Card, Button, Badge } from "./ui";
import { SPACING, COLORS } from "../constants";

const formatCurrency = (amount) => `$${amount?.toLocaleString() || '0'}`;

// Deal badge logic
function getDealBadges(car) {
  const badges = [];
  const currentYear = new Date().getFullYear();
  const age = currentYear - (car.year || currentYear);
  const avgMileagePerYear = 12000;
  const expectedMileage = age * avgMileagePerYear;
  
  // Hot Deal: Price significantly below estimated value
  if (car.asking && car.estimatedResale) {
    const discount = (car.estimatedResale - car.asking) / car.estimatedResale;
    if (discount > 0.15) {
      badges.push({ text: '🔥 Hot Deal', color: '#dc2626', bg: '#fee2e2' });
    }
  }
  
  // Excellent Condition
  if (car.condition >= 4) {
    badges.push({ text: '⭐ Excellent', color: '#7c3aed', bg: '#f3e8ff' });
  }
  
  // Low Mileage
  if (car.mileage && car.mileage < expectedMileage * 0.7) {
    badges.push({ text: '🚗 Low Miles', color: '#0369a1', bg: '#dbeafe' });
  }
  
  // Great Value: Good condition at reasonable price
  if (car.condition >= 3 && car.asking && car.estimatedResale) {
    const priceRatio = car.asking / car.estimatedResale;
    if (priceRatio <= 1.1 && priceRatio >= 0.85) {
      badges.push({ text: '💎 Great Value', color: '#16a34a', bg: '#dcfce7' });
    }
  }
  
  return badges;
}

export default function Market({market, onInspect, onBuyInspection, getRefreshCooldownRemaining, nextRefreshSeconds, mode = 'all'}){
  
  // ensure hooks run unconditionally; handle empty market after hooks
  if(!market || market.length===0) {
    return (
      <div style={{
        padding: SPACING.xl,
        textAlign: 'center',
        background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: '12px',
        border: '2px dashed #cbd5e1'
      }}>
        <div style={{ fontSize: '48px', marginBottom: SPACING.md }}>🏪</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#475569', marginBottom: SPACING.sm }}>
          Market is Empty
        </div>
        <div style={{ fontSize: '14px', color: '#64748b' }}>
          Wait for new inventory to arrive
        </div>
      </div>
    );
  }

  const refreshCooldown = getRefreshCooldownRemaining ? getRefreshCooldownRemaining() : 0;
  const nextRefresh = nextRefreshSeconds || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
      {/* Market Header with Stats and Refresh */}
      <Card style={{
        background: 'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
        color: 'white',
        border: 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: 700,
              marginBottom: SPACING.xs 
            }}>
              🏪 Car Market
            </h3>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {market.length} cars available • Professional dealer inventory
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
            {refreshCooldown > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                <CooldownRing 
                  remaining={refreshCooldown} 
                  duration={60} // Assuming 60 second refresh cycle
                  size={40} 
                  stroke={4} 
                  color="#60a5fa" 
                  bg="rgba(255,255,255,0.2)" 
                />
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  <div style={{ fontWeight: 600 }}>Next Refresh</div>
                  <div>{refreshCooldown}s</div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: `${SPACING.sm} ${SPACING.md}`,
                background: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>
                  ✅ New inventory available
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Market Cars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
        {market.map(car => {
          const dealBadges = getDealBadges(car);
          const inspectionCost = 100; // You might want to make this dynamic
          
          return (
            <Card key={car.id} style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: SPACING.lg,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ':hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)'
              }
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Car Information */}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 700, 
                    color: '#1e293b',
                    marginBottom: SPACING.sm 
                  }}>
                    {car.year} {car.make} {car.model}
                  </div>
                  
                  {/* Deal Badges */}
                  {dealBadges.length > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      gap: SPACING.xs, 
                      flexWrap: 'wrap',
                      marginBottom: SPACING.sm 
                    }}>
                      {dealBadges.map((badge, index) => (
                        <span key={index} style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none'
                        }}>
                          {badge.text}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Car Stats Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: SPACING.md,
                    marginBottom: SPACING.md 
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        Asking Price
                      </div>
                      <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '18px' }}>
                        {formatCurrency(car.asking)}
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        Condition
                      </div>
                      <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '16px' }}>
                        {car.condition}/5 ⭐
                      </div>
                    </div>
                    
                    {car.mileage && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                          Mileage
                        </div>
                        <div style={{ fontWeight: 700, color: '#6b7280', fontSize: '16px' }}>
                          {car.mileage?.toLocaleString()} mi
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                        Inspection
                      </div>
                      <div style={{ 
                        fontWeight: 700, 
                        color: car.inspected ? '#16a34a' : '#f59e0b', 
                        fontSize: '16px' 
                      }}>
                        {car.inspected ? '✅ Complete' : formatCurrency(inspectionCost)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Inspection Status */}
                  {car.inspected ? (
                    <div>
                      <div style={{
                        background: '#dcfce7',
                        padding: SPACING.sm,
                        borderRadius: '8px',
                        border: '1px solid #22c55e',
                        marginBottom: SPACING.sm
                      }}>
                        <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                          ✅ Inspection Complete
                        </div>
                      </div>
                      
                      {/* Damage Report */}
                      {car.damages && car.damages.length > 0 ? (
                        <div style={{
                          background: '#fee2e2',
                          padding: SPACING.sm,
                          borderRadius: '8px',
                          border: '1px solid #fecaca'
                        }}>
                          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, marginBottom: '4px' }}>
                            ⚠️ {car.damages.length} damage{car.damages.length > 1 ? 's' : ''} found:
                          </div>
                          {car.damages.map((damage, index) => (
                            <div key={index} style={{ fontSize: '10px', color: '#dc2626', marginBottom: '2px' }}>
                              • {damage.type}: {formatCurrency(damage.cost)} repair
                            </div>
                          ))}
                          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, marginTop: '4px' }}>
                            Total: {formatCurrency(car.estimatedRepairCost || car.damages.reduce((sum, d) => sum + d.cost, 0))}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          background: '#dcfce7',
                          padding: SPACING.sm,
                          borderRadius: '8px',
                          border: '1px solid #22c55e'
                        }}>
                          <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                            🎉 No damages found
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      background: '#fef3c7',
                      padding: SPACING.sm,
                      borderRadius: '8px',
                      border: '1px solid #fcd34d'
                    }}>
                      <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                        🔍 Inspection Report Available • Reveals hidden damage and repair costs
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: SPACING.sm,
                  minWidth: '140px',
                  marginLeft: SPACING.lg
                }}>
                  <Button 
                    variant="success"
                    size="medium"
                    onClick={() => onInspect(car)}
                    style={{
                      background: '#16a34a',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      padding: '10px 16px'
                    }}
                  >
                    🚗 View & Buy
                  </Button>
                  
                  {/* Conditional Inspect Button */}
                  {car.inspected ? (
                    <div style={{
                      padding: '10px 16px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: '8px',
                      border: '1px solid #22c55e',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 600
                    }}>
                      ✅ Inspected
                    </div>
                  ) : (
                    onBuyInspection && (
                      <Button 
                        variant="warning"
                        size="medium"
                        onClick={() => onBuyInspection(car.id, inspectionCost)}
                        style={{
                          background: '#f59e0b',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          padding: '10px 16px',
                          color: 'white'
                        }}
                      >
                        🔍 Inspect ({formatCurrency(inspectionCost)})
                      </Button>
                    )
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  )
}
