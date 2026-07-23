# Phase 6: Subscriptions & Billing Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute this plan task-by-task.

**Goal:** Build Stripe billing — subscription plans, payment methods, invoices.

**Prerequisites:** Phase 1-5 complete.

**Tech Stack:** Next.js 16, TypeScript strict, Prisma 7, tRPC 11, shadcn/ui, TailwindCSS, Stripe

---

### Task 1: Stripe Setup + Billing Router

**Files:**
- Create: `src/server/trpc/routers/billing.ts`
- Modify: `src/server/trpc/root.ts` (merge billing router)
- Create: `src/lib/stripe.ts` (if not exists)

- [ ] Create Stripe client library
- [ ] Create billing router with: getPlans, getCurrentSubscription, createCheckoutSession, createPortalSession, getPaymentMethods, addPaymentMethod, removePaymentMethod, getInvoices

### Task 2: Subscription Overview Page

**Files:**
- Create: `src/app/(dashboard)/billing/page.tsx`
- Create: `src/components/billing/PlanCard.tsx`
- Create: `src/components/billing/CurrentPlan.tsx`

- [ ] Create billing page with current plan display
- [ ] Show available plans for upgrade
- [ ] Wire to checkout session

### Task 3: Payment Methods

**Files:**
- Create: `src/app/(dashboard)/billing/payment-methods/page.tsx`
- Create: `src/components/billing/PaymentMethodForm.tsx`

- [ ] Create payment methods page
- [ ] List saved cards
- [ ] Add new card form
- [ ] Remove card

### Task 4: Invoices

**Files:**
- Create: `src/app/(dashboard)/billing/invoices/page.tsx`
- Create: `src/components/billing/InvoiceList.tsx`

- [ ] Create invoices page
- [ ] List past invoices with download links

### Task 5: Final Integration

- [ ] TypeScript check, all tests pass
- [ ] Update progress ledger
