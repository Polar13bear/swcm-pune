/**
 * Seeds the database with realistic Pune Municipal Corporation data.
 * Safe to run multiple times — uses upsert (ON CONFLICT DO UPDATE).
 */
import { pool, withTransaction } from "./pool.js";

const ZONES = [
  { code: "ZONE-01", name: "Central",    ward: 1,  pop: 142000, hh: 34800, area: 18.4, lat: 18.5196, lon: 73.8553, waste: 52.4, rate: 96.0 },
  { code: "ZONE-02", name: "North",      ward: 2,  pop: 128000, hh: 31200, area: 22.1, lat: 18.5600, lon: 73.8700, waste: 47.2, rate: 93.0 },
  { code: "ZONE-03", name: "South",      ward: 3,  pop: 115000, hh: 28400, area: 24.8, lat: 18.4700, lon: 73.8500, waste: 42.8, rate: 88.0 },
  { code: "ZONE-04", name: "East",       ward: 4,  pop: 131000, hh: 32100, area: 20.3, lat: 18.5300, lon: 73.9100, waste: 49.1, rate: 91.0 },
  { code: "ZONE-05", name: "West",       ward: 5,  pop: 108000, hh: 26900, area: 19.7, lat: 18.5200, lon: 73.8200, waste: 39.5, rate: 76.0 },
  { code: "ZONE-06", name: "North-East", ward: 6,  pop: 97000,  hh: 23800, area: 28.6, lat: 18.5750, lon: 73.9200, waste: 36.8, rate: 86.0 },
  { code: "ZONE-07", name: "North-West", ward: 7,  pop: 112000, hh: 27600, area: 23.9, lat: 18.5650, lon: 73.8000, waste: 41.5, rate: 90.0 },
  { code: "ZONE-08", name: "South-East", ward: 8,  pop: 103000, hh: 25400, area: 26.2, lat: 18.4800, lon: 73.9000, waste: 38.2, rate: 82.0 },
  { code: "ZONE-09", name: "South-West", ward: 9,  pop: 95000,  hh: 23100, area: 21.8, lat: 18.4600, lon: 73.8100, waste: 35.4, rate: 79.0 },
  { code: "ZONE-10", name: "Industrial", ward: 10, pop: 82000,  hh: 19800, area: 35.4, lat: 18.5100, lon: 73.9400, waste: 61.2, rate: 68.0 },
];

const DRIVER_NAMES = [
  "Rajesh Patil","Amit Shinde","Suresh Jadhav","Prakash More","Vijay Pawar",
  "Sunil Gaikwad","Ramesh Chavan","Deepak Kale","Mahesh Salunkhe","Anil Deshmukh",
  "Nitin Bhosale","Ganesh Kumbhar","Sanjay Mane","Rohit Lokhande","Kiran Kadam",
  "Mohan Sawant","Ajay Thorat","Sachin Wagh","Dinesh Shinde","Arun Kamble",
  "Vikas Jagtap","Santosh Naik","Ashok Gole","Manoj Raut","Ravi Yadav",
  "Imran Shaikh","Nilesh Patil","Harish More","Gopal Pawar","Sameer Khan",
  "Bharat Jadhav","Akshay Mane","Yogesh Kale","Tushar Chavan","Hemant Shinde",
  "Shankar Naik","Pankaj Sawant","Vinod Raut","Umesh Wagh","Rahul Kadam",
  "Naveen Patil","Irfan Shaikh","Mangesh Pawar","Milind More","Girish Mane",
  "Atul Jagtap","Sagar Bhosale","Vivek Deshmukh","Rakesh Yadav","Devendra Kale",
];

const VEHICLE_TYPES = [
  "Garbage Compactor","Mini Tipper","Truck","Electric Waste Vehicle","Transfer Vehicle",
] as const;

const PLATE_PREFIXES = ["AB","CD","EF","GH","JK","LM","NP","QR","ST","UV"];

function pad(n: number, w = 2) { return String(n).padStart(w, "0"); }

// Safe: only called with our own computed floats, never user input
function makePoint(lon: number, lat: number): string {
  return `ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`;
}

async function seed() {
  console.log("[seed] Starting database seed...");

  await withTransaction(async (client) => {

    // ----------------------------------------------------------------
    // Zones
    // ----------------------------------------------------------------
    console.log("[seed] Inserting zones...");
    const zoneIds: Record<string, number> = {};
    for (const z of ZONES) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO zones (code, name, ward_number, population, households,
           area_sqkm, depot_lat, depot_lon, daily_waste_ton, collection_rate, daily_cost_inr)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (code) DO UPDATE SET
           name=EXCLUDED.name, population=EXCLUDED.population,
           households=EXCLUDED.households, daily_waste_ton=EXCLUDED.daily_waste_ton,
           collection_rate=EXCLUDED.collection_rate, updated_at=NOW()
         RETURNING id`,
        [z.code, z.name, z.ward, z.pop, z.hh, z.area, z.lat, z.lon,
         z.waste, z.rate, 18400 + z.ward * 2150],
      );
      zoneIds[z.code] = rows[0]!.id;
    }

    // ----------------------------------------------------------------
    // Depots
    // ----------------------------------------------------------------
    console.log("[seed] Inserting depots...");
    const depotData = [
      { name: "Shivajinagar Central Depot", lat: 18.5308, lon: 73.8474, zone: "ZONE-01" },
      { name: "Hadapsar East Depot",         lat: 18.5018, lon: 73.9272, zone: "ZONE-04" },
      { name: "Katraj South Depot",          lat: 18.4530, lon: 73.8648, zone: "ZONE-03" },
      { name: "Pimpri North Depot",          lat: 18.6280, lon: 73.7930, zone: "ZONE-02" },
    ];
    const depotIds: number[] = [];
    for (const d of depotData) {
      // Insert without geometry column first
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO depots (name, lat, lon, zone_id, capacity)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [d.name, d.lat, d.lon, zoneIds[d.zone]!, 40],
      );
      if (rows[0]) {
        depotIds.push(rows[0].id);
      }
    }
    if (depotIds.length === 0) {
      const { rows } = await client.query<{ id: number }>(
        "SELECT id FROM depots ORDER BY id LIMIT 4",
      );
      rows.forEach(r => depotIds.push(r.id));
    }

    // ----------------------------------------------------------------
    // Drivers
    // ----------------------------------------------------------------
    console.log("[seed] Inserting drivers...");
    const driverIds: number[] = [];
    const shifts = ["Morning", "Afternoon"] as const;
    for (let i = 0; i < DRIVER_NAMES.length; i++) {
      const name = DRIVER_NAMES[i]!;
      const zoneCode = ZONES[i % ZONES.length]!.code;
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO drivers (employee_id, name, phone, license_number, license_expiry,
           zone_id, shift, experience_yrs, safety_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (employee_id) DO UPDATE SET
           name=EXCLUDED.name, phone=EXCLUDED.phone, updated_at=NOW()
         RETURNING id`,
        [
          `D-${pad(i + 1, 3)}`,
          name,
          `+91 98${pad(21 + (i % 70))}${pad(4821 + i * 73, 4)}`,
          `MH-${pad(i + 1, 5)}`,
          "2028-12-31",
          zoneIds[zoneCode]!,
          shifts[i % 2]!,
          3 + (i % 16),
          78 + (i * 3) % 22,
        ],
      );
      driverIds.push(rows[0]!.id);
    }

    // ----------------------------------------------------------------
    // Vehicles (128) — insert without geometry, update geometry after
    // ----------------------------------------------------------------
    console.log("[seed] Inserting vehicles...");
    const vehicleIds: number[] = [];
    const vehicleCoords: Array<{ id: number; lat: number; lon: number }> = [];
    const statusList = [
      "Collecting","Active","Traveling","Collecting","Active",
      "Idle","Traveling","Collecting","Maintenance","Offline",
    ] as const;

    for (let i = 0; i < 128; i++) {
      const zone      = ZONES[i % ZONES.length]!;
      const driverId  = driverIds[i % driverIds.length]!;
      const depotId   = depotIds[i % depotIds.length]!;
      const statusStr = statusList[i % statusList.length]!;
      const plate     = `MH-${[12,14,9,15][i%4]}-${PLATE_PREFIXES[i%PLATE_PREFIXES.length]}-${pad(2100+(i*137)%7800,4)}`;
      const vType     = VEHICLE_TYPES[i % VEHICLE_TYPES.length]!;
      const lat       = zone.lat + Math.sin(i * 0.7) * 0.03;
      const lon       = zone.lon + Math.cos(i * 0.5) * 0.03;
      const speed     = statusStr === "Offline" || statusStr === "Maintenance" ? 0 : 18 + (i * 7) % 38;

      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO vehicles
           (vehicle_id, plate_number, vehicle_type, capacity_ton,
            depot_id, zone_id, driver_id, status,
            fuel_level, load_percent, speed_kmh,
            current_lat, current_lon,
            odometer_km, operating_hours, last_maintenance, fuel_efficiency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (vehicle_id) DO UPDATE SET
           status=EXCLUDED.status, driver_id=EXCLUDED.driver_id,
           zone_id=EXCLUDED.zone_id, current_lat=EXCLUDED.current_lat,
           current_lon=EXCLUDED.current_lon, updated_at=NOW()
         RETURNING id`,
        [
          `V-${1001 + i}`, plate, vType, 4 + (i % 7),
          depotId, zoneIds[zone.code]!, driverId, statusStr,
          12 + (i * 17) % 85, 18 + (i * 13) % 80, speed,
          lat, lon,
          28000 + (i * 110) % 168000,
          Number((3.5 + (i % 9) * 0.6).toFixed(1)),
          `2026-09-${pad((i % 27) + 1)}`,
          Number((3.1 + (i % 18) / 10).toFixed(1)),
        ],
      );
      const vid = rows[0]!.id;
      vehicleIds.push(vid);
      vehicleCoords.push({ id: vid, lat, lon });
    }

    // Update geometry column separately (avoids type inference conflict)
    console.log("[seed] Updating vehicle geometry...");
    for (const { id, lat, lon } of vehicleCoords) {
      await client.query(
        `UPDATE vehicles SET current_location = ${makePoint(lon, lat)} WHERE id = $1`,
        [id],
      );
    }

    // ----------------------------------------------------------------
    // Vehicle Telemetry snapshots
    // ----------------------------------------------------------------
    console.log("[seed] Inserting vehicle telemetry...");
    for (let i = 0; i < vehicleIds.length; i++) {
      const vid       = vehicleIds[i]!;
      const { lat, lon } = vehicleCoords[i]!;
      const statusStr = statusList[i % statusList.length]!;
      const speed     = statusStr === "Offline" || statusStr === "Maintenance" ? 0 : 18 + (i * 7) % 38;

      // Insert without geometry first
      await client.query(
        `INSERT INTO vehicle_telemetry
           (vehicle_id, status, lat, lon, speed_kmh, heading_deg,
            fuel_level, load_percent, ignition_on, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (vehicle_id) DO UPDATE SET
           status=EXCLUDED.status, lat=EXCLUDED.lat, lon=EXCLUDED.lon,
           speed_kmh=EXCLUDED.speed_kmh, fuel_level=EXCLUDED.fuel_level,
           load_percent=EXCLUDED.load_percent, ignition_on=EXCLUDED.ignition_on,
           updated_at=NOW()`,
        [
          vid, statusStr, lat, lon, speed,
          Math.floor(Math.random() * 360),
          12 + (i * 17) % 85,
          18 + (i * 13) % 80,
          statusStr !== "Offline" && statusStr !== "Maintenance",
        ],
      );
      // Update geometry separately
      await client.query(
        `UPDATE vehicle_telemetry SET location = ${makePoint(lon, lat)} WHERE vehicle_id = $1`,
        [vid],
      );
    }

    // ----------------------------------------------------------------
    // Routes for today
    // ----------------------------------------------------------------
    console.log("[seed] Inserting today's routes...");
    const today = new Date().toISOString().split("T")[0]!;
    const routeStatuses = ["On Route","On Route","On Route","Delayed","Completed"] as const;
    for (let i = 0; i < 30; i++) {
      const vid     = vehicleIds[i]!;
      const did     = driverIds[i % driverIds.length]!;
      const zone    = ZONES[i % ZONES.length]!;
      const rStatus = routeStatuses[i % routeStatuses.length]!;
      await client.query(
        `INSERT INTO routes
           (route_code, vehicle_id, driver_id, zone_id, tier, shift,
            route_date, status, planned_stops, completed_stops,
            planned_km, actual_km, fuel_used_l, waste_collected_ton, started_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (route_code) DO NOTHING`,
        [
          `R-${201 + i}`, vid, did, zoneIds[zone.code]!,
          "DoorToDoor", "Morning", today, rStatus,
          18 + (i % 17),
          rStatus === "Completed" ? 18 + (i % 17) : Math.floor((18 + (i % 17)) * 0.6),
          34 + (i % 28),
          rStatus === "Completed" ? 34 + (i % 28) : (34 + (i % 28)) * 0.55,
          rStatus === "Completed" ? 13 + (i % 14) : null,
          rStatus === "Completed" ? Number((1.2 + i * 0.08).toFixed(2)) : null,
          new Date(Date.now() - (3 + i % 4) * 3600000).toISOString(),
        ],
      );
    }

    // ----------------------------------------------------------------
    // Alerts
    // ----------------------------------------------------------------
    console.log("[seed] Inserting alerts...");
    const alertTemplates = [
      { sev: "Critical",    subj: "V-1042", desc: "Vehicle V-1042 has exceeded expected route time by 45 minutes." },
      { sev: "Warning",     subj: "V-1098", desc: "Vehicle V-1098 fuel level below 15%. Refuel required." },
      { sev: "Information", subj: "V-1034", desc: "Vehicle V-1034 scheduled maintenance due in 500 km." },
      { sev: "Critical",    subj: "Zone 5", desc: "Zone 5 has 14 missed collection points today." },
      { sev: "Warning",     subj: "V-1012", desc: "Vehicle V-1012 has deviated from optimised route." },
      { sev: "Warning",     subj: "V-1088", desc: "Unusual fuel consumption detected for V-1088." },
      { sev: "Critical",    subj: "V-1076", desc: "Hydraulic pressure alert reported by V-1076." },
      { sev: "Information", subj: "Zone 2", desc: "Zone 2 collection rate crossed 93% for the day." },
    ] as const;

    for (let i = 0; i < 16; i++) {
      const t      = alertTemplates[i % alertTemplates.length]!;
      const status = i % 5 === 0 ? "Resolved" : i % 4 === 0 ? "Acknowledged" : "Open";
      await client.query(
        `INSERT INTO alerts (severity, subject, description, status, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [t.sev, t.subj, t.desc, status,
         new Date(Date.now() - i * 15 * 60000).toISOString()],
      );
    }

    // ----------------------------------------------------------------
    // 30-day historical waste summary
    // ----------------------------------------------------------------
    console.log("[seed] Inserting historical daily summaries...");
    const zoneIdList = Object.values(zoneIds);
    for (let d = 29; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split("T")[0]!;

      for (let zi = 0; zi < zoneIdList.length; zi++) {
        const zid       = zoneIdList[zi]!;
        const baseWaste = ZONES[zi]?.waste ?? 40;
        const totalWaste = Number((baseWaste * (0.9 + Math.sin(d / 3) * 0.1)).toFixed(3));
        await client.query(
          `INSERT INTO daily_waste_summary
             (zone_id, summary_date, total_waste_ton, organic_ton, recyclable_ton,
              plastic_ton, paper_ton, metal_ton, vehicles_deployed, trips_completed,
              collection_rate, missed_stops, fuel_consumed_l, distance_km, cost_inr)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (zone_id, summary_date) DO NOTHING`,
          [
            zid, dateStr, totalWaste,
            Number((totalWaste * 0.42).toFixed(3)),
            Number((totalWaste * 0.21).toFixed(3)),
            Number((totalWaste * 0.21).toFixed(3)),
            Number((totalWaste * 0.17).toFixed(3)),
            Number((totalWaste * 0.09).toFixed(3)),
            8 + (zi % 5), 6 + (zi % 5),
            ZONES[zi]?.rate ?? 85,
            2 + (d % 8),
            1160 + (d * 47) % 290,
            3420 + (d * 97) % 670,
            154000 + (d * 7350) % 61000,
          ],
        );
      }
    }
  });

  console.log("[seed] ✅ Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("[seed] ❌ Failed:", err);
  process.exit(1);
});
