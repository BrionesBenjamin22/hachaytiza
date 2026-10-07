import { PrismaClient, type LocationType } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const db = new PrismaClient();
const id = (key: string) => {
  const h = createHash('sha256').update(`hyt:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const data = JSON.parse(
  await readFile(new URL('../../../localidades.json', import.meta.url), 'utf8'),
) as {
  localidades: {
    id: string;
    nombre: string;
    tipo: LocationType;
    activo: boolean;
  }[];
};
try {
  const province = await db.location.upsert({
    where: { seedKey: 'buenos-aires' },
    update: { name: 'Buenos Aires', active: true },
    create: {
      id: id('buenos-aires'),
      seedKey: 'buenos-aires',
      name: 'Buenos Aires',
      type: 'PROVINCIA',
    },
  });
  const city = await db.location.upsert({
    where: { seedKey: 'la-plata' },
    update: { name: 'La Plata', active: true },
    create: {
      id: id('la-plata'),
      seedKey: 'la-plata',
      name: 'La Plata',
      type: 'CIUDAD',
      parentId: province.id,
    },
  });
  for (const location of data.localidades)
    await db.location.upsert({
      where: { seedKey: location.id },
      update: {
        name: location.nombre,
        type: location.tipo,
        active: location.activo,
        parentId: city.id,
      },
      create: {
        id: id(location.id),
        seedKey: location.id,
        name: location.nombre,
        type: location.tipo,
        active: location.activo,
        parentId: city.id,
      },
    });
  if (process.argv.includes('--development')) {
    if (process.env.NODE_ENV !== 'development')
      throw new Error('Fictional seeds require NODE_ENV=development');
    const organizer = await db.user.upsert({
      where: { email: 'organizer-demo@example.invalid' },
      update: {},
      create: {
        id: id('demo-organizer'),
        name: 'Organizador de demostración',
        email: 'organizer-demo@example.invalid',
        primaryLocationId: id('la-plata-tolosa'),
      },
    });
    const keys = [
      'la-plata-tolosa',
      'la-plata-tolosa',
      'la-plata-city-bell',
      'la-plata-los-hornos',
    ];
    await db.$transaction(async (tx) => {
      await tx.participation.updateMany({
        where: {
          userId: organizer.id,
          match: { seedKey: { startsWith: 'demo-match-' } },
        },
        data: { active: false },
      });
      for (const [index, key] of keys.entries()) {
        const startsAt = new Date();
        startsAt.setUTCDate(startsAt.getUTCDate() + index + 1);
        startsAt.setUTCHours(23, 0, 0, 0);
        const localDate = new Date(
          `${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(startsAt)}T00:00:00Z`,
        );
        const match = await tx.match.upsert({
          where: { seedKey: `demo-match-${index}` },
          update: { startsAt },
          create: {
            id: id(`demo-match-${index}`),
            seedKey: `demo-match-${index}`,
            organizerId: organizer.id,
            locationId: id(key),
            footballType: index % 2 ? 'SEVEN' : 'FIVE',
            startsAt,
            venueName: `Cancha de demostración ${index + 1}`,
            address: 'Dirección ficticia para desarrollo',
            pricePerPerson: 5000,
            availablePlaces: index + 1,
            description: 'Partido ficticio de desarrollo.',
          },
        });
        await tx.participation.upsert({
          where: {
            userId_matchId: { userId: organizer.id, matchId: match.id },
          },
          update: { localDate, active: true },
          create: {
            userId: organizer.id,
            matchId: match.id,
            role: 'ORGANIZER',
            localDate,
          },
        });
      }
    });
  }
  console.log('Seeds completed.');
} finally {
  await db.$disconnect();
}
