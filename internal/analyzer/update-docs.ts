import {
  AbsolutePath,
  createPackageAnalyzer,
} from '@lit-labs/analyzer/package-analyzer.js';
import * as path from 'path';
import * as fs from 'fs';
import { ElementDocModule, analyzeElementApi } from './analyze-element.js';
import { docsToElementMapping } from './element-docs-map.js';
import { MarkdownTable } from './markdown-tree-builder.js';

const packagePath = path.resolve('.');
const analyzer = createPackageAnalyzer(packagePath as AbsolutePath);

const documentationFileNames = Object.keys(docsToElementMapping) as Array<
  keyof typeof docsToElementMapping
>;

for (const docFileName of documentationFileNames) {
  const elementEntrypoints = docsToElementMapping[docFileName];
  const markdownTables: {
    className: string;
    summary: string;
    description: string;
    tables: { name: string; table: MarkdownTable }[];
  }[] = [];

  for (const elementEntrypoint of elementEntrypoints) {
    const elementDoc = analyzeElementApi(
      analyzer,
      path.resolve(packagePath, elementEntrypoint)
    );
    const tables = generateTablesFromElementDocs(elementDoc);

    markdownTables.push({
      className: elementDoc.className,
      summary: elementDoc.summary ?? '',
      description: elementDoc.description ?? '',
      tables,
    });
  }

  const documentationFileContents = fs.readFileSync(
    path.resolve(packagePath, 'docs', 'components', docFileName)
  );

  const updatedFileContents = insertMarkdownTables(
    documentationFileContents.toString(),
    markdownTables
  );

  fs.writeFileSync(
    path.resolve(packagePath, 'docs', 'components', docFileName),
    updatedFileContents
  );
}

function generateTablesFromElementDocs(
  element: ElementDocModule
): { name: string; table: MarkdownTable }[] {
  const tables: { name: string; table: MarkdownTable }[] = [];
  const propertiesTable = new MarkdownTable([
    'Property',
    'Type',
    'Default',
    'Description',
  ]);
  const methodsTable = new MarkdownTable([
    'Method',
    'Parameters',
    'Returns',
    'Description',
  ]);
  const eventsTable = new MarkdownTable([
    'Event',
    'Type',
    'Bubbles',
    'Composed',
    'Description',
  ]);

  let currentClass = element;

  while (currentClass) {
    for (const property of currentClass.reactiveProperties) {
      if (property.privacy !== 'public') {
        continue;
      }

      let defaultVal = property.default;
      if (defaultVal && property.default.includes('=>')) {
        defaultVal = 'function { ... }';
      }

      propertiesTable.addRow([
        `\`${property.name}\``,
        `\`${property.type}\`` ?? '',
        `\`${defaultVal}\`` ?? '`undefined`',
        property.description ?? '',
      ]);
    }

    for (const property of currentClass.properties) {
      if (property.privacy !== 'public') {
        continue;
      }

      let defaultVal = property.default;
      if (defaultVal && property.default.includes('=>')) {
        defaultVal = 'function { ... }';
      }

      propertiesTable.addRow([
        `\`${property.name}\``,
        `\`${property.type}\`` ?? '',
        `\`${defaultVal}\`` ?? '`undefined`',
        property.description ?? '',
      ]);
    }

    for (const method of currentClass.methods) {
      if (method.privacy !== 'public') {
        continue;
      }

      methodsTable.addRow([
        `\`${method.name}\``,
        method.parameters.map((p) => `\`${p.name}\``).join(', ') || '_None_',
        `\`${method.returns}\`` ?? '`void`',
        method.description ?? '',
      ]);
    }

    for (const event of currentClass.events) {
      eventsTable.addRow([
        `\`${event.name}\``,
        `\`${event.type}\`` ?? '',
        event.bubbles ? 'Yes' : 'No',
        event.composed ? 'Yes' : 'No',
        event.description ?? '',
      ]);
    }

    currentClass = currentClass.superClass;
  }

  if (propertiesTable.rows.length > 0) {
    tables.push({ name: 'Properties', table: propertiesTable });
  }

  if (methodsTable.rows.length > 0) {
    tables.push({ name: 'Methods', table: methodsTable });
  }

  if (eventsTable.rows.length > 0) {
    tables.push({ name: 'Events', table: eventsTable });
  }

  return tables;
}

function insertMarkdownTables(
  fileContents: string,
  elements: {
    className: string;
    summary: string;
    description: string;
    tables: { name: string; table: MarkdownTable }[];
  }[]
) {
  let tablesStrings = '';

  for (const element of elements) {
    const { className, tables } = element;
    tablesStrings += `
### ${className}
${tables
  .map(
    ({ name, table }) => `
#### ${name}

${table.toString()}
`
  )
  .join('')}`;
  }

  return fileContents.replace(
    /<!-- auto-generated API docs start -->.*<!-- auto-generated API docs end -->/s,
    `<!-- auto-generated API docs start -->

## API

${tablesStrings}
<!-- auto-generated API docs end -->`
  );
}
