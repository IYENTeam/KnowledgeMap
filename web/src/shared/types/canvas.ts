/**
 * JSON Canvas Specification Types
 * Based on https://jsoncanvas.org/spec/1.0/
 */

// =============================================================================
// Node Types
// =============================================================================

export type NodeType = 'text' | 'file' | 'link' | 'group';
export type Side = 'top' | 'right' | 'bottom' | 'left';
export type EndType = 'none' | 'arrow';
export type Color = '1' | '2' | '3' | '4' | '5' | '6' | string;

/**
 * Base node properties shared by all node types
 */
export interface BaseNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: Color;
}

/**
 * Text node - contains markdown text
 */
export interface TextNode extends BaseNode {
  type: 'text';
  text: string;
}

/**
 * File node - references a file in the vault
 */
export interface FileNode extends BaseNode {
  type: 'file';
  file: string;
  subpath?: string;
}

/**
 * Link node - references an external URL
 */
export interface LinkNode extends BaseNode {
  type: 'link';
  url: string;
}

/**
 * Group node - visual container for other nodes
 */
export interface GroupNode extends BaseNode {
  type: 'group';
  label?: string;
  background?: string;
  backgroundStyle?: 'cover' | 'ratio' | 'repeat';
}

export type CanvasNode = TextNode | FileNode | LinkNode | GroupNode;

// =============================================================================
// Edge Types
// =============================================================================

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: Side;
  toSide?: Side;
  fromEnd?: EndType;
  toEnd?: EndType;
  color?: Color;
  label?: string;
}

// =============================================================================
// Canvas Document
// =============================================================================

export interface CanvasDocument {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

// =============================================================================
// Color Semantics
// =============================================================================

export const COLORS = {
  red: '1',
  orange: '2',
  yellow: '3',
  green: '4',
  cyan: '5',
  purple: '6',
} as const;

export const SEMANTIC_COLORS = {
  question: COLORS.green,
  answer: COLORS.yellow,
  resource: COLORS.cyan,
  vaultNote: COLORS.red,
  topic: COLORS.purple,
  context: COLORS.orange,
  command: COLORS.red,
  alternative: COLORS.red,
} as const;

// =============================================================================
// Layout Helpers
// =============================================================================

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CreateNodeOptions {
  id?: string;
  color?: Color;
}

export interface CreateTextNodeOptions extends CreateNodeOptions {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface CreateFileNodeOptions extends CreateNodeOptions {
  file: string;
  subpath?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface CreateLinkNodeOptions extends CreateNodeOptions {
  url: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface CreateGroupNodeOptions extends CreateNodeOptions {
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateEdgeOptions {
  id?: string;
  fromSide?: Side;
  toSide?: Side;
  fromEnd?: EndType;
  toEnd?: EndType;
  color?: Color;
  label?: string;
}
