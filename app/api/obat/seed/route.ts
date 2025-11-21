import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Read seed file
    const seedFilePath = path.join(process.cwd(), 'database', 'seed_obat.sql');
    const seedSQL = fs.readFileSync(seedFilePath, 'utf-8');

    // Execute seed SQL
    // Split by semicolon and execute each statement
    const statements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('USE'));

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const statement of statements) {
      try {
        if (statement.trim().startsWith('INSERT INTO')) {
          await pool.execute(statement);
          successCount++;
        }
      } catch (error: any) {
        errorCount++;
        errors.push(error.message);
        console.error('Error executing statement:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seed data berhasil ditambahkan! ${successCount} data berhasil, ${errorCount} error.`,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit error messages
    });
  } catch (error: any) {
    console.error('Error seeding obat data:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan seed data', error: error.message },
      { status: 500 }
    );
  }
}

