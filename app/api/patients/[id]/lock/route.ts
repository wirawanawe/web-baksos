import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Lock patient for processing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pemeriksaanId = params.id;
    const data = await request.json();
    const { user_name, user_role } = data;
    
    if (!user_name) {
      return NextResponse.json(
        { success: false, message: 'User name is required' },
        { status: 400 }
      );
    }
    
    // Check if locked_by column exists
    let lockedByColumnExists = false;
    try {
      const [lockedByColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'locked_by'"
      ) as any[];
      lockedByColumnExists = lockedByColumns.length > 0;
      
      if (!lockedByColumnExists) {
        await pool.execute(`
          ALTER TABLE pemeriksaan 
          ADD COLUMN locked_by VARCHAR(255) AFTER status,
          ADD COLUMN locked_at TIMESTAMP NULL AFTER locked_by,
          ADD INDEX idx_locked_by (locked_by)
        `);
        lockedByColumnExists = true;
      }
    } catch (migError: any) {
      console.error('Migration check error:', migError.message);
    }
    
    if (!lockedByColumnExists) {
      return NextResponse.json(
        { success: false, message: 'Lock mechanism not available' },
        { status: 500 }
      );
    }
    
    // Check if patient is already being processed by another user (for warning only)
    const [existingLock] = await pool.execute(
      'SELECT locked_by, locked_at FROM pemeriksaan WHERE id = ?',
      [pemeriksaanId]
    ) as any[];
    
    let warningInfo = null;
    if (existingLock && existingLock.length > 0) {
      const lockInfo = existingLock[0];
      
      // Check if lock is still recent (within 5 minutes)
      if (lockInfo.locked_by && lockInfo.locked_by !== user_name) {
        const lockedAt = lockInfo.locked_at ? new Date(lockInfo.locked_at) : null;
        const now = new Date();
        const lockAge = lockedAt ? (now.getTime() - lockedAt.getTime()) / 1000 / 60 : 999; // minutes
        
        // If lock is recent (less than 5 minutes), return warning info
        if (lockAge < 5) {
          warningInfo = {
            locked_by: lockInfo.locked_by,
            locked_at: lockInfo.locked_at
          };
        }
      }
    }
    
    // Update locked_by (no strict lock - just tracking)
    const [result] = await pool.execute(
      'UPDATE pemeriksaan SET locked_by = ?, locked_at = NOW() WHERE id = ?',
      [user_name, pemeriksaanId]
    );
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: 'Pemeriksaan tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tracking updated',
      warning: warningInfo, // Include warning info if patient is being processed by another doctor
    });
  } catch (error: any) {
    console.error('Error locking patient:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunci pasien', error: error.message },
      { status: 500 }
    );
  }
}

// Unlock patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pemeriksaanId = params.id;
    const data = await request.json();
    const { user_name } = data;
    
    // Check if locked_by column exists
    let lockedByColumnExists = false;
    try {
      const [lockedByColumns] = await pool.execute(
        "SHOW COLUMNS FROM pemeriksaan LIKE 'locked_by'"
      ) as any[];
      lockedByColumnExists = lockedByColumns.length > 0;
    } catch (e) {
      // Column doesn't exist, return success
      return NextResponse.json({
        success: true,
        message: 'Pasien berhasil dibuka',
      });
    }
    
    if (!lockedByColumnExists) {
      return NextResponse.json({
        success: true,
        message: 'Pasien berhasil dibuka',
      });
    }
    
    // Only unlock if locked by the same user
    const [result] = await pool.execute(
      'UPDATE pemeriksaan SET locked_by = NULL, locked_at = NULL WHERE id = ? AND (locked_by = ? OR locked_by IS NULL)',
      [pemeriksaanId, user_name || '']
    );
    
    return NextResponse.json({
      success: true,
      message: 'Pasien berhasil dibuka',
    });
  } catch (error: any) {
    console.error('Error unlocking patient:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuka pasien', error: error.message },
      { status: 500 }
    );
  }
}

