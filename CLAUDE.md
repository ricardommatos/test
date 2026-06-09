# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Personal Preferences

- **Granola**: When querying Granola meetings, only include calls related to Code and Theory (participants with @codeandtheory.com emails or C&T projects such as TIME, Firefly, Pirilampos, etc.). Ignore all unrelated/personal calls.

## Project Overview

PrismLab is a single-page React application that generates 3D geometric shapes (prisms) with aurora-style visual effects. The application uses custom 3D mathematics for rendering without external 3D libraries.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (opens on http://localhost:5173 by default)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Single-Component Design
The entire application is a single React component (`PrismLab.jsx`) with ~700 lines. The component is organized into clearly marked sections:

1. **State Management** - All state uses React useState hooks
2. **3D Math Functions** - Custom implementations (no three.js)
3. **Rendering Logic** - SVG generation
4. **Mouse Interaction** - Drag-to-rotate functionality
5. **Export Functions** - PNG and SVG export

### 3D Mathematics Implementation

The application implements a complete 3D graphics pipeline from scratch:

**Vertex Generation** (`generate3DPrism`):
- Creates front face and back face vertices from 2D shape
- Supports polygon and star geometries
- Z-coordinates define depth (front: +depth/2, back: -depth/2)

**Rotation** (`rotateVertex`):
- Applies Euler angle transformations (X, Y, Z rotations)
- Uses standard 3D rotation matrices
- Rotations are applied in X → Y → Z order

**Projection** (`project`):
- Converts 3D coordinates to 2D screen space
- Uses perspective division: `scale = perspective / (perspective + z)`
- Canvas center is hardcoded at (400, 300) in the SVG viewport

**Face Rendering** (`renderShape`):
- Generates front face, back face, and connecting side faces
- Uses Painter's Algorithm (Z-sorting) for depth ordering
- Faces with lower avgZ are rendered first (back-to-front)

### SVG Rendering Strategy

- Canvas size: 800x600px SVG viewBox
- All shapes rendered as `<path>` elements using `pointsToPath()`
- SVG filters used for blur effects (`<feGaussianBlur>`)
- Linear gradients defined in `<defs>` section
- Real-time rendering: `renderShape()` is called on every component render

### Export Functionality

**PNG Export** (`exportPNG`):
1. Serializes SVG to string using `XMLSerializer`
2. Creates temporary canvas element
3. Draws SVG as image on canvas
4. Converts canvas to blob and triggers download
5. Scale parameter affects canvas dimensions (800×scale, 600×scale)

**SVG Export** (`exportSVG`):
- Direct serialization of the SVG element
- Creates blob and triggers download
- Preserves vector format

### Interactive Features

**Mouse Interaction**:
- Click and drag on canvas to rotate shape
- Uses `isDragging` state with window event listeners
- Delta movement maps to rotation angles (0.5 sensitivity factor)
- Event listeners are added/removed via useEffect

## Key Technical Considerations

### Performance
- `renderShape()` recalculates all vertices and faces on every render
- For performance-critical modifications, consider memoization
- No throttling on mouse movement updates

### Coordinate System
- Canvas center: (400, 300) - hardcoded in `renderShape()`
- SVG viewBox: "0 0 800 600"
- Z-axis: positive = toward camera, negative = away from camera

### State Dependencies
- All visual parameters are independent state variables
- No derived state or computed values are cached
- Changes to any parameter trigger full re-render

## Styling

- **Framework**: Tailwind CSS 3.3
- **Icons**: Lucide React
- **Layout**: Flexbox-based (sidebar + main area)
- **Custom styles**: Slider thumb styling in `src/index.css`
- **Color theme**: Violet (primary), Gray (neutrals)

## Adding New Features

**To add new shape types**:
Modify `generate2DShape()` to include new geometry logic.

**To add new visual effects**:
Add SVG filters in the `<defs>` section and apply via `filter` attribute.

**To modify 3D behavior**:
Focus on the three core functions: `generate3DPrism()`, `rotateVertex()`, `project()`.

**To add export formats**:
Create new export function following the pattern of `exportPNG()`/`exportSVG()`.
