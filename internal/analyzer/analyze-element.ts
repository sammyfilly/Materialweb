import {
  LitElementDeclaration,
  AbsolutePath,
  LitElementExport,
  Analyzer,
} from '@lit-labs/analyzer/package-analyzer.js';
import * as path from 'path';

export interface ElementDocModule {
  customElementName?: string;
  className: string;
  classPath: string;
  summary?: string;
  description?: string;
  properties: ElementDocProperty[];
  reactiveProperties: ElementDocProperty[];
  methods: ElementDocMethod[];
  superClass?: ElementDocModule;
  events: ElementDocEvent[];
}

export interface ElementDocEvent {
  name: string;
  description?: string;
  type?: string;
  bubbles: boolean;
  composed: boolean;
}

export interface ElementDocProperty {
  name: string;
  description?: string;
  type?: string;
  privacy?: string;
  default?: string;
}

export interface ElementDocMethod {
  name: string;
  description?: string;
  privacy?: string;
  parameters: ElementDocParameter[];
  returns?: string;
}

export interface ElementDocParameter {
  name: string;
  description?: string;
  type?: string;
  default?: string;
}

export function analyzeElementApi(
  analyzer: Analyzer,
  elementEntrypoint: string,
  superClassName = ''
) {
  const elementModule = analyzer.getModule(elementEntrypoint as AbsolutePath);
  const customElementModule =
    elementModule.getCustomElementExports()[0] ||
    (elementModule.getDeclaration(superClassName) as LitElementDeclaration);
  const { properties, reactiveProperties } = analzyeFields(customElementModule);
  const methods = analyzeMethods(customElementModule);
  const events = analyzeEvents(customElementModule);
  const superclass = customElementModule.heritage.superClass;

  const elementDocModule: ElementDocModule = {
    customElementName: customElementModule.tagname,
    className: customElementModule.name,
    classPath: elementEntrypoint,
    summary: cleanJsDocText(customElementModule.summary),
    description: cleanJsDocText(customElementModule.description),
    properties,
    reactiveProperties,
    methods,
    events,
  };

  if (superclass !== undefined && superclass.name !== 'LitElement') {
    const superClassLocation = superclass.module.replace(/\.js$/, '.ts');
    const absolutePath = path.resolve(
      elementEntrypoint,
      path.relative(elementEntrypoint, superClassLocation)
    );
    const superClassModule = analyzeElementApi(
      analyzer,
      absolutePath,
      superclass.name
    );
    elementDocModule.superClass = superClassModule;
  }

  return elementDocModule;
}

export function analzyeFields(
  module: LitElementExport | LitElementDeclaration
): {
  properties: ElementDocProperty[];
  reactiveProperties: ElementDocProperty[];
} {
  const properties: ElementDocProperty[] = [];
  const reactiveProperties: ElementDocProperty[] = [];

  for (const field of module.fields) {
    const isReactive = module.reactiveProperties.has(field.name);
    if (isReactive) {
      reactiveProperties.push({
        name: field.name,
        description: cleanJsDocText(field.description),
        type: field.type.text,
        privacy: field.privacy,
        default: field.default,
      });
    } else {
      properties.push({
        name: field.name,
        description: cleanJsDocText(field.description),
        type: field.type.text,
        privacy: field.privacy,
        default: field.default,
      });
    }
  }
  return { properties, reactiveProperties };
}

const METHODS_TO_IGNORE = new Set([
  'connectedCallback',
  'disconnectedCallback',
  'update',
  'render',
  'firstUpdated',
  'updated',
  'focus',
  'blur',
]);

export function analyzeMethods(
  module: LitElementExport | LitElementDeclaration
) {
  const methods: ElementDocMethod[] = [];
  for (const method of module.methods) {
    if (METHODS_TO_IGNORE.has(method.name)) {
      continue;
    }

    methods.push({
      name: method.name,
      description: cleanJsDocText(method.description),
      privacy: method.privacy,
      parameters: method.parameters.map((parameter) => ({
        name: parameter.name,
        summary: cleanJsDocText(parameter.summary),
        description: cleanJsDocText(parameter.description),
        type: parameter.type.text,
        default: parameter.default,
      })),
      returns: method.return?.type.text,
    });
  }

  return methods;
}

export function analyzeEvents(
  module: LitElementExport | LitElementDeclaration
): ElementDocEvent[] {
  const events: ElementDocEvent[] = [];
  const eventsKeys = module.events.keys();

  for (const eventName of eventsKeys) {
    const event = module.events.get(eventName);
    let description = event.description;
    const bubbles = description?.includes('--bubbles') || false;
    const composed = description?.includes('--composed') || false;

    description = description?.replace(/\s*\-\-bubbles\s*/g, '');
    description = description?.replace(/\s*\-\-composed\s*/g, '');
    description = cleanJsDocText(description);
    events.push({
      name: eventName,
      description,
      bubbles,
      composed,
      type: event?.type?.text,
    });
  }
  return events;
}

export function cleanJsDocText(text?: string) {
  if (!text) return undefined;

  text = text.trim();
  text = text.replaceAll('\n', '<br>');
  text = text.replaceAll(/\s+/g, ' ');

  return text;
}
