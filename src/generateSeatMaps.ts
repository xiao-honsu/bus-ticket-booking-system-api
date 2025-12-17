import mongoose from 'mongoose';
import Bus, { ISeat, ISeatMap } from './models/bus.model';
import config from './config/config';

/**
 * Generate seat maps for existing buses based on their busType and totalSeats
 * Run with: ts-node src/generateSeatMaps.ts
 */

/**
 * Generate seat map for Standard bus (2-2 layout with aisle in middle)
 * Layout: A B | C D
 */
function generateStandardSeatMap(totalSeats: number): ISeatMap {
  const columns = 4; // A, B, C, D
  const rows = Math.ceil(totalSeats / columns);
  const seats: ISeat[] = [];

  let seatNumber = 1;
  for (let row = 1; row <= rows && seatNumber <= totalSeats; row++) {
    for (let col = 1; col <= columns && seatNumber <= totalSeats; col++) {
      const seatLetter = String.fromCharCode(64 + col); // A, B, C, D
      seats.push({
        seatNumber: `${seatLetter}${row}`,
        row,
        column: col,
        seatType: col === 1 || col === 4 ? 'window' : 'aisle',
        position: {
          x: col,
          y: row,
        },
      });
      seatNumber++;
    }
  }

  return {
    name: `Standard ${totalSeats}-seat 2-2 Layout`,
    rows,
    columns,
    layout: {
      description: '2-2 configuration with center aisle',
      aislePosition: 'middle',
      columnLabels: ['A', 'B', 'C', 'D'],
    },
    seats,
  };
}

/**
 * Generate seat map for Limousine bus (1-2-1 luxury layout)
 * Layout: A | B C | D
 */
function generateLimousineSeatMap(totalSeats: number): ISeatMap {
  const columns = 4; // A, B, C, D
  const rows = Math.ceil(totalSeats / columns);
  const seats: ISeat[] = [];

  let seatNumber = 1;
  for (let row = 1; row <= rows && seatNumber <= totalSeats; row++) {
    for (let col = 1; col <= columns && seatNumber <= totalSeats; col++) {
      const seatLetter = String.fromCharCode(64 + col);
      seats.push({
        seatNumber: `${seatLetter}${row}`,
        row,
        column: col,
        seatType: col === 1 || col === 4 ? 'vip' : 'standard',
        position: {
          x: col,
          y: row,
        },
      });
      seatNumber++;
    }
  }

  return {
    name: `Limousine ${totalSeats}-seat 1-2-1 Layout`,
    rows,
    columns,
    layout: {
      description: '1-2-1 luxury configuration with extra legroom',
      aislePosition: 'dual',
      columnLabels: ['A', 'B', 'C', 'D'],
    },
    seats,
  };
}

/**
 * Generate seat map for Sleeper bus (3-column layout with lower/upper deck)
 * Layout: Lower deck L1, L2, L3 / Upper deck U1, U2, U3
 */
function generateSleeperSeatMap(totalSeats: number): ISeatMap {
  const columns = 3; // 3 berths per row
  const seatsPerLevel = Math.ceil(totalSeats / 2);
  const rowsPerLevel = Math.ceil(seatsPerLevel / columns);
  const seats: ISeat[] = [];

  // Lower deck
  let seatNumber = 1;
  for (let row = 1; row <= rowsPerLevel && seatNumber <= seatsPerLevel; row++) {
    for (let col = 1; col <= columns && seatNumber <= seatsPerLevel; col++) {
      seats.push({
        seatNumber: `L${seatNumber}`,
        row,
        column: col,
        seatType: col === 1 || col === 3 ? 'window' : 'standard',
        position: {
          x: col,
          y: row,
        },
      });
      seatNumber++;
    }
  }

  // Upper deck
  seatNumber = 1;
  for (let row = 1; row <= rowsPerLevel && seatsPerLevel + seatNumber <= totalSeats; row++) {
    for (let col = 1; col <= columns && seatsPerLevel + seatNumber <= totalSeats; col++) {
      seats.push({
        seatNumber: `U${seatNumber}`,
        row: row + 100, // Offset to indicate upper level
        column: col,
        seatType: col === 1 || col === 3 ? 'window' : 'standard',
        position: {
          x: col,
          y: row + 100,
        },
      });
      seatNumber++;
    }
  }

  return {
    name: `Sleeper ${totalSeats}-berth Double Deck`,
    rows: rowsPerLevel * 2,
    columns,
    layout: {
      description: 'Double-deck sleeper bus with 3 columns per deck',
      levels: ['lower', 'upper'],
      columnLabels: ['1', '2', '3'],
    },
    seats,
  };
}

/**
 * Generate appropriate seat map based on bus type
 */
function generateSeatMapForBus(busType: string, totalSeats: number): ISeatMap {
  switch (busType) {
    case 'standard':
      return generateStandardSeatMap(totalSeats);
    case 'limousine':
      return generateLimousineSeatMap(totalSeats);
    case 'sleeper':
      return generateSleeperSeatMap(totalSeats);
    default:
      throw new Error(`Unknown bus type: ${busType}`);
  }
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url);
    console.log('✅ Connected to MongoDB');

    // Find all buses
    const buses = await Bus.find({});
    console.log(`\n📋 Found ${buses.length} buses`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const bus of buses) {
      // Check if bus already has seat map
      if (bus.seatMap && bus.seatMap.seats && bus.seatMap.seats.length > 0) {
        console.log(`⚠️  ${bus.busNumber} already has seat map with ${bus.seatMap.seats.length} seats - SKIPPING`);
        skippedCount++;
        continue;
      }

      // Generate seat map
      console.log(`\n🔧 Generating seat map for ${bus.busNumber} (${bus.busType}, ${bus.totalSeats} seats)...`);
      const seatMap = generateSeatMapForBus(bus.busType, bus.totalSeats);

      // Update bus
      bus.seatMap = seatMap;
      await bus.save();

      console.log(`   ✅ Updated ${bus.busNumber}:`);
      console.log(`      - Layout: ${seatMap.name}`);
      console.log(`      - Rows: ${seatMap.rows}, Columns: ${seatMap.columns}`);
      console.log(`      - Seats generated: ${seatMap.seats.length}`);
      console.log(
        `      - Sample seats: ${seatMap.seats
          .slice(0, 5)
          .map((s) => s.seatNumber)
          .join(', ')}...`
      );

      updatedCount++;
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Seat map generation completed!');
    console.log(`   - Buses updated: ${updatedCount}`);
    console.log(`   - Buses skipped: ${skippedCount}`);
    console.log(`   - Total buses: ${buses.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    // Show summary of each bus
    console.log('📊 Final Summary:');
    const updatedBuses = await Bus.find({}).select('busNumber busType totalSeats seatMap.seats');
    for (const bus of updatedBuses) {
      const seatsCount = bus.seatMap?.seats?.length || 0;
      const status = seatsCount > 0 ? '✅' : '❌';
      console.log(`   ${status} ${bus.busNumber} (${bus.busType}): ${seatsCount}/${bus.totalSeats} seats`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error generating seat maps:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

main();
