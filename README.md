# AquaClean - Laundry Management System

A laundry and dry cleaning platform for a Hyderabad business: a public website, a customer portal for doorstep pickups, and a staff console for running orders. Built with Next.js 16, React 19, Tailwind CSS v4, Prisma 6 and SQLite.

## What is in it

| Route | Who | What |
|---|---|---|
| `/` | Everyone | Rate card, delivery charges, live offers, serviceable Hyderabad localities |
| `/portal` | Customers | Sign up or sign in (SMS OTP, or mobile number + PIN), book pickups, track orders, pay online or by UPI, reschedule, cancel, rate |
| `/admin` | Staff | Dashboard, orders, customers, delivery agents, services, settings and offer codes (password protected) |
| `/agent` | Delivery agents | Today's pickups and deliveries, re-weigh at pickup, delivery code handover, cash and UPI collection |

### Customer portal
- Book by service, quantity (kg or piece), locality, address, date (up to 14 days ahead) and 3-hour pickup slot. Slots that have already started can't be booked.
- Standard (48h) or Express (24h, surcharge) turnaround.
- Live bill computed by the server: items, express charge, coupon discount, pickup and delivery fee (free above a threshold), platform fee. Prices are GST-inclusive.
- Minimum order value, first-order and minimum-spend coupons.
- Order tracking through Pickup Scheduled, Picked Up, Washing, Drying, Ironing, Ready, Out for Delivery, Delivered.
- Online payment through Razorpay Checkout (UPI, cards, netbanking; test mode only). The server creates the Razorpay order, checks the payment signature and marks the order paid; a webhook settles it if the browser never returns.
- UPI deep link (GPay, PhonePe, Paytm) with the exact amount, WhatsApp help link, reschedule or cancel before pickup, rate after delivery.
- Sign in or sign up with a 6-digit SMS code (5-minute expiry, 5 wrong tries per code, 30-second resend cooldown, 5 codes per number per hour). Store customers are signed straight in once the code proves the number is theirs.
- PIN sign-in stays available as a fallback, and is the only option when no SMS provider is configured. Store customers can also activate PIN access with any of their order numbers.

### Delivery agent app
- Phone-first run sheet: pickups due today (and overdue), deliveries in hand, work completed today, cash and UPI collected.
- One-tap call, Google Maps directions and WhatsApp for each stop.
- At pickup the agent corrects weights and counts; the server re-prices the bill (express, coupon and delivery fee recalculated, platform fee kept).
- Deliveries: Ready -> Out for Delivery -> Delivered. Completing a delivery needs the customer's 4-digit delivery code, and unpaid orders need the amount collected (cash or UPI), which marks them paid.
- Agents only see orders assigned to them and never see the delivery code.

### Staff console
- Dashboard: revenue with platform and delivery fee breakdown, today's pickup run by slot and locality, average rating, revenue trend and service mix.
- Orders: create counter orders (no delivery fee), advance status, mark paid, cancel (kept on record), WhatsApp status message, printable GST tax invoice (taxable value, CGST, SGST).
- Delivery agents: add, pause, reset PIN or remove; assign a pickup and a delivery agent per order; open tasks and cash to settle per agent; unassigned pickups flagged on the dashboard.
- Customers: locality, order history, reset portal PIN, delete (blocked while orders are active).
- Services: rate card by category, enable or disable, delete (services used in past orders are deactivated instead).
- Settings and offers: business details, GSTIN, UPI ID, platform fee, delivery fee, free-delivery threshold, minimum order, express surcharge and turnaround hours, offer codes with usage stats.

## Pricing rules

Order total = items subtotal + express surcharge - coupon discount + pickup and delivery fee + platform fee.

- The delivery fee applies to portal orders whose amount after discount is below the free-delivery threshold.
- The platform fee is charged on every order.
- All values are configurable in **Settings & Offers**. Orders keep the charges they were placed with.

Seeded defaults: platform fee ₹5, delivery ₹49 (free above ₹499), minimum order ₹199, Express +30%. The rate card follows 2026 Hyderabad market prices (wash and fold ₹69/kg, wash and iron ₹99/kg, dry cleaning per item).

## Local setup

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Then open http://localhost:3000.

`.env` needs:

```env
DATABASE_URL="file:./db/custom.db"
AUTH_SECRET="<random 32+ byte hex string>"
ADMIN_PASSWORD="<staff console password>"
```

Optional, for SMS OTP sign-in (pick one provider; leave all unset in development to use the console provider):

```env
SMS_PROVIDER="msg91"                 # msg91 | twilio | console | off. Unset = first provider with keys, else console in dev
MSG91_AUTH_KEY="..."
MSG91_OTP_TEMPLATE_ID="..."          # DLT-approved OTP template
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM="+1..."                  # sender number or MG... messaging service SID
```

With the console provider (development only) no SMS is sent: the code is printed in the server log and shown on the sign-in screen. In production without provider keys, OTP is switched off and the portal shows PIN sign-in.

Optional, for Razorpay online payments (test keys only; `rzp_live_` keys are refused):

```env
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."        # same secret as the webhook in the Razorpay dashboard
```

Webhook URL: `https://<your-host>/api/payments/razorpay/webhook`, events `payment.captured`, `order.paid` and `payment.failed`. For local testing expose port 3000 with a tunnel (for example ngrok). Without these keys the order drawer only shows the UPI link. Razorpay test cards and the `success@razorpay` test UPI ID complete payments without real money.

### Demo logins (seed data, local only)
- Staff console: the `ADMIN_PASSWORD` from `.env`.
- Agent app: Ravi Kumar `9000011111` / PIN `1357` (West), Imran Khan `9000022222` / PIN `8642` (Central).
- Customer portal: mobile `9849012345`, PIN `2468` (Priya Reddy), or sign in with an SMS code (shown on screen in development). Other seeded customers can use an SMS code, or **Activate** with any of their order numbers.

`npm run db:seed` wipes and recreates all data.

## Known limits
- Agents are assigned by staff; there is no automatic assignment by zone or route optimisation yet. Delivery-code attempts are not rate limited.
- SMS OTP needs a DLT-registered sender and OTP template (MSG91) or an India-enabled Twilio sender before going live. Limits are per number; there is no per-IP rate limit or CAPTCHA yet.
- Customers who sign up with an SMS code have no PIN, so they can only sign in with a code.
- Razorpay runs in test mode only. Going live needs live keys, KYC and removing the `rzp_test_` guard in `src/lib/razorpay.ts`. Refunds are not automated: customers cannot cancel an order paid online from the portal, and staff handle refunds in the Razorpay dashboard.
- Staff still see a single payment status per order; Razorpay payment IDs are stored in the `Payment` table but not shown in the staff console yet.
- The UPI link remains a manual path: staff confirm those payments by hand.
- WhatsApp messages open a prefilled chat; there is no automated WhatsApp Business API sending.
