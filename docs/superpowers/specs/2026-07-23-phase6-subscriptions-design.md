# Phase 6: Subscriptions & Billing Design

> **Scope:** Stripe integration — subscription plans, payment methods, invoices, checkout portal.

---

## 1. Architecture

### Route Structure

```
/billing                → Subscription overview + plan selection
/billing/payment-methods → Manage payment cards
/billing/invoices       → Invoice history
```

### tRPC Router

```
src/server/trpc/routers/billing.ts:
  getPlans              (publicProcedure)
  getCurrentSubscription(protectedProcedure)
  createCheckoutSession (protectedProcedure)
  createPortalSession   (protectedProcedure)
  getPaymentMethods     (protectedProcedure)
  addPaymentMethod      (protectedProcedure)
  removePaymentMethod   (protectedProcedure)
  getInvoices           (protectedProcedure)
```

---

## 2. Subscription Plans

### Plan Display

- Fetch active plans from Stripe
- Display: name, price, features, storage capacity
- Highlight current plan
- Upgrade/downgrade buttons

### Checkout Flow

- User selects plan → creates Stripe Checkout session
- Redirects to Stripe hosted checkout
- Webhook updates subscription status

---

## 3. Payment Methods

### Card Management

- List saved cards (brand, last 4, exp)
- Add new card via Stripe Elements
- Set default card
- Remove card

---

## 4. Invoices

### Invoice History

- List past invoices from Stripe
- Show: date, amount, status
- Download PDF link

---

## 5. File Structure

```
tutiscloud/
├── src/
│   ├── server/
│   │   └── trpc/
│   │       └── routers/
│   │           └── billing.ts            # NEW — billing router
│   ├── app/
│   │   └── (dashboard)/
│   │       └── billing/
│   │           ├── page.tsx              # NEW — subscription overview
│   │           ├── payment-methods/
│   │           │   └── page.tsx          # NEW — card management
│   │           └── invoices/
│   │               └── page.tsx          # NEW — invoice history
│   └── components/
│       └── billing/
│           ├── PlanCard.tsx              # NEW — plan display card
│           ├── CurrentPlan.tsx           # NEW — current subscription
│           └── InvoiceList.tsx           # NEW — invoice table
```
