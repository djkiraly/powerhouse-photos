// Folders API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET all folders (with optional parent filter)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const tree = searchParams.get('tree') === 'true';

    if (tree) {
      // Return full folder tree
      const folders = await prisma.folder.findMany({
        where: { parentId: null },
        include: {
          children: {
            include: {
              children: {
                include: {
                  children: true, // 3 levels deep
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { photos: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json(folders);
    }

    // Return folders at a specific level
    const folders = await prisma.folder.findMany({
      where: { parentId: parentId || null },
      include: {
        _count: { select: { photos: true, children: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

// POST create folder (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { name, description, parentId } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Verify parent exists if provided
    if (parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }
    }

    // Get max sort order for this level
    const maxSortOrder = await prisma.folder.aggregate({
      where: { parentId: parentId || null },
      _max: { sortOrder: true },
    });

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
      include: {
        _count: { select: { photos: true, children: true } },
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
