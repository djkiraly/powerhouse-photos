// Single Folder API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET single folder with contents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            _count: { select: { photos: true, children: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { photos: true, children: true } },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    );
  }
}

// PATCH update folder (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { name, description, parentId, sortOrder } = body;

    const folder = await prisma.folder.findUnique({
      where: { id },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Prevent moving a folder to be its own descendant
    if (parentId !== undefined && parentId !== null) {
      // Check if new parent is the folder itself or a descendant
      if (parentId === id) {
        return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 });
      }

      // Check ancestors to prevent circular reference
      let currentParentId = parentId;
      while (currentParentId) {
        const parent = await prisma.folder.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        if (!parent) break;
        if (parent.parentId === id) {
          return NextResponse.json({ error: 'Cannot move folder into its own descendant' }, { status: 400 });
        }
        currentParentId = parent.parentId;
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        _count: { select: { photos: true, children: true } },
      },
    });

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// DELETE folder (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        _count: { select: { photos: true, children: true } },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Move photos to no folder before deleting
    await prisma.photo.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    });

    // Delete folder (cascades to children)
    await prisma.folder.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
