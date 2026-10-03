import { Loader2 } from "lucide-react";

export default function AdminTable({
  columns = [],
  rows,
  data,
  loading = false,
  emptyMessage = "No records found.",
}) {
  const items = rows || data || [];

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column, index) => {
              const label = column.label || column.header || column.title || "";
              const key = column.key || column.accessor || label || index;
              return (
                <th key={key} style={column.headerStyle || column.style}>
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="admin-table-empty">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 0" }}>
                  <Loader2 size={18} className="spin-icon" style={{ color: "var(--admin-gold)" }} />
                  <span>Loading records…</span>
                </div>
              </td>
            </tr>
          ) : items.length ? (
            items.map((row, rowIndex) => {
              const rowKey = row.id || row._id || row.orderId || row.returnNumber || rowIndex;
              return (
                <tr key={rowKey}>
                  {columns.map((column, colIndex) => {
                    const label = column.label || column.header || "";
                    const key = column.key || column.accessor || label || colIndex;

                    let content;
                    if (column.render) {
                      content = column.render(row);
                    } else if (column.cell) {
                      content = column.cell(row);
                    } else if (key && row[key] !== undefined) {
                      content = row[key];
                    } else {
                      content = "—";
                    }

                    return (
                      <td key={key} style={column.style}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={Math.max(columns.length, 1)} className="admin-table-empty">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}