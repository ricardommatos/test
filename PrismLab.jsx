import React, { useState, useRef, useEffect } from 'react';
import { Download, Layers, Sparkles } from 'lucide-react';

const PrismLab = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // Shape Settings
  const [shapeType, setShapeType] = useState('polygon'); // 'polygon' or 'star'
  const [sides, setSides] = useState(6);
  const [outerRadius, setOuterRadius] = useState(150);
  const [innerRatio, setInnerRatio] = useState(0.5); // For stars
  const [depth, setDepth] = useState(100);

  // 3D & Perspective
  const [rotateX, setRotateX] = useState(25);
  const [rotateY, setRotateY] = useState(35);
  const [rotateZ, setRotateZ] = useState(0);
  const [perspective, setPerspective] = useState(1000);

  // Stroke & Background
  const [showStroke, setShowStroke] = useState(true);
  const [strokeColor, setStrokeColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Fill & Effects
  const [fillType, setFillType] = useState('gradient'); // 'solid' or 'gradient'
  const [solidColor, setSolidColor] = useState('#8b5cf6');
  const [gradientColors, setGradientColors] = useState(['#ec4899', '#8b5cf6', '#3b82f6']);
  const [baseBlur, setBaseBlur] = useState(20);

  // Canvas & Export
  const [scale, setScale] = useState(1);
  const svgRef = useRef(null);
  const canvasRef = useRef(null);

  // Mouse interaction
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // ============================================
  // 3D MATH FUNCTIONS
  // ============================================

  // Generate vertices for a polygon or star in 2D
  const generate2DShape = (type, numSides, radius, innerR) => {
    const vertices = [];
    const angleStep = (Math.PI * 2) / numSides;

    if (type === 'polygon') {
      for (let i = 0; i < numSides; i++) {
        const angle = i * angleStep - Math.PI / 2;
        vertices.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      }
    } else if (type === 'star') {
      for (let i = 0; i < numSides * 2; i++) {
        const angle = i * (angleStep / 2) - Math.PI / 2;
        const r = i % 2 === 0 ? radius : radius * innerR;
        vertices.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
        });
      }
    }

    return vertices;
  };

  // Generate 3D prism vertices
  const generate3DPrism = () => {
    const shape2D = generate2DShape(shapeType, sides, outerRadius, innerRatio);
    const vertices = [];

    // Front face (z = depth/2)
    shape2D.forEach(v => {
      vertices.push({ x: v.x, y: v.y, z: depth / 2 });
    });

    // Back face (z = -depth/2)
    shape2D.forEach(v => {
      vertices.push({ x: v.x, y: v.y, z: -depth / 2 });
    });

    return vertices;
  };

  // Rotation matrices
  const rotateVertex = (vertex, rx, ry, rz) => {
    // Convert to radians
    const radX = (rx * Math.PI) / 180;
    const radY = (ry * Math.PI) / 180;
    const radZ = (rz * Math.PI) / 180;

    let { x, y, z } = vertex;

    // Rotate around X axis
    let tempY = y * Math.cos(radX) - z * Math.sin(radX);
    let tempZ = y * Math.sin(radX) + z * Math.cos(radX);
    y = tempY;
    z = tempZ;

    // Rotate around Y axis
    let tempX = x * Math.cos(radY) + z * Math.sin(radY);
    tempZ = -x * Math.sin(radY) + z * Math.cos(radY);
    x = tempX;
    z = tempZ;

    // Rotate around Z axis
    tempX = x * Math.cos(radZ) - y * Math.sin(radZ);
    tempY = x * Math.sin(radZ) + y * Math.cos(radZ);
    x = tempX;
    y = tempY;

    return { x, y, z };
  };

  // Project 3D to 2D with perspective
  const project = (vertex, centerX, centerY, persp) => {
    const scale = persp / (persp + vertex.z);
    return {
      x: centerX + vertex.x * scale,
      y: centerY + vertex.y * scale,
      z: vertex.z,
    };
  };

  // ============================================
  // RENDERING
  // ============================================

  const renderShape = () => {
    const vertices3D = generate3DPrism();
    const centerX = 400;
    const centerY = 300;

    // Apply rotation
    const rotatedVertices = vertices3D.map(v =>
      rotateVertex(v, rotateX, rotateY, rotateZ)
    );

    // Project to 2D
    const projectedVertices = rotatedVertices.map(v =>
      project(v, centerX, centerY, perspective)
    );

    const numPoints = sides * (shapeType === 'star' ? 2 : 1);
    const frontFace = projectedVertices.slice(0, numPoints);
    const backFace = projectedVertices.slice(numPoints);

    // Create faces/edges
    const faces = [];

    // Front face
    faces.push({
      points: frontFace,
      avgZ: frontFace.reduce((sum, v) => sum + v.z, 0) / frontFace.length,
      type: 'face',
    });

    // Back face
    faces.push({
      points: backFace,
      avgZ: backFace.reduce((sum, v) => sum + v.z, 0) / backFace.length,
      type: 'face',
    });

    // Side faces
    for (let i = 0; i < numPoints; i++) {
      const nextI = (i + 1) % numPoints;
      const sidePoints = [
        frontFace[i],
        frontFace[nextI],
        backFace[nextI],
        backFace[i],
      ];
      faces.push({
        points: sidePoints,
        avgZ: sidePoints.reduce((sum, v) => sum + v.z, 0) / sidePoints.length,
        type: 'side',
      });
    }

    // Sort by Z (painter's algorithm)
    faces.sort((a, b) => a.avgZ - b.avgZ);

    return faces;
  };

  // Convert points to SVG path
  const pointsToPath = (points) => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
      .join(' ') + ' Z';
  };

  // ============================================
  // MOUSE INTERACTION
  // ============================================

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setRotateY(prev => (prev + deltaX * 0.5) % 360);
    setRotateX(prev => (prev + deltaY * 0.5) % 360);

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, lastMousePos]);

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const exportPNG = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 800 * scale;
    canvas.height = 600 * scale;

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'prismlab-export.png';
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const exportSVG = () => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prismlab-export.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // RENDER UI
  // ============================================

  const faces = renderShape();

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-violet-600" />
            <h1 className="text-2xl font-bold text-gray-900">PrismLab</h1>
          </div>
          <p className="text-sm text-gray-500">3D Prism Generator</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Shape Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Shape Settings
            </h3>

            {/* Shape Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShapeType('polygon')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    shapeType === 'polygon'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Polygon
                </button>
                <button
                  onClick={() => setShapeType('star')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    shapeType === 'star'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Star
                </button>
              </div>
            </div>

            {/* Sides */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {shapeType === 'star' ? 'Points' : 'Sides'}: {sides}
              </label>
              <input
                type="range"
                min="3"
                max="12"
                value={sides}
                onChange={(e) => setSides(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Outer Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outer Radius: {outerRadius}px
              </label>
              <input
                type="range"
                min="50"
                max="300"
                value={outerRadius}
                onChange={(e) => setOuterRadius(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Inner Ratio (Star only) */}
            {shapeType === 'star' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inner Ratio: {innerRatio.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={innerRatio}
                  onChange={(e) => setInnerRatio(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            )}

            {/* Depth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Depth: {depth}px
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {/* 3D & Perspective */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              3D & Perspective
            </h3>

            {/* Rotate X */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rotate X: {Math.round(rotateX)}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={rotateX}
                onChange={(e) => setRotateX(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Rotate Y */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rotate Y: {Math.round(rotateY)}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={rotateY}
                onChange={(e) => setRotateY(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Rotate Z */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rotate Z: {Math.round(rotateZ)}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={rotateZ}
                onChange={(e) => setRotateZ(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Perspective */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perspective: {perspective}
              </label>
              <input
                type="range"
                min="200"
                max="2000"
                value={perspective}
                onChange={(e) => setPerspective(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {/* Stroke & Background */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Stroke
            </h3>

            {/* Show Stroke */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Show Stroke</label>
              <button
                onClick={() => setShowStroke(!showStroke)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showStroke ? 'bg-violet-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showStroke ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {showStroke && (
              <>
                {/* Stroke Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stroke Color
                  </label>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Stroke Width */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stroke Width: {strokeWidth}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </>
            )}
          </div>

          {/* Fill & Effects */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Fill & Effects
            </h3>

            {/* Fill Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fill Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFillType('solid')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    fillType === 'solid'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Solid
                </button>
                <button
                  onClick={() => setFillType('gradient')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    fillType === 'gradient'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Gradient
                </button>
              </div>
            </div>

            {/* Gradient Colors */}
            {fillType === 'gradient' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Gradient Colors
                </label>
                {gradientColors.map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...gradientColors];
                        newColors[index] = e.target.value;
                        setGradientColors(newColors);
                      }}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Solid Color */}
            {fillType === 'solid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solid Color
                </label>
                <input
                  type="color"
                  value={solidColor}
                  onChange={(e) => setSolidColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Base Blur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blur: {baseBlur}px
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={baseBlur}
                onChange={(e) => setBaseBlur(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Scale: {scale.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportPNG}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export PNG
            </button>
            <button
              onClick={exportSVG}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export SVG
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 flex items-center justify-center bg-gray-100 cursor-move overflow-hidden"
          onMouseDown={handleMouseDown}
        >
          <svg
            ref={svgRef}
            width="800"
            height="600"
            viewBox="0 0 800 600"
            style={{ transform: `scale(${scale})` }}
            className="bg-white shadow-lg"
          >
            <defs>
              {/* Gradient Definition */}
              {fillType === 'gradient' && (
                <linearGradient id="prismGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  {gradientColors.map((color, index) => (
                    <stop
                      key={index}
                      offset={`${(index / (gradientColors.length - 1)) * 100}%`}
                      stopColor={color}
                    />
                  ))}
                </linearGradient>
              )}

              {/* Blur Filter */}
              <filter id="blurFilter">
                <feGaussianBlur stdDeviation={baseBlur} />
              </filter>
            </defs>

            {/* Render Faces */}
            {faces.map((face, index) => (
              <path
                key={index}
                d={pointsToPath(face.points)}
                fill={fillType === 'gradient' ? 'url(#prismGradient)' : solidColor}
                stroke={showStroke ? strokeColor : 'none'}
                strokeWidth={showStroke ? strokeWidth : 0}
                filter={baseBlur > 0 ? 'url(#blurFilter)' : 'none'}
                opacity={0.8}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PrismLab;
