# Product Analytics Event Instrumentation Specification

This document details the telemetry and analytics event schema required to instrument the client applications (Flutter mobile apps, Web POS, and client portals) for the Counter365 / StyleFleet platform.

These events feed into the `events` table in Supabase and populate the **Product Analytics Engine** (`/dashboard/product-analytics`).

---

## 1. Events Table Schema

| Column Name | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | No (PK) | Unique event ID (`gen_random_uuid()`) |
| `user_id` | `UUID` | Yes | Auth User ID (`auth.users.id`) if authenticated |
| `shop_id` | `UUID` | Yes | Active salon / shop ID (`shops.id`) |
| `event_name` | `TEXT` | No | Identifier of the event (e.g. `screen_view`, `bill_completed`) |
| `screen` | `TEXT` | Yes | Screen or page route where the event occurred (e.g. `billing_pos`, `pricing_modal`) |
| `element` | `TEXT` | Yes | Target button or UI element (e.g. `checkout_button`, `add_service_btn`) |
| `metadata` | `JSONB` | Yes | Context payload (e.g. `{"step": 1, "duration_ms": 4200, "plan": "pro"}`) |
| `city` | `TEXT` | Yes | User or shop city |
| `state` | `TEXT` | Yes | User or shop state |
| `created_at` | `TIMESTAMPTZ` | No | Timestamp in UTC |

### Database Indexes
- `idx_events_user_event_created (user_id, event_name, created_at)`
- `idx_events_shop_created (shop_id, created_at)`
- `idx_events_event_name (event_name)`
- `idx_events_screen (screen)`
- `idx_events_created_at (created_at DESC)`
- `idx_events_metadata_gin (metadata jsonb_path_ops)`

---

## 2. Standard Client Telemetry Events

### A. Lifecycle & Screen Navigation
1. **`app_open`**
   - **Trigger**: App launched or brought to foreground.
   - **Screen**: `launch`
   - **Metadata**: `{"app_version": "1.4.2", "platform": "android|ios|web"}`
2. **`screen_view`**
   - **Trigger**: Screen navigated to and rendered.
   - **Screen**: `<screen_name>` (e.g. `billing_pos`, `dashboard`, `service_catalog`, `pricing_modal`, `customer_list`)
   - **Metadata**: `{"previous_screen": "<screen_name>"}`
3. **`screen_exit`**
   - **Trigger**: Screen dismissed or navigated away from.
   - **Screen**: `<screen_name>`
   - **Metadata**: `{"time_on_screen_ms": 14200}`
4. **`tap_zone`**
   - **Trigger**: Click or tap inside a designated UI screen zone.
   - **Element**: Zone or button identifier (e.g. `hero_cta`, `quick_bill_tile`, `apply_coupon`)
   - **Metadata**: `{"repeat_tap": boolean, "tap_count": number}` *(used for rage-click detection)*
5. **`scroll_depth`**
   - **Trigger**: User scrolls to milestone depths (25%, 50%, 75%, 100%) on enabled screens.
   - **Screen**: `<screen_name>`
   - **Metadata**: `{"depth_percent": 25 | 50 | 75 | 100}`

---

## 3. Subscription & Pricing Funnel Events

| Event Name | Screen | Trigger / Description | Metadata Payload |
| :--- | :--- | :--- | :--- |
| `pricing_viewed` | `pricing_modal` | User opened the subscription pricing plan dialog/page | `{"source": "quota_exhausted" \| "banner" \| "settings"}` |
| `plan_selected` | `pricing_modal` | User selected a specific tier (Monthly / Annual / Lifetime) | `{"plan_tier": "monthly" \| "annual", "price": 499}` |
| `subscribe_clicked`| `pricing_modal` | User clicked "Upgrade / Subscribe Now" | `{"plan_tier": "monthly", "gateway": "razorpay"}` |
| `payment_started` | `checkout` | Razorpay / Cashfree checkout window opened | `{"order_id": "order_xyz", "amount": 49900}` |
| `payment_success` | `checkout` | Payment confirmed by gateway callback | `{"payment_id": "pay_xyz", "order_id": "order_xyz", "amount": 49900}` |
| `payment_failed` | `checkout` | Payment failed or was canceled by user | `{"error_code": "BAD_REQUEST", "reason": "user_cancelled"}` |

---

## 4. User Journey Funnel Events

1. **`user_registered`**: Fired upon OTP verification / account creation in Supabase auth.
2. **`profile_completed`**: Salon name, owner phone, address, and city filled in.
3. **`first_service_added`** (First Key Setup Action): Salon created its first haircut/spa/service item.
4. **`first_bill_generated`** (First Core Action): Salon finalized its first bill / invoice.
5. **`multiple_bills_generated`** (Multiple Core Actions): Salon crossed 3+ bills.

---

## 5. Core Action Funnel Events (POS Billing Flow)

1. **`pos_opened`**: POS billing screen accessed (`billing_pos`).
2. **`service_selected`**: Salon staff clicked and added a service to the active bill cart.
3. **`customer_attached`**: Customer name or phone number selected or created for the bill.
4. **`tax_calculated`**: GST / Tax / Discount review step displayed.
5. **`bill_completed`**: Payment settled (Cash / UPI / Card) and invoice saved.

---

## 6. Client Integration Examples

### TypeScript / Web (Supabase Client)
```typescript
import { supabase } from '@/lib/supabase';

export async function trackEvent(
  eventName: string,
  screen?: string,
  element?: string,
  metadata: Record<string, any> = {}
) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('events').insert({
      user_id: user?.id || null,
      shop_id: user?.user_metadata?.shop_id || null,
      event_name: eventName,
      screen,
      element,
      metadata,
      city: user?.user_metadata?.city || null,
      state: user?.user_metadata?.state || null,
    });
  } catch (err) {
    console.error('Failed to send telemetry event:', err);
  }
}
```

### Flutter / Mobile
```dart
Future<void> trackEvent({
  required String eventName,
  String? screen,
  String? element,
  Map<String, dynamic>? metadata,
}) async {
  try {
    final user = supabase.auth.currentUser;
    await supabase.from('events').insert({
      'user_id': user?.id,
      'shop_id': currentShopId,
      'event_name': eventName,
      'screen': screen,
      'element': element,
      'metadata': metadata ?? {},
      'created_at': DateTime.now().toUtc().toIso8601String(),
    });
  } catch (e) {
    debugPrint('Telemetry send failed: $e');
  }
}
```
