const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('crypto');
const prisma = new PrismaClient();

/*
 * Demo data for a Hyderabad laundry.
 * Rates are set within the range published by Hyderabad providers in 2026
 * (wash & fold roughly Rs 45-110/kg, wash & iron Rs 75-140/kg, dry cleaning per item).
 *
 * Demo portal login (local testing only): phone 9849012345, PIN 2468 (Priya Reddy).
 * Demo agent logins (/agent): Ravi Kumar 9000011111 PIN 1357 (West), Imran Khan 9000022222 PIN 8642 (Central).
 * Other demo customers activate the portal with any of their order numbers.
 */

const SETTINGS = {
  id: 'default',
  businessName: 'AquaClean Laundry',
  phone: '+91 90000 12345',
  whatsapp: '919000012345',
  email: 'hello@aquaclean.example',
  address: 'Plot 12, Ayyappa Society, Madhapur, Hyderabad, Telangana 500081',
  gstin: null,
  gstRate: 18,
  upiId: 'aquaclean@okaxis',
  platformFee: 5,
  expressRate: 30,
  deliveryFee: 49,
  freeDeliveryAbove: 499,
  minOrderValue: 199,
  standardHours: 48,
  expressHours: 24,
};

const SERVICES = [
  { name: 'Wash & Fold', category: 'wash', price: 69, unit: 'kg', description: 'Everyday clothes machine washed, tumble dried and neatly folded.' },
  { name: 'Wash & Iron', category: 'wash', price: 99, unit: 'kg', description: 'Washed, dried and steam ironed. Ready to wear, packed on hangers or folded.' },
  { name: 'Premium Laundry', category: 'wash', price: 139, unit: 'kg', description: 'Separate wash per customer with fabric-specific detergent and softener.' },
  { name: 'Steam Iron', category: 'ironing', price: 15, unit: 'piece', description: 'Steam pressing for shirts, trousers, kurtas and dresses.' },
  { name: 'Saree Rolling', category: 'ironing', price: 79, unit: 'piece', description: 'Saree steam press and roll polish for a crisp drape.' },
  { name: 'Dry Clean - Shirt / T-shirt', category: 'dry_clean', price: 99, unit: 'piece', description: 'Solvent cleaning for formal and branded shirts.' },
  { name: 'Dry Clean - Trouser', category: 'dry_clean', price: 99, unit: 'piece', description: 'Formal trousers, chinos and dress pants.' },
  { name: 'Dry Clean - Kurta', category: 'dry_clean', price: 129, unit: 'piece', description: 'Cotton, linen and embroidered kurtas.' },
  { name: 'Dry Clean - Blazer', category: 'dry_clean', price: 249, unit: 'piece', description: 'Single blazers and jackets, shape retained.' },
  { name: 'Dry Clean - Suit (2 piece)', category: 'dry_clean', price: 349, unit: 'piece', description: 'Jacket and trouser, finished on a form press.' },
  { name: 'Dry Clean - Saree', category: 'dry_clean', price: 199, unit: 'piece', description: 'Cotton and synthetic sarees.' },
  { name: 'Dry Clean - Silk Saree', category: 'dry_clean', price: 299, unit: 'piece', description: 'Pochampally, Kanchipuram and other silks with zari care.' },
  { name: 'Dry Clean - Sherwani', category: 'dry_clean', price: 549, unit: 'piece', description: 'Wedding and festive sherwanis, embroidery protected.' },
  { name: 'Dry Clean - Lehenga', category: 'dry_clean', price: 699, unit: 'piece', description: 'Heavy and embellished lehengas, hand finished.' },
  { name: 'Blanket (Double)', category: 'household', price: 299, unit: 'piece', description: 'Double blankets and quilts, deep washed and dried.' },
  { name: 'Curtain (per panel)', category: 'household', price: 149, unit: 'piece', description: 'Curtain panels washed or dry cleaned by fabric.' },
  { name: 'Bedsheet Set', category: 'household', price: 99, unit: 'piece', description: 'Bedsheet with two pillow covers.' },
  { name: 'Shoe Cleaning', category: 'specialty', price: 349, unit: 'pair', description: 'Sneakers, sports and canvas shoes deep cleaned and deodorised.' },
  { name: 'Stain Removal Add-on', category: 'specialty', price: 49, unit: 'piece', description: 'Targeted treatment for oil, turmeric, ink and wine stains.' },
];

const COUPONS = [
  { code: 'WELCOME20', description: '20% off your first order, up to ₹150', type: 'PERCENT', value: 20, maxDiscount: 150, minOrder: 299, firstOrderOnly: true },
  { code: 'FESTIVE100', description: '₹100 off festive dry cleaning above ₹999', type: 'FLAT', value: 100, minOrder: 999, firstOrderOnly: false },
];

const AGENTS = [
  { name: 'Ravi Kumar', phone: '9000011111', pin: '1357', zone: 'West', vehicle: 'TS09 EK 4521, scooter' },
  { name: 'Imran Khan', phone: '9000022222', pin: '8642', zone: 'Central', vehicle: 'TS10 FA 7788, bike' },
];

// Which agent covers each customer's locality zone
const AGENT_FOR_ZONE = { West: 0, 'North-West': 0, Central: 1, North: 1, East: 1 };
const ZONE_OF_AREA = {
  Gachibowli: 'West', Kondapur: 'West', Tolichowki: 'Central', Kukatpally: 'North-West', 'Jubilee Hills': 'Central',
};

const CUSTOMERS = [
  { name: 'Priya Reddy', phone: '9849012345', email: 'priya.reddy@example.com', area: 'Gachibowli', address: 'Flat 1204, My Home Avatar, Narsingi Road, Gachibowli', notes: 'Gated community: share OTP at gate.', pin: '2468' },
  { name: 'Arjun Rao', phone: '9000123456', email: 'arjun.rao@example.com', area: 'Kondapur', address: 'H.No 2-48, Botanical Garden Road, Kondapur', notes: 'Starch on formal shirts.' },
  { name: 'Sana Fatima', phone: '7702345678', email: 'sana.f@example.com', area: 'Tolichowki', address: 'Flat 3B, Paramount Colony, Tolichowki', notes: 'Silk sarees: hand finish only.' },
  { name: 'Venkat Naidu', phone: '9963456789', email: 'venkat.n@example.com', area: 'Kukatpally', address: 'Plot 77, KPHB Phase 3, Kukatpally', notes: 'Call before pickup.' },
  { name: 'Meera Iyer', phone: '8106567890', email: 'meera.iyer@example.com', area: 'Jubilee Hills', address: 'Road No. 36, Jubilee Hills', notes: 'Prefers express delivery.' },
];

const round2 = (n) => Math.round(n * 100) / 100;

function charges(subtotal, { express = false, discount = 0, delivery = true }) {
  const expressCharge = express ? round2((subtotal * SETTINGS.expressRate) / 100) : 0;
  const afterDiscount = subtotal + expressCharge - discount;
  const deliveryFee = delivery && afterDiscount < SETTINGS.freeDeliveryAbove ? SETTINGS.deliveryFee : 0;
  return {
    expressCharge,
    discount,
    deliveryFee,
    platformFee: SETTINGS.platformFee,
    totalAmount: round2(afterDiscount + deliveryFee + SETTINGS.platformFee),
  };
}

function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}

async function main() {
  console.log('Clearing database...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.agent.deleteMany({});

  await prisma.setting.create({ data: SETTINGS });
  for (const c of COUPONS) await prisma.coupon.create({ data: c });

  const services = {};
  for (const s of SERVICES) services[s.name] = await prisma.service.create({ data: s });
  console.log(`Seeded ${SERVICES.length} services, ${COUPONS.length} coupons.`);

  const customers = [];
  for (const { pin, ...c } of CUSTOMERS) {
    customers.push(await prisma.customer.create({ data: { ...c, pinHash: pin ? hashPin(pin) : null } }));
  }
  console.log(`Seeded ${customers.length} customers.`);

  const agents = [];
  for (const { pin, ...a } of AGENTS) agents.push(await prisma.agent.create({ data: { ...a, pinHash: hashPin(pin) } }));
  console.log(`Seeded ${agents.length} agents.`);

  const at = (daysFromNow, hour = 9) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  // [customer index, status, payment, method, source, express, coupon, pickup day offset, slot, items, rating]
  const ORDERS = [
    [0, 'DELIVERED', 'PAID', 'MOBILE', 'PORTAL', false, 'WELCOME20', -9, '10:00-13:00', [['Wash & Iron', 4.5], ['Dry Clean - Silk Saree', 1]], [5, 'Saree came back perfect, on time delivery.']],
    [1, 'DELIVERED', 'PAID', 'CASH', 'STAFF', false, null, -6, null, [['Dry Clean - Suit (2 piece)', 1], ['Dry Clean - Shirt / T-shirt', 3]], null],
    [2, 'OUT_FOR_DELIVERY', 'UNPAID', 'MOBILE', 'PORTAL', false, null, -2, '16:00-19:00', [['Dry Clean - Silk Saree', 2], ['Saree Rolling', 2]], null],
    [3, 'READY', 'UNPAID', 'CASH', 'PORTAL', false, null, -1, '07:00-10:00', [['Wash & Iron', 6]], null],
    [4, 'WASHING', 'PAID', 'CARD', 'PORTAL', true, null, 0, '07:00-10:00', [['Wash & Fold', 5], ['Bedsheet Set', 2]], null],
    [1, 'PICKED_UP', 'UNPAID', 'MOBILE', 'PORTAL', false, null, 0, '07:00-10:00', [['Shoe Cleaning', 1], ['Wash & Fold', 3]], null],
    [0, 'PENDING', 'UNPAID', 'MOBILE', 'PORTAL', false, null, 1, '10:00-13:00', [['Blanket (Double)', 2], ['Curtain (per panel)', 4]], null],
    [3, 'PENDING', 'UNPAID', 'CASH', 'PORTAL', false, null, 0, '19:00-22:00', [['Wash & Fold', 3.5]], null],
    [2, 'PENDING', 'UNPAID', 'MOBILE', 'PORTAL', true, null, 0, '19:00-22:00', [['Dry Clean - Sherwani', 1], ['Dry Clean - Kurta', 2]], null],
  ];

  let n = 1001;
  let index = 0;
  for (const [ci, status, paymentStatus, paymentMethod, source, express, couponCode, day, slot, items, review] of ORDERS) {
    const customer = customers[ci];
    const lines = items.map(([name, qty]) => {
      const s = services[name];
      return { serviceId: s.id, quantity: qty, unitPrice: s.price, totalPrice: round2(qty * s.price) };
    });
    const subtotal = lines.reduce((t, l) => t + l.totalPrice, 0);
    let discount = 0;
    if (couponCode === 'WELCOME20') discount = Math.min(round2(subtotal * 0.2), 150);
    const c = charges(subtotal, { express, discount, delivery: source === 'PORTAL' });
    const pickupDate = at(day, slot ? Number(slot.slice(0, 2)) : 11);
    const deliveryDate = new Date(pickupDate.getTime() + (express ? SETTINGS.expressHours : SETTINGS.standardHours) * 3600 * 1000);

    // Doorstep (portal) orders get agents: pickup always, delivery once the order is ready.
    const STAGES = ['PENDING', 'PICKED_UP', 'WASHING', 'DRYING', 'IRONING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const stage = STAGES.indexOf(status);
    const agent = source === 'PORTAL' ? agents[AGENT_FOR_ZONE[ZONE_OF_AREA[customer.area]] ?? 0] : null;
    const agentData = {
      pickupAgentId: agent ? agent.id : null,
      deliveryAgentId: agent && stage >= STAGES.indexOf('READY') ? agent.id : null,
      deliveryCode: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
      pickedUpAt: agent && stage >= 1 ? pickupDate : null,
      outForDeliveryAt: stage >= STAGES.indexOf('OUT_FOR_DELIVERY') ? new Date(Math.min(deliveryDate.getTime(), Date.now() - 3600 * 1000)) : null,
      deliveredAt: status === 'DELIVERED' ? deliveryDate : null,
      collectedAmount: agent && status === 'DELIVERED' ? c.totalAmount : null,
      collectedVia: agent && status === 'DELIVERED' ? paymentMethod : null,
    };

    await prisma.order.create({
      data: {
        orderNumber: `LND-${n++}`,
        customerId: customer.id,
        status,
        paymentStatus,
        paymentMethod,
        source,
        deliveryType: express ? 'EXPRESS' : 'STANDARD',
        ...c,
        ...agentData,
        couponCode,
        pickupDate,
        pickupSlot: slot,
        deliveryDate,
        area: customer.area,
        address: customer.address,
        rating: review ? review[0] : null,
        feedback: review ? review[1] : null,
        ratedAt: review ? deliveryDate : null,
        // Booked the evening before pickup, never in the future; later order numbers stay newest.
        createdAt: new Date(Math.min(pickupDate.getTime() - 20 * 3600 * 1000, Date.now() - (ORDERS.length - index++) * 60000)),
        items: { create: lines },
      },
    });
  }
  console.log(`Seeded ${ORDERS.length} orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
