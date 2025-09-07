class QuiltingGridPlanner {
    constructor() {
        this.canvas = document.getElementById('grid-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridWidth = 20;
        this.gridHeight = 20;
        this.cellSize = 30;
        this.currentTool = 'whole-square';
        this.currentColor = '#ff6b6b';
        this.currentPattern = null;
        this.currentRotation = 0;
        this.currentPosition = 'top-left';
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedCells = new Set();
        this.copiedSelection = null;
        this.isPasting = false;
        this.pasteOffset = { x: 0, y: 0 };
        this.mousePos = null;
        this.showPreview = false;
        
        this.grid = this.initializeGrid();
        this.setupEventListeners();
        this.drawGrid();
    }

    initializeGrid() {
        const grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                grid[y][x] = {
                    elements: [], // Array to hold multiple elements
                    selected: false
                };
            }
        }
        return grid;
    }

    setupEventListeners() {
        // Grid size controls
        document.getElementById('resize-grid').addEventListener('click', () => {
            this.gridWidth = parseInt(document.getElementById('grid-width').value);
            this.gridHeight = parseInt(document.getElementById('grid-height').value);
            this.grid = this.initializeGrid();
            this.updateCanvasSize();
            this.drawGrid();
        });

        // Tool selection
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
                this.updateCursor();
            });
        });

        // Rotation selection
        document.querySelectorAll('.tool-btn[data-rotation]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn[data-rotation]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentRotation = parseInt(e.target.dataset.rotation);
            });
        });

        // Position selection
        document.querySelectorAll('.tool-btn[data-position]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn[data-position]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPosition = e.target.dataset.position;
            });
        });

        // Color picker
        document.getElementById('color-input').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });

        // Pattern upload
        document.getElementById('upload-pattern').addEventListener('click', () => {
            document.getElementById('pattern-input').click();
        });

        document.getElementById('pattern-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.currentPattern = event.target.result;
                    this.updatePatternPreview();
                };
                reader.readAsDataURL(file);
            }
        });

        // Selection tools
        document.getElementById('copy-selection').addEventListener('click', () => {
            this.copySelection();
        });

        document.getElementById('rotate-selection').addEventListener('click', () => {
            this.rotateSelection();
        });

        document.getElementById('paste-selection').addEventListener('click', () => {
            this.startPasting();
        });

        document.getElementById('clear-selection').addEventListener('click', () => {
            this.clearSelection();
        });

        // Actions
        document.getElementById('clear-grid').addEventListener('click', () => {
            this.clearGrid();
        });

        document.getElementById('save-design').addEventListener('click', () => {
            this.saveDesign();
        });

        document.getElementById('load-design').addEventListener('click', () => {
            this.loadDesign();
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mouseenter', () => { this.showPreview = true; });
        this.canvas.addEventListener('mouseleave', () => { 
            this.showPreview = false; 
            this.mousePos = null;
            this.drawGrid();
        });
    }

    updateCanvasSize() {
        const maxSize = 800;
        const cellSize = Math.min(maxSize / Math.max(this.gridWidth, this.gridHeight), 30);
        this.cellSize = cellSize;
        this.canvas.width = this.gridWidth * this.cellSize;
        this.canvas.height = this.gridHeight * this.cellSize;
    }

    updateCursor() {
        if (this.currentTool === 'select') {
            this.canvas.style.cursor = 'cell';
            this.canvas.classList.add('selecting');
        } else {
            this.canvas.style.cursor = 'crosshair';
            this.canvas.classList.remove('selecting');
        }
    }

    updatePatternPreview() {
        const preview = document.getElementById('pattern-preview');
        if (this.currentPattern) {
            preview.innerHTML = `<img src="${this.currentPattern}" alt="Pattern">`;
            preview.classList.add('has-pattern');
        } else {
            preview.innerHTML = 'No pattern selected';
            preview.classList.remove('has-pattern');
        }
    }

    getCellFromMouseEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        return { x, y };
    }

    handleMouseDown(e) {
        const cell = this.getCellFromMouseEvent(e);
        
        if (this.currentTool === 'select') {
            this.isSelecting = true;
            this.selectionStart = cell;
            this.selectionEnd = cell;
            // Clear previous selection when starting new one
            this.clearSelection();
        } else if (this.isPasting) {
            this.pasteSelection(cell);
        } else {
            // Fill cell immediately on mouse down for better responsiveness
            this.fillCell(cell.x, cell.y);
        }
    }

    handleMouseMove(e) {
        const cell = this.getCellFromMouseEvent(e);
        this.mousePos = cell;
        
        if (this.isSelecting && this.selectionStart) {
            this.selectionEnd = cell;
            this.updateSelection();
        }
        
        this.drawGrid();
    }

    handleMouseUp(e) {
        if (this.isSelecting) {
            this.isSelecting = false;
            this.updateSelectionButtons();
        }
    }

    handleClick(e) {
        // Prevent default to avoid conflicts with mousedown
        e.preventDefault();
        // Click handling is now done in mousedown for better responsiveness
    }

    fillCell(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return;

        if (this.currentTool === 'clear-cell') {
            this.clearCell(x, y);
            return;
        }

        // Add new element to the cell instead of replacing
        const newElement = {
            color: this.currentColor,
            pattern: this.currentPattern,
            fillType: this.currentTool,
            rotation: this.currentRotation,
            position: this.currentPosition
        };

        this.grid[y][x].elements.push(newElement);

        this.drawGrid();
    }

    updateSelection() {
        if (!this.selectionStart || !this.selectionEnd) return;

        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);

        this.selectedCells.clear();
        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
                    this.selectedCells.add(`${x},${y}`);
                    this.grid[y][x].selected = true;
                }
            }
        }
    }

    clearSelection() {
        this.selectedCells.forEach(cellKey => {
            const [x, y] = cellKey.split(',').map(Number);
            this.grid[y][x].selected = false;
        });
        this.selectedCells.clear();
        this.selectionStart = null;
        this.selectionEnd = null;
        this.updateSelectionButtons();
        this.drawGrid();
    }

    updateSelectionButtons() {
        const hasSelection = this.selectedCells.size > 0;
        const hasCopiedData = this.copiedSelection !== null;
        
        document.getElementById('copy-selection').disabled = !hasSelection;
        document.getElementById('rotate-selection').disabled = !hasSelection;
        document.getElementById('paste-selection').disabled = !hasCopiedData;
    }

    copySelection() {
        if (this.selectedCells.size === 0) return;

        const selectionData = {
            cells: [],
            bounds: { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        };

        this.selectedCells.forEach(cellKey => {
            const [x, y] = cellKey.split(',').map(Number);
            selectionData.cells.push({
                x, y,
                data: { ...this.grid[y][x] }
            });
            selectionData.bounds.minX = Math.min(selectionData.bounds.minX, x);
            selectionData.bounds.maxX = Math.max(selectionData.bounds.maxX, x);
            selectionData.bounds.minY = Math.min(selectionData.bounds.minY, y);
            selectionData.bounds.maxY = Math.max(selectionData.bounds.maxY, y);
        });

        this.copiedSelection = selectionData;
        this.updateSelectionButtons();
    }

    rotateSelection() {
        if (this.selectedCells.size === 0) return;

        const selectionData = {
            cells: [],
            bounds: { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        };

        this.selectedCells.forEach(cellKey => {
            const [x, y] = cellKey.split(',').map(Number);
            selectionData.cells.push({
                x, y,
                data: { ...this.grid[y][x] }
            });
            selectionData.bounds.minX = Math.min(selectionData.bounds.minX, x);
            selectionData.bounds.maxX = Math.max(selectionData.bounds.maxX, x);
            selectionData.bounds.minY = Math.min(selectionData.bounds.minY, y);
            selectionData.bounds.maxY = Math.max(selectionData.bounds.maxY, y);
        });

        // Calculate rotation center
        const centerX = (selectionData.bounds.minX + selectionData.bounds.maxX) / 2;
        const centerY = (selectionData.bounds.minY + selectionData.bounds.maxY) / 2;

        // Clear current selection
        this.clearSelection();

        // Rotate each cell 90 degrees clockwise
        selectionData.cells.forEach(cell => {
            const relativeX = cell.x - centerX;
            const relativeY = cell.y - centerY;
            const newX = Math.round(centerX - relativeY);
            const newY = Math.round(centerY + relativeX);

            if (newX >= 0 && newX < this.gridWidth && newY >= 0 && newY < this.gridHeight) {
                this.grid[newY][newX] = { ...cell.data, selected: false };
            }
        });

        this.drawGrid();
    }

    startPasting() {
        if (!this.copiedSelection) return;
        this.isPasting = true;
        this.canvas.style.cursor = 'copy';
    }

    pasteSelection(targetCell) {
        if (!this.copiedSelection) return;

        const offsetX = targetCell.x - this.copiedSelection.bounds.minX;
        const offsetY = targetCell.y - this.copiedSelection.bounds.minY;

        this.copiedSelection.cells.forEach(cell => {
            const newX = cell.x + offsetX;
            const newY = cell.y + offsetY;

            if (newX >= 0 && newX < this.gridWidth && newY >= 0 && newY < this.gridHeight) {
                this.grid[newY][newX] = { ...cell.data, selected: false };
            }
        });

        this.isPasting = false;
        this.canvas.style.cursor = 'crosshair';
        this.drawGrid();
    }

    clearGrid() {
        this.grid = this.initializeGrid();
        this.clearSelection();
        this.drawGrid();
    }

    clearCell(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return;
        this.grid[y][x].elements = [];
        this.drawGrid();
    }

    saveDesign() {
        const designData = {
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            grid: this.grid
        };

        const dataStr = JSON.stringify(designData);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'quilting-design.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    loadDesign() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const designData = JSON.parse(event.target.result);
                        this.gridWidth = designData.gridWidth;
                        this.gridHeight = designData.gridHeight;
                        this.grid = designData.grid;
                        
                        document.getElementById('grid-width').value = this.gridWidth;
                        document.getElementById('grid-height').value = this.gridHeight;
                        
                        this.updateCanvasSize();
                        this.clearSelection();
                        this.drawGrid();
                    } catch (error) {
                        alert('Error loading design file');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    drawGrid() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.gridWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.gridHeight * this.cellSize);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.gridHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.gridWidth * this.cellSize, y * this.cellSize);
            this.ctx.stroke();
        }

        // Draw filled cells
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const cell = this.grid[y][x];
                if (cell.elements && cell.elements.length > 0) {
                    this.drawCell(x, y, cell);
                }
            }
        }

        // Draw selection overlay
        if (this.selectedCells.size > 0) {
            this.ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
            this.selectedCells.forEach(cellKey => {
                const [x, y] = cellKey.split(',').map(Number);
                this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
            });
        }

        // Draw mouseover preview
        if (this.showPreview && this.mousePos && 
            this.mousePos.x >= 0 && this.mousePos.x < this.gridWidth && 
            this.mousePos.y >= 0 && this.mousePos.y < this.gridHeight) {
            this.drawPreview(this.mousePos.x, this.mousePos.y);
        }
    }

    drawCell(x, y, cell) {
        const cellX = x * this.cellSize;
        const cellY = y * this.cellSize;

        // Draw all elements in the cell
        cell.elements.forEach(element => {
            if (element.pattern) {
                // Draw pattern
                const img = new Image();
                img.onload = () => {
                    this.ctx.drawImage(img, cellX, cellY, this.cellSize, this.cellSize);
                    this.drawFillType(cellX, cellY, element.fillType, element.color, element.rotation, element.position);
                };
                img.src = element.pattern;
            } else if (element.color) {
                // Draw solid color
                this.ctx.fillStyle = element.color;
                this.drawFillType(cellX, cellY, element.fillType, element.color, element.rotation, element.position);
            }
        });
    }

    drawFillType(cellX, cellY, fillType, color, rotation = 0, position = 'top-left') {
        this.ctx.fillStyle = color;
        
        // Save the current context state
        this.ctx.save();
        
        // Calculate center point for rotation
        const centerX = cellX + this.cellSize / 2;
        const centerY = cellY + this.cellSize / 2;
        
        // Apply rotation
        if (rotation !== 0) {
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate((rotation * Math.PI) / 180);
            this.ctx.translate(-centerX, -centerY);
        }
        
        // Calculate position offsets
        const pos = this.getPositionOffsets(position);
        
        switch (fillType) {
            case 'whole-square':
                this.ctx.fillRect(cellX + pos.x, cellY + pos.y, this.cellSize, this.cellSize);
                break;
                
            case 'half-square':
                this.ctx.fillRect(cellX + pos.x, cellY + pos.y, this.cellSize / 2, this.cellSize);
                break;
                
            case 'third-square':
                this.ctx.fillRect(cellX + pos.x, cellY + pos.y, this.cellSize / 3, this.cellSize);
                break;
                
            case 'whole-triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(cellX + pos.x, cellY + pos.y);
                this.ctx.lineTo(cellX + pos.x + this.cellSize, cellY + pos.y);
                this.ctx.lineTo(cellX + pos.x, cellY + pos.y + this.cellSize);
                this.ctx.closePath();
                this.ctx.fill();
                break;
                
            case 'half-triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(cellX + pos.x, cellY + pos.y);
                this.ctx.lineTo(cellX + pos.x + this.cellSize / 2, cellY + pos.y);
                this.ctx.lineTo(cellX + pos.x, cellY + pos.y + this.cellSize);
                this.ctx.closePath();
                this.ctx.fill();
                break;
                
            case 'third-triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(cellX + pos.x, cellY + pos.y);
                this.ctx.lineTo(cellX + pos.x + this.cellSize / 3, cellY + pos.y);
                this.ctx.lineTo(cellX + pos.x, cellY + pos.y + this.cellSize);
                this.ctx.closePath();
                this.ctx.fill();
                break;
        }
        
        // Restore the context state
        this.ctx.restore();
    }

    getPositionOffsets(position) {
        switch (position) {
            case 'top-left':
                return { x: 0, y: 0 };
            case 'top-right':
                return { x: this.cellSize / 2, y: 0 };
            case 'bottom-left':
                return { x: 0, y: this.cellSize / 2 };
            case 'bottom-right':
                return { x: this.cellSize / 2, y: this.cellSize / 2 };
            case 'center':
                return { x: this.cellSize / 4, y: this.cellSize / 4 };
            default:
                return { x: 0, y: 0 };
        }
    }

    drawPreview(x, y) {
        const cellX = x * this.cellSize;
        const cellY = y * this.cellSize;
        
        // Don't show preview if we're selecting or pasting
        if (this.currentTool === 'select' || this.isPasting) {
            if (this.currentTool === 'select') {
                // Show selection preview
                this.ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
                this.ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
            }
            return;
        }

        // Show clear preview
        if (this.currentTool === 'clear-cell') {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
            return;
        }
        
        // Show fill preview with current settings
        this.ctx.globalAlpha = 0.6;
        this.drawFillType(cellX, cellY, this.currentTool, this.currentColor, this.currentRotation, this.currentPosition);
        this.ctx.globalAlpha = 1.0;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new QuiltingGridPlanner();
});
