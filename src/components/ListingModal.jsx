
import React, {useState, useEffect} from "react";
import CooldownRing from "./CooldownRing";
import ModalWrapper from "./ModalWrapper";
import { Button, Badge, Card } from "./ui";
import { SPACING, COLORS } from "../constants";
import { calculateTotalDamages, calculateTotalSpent, calculateProfit, calculateProfitPercentage } from "../utils/carCalculations";

const formatCurrency = (amount) => `$${amount?.toLocaleString() || '0'}`;

// Buyer persona configurations
const BUYER_PERSONAS = {
  realist: { icon: '🎯', color: '#3b82f6', bg: '#dbeafe', name: 'Realist', tip: 'Fair negotiator, responds well to reasonable counters' },
  cheapskate: { icon: '💰', color: '#f59e0b', bg: '#fef3c7', name: 'Bargain Hunter', tip: 'Always lowballs, but will negotiate up gradually' },
  impulse: { icon: '⚡', color: '#10b981', bg: '#d1fae5', name: 'Impulse Buyer', tip: 'Quick decisions, often accepts asking price' },
  perfectionist: { icon: '🧐', color: '#8b5cf6', bg: '#ede9fe', name: 'Perfectionist', tip: 'Only interested in pristine vehicles' }
};

export default function ListingModal({modal, cash, onCancel, onBuy, onSell, refreshMarket, onNegotiate, onRemoveBuyer, onUpdatePrice, getPriceCooldownRemaining, now}){
  if (!modal) return null;
  const {side} = modal;
  const listing = modal.subject;
  
  const [log, setLog] = useState([]);
  const [priceEdit, setPriceEdit] = useState(listing.listPrice || 0);
  const [counterOffers, setCounterOffers] = useState({});
  const [showActivityLog, setShowActivityLog] = useState(false);

  useEffect(()=>{
    if (side === "listing" && listing) {
      setLog([{
        time: new Date(),
        type: 'listing',
        message: `Listed ${listing.year} ${listing.make} ${listing.model} for ${formatCurrency(listing.listPrice)}`
      }]);
    }
  },[listing]);

  function addLog(type, message){ 
    setLog(l=>[...l, { time: new Date(), type, message }]); 
  }

  function acceptOffer(buyer){
    addLog('sale', `Accepted ${buyer.id}'s offer of ${formatCurrency(buyer.offer)}`);
    onSell(listing.id, buyer.id, buyer.offer);
  }

  function counterOffer(buyer, newPrice) {
    const price = Math.round(Number(newPrice));
    if(!price || price === buyer.offer) return;
    
    if(price > buyer.budget){
      addLog('negotiation', `Countered ${buyer.id} at ${formatCurrency(price)} - exceeded budget, buyer walked away`);
      if(typeof onRemoveBuyer === 'function') onRemoveBuyer(listing.id, buyer.id);
      return;
    }
    
    const willAccept = Math.random() < (0.25 + 0.5*(buyer.offer / price));
    if(willAccept){
      addLog('sale', `${buyer.id} accepted counter-offer of ${formatCurrency(price)}`);
      onSell(listing.id, buyer.id, price);
    } else {
      const newOffer = Math.round(buyer.offer + Math.random()*(price - buyer.offer)*0.4);
      addLog('negotiation', `${buyer.id} declined ${formatCurrency(price)}, counter-offered ${formatCurrency(newOffer)}`);
      // Note: You'd need to update the buyer's offer in the parent component
      refreshMarket();
    }
    
    setCounterOffers(prev => ({...prev, [buyer.id]: ''}));
  }

  function getSuggestedCounter(buyer) {
    const midpoint = Math.round((buyer.offer + buyer.budget) / 2);
    const persona = BUYER_PERSONAS[buyer.persona] || BUYER_PERSONAS.realist;
    
    if (buyer.persona === 'cheapskate') {
      return Math.round(buyer.offer * 1.15); // Small increments
    } else if (buyer.persona === 'impulse') {
      return Math.round(buyer.budget * 0.9); // Go close to their budget
    } else {
      return midpoint; // Fair middle ground
    }
  }

  // Calculate financials
  const totalSpent = calculateTotalSpent(listing);
  const totalDamages = calculateTotalDamages(listing);
  const profit = calculateProfit(listing.listPrice, totalSpent);
  const profitPct = calculateProfitPercentage(profit, totalSpent);
  const isProfitable = profit >= 0;
  const damageWarn = totalDamages > (listing.estimatedResale || listing.base || 0);
  
  // Interest level calculation (mock for now)
  const interestLevel = listing.buyers?.length || 0;
  const interestScore = Math.min(100, (interestLevel * 25) + Math.random() * 20);
  
  const priceCooldown = (typeof getPriceCooldownRemaining === 'function') ? getPriceCooldownRemaining(listing.id) : 0;

  return (
    <ModalWrapper 
      isOpen={!!modal} 
      onClose={onCancel} 
      title="🏪 Manage Listing"
      width="min(1200px, 95vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
        
        {/* Hero Card - Car Summary */}
        <Card style={{
          background: 'linear-gradient(145deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          border: 'none',
          padding: SPACING.lg
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '28px', 
                fontWeight: 700,
                marginBottom: SPACING.sm 
              }}>
                {listing.year} {listing.make} {listing.model}
              </h2>
              
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 700,
                marginBottom: SPACING.md,
                color: '#60a5fa'
              }}>
                {formatCurrency(listing.listPrice)}
              </div>

              {/* Financial Summary */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                gap: SPACING.md 
              }}>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                    Total Invested
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>
                    {formatCurrency(totalSpent)}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                    {isProfitable ? 'Profit' : 'Loss'}
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 600,
                    color: isProfitable ? '#22c55e' : '#ef4444'
                  }}>
                    {formatCurrency(Math.abs(profit))} ({profitPct > 0 ? '+' : ''}{profitPct}%)
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                    Market Interest
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>
                    {Math.round(interestScore)}% 
                    <span style={{ fontSize: '14px', marginLeft: '8px' }}>
                      {interestScore > 75 ? '🔥' : interestScore > 50 ? '📈' : interestScore > 25 ? '📊' : '📉'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Car Status Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm, minWidth: '140px' }}>
              <Badge style={{
                background: 'rgba(96, 165, 250, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                padding: '6px 12px',
                textAlign: 'center'
              }}>
                Condition: {listing.condition}/5
              </Badge>
              
              {totalDamages > 0 && (
                <Badge style={{
                  background: damageWarn ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                  color: damageWarn ? '#ef4444' : '#f59e0b',
                  border: `1px solid ${damageWarn ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                  padding: '6px 12px',
                  textAlign: 'center'
                }}>
                  {damageWarn ? '⚠️' : '🔧'} Damages: {formatCurrency(totalDamages)}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: SPACING.lg }}>
          
          {/* Left Column - Buyer Offers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: 700 }}>
                💰 Buyer Offers ({listing.buyers?.length || 0})
              </h3>
              {(listing.buyers?.length || 0) === 0 && (
                <Badge style={{ background: '#f3f4f6', color: '#6b7280', border: 'none' }}>
                  Waiting for buyers...
                </Badge>
              )}
            </div>

            {(!listing.buyers || listing.buyers.length === 0) ? (
              <Card style={{
                padding: SPACING.xl,
                textAlign: 'center',
                background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
                border: '2px dashed #cbd5e1'
              }}>
                <div style={{ fontSize: '48px', marginBottom: SPACING.md }}>👥</div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#475569', marginBottom: SPACING.sm }}>
                  No Offers Yet
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  Buyers will appear when your price is competitive
                </div>
              </Card>
            ) : (
              listing.buyers.map(buyer => {
                const persona = BUYER_PERSONAS[buyer.persona] || BUYER_PERSONAS.realist;
                const buyerProfit = buyer.offer - totalSpent;
                const buyerProfitPct = calculateProfitPercentage(buyerProfit, totalSpent);
                const suggestedCounter = getSuggestedCounter(buyer);
                
                return (
                  <Card key={buyer.id} style={{
                    background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: SPACING.lg
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                            Buyer #{buyer.id}
                          </div>
                          <Badge 
                            title={persona.tip}
                            style={{
                              background: persona.bg,
                              color: persona.color,
                              border: 'none',
                              padding: '4px 8px',
                              cursor: 'help'
                            }}
                          >
                            {persona.icon} {persona.name}
                          </Badge>
                        </div>
                        
                        {/* Offer Details Grid */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                          gap: SPACING.md,
                          marginBottom: SPACING.md 
                        }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                              Current Offer
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                              {formatCurrency(buyer.offer)}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                              Max Budget
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#6b7280' }}>
                              {formatCurrency(buyer.budget)}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                              Your Profit
                            </div>
                            <div style={{ 
                              fontSize: '16px', 
                              fontWeight: 700, 
                              color: buyerProfit >= 0 ? '#16a34a' : '#dc2626' 
                            }}>
                              {formatCurrency(buyerProfit)} ({buyerProfitPct > 0 ? '+' : ''}{buyerProfitPct}%)
                            </div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                              Patience
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#8b5cf6' }}>
                              {buyer.patience}/10
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div style={{ display: 'flex', gap: SPACING.sm, flexWrap: 'wrap' }}>
                          <Button 
                            variant="success"
                            size="medium"
                            onClick={() => acceptOffer(buyer)}
                            style={{
                              background: '#16a34a',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 600,
                              padding: '8px 16px'
                            }}
                          >
                            ✅ Accept {formatCurrency(buyer.offer)}
                          </Button>
                          
                          <div style={{ display: 'flex', gap: SPACING.xs, alignItems: 'center' }}>
                            <input 
                              type="number"
                              value={counterOffers[buyer.id] || ''}
                              onChange={(e) => setCounterOffers(prev => ({...prev, [buyer.id]: e.target.value}))}
                              placeholder={suggestedCounter.toString()}
                              style={{
                                width: '100px',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px'
                              }}
                            />
                            <Button 
                              variant="warning"
                              size="medium"
                              onClick={() => counterOffer(buyer, counterOffers[buyer.id] || suggestedCounter)}
                              style={{
                                background: '#f59e0b',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                padding: '8px 12px',
                                color: 'white'
                              }}
                            >
                              💬 Counter
                            </Button>
                          </div>
                          
                          <Button 
                            variant="secondary"
                            size="small"
                            onClick={() => setCounterOffers(prev => ({...prev, [buyer.id]: suggestedCounter.toString()}))}
                            style={{
                              fontSize: '12px',
                              padding: '6px 10px',
                              borderRadius: '6px'
                            }}
                          >
                            💡 Suggest: {formatCurrency(suggestedCounter)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Right Column - Tools & Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            
            {/* Price Update */}
            <Card style={{ padding: SPACING.lg }}>
              <h4 style={{ margin: 0, marginBottom: SPACING.md, color: '#1e293b', fontSize: '16px', fontWeight: 700 }}>
                💰 Update Price
              </h4>
              
              {priceCooldown > 0 ? (
                <div style={{
                  background: '#fef3c7',
                  padding: SPACING.md,
                  borderRadius: '8px',
                  border: '1px solid #fcd34d',
                  textAlign: 'center'
                }}>
                  <CooldownRing 
                    remaining={priceCooldown} 
                    duration={60} 
                    size={48} 
                    stroke={4} 
                    color="#f59e0b" 
                    bg="#fed7aa" 
                  />
                  <div style={{ fontSize: '14px', color: '#92400e', fontWeight: 600, marginTop: SPACING.sm }}>
                    Price locked for {priceCooldown}s
                  </div>
                  <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                    Prevents market manipulation
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
                  <input 
                    type="number"
                    value={priceEdit}
                    onChange={(e) => setPriceEdit(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: SPACING.sm,
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '16px',
                      fontWeight: 600
                    }}
                  />
                  <Button 
                    variant="primary"
                    size="medium"
                    onClick={() => {
                      if(typeof onUpdatePrice === 'function') {
                        onUpdatePrice(listing.id, Math.round(Number(priceEdit)));
                        addLog('price', `Updated price to ${formatCurrency(Math.round(Number(priceEdit)))}`);
                      }
                    }}
                    style={{
                      background: '#3b82f6',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      padding: '10px 16px'
                    }}
                  >
                    🏷️ Update Price
                  </Button>
                </div>
              )}
              
              {/* Price Suggestions */}
              <div style={{ marginTop: SPACING.md }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: SPACING.xs }}>
                  💡 Smart Suggestions:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {interestScore < 30 && (
                    <div style={{ fontSize: '12px', color: '#dc2626' }}>
                      📉 Low interest - consider reducing price by 5-10%
                    </div>
                  )}
                  {interestScore > 70 && (
                    <div style={{ fontSize: '12px', color: '#16a34a' }}>
                      🔥 High interest - you could increase price by 5%
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    💎 Sweet spot: {formatCurrency(Math.round(listing.estimatedResale * 1.05))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Activity Log */}
            <Card style={{ padding: SPACING.lg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: 700 }}>
                  📋 Activity Log
                </h4>
                <Button 
                  variant="secondary"
                  size="small"
                  onClick={() => setShowActivityLog(!showActivityLog)}
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                >
                  {showActivityLog ? 'Hide' : 'Show'}
                </Button>
              </div>
              
              {showActivityLog && (
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: SPACING.xs
                }}>
                  {log.slice(-5).reverse().map((entry, idx) => {
                    const icons = {
                      listing: '🏷️',
                      price: '💰',
                      negotiation: '💬',
                      sale: '🤝'
                    };
                    
                    return (
                      <div key={idx} style={{
                        fontSize: '12px',
                        padding: SPACING.xs,
                        background: '#f8fafc',
                        borderRadius: '6px',
                        borderLeft: '3px solid #3b82f6'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span>{icons[entry.type] || '📝'}</span>
                          <span style={{ fontSize: '10px', color: '#6b7280' }}>
                            {entry.time.toLocaleTimeString()}
                          </span>
                        </div>
                        <div style={{ color: '#374151' }}>{entry.message}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}

