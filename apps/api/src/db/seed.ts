import { reset } from "drizzle-seed";
import { db, pool } from "@/config/database.js";
import * as schema from "@/db/schema/index.js";

const PHONE_NUMBERS = [
  "+15550000001",
  "+15550000002",
  "+15550000003",
  "+15550000004",
  "+15550000005",
] as const;

async function main() {
  console.log("Resetting database...");
  await reset(db, schema);

  // --- Users ---
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

  const alice = userRows[0]!;
  const bob = userRows[1]!;
  const carol = userRows[2]!;
  const david = userRows[3]!;
  const eve = userRows[4]!;

  // --- Trips ---
  const tripRows = await db
    .insert(schema.trips)
    .values([
      {
        name: "Tokyo Adventure",
        destination: "Tokyo, Japan",
        startDate: "2026-04-10",
        endDate: "2026-04-17",
        preferredTimezone: "Asia/Tokyo",
        description: "A week exploring Tokyo — temples, food, and nightlife.",
        createdBy: alice.id,
      },
      {
        name: "Barcelona Beach Week",
        destination: "Barcelona, Spain",
        startDate: "2026-05-20",
        endDate: "2026-05-27",
        preferredTimezone: "Europe/Madrid",
        description: "Sun, tapas, and Gaudi architecture.",
        createdBy: bob.id,
      },
      {
        name: "NYC Weekend",
        destination: "New York City, USA",
        startDate: "2026-03-14",
        endDate: "2026-03-16",
        preferredTimezone: "America/New_York",
        description: "Quick weekend getaway to the city.",
        createdBy: carol.id,
      },
    ])
    .returning();

  const tokyo = tripRows[0]!;
  const barcelona = tripRows[1]!;
  const nyc = tripRows[2]!;

  // --- Members ---
  const memberRows = await db
    .insert(schema.members)
    .values([
      // Tokyo: Alice (organizer), Bob, Carol, David
      {
        tripId: tokyo.id,
        userId: alice.id,
        status: "going" as const,
        isOrganizer: true,
      },
      {
        tripId: tokyo.id,
        userId: bob.id,
        status: "going" as const,
      },
      {
        tripId: tokyo.id,
        userId: carol.id,
        status: "maybe" as const,
      },
      {
        tripId: tokyo.id,
        userId: david.id,
        status: "no_response" as const,
      },
      // Barcelona: Bob (organizer), Alice, Eve, Carol
      {
        tripId: barcelona.id,
        userId: bob.id,
        status: "going" as const,
        isOrganizer: true,
      },
      {
        tripId: barcelona.id,
        userId: alice.id,
        status: "going" as const,
      },
      {
        tripId: barcelona.id,
        userId: eve.id,
        status: "going" as const,
      },
      {
        tripId: barcelona.id,
        userId: carol.id,
        status: "not_going" as const,
      },
      // NYC: Carol (organizer), David, Eve
      {
        tripId: nyc.id,
        userId: carol.id,
        status: "going" as const,
        isOrganizer: true,
      },
      {
        tripId: nyc.id,
        userId: david.id,
        status: "maybe" as const,
      },
      {
        tripId: nyc.id,
        userId: eve.id,
        status: "going" as const,
      },
    ])
    .returning();

  // --- Events ---
  await db.insert(schema.events).values([
    // Tokyo events
    {
      tripId: tokyo.id,
      createdBy: alice.id,
      name: "Senso-ji Temple Visit",
      eventType: "activity" as const,
      location: "Senso-ji, Asakusa, Tokyo",
      startTime: new Date("2026-04-11T09:00:00+09:00"),
      endTime: new Date("2026-04-11T12:00:00+09:00"),
    },
    {
      tripId: tokyo.id,
      createdBy: alice.id,
      name: "Tsukiji Outer Market Lunch",
      eventType: "meal" as const,
      location: "Tsukiji Outer Market, Tokyo",
      startTime: new Date("2026-04-11T12:30:00+09:00"),
      endTime: new Date("2026-04-11T14:00:00+09:00"),
    },
    {
      tripId: tokyo.id,
      createdBy: bob.id,
      name: "Shibuya Night Out",
      eventType: "activity" as const,
      location: "Shibuya, Tokyo",
      startTime: new Date("2026-04-12T19:00:00+09:00"),
      isOptional: true,
    },
    // Barcelona events
    {
      tripId: barcelona.id,
      createdBy: bob.id,
      name: "Sagrada Familia Tour",
      eventType: "activity" as const,
      location: "Sagrada Familia, Barcelona",
      startTime: new Date("2026-05-21T10:00:00+02:00"),
      endTime: new Date("2026-05-21T12:30:00+02:00"),
    },
    {
      tripId: barcelona.id,
      createdBy: eve.id,
      name: "Paella Dinner",
      eventType: "meal" as const,
      location: "La Mar Salada, Barcelona",
      startTime: new Date("2026-05-22T20:00:00+02:00"),
      endTime: new Date("2026-05-22T22:00:00+02:00"),
    },
    // NYC events
    {
      tripId: nyc.id,
      createdBy: carol.id,
      name: "Broadway Show",
      eventType: "activity" as const,
      location: "Broadway, New York",
      startTime: new Date("2026-03-14T19:30:00-04:00"),
      endTime: new Date("2026-03-14T22:00:00-04:00"),
    },
    {
      tripId: nyc.id,
      createdBy: carol.id,
      name: "Brunch at Balthazar",
      eventType: "meal" as const,
      location: "Balthazar, SoHo, New York",
      startTime: new Date("2026-03-15T11:00:00-04:00"),
      endTime: new Date("2026-03-15T13:00:00-04:00"),
    },
  ]);

  // --- Accommodations ---
  await db.insert(schema.accommodations).values([
    {
      tripId: tokyo.id,
      createdBy: alice.id,
      name: "Hotel Sunroute Plaza Shinjuku",
      address: "2-3-1 Yoyogi, Shibuya-ku, Tokyo",
      checkIn: new Date("2026-04-10T15:00:00+09:00"),
      checkOut: new Date("2026-04-17T11:00:00+09:00"),
    },
    {
      tripId: barcelona.id,
      createdBy: bob.id,
      name: "Airbnb near La Rambla",
      address: "Carrer de Ferran 28, Barcelona",
      checkIn: new Date("2026-05-20T14:00:00+02:00"),
      checkOut: new Date("2026-05-27T10:00:00+02:00"),
    },
    {
      tripId: nyc.id,
      createdBy: carol.id,
      name: "The NoMad Hotel",
      address: "1170 Broadway, New York",
      checkIn: new Date("2026-03-14T15:00:00-04:00"),
      checkOut: new Date("2026-03-16T12:00:00-04:00"),
    },
  ]);

  // --- Member Travel ---
  const aliceTokyo = memberRows.find(
    (m) => m.tripId === tokyo.id && m.userId === alice.id,
  )!;
  const bobTokyo = memberRows.find(
    (m) => m.tripId === tokyo.id && m.userId === bob.id,
  )!;

  await db.insert(schema.memberTravel).values([
    {
      tripId: tokyo.id,
      memberId: aliceTokyo.id,
      travelType: "arrival" as const,
      time: new Date("2026-04-10T10:30:00+09:00"),
      location: "Narita International Airport",
      details: "Flight JL005 from SFO",
    },
    {
      tripId: tokyo.id,
      memberId: aliceTokyo.id,
      travelType: "departure" as const,
      time: new Date("2026-04-17T14:00:00+09:00"),
      location: "Narita International Airport",
    },
    {
      tripId: tokyo.id,
      memberId: bobTokyo.id,
      travelType: "arrival" as const,
      time: new Date("2026-04-10T16:00:00+09:00"),
      location: "Haneda Airport",
      details: "Flight NH106 from LAX",
    },
  ]);

  // --- Messages ---
  const msgRows = await db
    .insert(schema.messages)
    .values([
      {
        tripId: tokyo.id,
        authorId: alice.id,
        content: "So excited for Tokyo! Has everyone started packing?",
      },
    ])
    .returning();

  const tokyoMsg1 = msgRows[0]!;

  await db.insert(schema.messages).values([
    {
      tripId: tokyo.id,
      authorId: bob.id,
      parentId: tokyoMsg1.id,
      content: "Almost done! Can't wait for the ramen.",
    },
    {
      tripId: tokyo.id,
      authorId: carol.id,
      content: "Still deciding if I can make it — will confirm by next week.",
    },
    {
      tripId: barcelona.id,
      authorId: bob.id,
      content: "Found a great rooftop bar near our Airbnb!",
    },
    {
      tripId: barcelona.id,
      authorId: eve.id,
      content: "I'll book the Sagrada Familia tickets. How many do we need?",
    },
    {
      tripId: nyc.id,
      authorId: carol.id,
      content: "Hamilton tickets are booked! Saturday 7:30pm.",
      isPinned: true,
    },
  ]);

  // --- Print login info ---
  console.log("\nSeed complete! Login with any phone number + code 000000:\n");
  console.log("  Phone Number     Name");
  console.log("  ──────────────── ──────────────");
  const names = [
    "Alice Johnson",
    "Bob Williams",
    "Carol Martinez",
    "David Kim",
    "Eve Chen",
  ];
  PHONE_NUMBERS.forEach((phone, i) => {
    console.log(`  ${phone}  ${names[i]}`);
  });
  console.log("");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
