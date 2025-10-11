// Utility functions for car and listing calculations

export function calculateTotalDamages(listing) {
  return (listing?.damages || []).reduce((sum, damage) => sum + (damage.cost || 0), 0);
}

export function calculateTotalSpent(listing) {
  const purchasePrice = Number(listing?.purchasePrice || 0);
  const repairSpent = Number(listing?.repairSpent || 0);
  return purchasePrice + repairSpent;
}

export function calculateProfit(listPrice, totalSpent) {
  return Math.round(Number(listPrice) - totalSpent);
}

export function calculateProfitPercentage(profit, totalSpent) {
  return totalSpent > 0 ? Math.round((profit / totalSpent) * 100) : null;
}