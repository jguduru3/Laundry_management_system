const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.service.deleteMany({});

  console.log('Seeding laundry services...');
  const services = [
    {
      name: 'Wash & Fold',
      category: 'wash',
      price: 2.50,
      unit: 'kg',
      description: 'Standard wash, dry, and fold service. Great for everyday clothes.',
    },
    {
      name: 'Wash & Iron',
      category: 'wash',
      price: 3.50,
      unit: 'kg',
      description: 'Wash, dry, and professional iron service. Ready to wear.',
    },
    {
      name: 'Dry Cleaning (Suit)',
      category: 'dry_clean',
      price: 12.00,
      unit: 'piece',
      description: 'Professional dry cleaning for standard suits (jacket and pants).',
    },
    {
      name: 'Dry Cleaning (Coat)',
      category: 'dry_clean',
      price: 15.00,
      unit: 'piece',
      description: 'Dry cleaning for heavy winter coats, trench coats, or jackets.',
    },
    {
      name: 'Ironing Only',
      category: 'ironing',
      price: 1.50,
      unit: 'piece',
      description: 'Professional steam ironing for shirts, pants, or dresses.',
    },
    {
      name: 'Premium Silk Wash',
      category: 'specialty',
      price: 8.00,
      unit: 'piece',
      description: 'Delicate hand wash treatment for silk garments and fine wear.',
    },
    {
      name: 'Stain Removal Treatment',
      category: 'specialty',
      price: 5.00,
      unit: 'piece',
      description: 'Advanced stain removal for stubborn stains (wine, grease, ink).',
    },
  ];

  const dbServices = [];
  for (const s of services) {
    const created = await prisma.service.create({ data: s });
    dbServices.push(created);
  }
  console.log(`Seeded ${dbServices.length} services.`);

  console.log('Seeding customers...');
  const customers = [
    {
      name: 'Alice Smith',
      phone: '555-0199',
      email: 'alice.smith@example.com',
      address: '123 Maple Street, Springfield',
      notes: 'Prefers mild lavender detergent. Sensitive skin.',
    },
    {
      name: 'Bob Jones',
      phone: '555-0244',
      email: 'bob.jones@example.com',
      address: '456 Oak Avenue, Metropolis',
      notes: 'Leave package at the front porch if not home.',
    },
    {
      name: 'Charlie Brown',
      phone: '555-0311',
      email: 'charlie.b@example.com',
      address: '789 Pine Road, Peanuts City',
      notes: 'Always request starch on dress shirts.',
    },
    {
      name: 'Diana Prince',
      phone: '555-0422',
      email: 'diana.prince@example.com',
      address: '101 Wayne Tower, Gotham',
      notes: 'VIP customer. Request express delivery.',
    },
  ];

  const dbCustomers = [];
  for (const c of customers) {
    const created = await prisma.customer.create({ data: c });
    dbCustomers.push(created);
  }
  console.log(`Seeded ${dbCustomers.length} customers.`);

  console.log('Seeding orders...');
  const now = new Date();
  
  // Helper to subtract days
  const daysAgo = (num) => {
    const d = new Date(now);
    d.setDate(d.getDate() - num);
    return d;
  };
  
  // Helper to add days
  const daysAhead = (num) => {
    const d = new Date(now);
    d.setDate(d.getDate() + num);
    return d;
  };

  const getService = (name) => dbServices.find(s => s.name === name);

  // Order 1: Alice Smith (Delivered & Paid)
  const serviceWashFold = getService('Wash & Fold');
  const serviceIroning = getService('Ironing Only');
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'LND-1001',
      customerId: dbCustomers[0].id,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      paymentMethod: 'CARD',
      totalAmount: (5 * serviceWashFold.price) + (3 * serviceIroning.price),
      pickupDate: daysAgo(5),
      deliveryDate: daysAgo(3),
      notes: 'Wash cold, iron medium.',
      items: {
        create: [
          {
            serviceId: serviceWashFold.id,
            quantity: 5,
            unitPrice: serviceWashFold.price,
            totalPrice: 5 * serviceWashFold.price,
          },
          {
            serviceId: serviceIroning.id,
            quantity: 3,
            unitPrice: serviceIroning.price,
            totalPrice: 3 * serviceIroning.price,
          }
        ]
      }
    }
  });

  // Order 2: Bob Jones (Ready & Paid)
  const serviceDryCleanSuit = getService('Dry Cleaning (Suit)');
  const serviceStain = getService('Stain Removal Treatment');
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'LND-1002',
      customerId: dbCustomers[1].id,
      status: 'READY',
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      totalAmount: (2 * serviceDryCleanSuit.price) + (1 * serviceStain.price),
      pickupDate: daysAgo(2),
      deliveryDate: now,
      notes: 'Remove wine stain on the sleeve of the suit.',
      items: {
        create: [
          {
            serviceId: serviceDryCleanSuit.id,
            quantity: 2,
            unitPrice: serviceDryCleanSuit.price,
            totalPrice: 2 * serviceDryCleanSuit.price,
          },
          {
            serviceId: serviceStain.id,
            quantity: 1,
            unitPrice: serviceStain.price,
            totalPrice: 1 * serviceStain.price,
          }
        ]
      }
    }
  });

  // Order 3: Charlie Brown (Washing & Unpaid)
  const serviceWashIron = getService('Wash & Iron');
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'LND-1003',
      customerId: dbCustomers[2].id,
      status: 'WASHING',
      paymentStatus: 'UNPAID',
      paymentMethod: 'MOBILE',
      totalAmount: 6 * serviceWashIron.price,
      pickupDate: daysAgo(1),
      deliveryDate: daysAhead(1),
      notes: 'Separate whites and darks.',
      items: {
        create: [
          {
            serviceId: serviceWashIron.id,
            quantity: 6,
            unitPrice: serviceWashIron.price,
            totalPrice: 6 * serviceWashIron.price,
          }
        ]
      }
    }
  });

  // Order 4: Diana Prince (Pending & Unpaid)
  const serviceSilk = getService('Premium Silk Wash');
  const serviceDryCleanCoat = getService('Dry Cleaning (Coat)');
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'LND-1004',
      customerId: dbCustomers[3].id,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      paymentMethod: 'CARD',
      totalAmount: (2 * serviceSilk.price) + (1 * serviceDryCleanCoat.price),
      pickupDate: now,
      deliveryDate: daysAhead(3),
      notes: 'Handle silk wrap with extreme care.',
      items: {
        create: [
          {
            serviceId: serviceSilk.id,
            quantity: 2,
            unitPrice: serviceSilk.price,
            totalPrice: 2 * serviceSilk.price,
          },
          {
            serviceId: serviceDryCleanCoat.id,
            quantity: 1,
            unitPrice: serviceDryCleanCoat.price,
            totalPrice: 1 * serviceDryCleanCoat.price,
          }
        ]
      }
    }
  });

  console.log('Seeded 4 orders successfully.');
  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
