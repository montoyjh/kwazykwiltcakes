# Quilting Grid Planner

A modern web application for planning quilting designs on a customizable grid. Create beautiful quilt patterns with various fill types, colors, and patterns.

## Features

- **Customizable Grid**: Adjust grid width and height (5-100 squares)
- **Multiple Fill Types**:
  - Whole square
  - Half square
  - Third square
  - Half triangle
  - Third triangle
- **Color & Pattern Support**: Use solid colors or upload custom patterns
- **Selection Tools**: Select, copy, rotate, and paste grid sections
- **Save/Load**: Export and import your designs as JSON files

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the development server:
   ```bash
   npm start
   ```
   This will open the app in your browser at `http://localhost:3000`

2. **Customize Grid Size**:
   - Use the width and height controls in the header
   - Click "Resize Grid" to apply changes

3. **Choose Fill Tool**:
   - Select from whole square, half square, third square, half triangle, or third triangle
   - Click on the grid to fill cells

4. **Add Colors & Patterns**:
   - Use the color picker for solid colors
   - Click "Upload Pattern" to use custom images

5. **Selection Tools**:
   - Switch to "Select" tool
   - Click and drag to select multiple cells
   - Use Copy, Rotate, and Paste buttons to manipulate selections

6. **Save Your Work**:
   - Click "Save Design" to download your pattern as a JSON file
   - Use "Load Design" to import previously saved patterns

## Controls

- **Mouse**: Click to fill cells or select areas
- **Drag**: Select multiple cells when in select mode
- **Color Picker**: Choose solid colors
- **File Upload**: Add custom patterns from images

## Browser Compatibility

This app works in all modern browsers that support:
- HTML5 Canvas
- ES6 Classes
- File API
- CSS Grid and Flexbox

## Technical Details

- Built with vanilla JavaScript (no frameworks)
- Uses HTML5 Canvas for rendering
- Responsive design that works on desktop and mobile
- Local file storage for saving/loading designs

## License

MIT License - feel free to use and modify as needed.

