import { PrismaClient, Category, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const METHODS = [
  // Análisis Numérico — Raíces
  { slug: 'bisection', name: 'Bisección', category: Category.NUMERICAL, description: 'Método cerrado de búsqueda de raíces que divide iterativamente el intervalo a la mitad.' },
  { slug: 'newton-raphson', name: 'Newton-Raphson', category: Category.NUMERICAL, description: 'Método abierto basado en la derivada para encontrar raíces de funciones no lineales.' },
  // Interpolación
  { slug: 'lagrange', name: 'Interpolación de Lagrange', category: Category.NUMERICAL, description: 'Construye un polinomio interpolante mediante combinación lineal de polinomios base.' },
  { slug: 'newton-divided', name: 'Diferencias Divididas de Newton', category: Category.NUMERICAL, description: 'Polinomio interpolante en forma de Newton usando tabla de diferencias divididas.' },
  // Integración
  { slug: 'trapezoidal', name: 'Regla del Trapecio', category: Category.NUMERICAL, description: 'Aproximación de integrales definidas mediante áreas trapezoidales.' },
  { slug: 'simpson-1-3', name: 'Simpson 1/3', category: Category.NUMERICAL, description: 'Aproximación de integrales con polinomios cuadráticos por pares de subintervalos.' },
  { slug: 'simpson-3-8', name: 'Simpson 3/8', category: Category.NUMERICAL, description: 'Aproximación de integrales con polinomios cúbicos por tercios de subintervalos.' },
  // IO
  { slug: 'simplex', name: 'Método Símplex', category: Category.OPERATIONS, description: 'Algoritmo tabular para resolver problemas de programación lineal.' },
  { slug: 'transportation', name: 'Problema de Transporte', category: Category.OPERATIONS, description: 'Solución básica inicial por Vogel y optimización por MODI.' },
  { slug: 'assignment', name: 'Problema de Asignación', category: Category.OPERATIONS, description: 'Algoritmo Húngaro para asignación óptima de recursos a tareas.' },
];

async function main() {
  console.log('Seeding methods...');
  for (const m of METHODS) {
    await prisma.method.upsert({
      where: { slug: m.slug },
      update: { name: m.name, category: m.category, description: m.description },
      create: m,
    });
  }

  // Las cuentas demo tienen contraseñas publicadas en la documentación: solo se
  // crean en desarrollo (SEED_USUARIOS_DEMO=true), nunca en el servidor.
  if (process.env.SEED_USUARIOS_DEMO !== 'true') {
    console.log('Cuentas demo omitidas (SEED_USUARIOS_DEMO no es true).');
    console.log('Seed completed.');
    return;
  }

  console.log('Seeding admin user...');
  const adminEmail = 'admin@uts.edu.co';
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Administrador NumIO',
      role: Role.ADMIN,
    },
  });

  console.log('Seeding teacher user...');
  const teacherHash = await bcrypt.hash('Docente123!', 10);
  await prisma.user.upsert({
    where: { email: 'docente@uts.edu.co' },
    update: {},
    create: {
      email: 'docente@uts.edu.co',
      passwordHash: teacherHash,
      fullName: 'Docente Demostración',
      role: Role.TEACHER,
    },
  });

  console.log('Seeding student user...');
  const studentHash = await bcrypt.hash('Estudiante123!', 10);
  await prisma.user.upsert({
    where: { email: 'estudiante@uts.edu.co' },
    update: {},
    create: {
      email: 'estudiante@uts.edu.co',
      passwordHash: studentHash,
      fullName: 'Estudiante Demostración',
      role: Role.STUDENT,
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
