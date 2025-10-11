import React from 'react';
import { Card, Badge, Button } from './ui';
import { formatCurrency } from '../utils/gameLogic';
import { evaluateDeal, getDealBadgeVariant, getDealBadgeText } from '../utils/gameLogic';
import { COLORS, SPACING } from '../constants';

export function CarCard({ 
  car, 
  showInspection = false, 
  showActions = true,
  showDetails = false,
  onInspect,
  onBuy,
  onClick,
  className = '',
  style = {} 
}) {
  const dealType = evaluateDeal(car.asking, car.estimatedResale || car.base);
  const dealVariant = getDealBadgeVariant(dealType);
  const dealText = getDealBadgeText(dealType);

  const cardStyle = {
    minHeight: 140,
    display: 'flex',
    flexDirection: showDetails ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: showDetails ? 'center' : 'flex-start',
    cursor: onClick ? 'pointer' : 'default',
    ...style
  };

  const totalDamages = car.damages ? car.damages.reduce((sum, d) => sum + (d.cost || 0), 0) : 0;
  const damageWarning = totalDamages > (car.estimatedResale || car.base || 0);

  return (
    <Card 
      variant={onClick ? 'clickable' : 'default'}
      className={className}
      style={cardStyle}
      onClick={onClick}
    >
      <div style={{ flex: showDetails ? 1 : 'none' }}>
        <div style={{ fontWeight: 700, marginBottom: SPACING.xs }}>
          {car.year} {car.make} {car.model}
        </div>
        
        {showDetails && (
          <div className="small" style={{ marginBottom: SPACING.xs }}>
            Mileage: {car.mileage?.toLocaleString()} • Cond: {car.condition}/5
          </div>
        )}
        
        <div className="small" style={{ marginBottom: SPACING.xs }}>
          Asking: {formatCurrency(car.asking)}
        </div>
        
        <div className="small" style={{ marginBottom: SPACING.sm }}>
          Est resale: {formatCurrency(car.estimatedResale || car.base)}
        </div>

        {car.inspected && car.damages && car.damages.length > 0 && showDetails && (
          <div 
            className="small" 
            style={{
              marginTop: 6,
              color: damageWarning ? COLORS.error : '#444',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            Damages: {formatCurrency(totalDamages)} {damageWarning ? '(⚠️ exceeds est. resale)' : ''}
          </div>
        )}
        
        <Badge variant={dealVariant}>
          {dealText}
        </Badge>

        {/* Only show damage warning after inspection */}
        {car.inspected && car.damages && car.damages.length > 0 && !showDetails && (
          <div style={{ 
            marginTop: SPACING.sm, 
            fontSize: 12, 
            color: COLORS.warning 
          }}>
            ⚠️ Has damages
          </div>
        )}
      </div>

      {showInspection && car.inspected && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          marginTop: SPACING.sm 
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 8px',
            background: COLORS.inspectionBg,
            border: `1px solid ${COLORS.inspectionBorder}`,
            borderRadius: 6
          }}>
            Repair est: {formatCurrency(car.estimatedRepairCost)}
          </div>
        </div>
      )}

      {showActions && (
        <div style={{ 
          display: 'flex', 
          gap: SPACING.sm, 
          marginTop: SPACING.sm 
        }}>
          {onInspect && !car.inspected && (
            <Button 
              variant="secondary" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onInspect(car);
              }}
            >
              Inspect
            </Button>
          )}
          
          {onBuy && (
            <Button 
              variant="primary" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onBuy(car);
              }}
            >
              Buy
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export function InventoryCarCard({ 
  car, 
  onRepair,
  onCreateListing,
  showActions = true,
  className = '',
  style = {} 
}) {
  const totalSpent = (Number(car.purchasePrice) || 0) + (Number(car.repairSpent) || 0);
  const hasDamages = car.damages && car.damages.length > 0;
  const estimatedRepairCost = car.estimatedRepairCost || 0;
  const potentialProfit = (car.estimatedResale || 0) - totalSpent - estimatedRepairCost;
  
  return (
    <Card className={className} style={{
      ...style,
      background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: SPACING.lg
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Car Info Section */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 700, 
            fontSize: '18px',
            color: '#1e293b',
            marginBottom: SPACING.sm 
          }}>
            {car.year} {car.make} {car.model}
          </div>
          
          {/* Financial Info Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: SPACING.sm,
            marginBottom: SPACING.md 
          }}>
            <div>
              <div className="small" style={{ color: '#64748b', fontWeight: 600 }}>
                Purchase Price
              </div>
              <div style={{ fontWeight: 700, color: '#dc2626' }}>
                {formatCurrency(car.purchasePrice)}
              </div>
            </div>
            
            <div>
              <div className="small" style={{ color: '#64748b', fontWeight: 600 }}>
                Estimated Resale
              </div>
              <div style={{ fontWeight: 700, color: '#16a34a' }}>
                {formatCurrency(car.estimatedResale)}
              </div>
            </div>
            
            {estimatedRepairCost > 0 && (
              <>
                <div>
                  <div className="small" style={{ color: '#64748b', fontWeight: 600 }}>
                    Repair Cost
                  </div>
                  <div style={{ fontWeight: 700, color: '#ea580c' }}>
                    {formatCurrency(estimatedRepairCost)}
                  </div>
                </div>
                
                <div>
                  <div className="small" style={{ color: '#64748b', fontWeight: 600 }}>
                    Potential Profit
                  </div>
                  <div style={{ 
                    fontWeight: 700, 
                    color: potentialProfit > 0 ? '#16a34a' : '#dc2626' 
                  }}>
                    {formatCurrency(potentialProfit)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Status Badges */}
          <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' }}>
            <Badge variant="info" style={{ 
              background: '#dbeafe', 
              color: '#1e40af',
              border: 'none',
              padding: '4px 12px'
            }}>
              Condition: {car.condition}/5
            </Badge>
            
            {hasDamages && (
              <Badge variant="warning" style={{ 
                background: '#fed7aa', 
                color: '#ea580c',
                border: 'none',
                padding: '4px 12px'
              }}>
                Needs Repair • {formatCurrency(estimatedRepairCost)}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions Section */}
        {showActions && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: SPACING.sm,
            minWidth: '120px'
          }}>
            {onCreateListing && (
              <Button 
                variant="success" 
                size="medium"
                style={{
                  background: '#16a34a',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  padding: '8px 16px'
                }}
                onClick={() => onCreateListing(car)}
              >
                📋 List for Sale
              </Button>
            )}
            
            {onRepair && hasDamages && (
              <Button 
                variant="warning" 
                size="medium"
                style={{
                  background: '#ea580c',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  color: 'white'
                }}
                onClick={() => onRepair(car)}
              >
                🔧 Send to Workshop
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}