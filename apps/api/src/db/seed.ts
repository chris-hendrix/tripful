import { reset, cities } from "drizzle-seed";
import { db, pool } from "@/config/database.js";
import * as schema from "@/db/schema/index.js";

// --- Helpers ---

function daysFromNow(days: number, hour = 12): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

// --- Data pools ---

const PHONE_NUMBERS = [
  "+15550000001",
  "+15550000002",
  "+15550000003",
  "+15550000004",
  "+15550000005",
] as const;

const EVENT_NAMES = {
  activity: [
    "Temple Visit", "Museum Tour", "Walking Tour", "Night Out", "Morning Hike",
    "Beach Day", "Cable Car Ride", "Stadium Tour", "Street Art Walk", "Boat Tour",
    "Sunset Viewpoint", "Neighborhood Walk", "Comedy Show", "Cooking Class",
    "Bike Ride", "Park Picnic", "Live Music", "Market Stroll",
  ],
  meal: [
    "Brunch", "Lunch Spot", "Dinner Reservation", "Street Food Tour",
    "Rooftop Drinks", "Tapas Night", "Pizza Night", "Cocktail Hour",
    "Market Breakfast", "Seafood Feast", "Wine Tasting", "Dessert Run",
  ],
  travel: [
    "Airport Transfer", "Train to City Center", "Ferry Crossing",
    "Bus to Hotel", "Shuttle to Airport", "Car Rental Pickup",
    "Taxi to Station", "Drive to Next City",
  ],
};

// --- Main ---

async function main() {
  console.log("Resetting database...");
  await reset(db, schema);

  // Users
  const userRows = await db
    .insert(schema.users)
    .values([
      { phoneNumber: PHONE_NUMBERS[0], displayName: "Alice Johnson" },
      { phoneNumber: PHONE_NUMBERS[1], displayName: "Bob Williams" },
      { phoneNumber: PHONE_NUMBERS[2], displayName: "Carol Martinez" },
      { phoneNumber: PHONE_NUMBERS[3], displayName: "David Kim" },
      { phoneNumber: PHONE_NUMBERS[4], displayName: "Eve Chen" },
    ])
    .returning();

  const [alice, bob, carol, david, eve] = userRows as [
    (typeof userRows)[0], (typeof userRows)[0], (typeof userRows)[0],
    (typeof userRows)[0], (typeof userRows)[0],
  ];

  // Trips — one upcoming, one future, one in-progress
  const tripRows = await db
    .insert(schema.trips)
    .values([
      {
        name: "Tokyo Adventure",
        destination: "Tokyo, Japan",
        startDate: toDateStr(daysFromNow(3)),
        endDate: toDateStr(daysFromNow(10)),
        preferredTimezone: "Asia/Tokyo",
        description: "A week exploring Tokyo — temples, food, and nightlife.",
        createdBy: alice.id,
      },
      {
        name: "Barcelona Beach Week",
        destination: "Barcelona, Spain",
        startDate: toDateStr(daysFromNow(18)),
        endDate: toDateStr(daysFromNow(25)),
        preferredTimezone: "Europe/Madrid",
        description: "Sun, tapas, and Gaudi architecture.",
        createdBy: bob.id,
      },
      {
        name: "NYC Weekend",
        destination: "New York City, USA",
        startDate: toDateStr(daysFromNow(-2)),
        endDate: toDateStr(daysFromNow(1)),
        preferredTimezone: "America/New_York",
        description: "Quick weekend getaway to the city.",
        createdBy: carol.id,
      },
    ])
    .returning();

  const [tokyo, barcelona, nyc] = tripRows as [
    (typeof tripRows)[0], (typeof tripRows)[0], (typeof tripRows)[0],
  ];

  // Members
  const memberRows = await db
    .insert(schema.members)
    .values([
      { tripId: tokyo.id, userId: alice.id, status: "going" as const, isOrganizer: true },
      { tripId: tokyo.id, userId: bob.id, status: "going" as const },
      { tripId: tokyo.id, userId: carol.id, status: "maybe" as const },
      { tripId: tokyo.id, userId: david.id, status: "no_response" as const },
      { tripId: barcelona.id, userId: bob.id, status: "going" as const, isOrganizer: true },
      { tripId: barcelona.id, userId: alice.id, status: "going" as const },
      { tripId: barcelona.id, userId: eve.id, status: "going" as const },
      { tripId: barcelona.id, userId: carol.id, status: "not_going" as const },
      { tripId: nyc.id, userId: carol.id, status: "going" as const, isOrganizer: true },
      { tripId: nyc.id, userId: david.id, status: "maybe" as const },
      { tripId: nyc.id, userId: eve.id, status: "going" as const },
    ])
    .returning();

  // Events — randomly generated per trip
  const trips = [
    { trip: tokyo, startDay: 3, days: 7, creators: [alice, bob, carol] },
    { trip: barcelona, startDay: 18, days: 7, creators: [bob, alice, eve] },
    { trip: nyc, startDay: -2, days: 3, creators: [carol, david, eve] },
  ];

  for (const { trip, startDay, days, creators } of trips) {
    const eventValues: (typeof schema.events.$inferInsert)[] = [];
    const activityNames = shuffle([...EVENT_NAMES.activity]);
    const mealNames = shuffle([...EVENT_NAMES.meal]);
    const travelNames = shuffle([...EVENT_NAMES.travel]);
    let ai = 0;
    let mi = 0;
    let ti = 0;

    for (let day = 0; day < days; day++) {
      const isFirstDay = day === 0;
      const isLastDay = day === days - 1;

      // Add a travel event on first/last day
      if (isFirstDay || isLastDay) {
        const name = travelNames[ti++ % travelNames.length]!;
        const hour = isFirstDay ? randInt(7, 9) : randInt(16, 19);
        eventValues.push({
          tripId: trip.id,
          createdBy: pick(creators).id,
          name,
          eventType: "travel",
          location: pick(cities),
          startTime: daysFromNow(startDay + day, hour),
          endTime: daysFromNow(startDay + day, hour + randInt(1, 3)),
        });
      }

      const count = randInt(3, 5);
      const hours = shuffle([8, 10, 12, 14, 16, 19]).slice(0, count).sort((a, b) => a - b);

      for (const hour of hours) {
        const type = hour >= 19 || hour <= 8 || hour === 12 ? "meal" as const : pick(["activity", "meal"] as const);
        const name = type === "meal"
          ? mealNames[mi++ % mealNames.length]!
          : activityNames[ai++ % activityNames.length]!;
        const duration = type === "meal" ? randInt(1, 2) : randInt(2, 4);

        eventValues.push({
          tripId: trip.id,
          createdBy: pick(creators).id,
          name,
          eventType: type,
          location: pick(cities),
          startTime: daysFromNow(startDay + day, hour),
          endTime: daysFromNow(startDay + day, hour + duration),
          isOptional: Math.random() < 0.15,
        });
      }
    }

    await db.insert(schema.events).values(eventValues);
  }

  // Member travel — arrival + departure for going/maybe members
  const travelValues: (typeof schema.memberTravel.$inferInsert)[] = [];

  for (const { trip, startDay, days } of trips) {
    const goingMembers = memberRows.filter(
      (m) => m.tripId === trip.id && (m.status === "going" || m.status === "maybe"),
    );

    for (const m of goingMembers) {
      const location = `${pick(cities)} Airport`;

      travelValues.push({
        tripId: trip.id,
        memberId: m.id,
        travelType: "arrival",
        time: daysFromNow(startDay, randInt(7, 16)),
        location,
        details: pick(["Flight from SFO", "Flight from LAX", "Flight from JFK",
          "Flight from ORD", "Flight from LHR", "Train from nearby city"]),
      });

      if (Math.random() < 0.8) {
        travelValues.push({
          tripId: trip.id,
          memberId: m.id,
          travelType: "departure",
          time: daysFromNow(startDay + days, randInt(8, 18)),
          location,
        });
      }
    }
  }

  await db.insert(schema.memberTravel).values(travelValues);

  // Accommodations
  await db.insert(schema.accommodations).values([
    {
      tripId: tokyo.id, createdBy: alice.id,
      name: "Hotel Sunroute Plaza Shinjuku",
      address: "2-3-1 Yoyogi, Shibuya-ku, Tokyo",
      checkIn: daysFromNow(3, 15), checkOut: daysFromNow(10, 11),
    },
    {
      tripId: barcelona.id, createdBy: bob.id,
      name: "Airbnb near La Rambla",
      address: "Carrer de Ferran 28, Barcelona",
      checkIn: daysFromNow(18, 14), checkOut: daysFromNow(25, 10),
    },
    {
      tripId: nyc.id, createdBy: carol.id,
      name: "The NoMad Hotel",
      address: "1170 Broadway, New York",
      checkIn: daysFromNow(-2, 15), checkOut: daysFromNow(1, 12),
    },
  ]);

  // Messages
  const [tokyoMsg1] = await db
    .insert(schema.messages)
    .values({
      tripId: tokyo.id,
      authorId: alice.id,
      content: "So excited for Tokyo! Has everyone started packing?",
    })
    .returning();

  await db.insert(schema.messages).values([
    { tripId: tokyo.id, authorId: bob.id, parentId: tokyoMsg1!.id,
      content: "Almost done! Can't wait for the ramen." },
    { tripId: tokyo.id, authorId: carol.id,
      content: "Still deciding if I can make it — will confirm by next week." },
    { tripId: barcelona.id, authorId: bob.id,
      content: "Found a great rooftop bar near our Airbnb!" },
    { tripId: barcelona.id, authorId: eve.id,
      content: "I'll book the Sagrada Familia tickets. How many do we need?" },
    { tripId: nyc.id, authorId: carol.id, isPinned: true,
      content: "Hamilton tickets are booked! Saturday 7:30pm." },
  ]);

  // Print login info
  console.log("\nSeed complete! Login with any phone number + code 000000:\n");
  console.log("  Phone Number     Name");
  console.log("  ──────────────── ──────────────");
  const names = ["Alice Johnson", "Bob Williams", "Carol Martinez", "David Kim", "Eve Chen"];
  PHONE_NUMBERS.forEach((phone, i) => console.log(`  ${phone}  ${names[i]}`));
  console.log("");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
