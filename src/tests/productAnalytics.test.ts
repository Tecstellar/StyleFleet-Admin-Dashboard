/**
 * Unit Tests for Product Analytics Calculations
 * Run with: node --loader ts-node or tsx or standalone node test script
 */

import {
  calculateFunnel,
  calculateEngagementScore,
  evaluateCSOpportunities,
} from '../utils/productAnalyticsCalculations';
import { PRODUCT_ANALYTICS_CONFIG } from '../config/productAnalyticsConfig';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('Running Product Analytics Unit Tests...');

  // TEST 1: Funnel Drop-off Math & Strict Ordering
  {
    const steps = PRODUCT_ANALYTICS_CONFIG.funnels.subscriptionSteps;
    // Anomaly test case: 100 viewed pricing, 120 selected plan (anomalous tracking), 80 clicked subscribe, 60 payment started, 50 payment success, 40 subscribed
    const rawCounts = [100, 120, 80, 60, 50, 40];
    const funnel = calculateFunnel(steps, rawCounts);

    assert(funnel.length === 6, 'Funnel should have 6 steps');
    assert(funnel[0].users === 100, 'Step 1 should have 100 users');
    assert(funnel[1].users === 100, 'Step 2 must be clamped to <= Step 1 (100), never 120');
    assert(funnel[1].fromPrevPercent <= 100, 'fromPrevPercent must never exceed 100%');
    assert(funnel[2].users === 80, 'Step 3 should have 80 users');
    assert(funnel[2].fromPrevPercent === 80, 'Step 3 fromPrevPercent should be 80%');
    assert(funnel[2].dropOffPercent === 20, 'Step 3 dropOffPercent should be 20%');
    assert(funnel[2].dropOffCount === 20, 'Step 3 dropOffCount should be 20');

    console.log('✓ Funnel calculations and from-prev <= 100% clamp passed.');
  }

  // TEST 2: Zero Initial Users Handling
  {
    const steps = PRODUCT_ANALYTICS_CONFIG.funnels.coreActionSteps;
    const funnel = calculateFunnel(steps, [0, 0, 0, 0, 0]);
    assert(funnel[0].users === 0, 'Zero start count handled cleanly');
    assert(funnel[0].fromStartPercent === 0, '0% from start when start is 0');
    assert(funnel[1].fromPrevPercent === 0, '0% from prev when prev is 0');

    console.log('✓ Zero user edge cases passed.');
  }

  // TEST 3: Engagement Scoring
  {
    // Highly engaged salon (active today, 50+ bills, 3 staff, 30 customers, high revenue)
    const high = calculateEngagementScore({
      daysSinceActive: 0,
      billsCount30d: 55,
      staffCount: 3,
      customerCount: 30,
      revenue30d: 6000000,
    });
    assert(high.bucket === 'highly_engaged', `Expected highly_engaged, got ${high.bucket}`);
    assert(high.score >= 70, `Expected score >= 70, got ${high.score}`);

    // Inactive salon (active 45 days ago, 0 bills, 0 staff, 0 customers, 0 revenue)
    const inactive = calculateEngagementScore({
      daysSinceActive: 45,
      billsCount30d: 0,
      staffCount: 0,
      customerCount: 0,
      revenue30d: 0,
    });
    assert(inactive.bucket === 'inactive', `Expected inactive, got ${inactive.bucket}`);
    assert(inactive.score < 20, `Expected score < 20, got ${inactive.score}`);

    // Moderately engaged
    const mod = calculateEngagementScore({
      daysSinceActive: 5,
      billsCount30d: 10,
      staffCount: 1,
      customerCount: 10,
      revenue30d: 800000,
    });
    assert(mod.bucket === 'moderately_engaged', `Expected moderately_engaged, got ${mod.bucket}`);

    console.log('✓ Engagement scoring and bucketing passed.');
  }

  // TEST 4: Customer Success Opportunities Rule Evaluation
  {
    const sampleSalons = [
      {
        id: '1',
        name: 'Salon Alpha',
        phone: '9876543210',
        city: 'Chennai',
        address: '123 Main St',
        created_at: new Date().toISOString(),
        customer_count: 5,
        bill_count: 0,
        viewed_pricing: false,
        days_since_active: 2,
      },
      {
        id: '2',
        name: 'Salon Beta',
        phone: '9876543211',
        city: 'Madurai',
        address: '456 East St',
        created_at: new Date().toISOString(),
        customer_count: 20,
        bill_count: 15,
        viewed_pricing: true,
        has_paid_subscription: false,
        days_since_active: 1,
      },
    ];

    const opps = evaluateCSOpportunities(sampleSalons);
    assert(opps.length === 2, 'Should detect 2 opportunities');
    assert(opps[0].priority === 'High', 'Viewed pricing without paying must be High priority');
    assert(opps[0].reason === 'Viewed subscription, did not pay', 'Correct reason for Salon Beta');
    assert(opps[1].priority === 'Medium', 'Customer added with no bill should be Medium priority');

    console.log('✓ Customer Success Opportunities rule evaluation passed.');
  }

  console.log('ALL UNIT TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests();
