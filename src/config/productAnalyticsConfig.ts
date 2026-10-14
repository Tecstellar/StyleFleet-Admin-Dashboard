/**
 * Product Analytics Engine Configuration
 * Single source of truth for funnels, engagement scoring weights,
 * alert thresholds, and configurable entity labels.
 */

export interface FunnelStepConfig {
  id: string;
  label: string;
  description: string;
  eventName?: string;
}

export interface EngagementThresholds {
  highlyEngaged: number;
  moderatelyEngaged: number;
  atRisk: number;
}

export interface EngagementWeights {
  recencyWeight: number;    // Weight for days since last active
  volumeWeight: number;     // Weight for sales/bills volume
  breadthWeight: number;    // Weight for feature breadth (staff, customers, etc.)
  revenueWeight: number;    // Weight for monetary value created
}

export interface ProductAnalyticsConfig {
  app: {
    name: string;
    entitySingular: string; // e.g. "Salon" or "Shop"
    entityPlural: string;   // e.g. "Salons" or "Shops"
    coreActionSingular: string; // e.g. "Bill" or "Order"
    coreActionPlural: string;   // e.g. "Bills" or "Orders"
    clientSingular: string;     // e.g. "Customer" or "Client"
    clientPlural: string;       // e.g. "Customers" or "Clients"
  };
  alerts: {
    highDropOffExitRateThreshold: number; // e.g. 0.50 (50%)
    inactiveDaysThreshold: number;        // e.g. 7 days
    atRiskEngagementScoreThreshold: number; // e.g. 35
  };
  funnels: {
    userJourneySteps: FunnelStepConfig[];
    subscriptionSteps: FunnelStepConfig[];
    coreActionSteps: FunnelStepConfig[];
  };
  engagement: {
    thresholds: EngagementThresholds;
    weights: EngagementWeights;
  };
  cacheTtlMs: number;
}

export const PRODUCT_ANALYTICS_CONFIG: ProductAnalyticsConfig = {
  app: {
    name: 'Counter365 / StyleFleet',
    entitySingular: 'Salon',
    entityPlural: 'Salons',
    coreActionSingular: 'Bill',
    coreActionPlural: 'Bills',
    clientSingular: 'Customer',
    clientPlural: 'Customers',
  },
  alerts: {
    highDropOffExitRateThreshold: 0.50, // Screen exit rate >= 50%
    inactiveDaysThreshold: 7,           // Inactive for 7+ days
    atRiskEngagementScoreThreshold: 35,  // Below 35 score is at-risk
  },
  funnels: {
    // 1. User Journey Funnel Steps: [Registered -> Profile completed -> First setup action -> First core action -> Multiple core actions]
    userJourneySteps: [
      {
        id: 'registered',
        label: 'Registered',
        description: 'Account created with initial shop credentials',
        eventName: 'app_open',
      },
      {
        id: 'profile_completed',
        label: 'Profile Completed',
        description: 'Store setup, address, phone & invoice prefix configured',
        eventName: 'profile_completed',
      },
      {
        id: 'staff_configured',
        label: 'First Setup Action',
        description: 'Added first staff / stylist or service catalog item',
        eventName: 'setup_action_completed',
      },
      {
        id: 'first_core_action',
        label: 'First Core Action',
        description: 'Issued first customer bill / recorded first transaction',
        eventName: 'first_bill_created',
      },
      {
        id: 'multiple_core_actions',
        label: 'Multiple Core Actions',
        description: 'Actively running POS (5+ bills generated)',
        eventName: 'multiple_bills_created',
      },
    ],

    // 2. Subscription Funnel Steps (strictly ordered so prev% can never exceed 100%)
    subscriptionSteps: [
      {
        id: 'pricing_viewed',
        label: 'Viewed Pricing',
        description: 'Opened Subscription & Quota plans hub',
        eventName: 'pricing_viewed',
      },
      {
        id: 'plan_selected',
        label: 'Selected Plan',
        description: 'Selected Pro Tier or Custom quota pack',
        eventName: 'plan_selected',
      },
      {
        id: 'subscribe_clicked',
        label: 'Clicked Subscribe',
        description: 'Clicked Proceed to Payment button',
        eventName: 'subscribe_clicked',
      },
      {
        id: 'payment_started',
        label: 'Payment Started',
        description: 'Razorpay / UPI payment gateway launched',
        eventName: 'payment_started',
      },
      {
        id: 'payment_success',
        label: 'Payment Success',
        description: 'Transaction confirmed by payment gateway',
        eventName: 'payment_success',
      },
      {
        id: 'subscribed',
        label: 'Subscribed',
        description: 'Active Pro subscription activated in ledger',
        eventName: 'subscribed',
      },
    ],

    // 3. Core Action Funnel Steps (Billing / Order flow)
    coreActionSteps: [
      {
        id: 'open_pos',
        label: 'Opened Billing Screen',
        description: 'Opened New Bill / POS terminal',
        eventName: 'pos_opened',
      },
      {
        id: 'add_service',
        label: 'Selected Service / Items',
        description: 'Added haircut, styling or products to cart',
        eventName: 'item_added_to_cart',
      },
      {
        id: 'add_customer',
        label: 'Attached Customer',
        description: 'Selected or created client profile',
        eventName: 'customer_attached',
      },
      {
        id: 'calculate_tax',
        label: 'Tax & GST Calculated',
        description: 'Applied GST rate and verified totals',
        eventName: 'tax_calculated',
      },
      {
        id: 'complete_bill',
        label: 'Completed & Printed Bill',
        description: 'Invoice issued and payment settled',
        eventName: 'bill_completed',
      },
    ],
  },
  engagement: {
    thresholds: {
      highlyEngaged: 70,    // Score >= 70
      moderatelyEngaged: 40,// Score >= 40 and < 70
      atRisk: 20,           // Score >= 20 and < 40
      // < 20 is Inactive
    },
    weights: {
      recencyWeight: 35, // Recency of last action (within 24h = max score)
      volumeWeight: 35,  // Volume of core actions (bills generated in 30 days)
      breadthWeight: 15, // Team size & customer list breadth
      revenueWeight: 15, // Total sales volume throughput
    },
  },
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes in-memory cache
};
