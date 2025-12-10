/**
 * Floor ID Parser Utility
 * Converts floor IDs like "llia-terminal1-departures" to human-readable format
 */

/**
 * Parse a floor ID into a human-readable floor name
 * @param floorId - The floor ID (e.g., "llia-terminal1-departures")
 * @returns Human-readable floor name (e.g., "Terminal 1 Departures")
 */
export function parseFloorId(floorId: string | undefined): string {
  if (!floorId) {
    return 'Unknown Location';
  }

  // Remove venue prefix (e.g., "llia-")
  let parsed = floorId.replace(/^[a-z]+-/i, '');

  // Split by hyphens
  const parts = parsed.split('-');

  // Process each part
  const formattedParts = parts.map((part) => {
    // Handle "terminal1" -> "Terminal 1"
    const terminalMatch = part.match(/^(terminal)(\d+)$/i);
    if (terminalMatch) {
      return `Terminal ${terminalMatch[2]}`;
    }

    // Handle "concourse" patterns
    const concourseMatch = part.match(/^(concourse)([a-z])$/i);
    if (concourseMatch) {
      return `Concourse ${concourseMatch[2].toUpperCase()}`;
    }

    // Handle "level" patterns
    const levelMatch = part.match(/^(level)(\d+)$/i);
    if (levelMatch) {
      return `Level ${levelMatch[2]}`;
    }

    // Handle "floor" patterns
    const floorMatch = part.match(/^(floor)(\d+)$/i);
    if (floorMatch) {
      return `Floor ${floorMatch[2]}`;
    }

    // Capitalize first letter of other words
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  });

  return formattedParts.join(' ');
}

/**
 * Get a short version of the floor name (for compact displays)
 * @param floorId - The floor ID
 * @returns Short floor name (e.g., "T1 Departures")
 */
export function parseFloorIdShort(floorId: string | undefined): string {
  if (!floorId) {
    return 'Unknown';
  }

  // Remove venue prefix
  let parsed = floorId.replace(/^[a-z]+-/i, '');
  const parts = parsed.split('-');

  const formattedParts = parts.map((part) => {
    // Handle "terminal1" -> "T1"
    const terminalMatch = part.match(/^(terminal)(\d+)$/i);
    if (terminalMatch) {
      return `T${terminalMatch[2]}`;
    }

    // Handle "concourse" patterns -> "CA", "CB", etc.
    const concourseMatch = part.match(/^(concourse)([a-z])$/i);
    if (concourseMatch) {
      return `C${concourseMatch[2].toUpperCase()}`;
    }

    // Handle level/floor patterns
    const levelMatch = part.match(/^(level|floor)(\d+)$/i);
    if (levelMatch) {
      return `L${levelMatch[2]}`;
    }

    // Capitalize first letter
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  });

  return formattedParts.join(' ');
}
