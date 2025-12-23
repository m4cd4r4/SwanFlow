/**
 * Database Initialization Script
 * Populates sites table and creates initial detection records
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'traffic-watch.db');
const db = new Database(dbPath);

// Site definitions (matching live-simulator.js)
const sites = [
  // Stirling Highway / Mounts Bay Road (Winthrop Ave → Point Lewis) - PoC Phase 1
  { name: 'Stirling Hwy @ Winthrop Ave (Northbound)', description: 'Stirling Highway at Winthrop Avenue, Nedlands (near SCGH/UWA)' },
  { name: 'Stirling Hwy @ Winthrop Ave (Southbound)', description: 'Stirling Highway at Winthrop Avenue, Nedlands (near SCGH/UWA)' },
  { name: 'Stirling Hwy @ Broadway (Northbound)', description: 'Stirling Highway at Broadway, Nedlands' },
  { name: 'Stirling Hwy @ Broadway (Southbound)', description: 'Stirling Highway at Broadway, Nedlands' },
  { name: 'Mounts Bay Rd @ Kings Park (Northbound)', description: 'Mounts Bay Road near Kings Park' },
  { name: 'Mounts Bay Rd @ Kings Park (Southbound)', description: 'Mounts Bay Road near Kings Park' },
  { name: 'Mounts Bay Rd @ Mill Point (Northbound)', description: 'Mounts Bay Road at Mill Point' },
  { name: 'Mounts Bay Rd @ Mill Point (Southbound)', description: 'Mounts Bay Road at Mill Point' },
  { name: 'Mounts Bay Rd @ Fraser Ave (Northbound)', description: 'Mounts Bay Road at Fraser Avenue' },
  { name: 'Mounts Bay Rd @ Fraser Ave (Southbound)', description: 'Mounts Bay Road at Fraser Avenue' },
  { name: 'Mounts Bay Rd @ Malcolm St (Northbound)', description: 'Mounts Bay Road at Malcolm Street' },
  { name: 'Mounts Bay Rd @ Malcolm St (Southbound)', description: 'Mounts Bay Road at Malcolm Street' },

  // Stirling Hwy - Claremont to Cottesloe (Stirling Rd → Eric St) - Phase 2
  { name: 'Stirling Hwy @ Stirling Rd (Northbound)', description: 'Stirling Highway at Stirling Road, Claremont (Bunnings/Claremont Quarter)' },
  { name: 'Stirling Hwy @ Stirling Rd (Southbound)', description: 'Stirling Highway at Stirling Road, Claremont (Bunnings/Claremont Quarter)' },
  { name: 'Stirling Hwy @ Jarrad St (Northbound)', description: 'Stirling Highway at Jarrad Street, Cottesloe (school zone)' },
  { name: 'Stirling Hwy @ Jarrad St (Southbound)', description: 'Stirling Highway at Jarrad Street, Cottesloe (school zone)' },
  { name: 'Stirling Hwy @ Eric St (Northbound)', description: 'Stirling Highway at Eric Street, Cottesloe' },
  { name: 'Stirling Hwy @ Eric St (Southbound)', description: 'Stirling Highway at Eric Street, Cottesloe' },

  // Stirling Hwy - Mosman Park (Forrest St → Victoria St) - Phase 1
  { name: 'Stirling Hwy @ Forrest St (Northbound)', description: 'Stirling Highway at Forrest Street, Mosman Park' },
  { name: 'Stirling Hwy @ Forrest St (Southbound)', description: 'Stirling Highway at Forrest Street, Mosman Park' },
  { name: 'Stirling Hwy @ Bay View Terrace (Northbound)', description: 'Stirling Highway at Bay View Terrace' },
  { name: 'Stirling Hwy @ Bay View Terrace (Southbound)', description: 'Stirling Highway at Bay View Terrace' },
  { name: 'Stirling Hwy @ McCabe St (Northbound)', description: 'Stirling Highway at McCabe Street' },
  { name: 'Stirling Hwy @ McCabe St (Southbound)', description: 'Stirling Highway at McCabe Street' },
  { name: 'Stirling Hwy @ Victoria St (Northbound)', description: 'Stirling Highway at Victoria Street' },
  { name: 'Stirling Hwy @ Victoria St (Southbound)', description: 'Stirling Highway at Victoria Street' }
];

console.log('==================================');
console.log('Initializing Perth Traffic Watch Database');
console.log('==================================\n');

try {
  // Insert or update sites
  const insertSite = db.prepare(`
    INSERT INTO sites (name, description, active)
    VALUES (?, ?, 1)
    ON CONFLICT(name) DO UPDATE SET
      description = excluded.description,
      active = 1
  `);

  const insertDetection = db.prepare(`
    INSERT INTO detections (
      site, latitude, longitude, timestamp,
      total_count, hour_count, minute_count,
      avg_confidence, uptime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  let sitesInserted = 0;
  let detectionsInserted = 0;

  // Begin transaction for better performance
  const transaction = db.transaction(() => {
    sites.forEach(site => {
      // Insert site
      insertSite.run(site.name, site.description);
      sitesInserted++;

      // Check if detection records exist for this site
      const existingDetection = db.prepare(
        'SELECT COUNT(*) as count FROM detections WHERE site = ?'
      ).get(site.name);

      // Create initial detection record if none exists
      if (existingDetection.count === 0) {
        insertDetection.run(
          site.name,
          null, // latitude (optional for now)
          null, // longitude (optional for now)
          now,
          0,    // total_count starts at 0
          0,    // hour_count starts at 0
          0,    // minute_count starts at 0
          0.85, // avg_confidence
          0     // uptime starts at 0
        );
        detectionsInserted++;
      }
    });
  });

  transaction();

  console.log(`✓ Sites table populated: ${sitesInserted} sites`);
  console.log(`✓ Initial detection records created: ${detectionsInserted} records`);
  console.log('\n✓ Database initialization complete!');
  console.log('==================================\n');

  db.close();
  process.exit(0);

} catch (error) {
  console.error('Error initializing database:', error);
  db.close();
  process.exit(1);
}
