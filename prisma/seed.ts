import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user (password placeholder — Better Auth handles real passwords)
  await prisma.user.upsert({
    where: { email: 'admin@tutiscloud.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@tutiscloud.com',
      password: '$2b$10$placeholder',
      role: 'admin',
      emailVerifiedAt: new Date(),
    },
  });

  // Create default settings
  const settings = [
    { name: 'app_name', value: 'TutisCloud' },
    { name: 'app_version', value: '1.0.0' },
    { name: 'app_url', value: 'http://localhost:3000' },
    { name: 'license', value: 'enterprise' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { name: setting.name },
      update: { value: setting.value },
      create: setting,
    });
  }

  // Create default languages
  await prisma.language.upsert({
    where: { locale: 'en' },
    update: {},
    create: { id: 'en-lang', name: 'English', locale: 'en' },
  });

  await prisma.language.upsert({
    where: { locale: 'es' },
    update: {},
    create: { id: 'es-lang', name: 'Spanish', locale: 'es' },
  });

  // Create default payment gateway
  await prisma.paymentGateway.create({
    data: { name: 'Stripe', slug: 'stripe' },
  });

  console.log('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
