export function generateMaze(mazeCols: number, mazeRows: number): number[][] {
  const gridW = 2 * mazeCols + 1;
  const gridH = 2 * mazeRows + 1;

  const grid: number[][] = Array.from({ length: gridH }, () => Array(gridW).fill(0));
  const visited: boolean[][] = Array.from({ length: mazeRows }, () =>
    Array(mazeCols).fill(false)
  );

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function carve(col: number, row: number): void {
    visited[row][col] = true;
    grid[row * 2 + 1][col * 2 + 1] = 1;
    const dirs = shuffle<[number, number]>([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    for (const [dc, dr] of dirs) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc >= 0 && nc < mazeCols && nr >= 0 && nr < mazeRows && !visited[nr][nc]) {
        grid[row * 2 + 1 + dr][col * 2 + 1 + dc] = 1;
        carve(nc, nr);
      }
    }
  }

  carve(0, 0);
  return grid;
}

export function getPathCells(grid: number[][]): Array<{ gx: number; gy: number }> {
  const cells: Array<{ gx: number; gy: number }> = [];
  for (let gy = 0; gy < grid.length; gy++) {
    for (let gx = 0; gx < grid[gy].length; gx++) {
      if (grid[gy][gx] === 1) cells.push({ gx, gy });
    }
  }
  return cells;
}
