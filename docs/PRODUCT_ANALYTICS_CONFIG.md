# Product Analytics Configuration Guide

The Product Analytics engine in Counter365 / StyleFleet is driven by a single centralized configuration file:
[`src/config/productAnalyticsConfig.ts`](file:///d:/StyleFleet/stylefleet-admin-dashboard/src/config/productAnalyticsConfig.ts).

This guide describes how to configure funnel steps, alert thresholds, scoring weights, and entity labels without modifying the calculation engine or UI components.

---

## Configuration File Structure

```typescript
export const PRODUCT_ANALYTICS_CONFIG = {
  app: {
    name: 'Counter365 / StyleFleet',
    entityLabel: 'Salon',
    orderLabel: 'Bill',
    customerLabel: 'Customer',
  },
  thresholds: {
    highDropOffExitRatePercent: 50,
    inactiveDays: 7,
    dormantDays: 14,
    multipleCoreActionsMinCount: 3,
  },
  engagementWeights: {
    recency: 35,
    volume: 35,
    breadth: 15,
    revenue: 15,
  },
  engagementScoreBuckets: {
    highlyEngagedMin: 70,
    moderatelyEngagedMin: 40,
    atRiskMin: 20,
    inactiveMin: 0,
  },
  userJourneySteps: [ ... ],
  subscriptionSteps: [ ... ],
  coreActionSteps: [ ... ],
};
```

---

## 1. App Entity Labels (`app`)
- **`name`**: Application name displayed in headers and exports.
- **`entityLabel`**: Primary tenant noun (e.g. `Salon`, `Shop`, `Store`).
- **`orderLabel`**: Core transaction noun (e.g. `Bill`, `Order`, `Invoice`).
- **`customerLabel`**: End customer noun (e.g. `Customer`, `Client`, `Guest`).

*Benefit: Prevents hardcoding domain-specific terms across cards, funnels, alerts, and CS opportunities.*

---

## 2. Thresholds (`thresholds`)
- **`highDropOffExitRatePercent` (Default: `50`)**: Screens with exit rate equal to or higher than this percentage trigger a warning in the Alerts panel.
- **`inactiveDays` (Default: `7`)**: Users with no events or transactions for 7+ days are categorized as "Inactive 7+ days" in Churn Signals and CS Opportunities.
- **`dormantDays` (Default: `14`)**: Users with no activity for 14+ days.
- **`multipleCoreActionsMinCount` (Default: `3`)**: Number of bills required to reach the "Multiple core actions" step of the User Journey Funnel.

---

## 3. Engagement Score Weights & Buckets
The engagement score (0 to 100) is calculated as:
$$\text{Score} = (\text{Recency} \times 0.35) + (\text{Volume} \times 0.35) + (\text{Breadth} \times 0.15) + (\text{Revenue} \times 0.15)$$

- **`recency` (35%)**: How recently the user logged in or created a bill (full score if active in last 2 days, decaying to 0 at 30 days).
- **`volume` (35%)**: Number of core actions in the last 30 days (10+ bills = 100%).
- **`breadth` (15%)**: Adoption of diverse features (customers added, staff created, services configured).
- **`revenue` (15%)**: Active paid subscription tier or subscription payment records.

### Buckets
- **Highly engaged**: $\ge 70$
- **Moderately engaged**: $40 - 69$
- **At risk**: $20 - 39$
- **Inactive**: $< 20$

---

## 4. Customizing Funnels
To add or modify steps in any funnel, edit the step arrays in `src/config/productAnalyticsConfig.ts`:

### User Journey Funnel (`userJourneySteps`)
```typescript
userJourneySteps: [
  { id: 'registered', label: 'Registered' },
  { id: 'profile_completed', label: 'Profile completed' },
  { id: 'first_setup_action', label: 'First service added' },
  { id: 'first_core_action', label: 'First bill generated' },
  { id: 'multiple_core_actions', label: 'Multiple bills (3+)' },
]
```

### Subscription Funnel (`subscriptionSteps`)
```typescript
subscriptionSteps: [
  { id: 'pricing_viewed', label: 'Viewed pricing' },
  { id: 'plan_selected', label: 'Selected plan' },
  { id: 'subscribe_clicked', label: 'Clicked subscribe' },
  { id: 'payment_started', label: 'Payment started' },
  { id: 'payment_success', label: 'Payment success' },
  { id: 'subscribed', label: 'Subscribed' },
]
```

### Core Action Funnel (`coreActionSteps`)
```typescript
coreActionSteps: [
  { id: 'step_1_pos_opened', label: 'Opened POS billing screen' },
  { id: 'step_2_service_selected', label: 'Selected service / item' },
  { id: 'step_3_customer_attached', label: 'Attached customer' },
  { id: 'step_4_tax_calculated', label: 'Tax & GST calculated' },
  { id: 'step_5_bill_completed', label: 'Completed bill' },
]
```

---

## 5. Caching and Refresh Behavior
- Responses from `productAnalyticsService.getProductAnalyticsData` are cached in-memory for **5 minutes (300,000 ms)**.
- Clicking the **Refresh** button calls the service with `bypassCache: true`, immediately forcing fresh SQL aggregations and updating the IST timestamp.
