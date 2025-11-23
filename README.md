# PrismLab - Vector 3D Prism Generator

A sophisticated React application that generates beautiful, aurora-style 3D geometric shapes with real-time manipulation and export capabilities.

![PrismLab](https://img.shields.io/badge/React-18.2.0-blue) ![Tailwind](https://img.shields.io/badge/TailwindCSS-3.3.6-blue) ![Vite](https://img.shields.io/badge/Vite-5.0.8-purple)

## Features

### 🎨 Shape Generation
- **Polygon & Star modes**: Create regular polygons or star shapes
- **Configurable sides/points**: 3 to 12 sides
- **Dynamic sizing**: Adjustable outer radius and inner ratio for stars
- **3D depth control**: Create true prism shapes with depth

### 🔄 3D Transformation
- **Full rotation control**: Rotate on X, Y, and Z axes (0-360°)
- **Perspective adjustment**: Simulate camera distance for realistic depth
- **Interactive rotation**: Click and drag on the canvas to rotate

### 🎭 Visual Styling
- **Stroke customization**: Toggle, color picker, and width control
- **Fill options**: Solid color or gradient fills
- **Multi-color gradients**: Configure 2-3 color gradients
- **Aurora blur effect**: 0-50px blur for soft, ethereal gradients

### 📤 Export Options
- **PNG export**: Rasterized output with scale support
- **SVG export**: Vector format for infinite scalability
- **Scale control**: 0.5x to 2x for different output sizes

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

1. **Select Shape Type**: Choose between Polygon or Star in the sidebar
2. **Adjust Parameters**: Use sliders to control sides, radius, depth, and rotation
3. **Apply Effects**: Configure stroke, fill type, gradients, and blur
4. **Interact**: Click and drag on the canvas to rotate the shape
5. **Export**: Use the header buttons to download PNG or SVG

## Technical Details

### Mathematics
- **3D Vertex Generation**: Algorithmically generates prism vertices based on shape parameters
- **Rotation Matrices**: Implements Euler angle rotation transformations
- **Perspective Projection**: Projects 3D coordinates to 2D with realistic perspective
- **Painter's Algorithm**: Z-sorting for proper face rendering

### Rendering
- **SVG-based**: Uses SVG for crisp, scalable graphics
- **Real-time updates**: All changes reflect immediately
- **Blur filters**: SVG Gaussian blur for aurora effects
- **Gradient support**: Linear gradients with multiple color stops

## Component Structure

```
PrismLab.jsx (Main component)
├── State Management (useState hooks)
├── 3D Math Functions
│   ├── generate2DShape()
│   ├── generate3DPrism()
│   ├── rotateVertex()
│   └── project()
├── Rendering Logic
│   ├── renderShape()
│   └── pointsToPath()
├── Mouse Interaction
│   ├── handleMouseDown()
│   ├── handleMouseMove()
│   └── handleMouseUp()
└── Export Functions
    ├── exportPNG()
    └── exportSVG()
```

## Dependencies

- **React 18.2**: UI framework
- **Tailwind CSS 3.3**: Utility-first styling
- **Lucide React**: Icon library
- **Vite 5**: Build tool and dev server

## Browser Support

Works in all modern browsers that support:
- SVG rendering
- CSS filters
- ES6+ JavaScript
- Canvas API (for PNG export)

## Performance

- Optimized real-time rendering
- Efficient Z-sorting algorithm
- Minimal re-renders with proper state management
- Smooth 60fps interactions

## Tips for Best Results

1. **Aurora Effect**: Set blur to 20-40px with gradient fill
2. **Sharp Geometry**: Use 0px blur with stroke enabled
3. **Complex Patterns**: Use star shapes with 8-12 points
4. **Depth Effects**: Combine high perspective with rotation
5. **Export Quality**: Increase scale before PNG export

## License

MIT

## Credits

Created with ❤️ using React, Tailwind CSS, and mathematical creativity.
