
export type BillingCycle = 'Monthly' | 'Annual';
export type DecisionStatus = 'SHIP' | 'ITERATE' | 'KILL';

export interface PricingVariant {
  id: string;
  name: string;
  price: number;
  billingCycle: BillingCycle;
  notes: string;
  isControl: boolean;
}

export interface VariantAssumptions {
  variantId: string;
  trafficSplit: number; // 0-100
  convRate: number;     // 0-100
  churnRate: number;    // 0-100
}

export interface GlobalAssumptions {
  monthlyTraffic: number;
  perVariantAssumptions: Record<string, VariantAssumptions>;
}

export interface VariantResult {
  variantId: string;
  name: string;
  visitors: number;
  conversions: number;
  revenue: number;
  arpu: number;
  rpv: number;
  isRevenueLeader: boolean;
  isRPVLeader: boolean;
}

export interface SimulationOutput {
  results: VariantResult[];
  trafficSplitTotal: number;
}
