import { describe, expect, it } from "vitest";

import { fireEvent, render, screen } from "../../test/renderWithTheme";

import { DataGrid } from "./DataGrid";
import type { DataGridColumn } from "./DataGrid";

interface Row {
  id: string;
  name: string;
  score: number;
}

const columns: DataGridColumn<Row>[] = [
  { key: "name", header: "Name", render: (r) => r.name, sortable: true, sortValue: (r) => r.name },
  {
    key: "score",
    header: "Score",
    render: (r) => r.score,
    sortable: true,
    sortValue: (r) => r.score,
  },
];

function nameCells(): string[] {
  // Cells render row-major: [name0, score0, name1, score1, ...]; even indices
  // are the name column.
  return screen
    .getAllByRole("gridcell")
    .filter((_, i) => i % 2 === 0)
    .map((c) => c.textContent);
}

describe("DataGrid organism", () => {
  it("exposes the grid role, accessible name, and full row count", () => {
    const rows: Row[] = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      name: `Row ${String(i)}`,
      score: i,
    }));
    render(<DataGrid rows={rows} columns={columns} getRowId={(r) => r.id} ariaLabel="Test grid" />);
    const grid = screen.getByRole("grid", { name: "Test grid" });
    expect(grid).toHaveAttribute("aria-rowcount", "100");
    // Virtualized: the first row renders, far-off rows do not.
    expect(screen.getByText("Row 0")).toBeInTheDocument();
    expect(screen.queryByText("Row 99")).not.toBeInTheDocument();
  });

  it("renders a spinner while loading and an alert on error", () => {
    const { rerender } = render(
      <DataGrid rows={[]} columns={columns} getRowId={(r) => r.id} ariaLabel="L" loading />,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    rerender(
      <DataGrid rows={[]} columns={columns} getRowId={(r) => r.id} ariaLabel="L" error="Boom" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
  });

  it("shows the empty message when there are no rows", () => {
    render(
      <DataGrid
        rows={[]}
        columns={columns}
        getRowId={(r) => r.id}
        ariaLabel="E"
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("sorts when a sortable header is clicked and reflects aria-sort", () => {
    const rows: Row[] = [
      { id: "a", name: "Alpha", score: 30 },
      { id: "b", name: "Bravo", score: 10 },
      { id: "c", name: "Charlie", score: 20 },
    ];
    render(<DataGrid rows={rows} columns={columns} getRowId={(r) => r.id} ariaLabel="Sortable" />);
    expect(nameCells()).toEqual(["Alpha", "Bravo", "Charlie"]);

    const scoreHeader = screen.getByRole("columnheader", { name: /Score/ });
    fireEvent.click(scoreHeader);
    expect(scoreHeader).toHaveAttribute("aria-sort", "ascending");
    expect(nameCells()).toEqual(["Bravo", "Charlie", "Alpha"]);

    fireEvent.click(scoreHeader);
    expect(scoreHeader).toHaveAttribute("aria-sort", "descending");
    expect(nameCells()).toEqual(["Alpha", "Charlie", "Bravo"]);
  });
});
