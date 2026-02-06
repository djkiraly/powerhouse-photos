// Players API Routes

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET all players
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const players = await prisma.player.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: { team: true },
      orderBy: [
        { name: 'asc' }
      ],
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

// POST create player (admin only)
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

    const { name, jerseyNumber, position, teamId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const player = await prisma.player.create({
      data: {
        name,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
        position: position || null,
        teamId: teamId || null,
      },
      include: { team: true },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}

// PUT bulk import players (admin only)
export async function PUT(request: NextRequest) {
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

    const { players } = body;

    if (!players || !Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: 'Players array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate all players have names
    const invalidPlayers = players.filter((p: { name?: string }) => !p.name || typeof p.name !== 'string' || p.name.trim() === '');
    if (invalidPlayers.length > 0) {
      return NextResponse.json(
        { error: 'All players must have a name' },
        { status: 400 }
      );
    }

    // Get unique team names from the import
    const teamNames = [...new Set(
      players
        .map((p: { team?: string }) => p.team?.trim())
        .filter((t): t is string => !!t)
    )];

    // Look up teams by name (case-insensitive)
    const teams = await prisma.team.findMany({
      where: teamNames.length > 0 ? {
        name: { in: teamNames, mode: 'insensitive' }
      } : undefined,
    });

    // Create a map of team name (lowercase) to team ID
    const teamMap = new Map(
      teams.map(t => [t.name.toLowerCase(), t.id])
    );

    // Create all players
    const createdPlayers = await prisma.player.createMany({
      data: players.map((p: { name: string; jerseyNumber?: string | number; position?: string; team?: string }) => ({
        name: p.name.trim(),
        jerseyNumber: p.jerseyNumber ? parseInt(String(p.jerseyNumber), 10) : null,
        position: p.position?.trim() || null,
        teamId: p.team ? teamMap.get(p.team.trim().toLowerCase()) || null : null,
      })),
      skipDuplicates: false,
    });

    // Check for unmatched teams
    const unmatchedTeams = teamNames.filter(t => !teamMap.has(t.toLowerCase()));
    const warningMessage = unmatchedTeams.length > 0
      ? ` (Warning: Teams not found: ${unmatchedTeams.join(', ')})`
      : '';

    return NextResponse.json(
      { message: `Successfully created ${createdPlayers.count} players${warningMessage}` },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error bulk importing players:', error);
    return NextResponse.json(
      { error: 'Failed to import players' },
      { status: 500 }
    );
  }
}
