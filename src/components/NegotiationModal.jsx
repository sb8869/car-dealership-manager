import React, { useState } from "react";

export default function NegotiationModal({ modal, cash, onCancel, onBuy, onBuyInspection }) {
  const car = modal?.car || modal?.subject || {};
  const [playerOffer, setPlayerOffer] = useState('');
  const inspectionCost = 100;
  
  if (!car || !car.year) {
    return null;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const handleMakeOffer = () => {
    const offer = Number(playerOffer);
    if (offer && offer > 0 && offer <= cash) {
      onBuy(car, offer);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: 'min(600px, 95vw)',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            Car Purchase Negotiation
          </h2>
          <button 
            onClick={onCancel} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{
          background: 'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
            {car.year} {car.make} {car.model}
          </h3>
          <div>
            <p><strong>Asking Price:</strong> {formatCurrency(car.asking)}</p>
            <p><strong>Condition:</strong> {car.condition}/5 ⭐</p>
            {car.mileage && <p><strong>Mileage:</strong> {car.mileage.toLocaleString()} miles</p>}
            {car.estimatedResale && <p><strong>Est. Resale Value:</strong> {formatCurrency(car.estimatedResale)}</p>}
            <p><strong>Available Cash:</strong> {formatCurrency(cash)}</p>
          </div>
        </div>

        {/* Inspection Section */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: 0, marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>
            🔍 Vehicle Inspection
          </h4>
          
          {car.inspected ? (
            <div>
              <div style={{
                background: '#dcfce7',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #22c55e',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '14px', color: '#166534', fontWeight: 600, marginBottom: '8px' }}>
                  ✅ Inspection Complete
                </div>
                <div style={{ fontSize: '12px', color: '#166534' }}>
                  Full damage report available below
                </div>
              </div>

              {/* Damage Report */}
              {car.damages && car.damages.length > 0 ? (
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#dc2626' }}>
                    ⚠️ Damages Found:
                  </div>
                  {car.damages.map((damage, index) => (
                    <div key={index} style={{
                      background: '#fee2e2',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '14px', color: '#dc2626', textTransform: 'capitalize' }}>
                        {damage.type} damage
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                        Repair: {formatCurrency(damage.cost)}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    background: '#fef3c7',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #fcd34d',
                    marginTop: '8px'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
                      Total Estimated Repair Cost: {formatCurrency(car.estimatedRepairCost || car.damages.reduce((sum, d) => sum + d.cost, 0))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#dcfce7',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #22c55e',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>
                    🎉 No Damages Found!
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534' }}>
                    This vehicle is in excellent condition
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{
                background: '#fef3c7',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #fcd34d',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '14px', color: '#92400e', fontWeight: 600, marginBottom: '8px' }}>
                  🔍 Inspection Available
                </div>
                <div style={{ fontSize: '12px', color: '#92400e' }}>
                  Purchase a vehicle inspection to reveal hidden damage and repair costs
                </div>
              </div>
              
              {onBuyInspection && (
                <button
                  onClick={() => onBuyInspection(car.id, inspectionCost)}
                  disabled={inspectionCost > cash}
                  style={{
                    background: inspectionCost > cash ? '#9ca3af' : '#f59e0b',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    padding: '10px 16px',
                    color: 'white',
                    cursor: inspectionCost > cash ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔍 Buy Inspection Report ({formatCurrency(inspectionCost)})
                </button>
              )}
              
              {inspectionCost > cash && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#dc2626'
                }}>
                  ⚠️ Insufficient funds for inspection
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          background: '#f8fafc',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: 0, marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>
            Make Your Offer
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <input
              type="number"
              value={playerOffer}
              onChange={(e) => setPlayerOffer(e.target.value)}
              placeholder="Enter your offer..."
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '16px'
              }}
            />
            <button 
              onClick={handleMakeOffer}
              disabled={!playerOffer || Number(playerOffer) > cash || Number(playerOffer) <= 0}
              style={{
                background: (!playerOffer || Number(playerOffer) > cash || Number(playerOffer) <= 0) ? '#9ca3af' : '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                padding: '12px 20px',
                color: 'white',
                cursor: (!playerOffer || Number(playerOffer) > cash || Number(playerOffer) <= 0) ? 'not-allowed' : 'pointer'
              }}
            >
              Make Offer
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => onBuy(car, car.asking)}
              disabled={car.asking > cash}
              style={{
                background: car.asking > cash ? '#9ca3af' : '#16a34a',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                padding: '10px 16px',
                color: 'white',
                cursor: car.asking > cash ? 'not-allowed' : 'pointer'
              }}
            >
              Buy at Asking Price
            </button>
            <button 
              onClick={onCancel}
              style={{
                background: '#6b7280',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          {Number(playerOffer) > cash && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: '#fee2e2',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              ⚠️ Insufficient funds! You have {formatCurrency(cash)} available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}