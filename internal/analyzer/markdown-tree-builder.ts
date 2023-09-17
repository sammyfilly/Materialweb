export class MarkdownTable {
  private _rows: string[][] = [];
  constructor(private _columns: string[]) {}

  get columns() {
    return this._columns;
  }

  get rows() {
    return this._rows;
  }

  addRow(row: string[]) {
    if (row.length !== this._columns.length) {
      throw new Error(
        `Row length (${row.length}) must match column length (${this._columns.length})`
      );
    }

    this._rows.push(row);
  }

  toString() {
    const headerRow = this._columns.join(' | ');
    const dividerRow = this._columns.map(() => '---').join(' | ');
    const rows = this._rows.map((row) => `${row.join(' | ')}`).join('\n');
    return `${headerRow}\n${dividerRow}\n${rows}`;
  }
}
