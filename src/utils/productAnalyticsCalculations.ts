/**
 * Pure Calculation Functions for Product Analytics Engine
 * Encapsulates funnel drop-off math, engagement scoring, and CS rule evaluation.
 */

import {
  PRODUCT_ANALYTICS_CONFIG,
  FunnelStepConfig,
  EngagementThresholds,
  EngagementWeights,
} from '../config/productAnalyticsConfig';

export interface FunnelRowResult {
  step: string;
  stepId: string;
  users: number;
  fromPrevPercent: number;
  fromStartPercent: number;
  dropOffPercent: number;
  dropOffCount: number;
}

export interface EngagementScoreResult {
  shopId: string;
  shopName: string;
  score: number;
  bucket: 'highly_engaged' | 'moderately_engaged' | 'at_risk' | 'inactive';
  recencyScore: number;
  volumeScore: number;
  breadthScore: number;
  revenueScore: number;
  daysSinceActive: number;
  billsCount30d: number;
}

export interface CSOpportunityItem {
  id: string;
  priority: 'High' | 'Medium' | 'Low';
  shopId: string;
  shopName: string;
  phone: string;
  city: string;
  reason: string;
  detail: string;
  engagementScore?: number;
}

/**
 * Calculates a funnel table with strict sequential progression.
 * Ensures fromPrevPercent is mathematically bounded between 0% and 100%.
 */
export function calculateFunnel(
  steps: FunnelStepConfig[],
  countsPerStep: number[]
): FunnelRowResult[] {
  if (steps.length === 0) return [];

  const results: FunnelRowResult[] = [];
  let prevCount = 0;
  const startCount = countsPerStep[0] || 0;

  for (let i = 0; i < steps.length; i++) {
    const rawCount = countsPerStep[i] || 0;

    // Strict funnel enforcement: a step cannot exceed its predecessor
    const users = i === 0 ? rawCount : Math.min(rawCount, prevCount);

    let fromPrevPercent = 100;
    let dropOffCount = 0;
    let dropOffPercent = 0;

    if (i > 0) {
      if (prevCount > 0) {
        fromPrevPercent = Math.min(100, Math.round((users / prevCount) * 100));
        dropOffCount = Math.max(0, prevCount - users);
        dropOffPercent = Math.round((dropOffCount / prevCount) * 100);
      } else {
        fromPrevPercent = 0;
        dropOffCount = 0;
        dropOffPercent = 0;
      }
    }

    const fromStartPercent =
      startCount > 0 ? Math.min(100, Math.round((users / startCount) * 100)) : 0;

    results.push({
      step: steps[i].label,
      stepId: steps[i].id,
      users,
      fromPrevPercent,
      fromStartPercent,
      dropOffPercent,
      dropOffCount,
    });

    prevCount = users;
  }

  return results;
}

/**
 * Computes an engagement score (0 - 100) and assigns an engagement bucket.
 */
export function calculateEngagementScore(
  metrics: {
    daysSinceActive: number;
    billsCount30d: number;
    staffCount: number;
    customerCount: number;
    revenue30d: number;
  },
  weights: EngagementWeights = PRODUCT_ANALYTICS_CONFIG.engagement.weights,
  thresholds: EngagementThresholds = PRODUCT_ANALYTICS_CONFIG.engagement.thresholds
): { score: number; bucket: EngagementScoreResult['bucket'] } {
  // 1. Recency component (0 - 100 points, scaled by weight)
  let recencyNormalized = 0;
  if (metrics.daysSinceActive <= 1) recencyNormalized = 100;
  else if (metrics.daysSinceActive <= 3) recencyNormalized = 80;
  else if (metrics.daysSinceActive <= 7) recencyNormalized = 55;
  else if (metrics.daysSinceActive <= 14) recencyNormalized = 30;
  else if (metrics.daysSinceActive <= 30) recencyNormalized = 15;
  else recencyNormalized = 0;

  // 2. Volume component (bills in 30 days)
  let volumeNormalized = 0;
  if (metrics.billsCount30d >= 50) volumeNormalized = 100;
  else if (metrics.billsCount30d >= 20) volumeNormalized = 75;
  else if (metrics.billsCount30d >= 5) volumeNormalized = 50;
  else if (metrics.billsCount30d >= 1) volumeNormalized = 25;
  else volumeNormalized = 0;

  // 3. Breadth component (team size & customer base)
  let breadthNormalized = 0;
  const staffPts = Math.min(50, (metrics.staffCount || 0) * 20);
  const custPts = Math.min(50, Math.round(((metrics.customerCount || 0) / 10) * 50));
  breadthNormalized = Math.min(100, staffPts + custPts);

  // 4. Revenue component
  let revenueNormalized = 0;
  if (metrics.revenue30d >= 5000000) revenueNormalized = 100; // >= 50,000 INR
  else if (metrics.revenue30d >= 1500000) revenueNormalized = 75; // >= 15,000 INR
  else if (metrics.revenue30d >= 500000) revenueNormalized = 50;  // >= 5,000 INR
  else if (metrics.revenue30d > 0) revenueNormalized = 25;
  else revenueNormalized = 0;

  const totalWeight =
    weights.recencyWeight +
    weights.volumeWeight +
    weights.breadthWeight +
    weights.revenueWeight;

  const weightedScore =
    (recencyNormalized * weights.recencyWeight +
      volumeNormalized * weights.volumeWeight +
      breadthNormalized * weights.breadthWeight +
      revenueNormalized * weights.revenueWeight) /
    totalWeight;

  const score = Math.max(0, Math.min(100, Math.round(weightedScore)));

  let bucket: EngagementScoreResult['bucket'] = 'inactive';
  if (score >= thresholds.highlyEngaged) {
    bucket = 'highly_engaged';
  } else if (score >= thresholds.moderatelyEngaged) {
    bucket = 'moderately_engaged';
  } else if (score >= thresholds.atRisk) {
    bucket = 'at_risk';
  } else {
    bucket = 'inactive';
  }

  return { score, bucket };
}

/**
 * Rule-based evaluation of Customer Success outreach opportunities.
 */
export function evaluateCSOpportunities(
  salons: {
    id: string;
    name: string;
    phone: string | null;
    city: string | null;
    address: string | null;
    created_at: string;
    customer_count: number;
    bill_count: number;
    viewed_pricing?: boolean;
    has_paid_subscription?: boolean;
    days_since_active: number;
    engagement_score?: number;
  }[]
): CSOpportunityItem[] {
  const opportunities: CSOpportunityItem[] = [];

  for (const s of salons) {
    const phone = s.phone || 'No phone';
    const city = s.city || '-';
    const hasAddress = !!s.address && s.address.trim().length > 0;

    // Rule 1: High Priority - Viewed subscription / near limit, but did not pay
    if (s.viewed_pricing && !s.has_paid_subscription) {
      opportunities.push({
        id: `cs-sub-${s.id}`,
        priority: 'High',
        shopId: s.id,
        shopName: s.name,
        phone,
        city,
        reason: 'Viewed subscription, did not pay',
        detail: `Viewed Pro subscription plans but has not completed payment yet.`,
        engagementScore: s.engagement_score,
      });
      continue;
    }

    // Rule 2: High Priority - Inactive 7+ days with existing customers/bills (at risk of churn)
    if (s.days_since_active >= 7 && (s.bill_count > 0 || s.customer_count > 0)) {
      opportunities.push({
        id: `cs-churn-${s.id}`,
        priority: 'High',
        shopId: s.id,
        shopName: s.name,
        phone,
        city,
        reason: 'Inactive 7+ days',
        detail: `No POS activity recorded for ${s.days_since_active} days. User was previously active with ${s.bill_count} bills.`,
        engagementScore: s.engagement_score,
      });
      continue;
    }

    // Rule 3: Medium Priority - Customer added, no order/bill created
    if (s.customer_count > 0 && s.bill_count === 0) {
      opportunities.push({
        id: `cs-nobill-${s.id}`,
        priority: 'Medium',
        shopId: s.id,
        shopName: s.name,
        phone,
        city,
        reason: 'Customer added, no order',
        detail: `Added ${s.customer_count} client(s) to system but has not generated any bill yet.`,
        engagementScore: s.engagement_score,
      });
      continue;
    }

    // Rule 4: Low Priority - Profile completed, no customer added
    if (hasAddress && s.customer_count === 0 && s.bill_count === 0) {
      opportunities.push({
        id: `cs-nocust-${s.id}`,
        priority: 'Low',
        shopId: s.id,
        shopName: s.name,
        phone,
        city,
        reason: 'Profile completed, no customer added',
        detail: `Completed basic store setup but hasn't entered any clients yet.`,
        engagementScore: s.engagement_score,
      });
    }
  }

  // Sort by priority order: High -> Medium -> Low
  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  return opportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
