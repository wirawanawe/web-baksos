import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Read seed file
    const seedFilePath = path.join(process.cwd(), 'database', 'seed_dokter.sql');
    const seedSQL = fs.readFileSync(seedFilePath, 'utf-8');

    // Parse INSERT statements from SQL file
    const insertStatements = seedSQL
      .split('INSERT INTO')
      .slice(1) // Skip first empty element
      .map(s => 'INSERT INTO' + s.split(';')[0].trim())
      .filter(s => s.length > 20); // Filter out very short statements

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];

    for (const statement of insertStatements) {
      try {
        // Extract nama_dokter from INSERT statement to check for duplicates
        const namaMatch = statement.match(/VALUES\s*\([^,]+,\s*'([^']+)'/);
        if (namaMatch && namaMatch[1]) {
          const namaDokter = namaMatch[1];
          
          // Check if dokter already exists
          const [existing] = await pool.execute(
            'SELECT id FROM dokter WHERE nama_dokter = ?',
            [namaDokter]
          );

          if (Array.isArray(existing) && existing.length > 0) {
            duplicateCount++;
            continue; // Skip duplicate
          }
        }

        await pool.execute(statement);
        successCount++;
      } catch (error: any) {
        errorCount++;
        if (errors.length < 10) {
          errors.push(error.message);
        }
        console.error('Error executing statement:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seed data dokter selesai! ${successCount} data baru ditambahkan, ${duplicateCount} data duplikat dilewati, ${errorCount} error.`,
      successCount,
      duplicateCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit error messages
    });
  } catch (error: any) {
    console.error('Error seeding dokter data:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan seed data', error: error.message },
      { status: 500 }
    );
  }
}

