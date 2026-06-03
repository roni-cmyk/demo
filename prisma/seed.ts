import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Define standard permissions
  const permissionsList = [
    { name: 'users:create', description: 'Create new users' },
    { name: 'users:read', description: 'Read user list and details' },
    { name: 'users:update', description: 'Update existing user profiles' },
    { name: 'users:delete', description: 'Soft delete or delete users' },
    { name: 'roles:manage', description: 'Manage roles and permission mappings' },
    { name: 'audit:read', description: 'Read audit logs and request logs' },
    { name: 'dashboard:read', description: 'Access dashboard analytics and stats' },
  ];

  console.log('Seeding permissions...');
  const seededPermissions = [];
  for (const perm of permissionsList) {
    const dbPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
    seededPermissions.push(dbPerm);
  }

  // 2. Define standard roles and assign permissions
  console.log('Seeding roles and mapping permissions...');
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {
      permissions: {
        set: seededPermissions.map((p) => ({ id: p.id })),
      },
    },
    create: {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with full control over the system',
      permissions: {
        connect: seededPermissions.map((p) => ({ id: p.id })),
      },
    },
  });

  const adminPermissions = seededPermissions.filter((p) =>
    ['users:read', 'users:create', 'users:update', 'audit:read', 'dashboard:read'].includes(p.name),
  );
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {
      permissions: {
        set: adminPermissions.map((p) => ({ id: p.id })),
      },
    },
    create: {
      name: 'ADMIN',
      description: 'Administrator with access to dashboard and user operations',
      permissions: {
        connect: adminPermissions.map((p) => ({ id: p.id })),
      },
    },
  });

  const userPermissions = seededPermissions.filter((p) =>
    ['users:read'].includes(p.name),
  );
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {
      permissions: {
        set: userPermissions.map((p) => ({ id: p.id })),
      },
    },
    create: {
      name: 'USER',
      description: 'Standard system user',
      permissions: {
        connect: userPermissions.map((p) => ({ id: p.id })),
      },
    },
  });

  // 3. Create a default Super Admin user
  const adminEmail = 'admin@demo.com';
  const existingUser = await prisma.user.findFirst({
    where: { email: adminEmail },
  });

  if (!existingUser) {
    console.log(`Creating default SUPER_ADMIN user (${adminEmail})...`);
    const passwordHash = await bcrypt.hash('SuperSecretAdminPassword123!', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        isEmailVerified: true,
        roles: {
          connect: [{ id: superAdminRole.id }],
        },
      },
    });
  } else {
    console.log(`SUPER_ADMIN user (${adminEmail}) already exists.`);
  }

  console.log('✅ Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
