import React from 'react';
import { calculateTotalDamages, calculateTotalSpent, calculateProfit, calculateProfitPercentage } from '../utils/carCalculations';

const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px'
};

export default function ListingSummary({listing, hideBuyers=false, onClick=null, clickable=false}){
  // support either a full listing or a raw car object
  const pp = typeof listing.purchasePrice !== 'undefined' ? Number(listing.purchasePrice) : null;
  const repairs = Number(listing.repairSpent || 0);
  const totalSpent = calculateTotalSpent(listing);
  const listPrice = (typeof listing.listPrice !== 'undefined' && listing.listPrice !== null) ? Number(listing.listPrice) : null;
  const estResale = (typeof listing.estimatedResale !== 'undefined' && listing.estimatedResale !== null) ? Number(listing.estimatedResale) : (typeof listing.base !== 'undefined' ? Number(listing.base) : null);
  const profit = listPrice !== null ? calculateProfit(listPrice, totalSpent) : null;
  const pct = profit !== null ? calculateProfitPercentage(profit, totalSpent) : null;
  const profitPositive = profit >= 0;

  const totalDamages = calculateTotalDamages(listing);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const getProfitColor = () => {
    if (profit === null) return '#6b7280';
    return profitPositive ? '#16a34a' : '#dc2626';
  };

  const getProfitBackground = () => {
    if (profit === null) return '#f3f4f6';
    return profitPositive ? '#dcfce7' : '#fee2e2';
  };

  const buyersCount = listing && listing.buyers ? listing.buyers.length : 0;
  const hasBuyers = buyersCount > 0;

  // Heat badge logic (deal quality indicator)
  const getHeatScore = () => {
    const M = estResale || listing.base || 1;
    const ratio = listPrice / M;
    if (ratio <= 0.95) return 3; // Hot deal
    if (ratio <= 1.05) return 2; // Good deal  
    if (ratio <= 1.15) return 1; // Fair deal
    return 0; // Overpriced
  };

  const getHeatColor = (score) => {
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745'];
    return colors[Math.min(score, 3)];
  };

  const heatScore = getHeatScore();

  return (
    <div 
      style={{
        background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: '12px',
        padding: SPACING.lg,
        border: '1px solid #e2e8f0',
        boxShadow: clickable ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease',
        cursor: clickable ? 'pointer' : 'default',
        position: 'relative',
        ...(clickable && {
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
          }
        })
      }}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={(e) => {
        if (clickable) {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
          e.target.style.background = 'linear-gradient(145deg, #f1f5f9 0%, #cbd5e1 100%)';
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          e.target.style.background = 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)';
        }
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: SPACING.lg }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
            color: 'white',
            padding: SPACING.md,
            borderRadius: '8px',
            marginBottom: SPACING.md,
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '2px'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>
                {listing.year} {listing.make} {listing.model}
              </div>
              
              {/* Heat Indicator */}
              <div style={{ 
                display: 'flex', 
                gap: '4px',
                alignItems: 'center'
              }}>
                {[0, 1, 2].map(i => {
                  const filled = i < heatScore;
                  return (
                    <div 
                      key={i} 
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        background: filled ? getHeatColor(heatScore) : 'rgba(255,255,255,0.3)',
                        transition: 'all 0.2s ease'
                      }} 
                    />
                  );
                })}
              </div>
            </div>
            
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#60a5fa' }}>
              {listPrice !== null ? formatCurrency(listPrice) : (estResale !== null ? formatCurrency(estResale) : '—')}
            </div>         
          </div>        {/* Profit/Loss Badge */}
        {profit !== null && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: '20px',
            background: getProfitBackground(),
            border: `1px solid ${getProfitColor()}20`,
            fontSize: '14px',
            fontWeight: 700,
            color: getProfitColor()
          }}>
            <span style={{ marginRight: '4px' }}>
              {profitPositive ? '📈' : '📉'}
            </span>
            {profitPositive ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(profit))}
            {pct !== null && (
              <span style={{ marginLeft: '4px', fontSize: '12px', opacity: 0.8 }}>
                ({profitPositive ? `+${pct}%` : `${pct}%`})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Financial Details */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: SPACING.md,
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 700, 
          marginBottom: SPACING.md,
          color: '#374151'
        }}>
          💰 Financial Breakdown
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Purchase Price</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#374151' }}>
              {pp !== null ? formatCurrency(pp) : '—'}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Repair Costs</span>
            <span style={{ 
              fontWeight: 700, 
              fontSize: '14px', 
              color: repairs > 0 ? '#dc2626' : '#374151' 
            }}>
              {formatCurrency(repairs)}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Est. Resale Value</span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#374151' }}>
              {estResale !== null ? formatCurrency(estResale) : '—'}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>Outstanding Damages</span>
            <span style={{ 
              fontWeight: 700, 
              fontSize: '14px', 
              color: totalDamages > 0 ? '#dc2626' : '#16a34a' 
            }}>
              {formatCurrency(totalDamages)}
            </span>
          </div>
          
          {/* Total Spent Separator */}
          <div style={{
            borderTop: '1px solid #e5e7eb',
            marginTop: SPACING.sm,
            paddingTop: SPACING.sm
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#374151', fontSize: '14px', fontWeight: 600 }}>Total Investment</span>
              <span style={{ fontWeight: 900, fontSize: '16px', color: '#1e293b' }}>
                {formatCurrency(totalSpent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Buyers Section */}
      {!hideBuyers && (
        <div style={{
          background: hasBuyers ? 'linear-gradient(145deg, #dcfce7 0%, #bbf7d0 100%)' : '#f9fafb',
          borderRadius: '8px',
          padding: SPACING.md,
          marginTop: SPACING.md,
          border: `1px solid ${hasBuyers ? '#22c55e' : '#e5e7eb'}`
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <span style={{ 
              color: hasBuyers ? '#166534' : '#6b7280', 
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {hasBuyers ? '🎯' : '👥'} Active Buyers
            </span>
            <div style={{
              background: hasBuyers ? '#16a34a' : '#9ca3af',
              color: 'white',
              borderRadius: '12px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 700,
              minWidth: '24px',
              textAlign: 'center'
            }}>
              {buyersCount}
            </div>
          </div>
          
          {hasBuyers && (
            <div style={{ 
              fontSize: '11px', 
              color: '#166534', 
              marginTop: '4px',
              opacity: 0.8 
            }}>
              {buyersCount === 1 ? 'Buyer is interested' : `${buyersCount} buyers are interested`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
