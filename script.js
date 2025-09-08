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
        
        // ROYGBIV color palette
        this.colorPalette = [
            '#ff0000', // Red
            '#ff8c00', // Orange
            '#ffff00', // Yellow
            '#00ff00', // Green
            '#0000ff', // Blue
            '#4b0082', // Indigo
            '#9400d3'  // Violet
        ];
        this.currentColorIndex = 0;
        this.lastTool = 'whole-square'; // Track the last non-selection tool
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedCells = new Set();
        this.copiedSelection = null;
        this.isPasting = false;
        this.pasteOffset = { x: 0, y: 0 };
        this.mousePos = null;
        this.showPreview = false;
        this.justFinishedSelection = false;
        
        this.grid = this.initializeGrid();
        this.setupEventListeners();
        
        // Load saved state from localStorage
        this.loadState();
        
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
            this.saveState(); // Auto-save after resizing grid
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
            // Update color index to match the selected color (or -1 if not in palette)
            this.currentColorIndex = this.colorPalette.indexOf(this.currentColor);
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
            this.saveDesignToFile();
        });

        document.getElementById('load-design').addEventListener('click', () => {
            document.getElementById('load-file-input').click();
        });

        // File input for loading designs
        const loadFileInput = document.createElement('input');
        loadFileInput.type = 'file';
        loadFileInput.accept = '.json';
        loadFileInput.id = 'load-file-input';
        loadFileInput.style.display = 'none';
        loadFileInput.addEventListener('change', (e) => {
            this.loadDesignFromFile(e.target.files[0]);
        });
        document.body.appendChild(loadFileInput);

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

        // Add keyboard event listeners
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
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
        console.log('handleMouseDown - cell:', cell, 'currentTool:', this.currentTool, 'isPasting:', this.isPasting);
        
        if (this.isPasting) {
            console.log('Attempting to paste at cell:', cell);
            this.pasteSelection(cell);
        } else if (this.currentTool === 'select') {
            console.log('=== SELECTION STARTING ===');
            // Clear previous selection when starting new one
            this.clearSelection();
            this.isSelecting = true;
            // Create new objects to avoid reference issues
            this.selectionStart = { x: cell.x, y: cell.y };
            this.selectionEnd = { x: cell.x, y: cell.y };
            console.log('Selection started:', { 
                isSelecting: this.isSelecting, 
                start: this.selectionStart, 
                end: this.selectionEnd,
                cellX: cell.x,
                cellY: cell.y
            });
            this.drawGrid(); // Redraw to show selection start
        } else {
            // Fill cell immediately on mouse down for better responsiveness
            this.fillCell(cell.x, cell.y);
        }
    }

    handleMouseMove(e) {
        const cell = this.getCellFromMouseEvent(e);
        this.mousePos = cell;
        
        if (this.isSelecting && this.selectionStart) {
            this.selectionEnd = { x: cell.x, y: cell.y };
            this.updateSelection();
        }
        
        this.drawGrid();
    }

    handleMouseUp(e) {
        if (this.isSelecting) {
            this.isSelecting = false;
            this.justFinishedSelection = true; // Prevent click event from interfering
            // Finalize the selection
            this.updateSelection();
            this.updateSelectionButtons();
            console.log('Selection finalized:', { 
                selectedCells: this.selectedCells.size,
                cells: Array.from(this.selectedCells)
            });
        }
    }

    handleClick(e) {
        // Prevent default to avoid conflicts with mousedown
        e.preventDefault();
        
        // Handle single-click selection only if we didn't just finish a drag selection
        if (this.currentTool === 'select' && !this.isSelecting && !this.justFinishedSelection) {
            const cell = this.getCellFromMouseEvent(e);
            this.selectSingleCell(cell.x, cell.y);
        }
        
        // Reset the flag after handling the click
        this.justFinishedSelection = false;
    }

    handleKeyDown(e) {
        // Only handle hotkeys if not typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Handle Command/Ctrl + C for copy
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            if (this.selectedCells.size > 0) {
                this.copySelection();
                console.log('Copied selection via Cmd+C');
            }
            return;
        }

        // Handle Command/Ctrl + V for paste
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            if (this.copiedSelection) {
                this.startPasting();
                console.log('Started pasting via Cmd+V');
            }
            return;
        }

        // Handle Command/Ctrl + S for toggle selection mode
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (this.currentTool === 'select') {
                // Exit selection mode, return to last tool
                this.setTool(this.lastTool);
                console.log('Exited selection mode, returned to:', this.lastTool);
            } else {
                // Enter selection mode, save current tool
                this.lastTool = this.currentTool;
                this.setTool('select');
                console.log('Entered selection mode via Cmd+S, saved tool:', this.lastTool);
            }
            return;
        }

        // Handle Command/Ctrl + R for rotate selection
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            if (this.selectedCells.size > 0) {
                this.rotateSelection();
                console.log('Rotated selection via Cmd+R');
            }
            return;
        }

        switch (e.key.toLowerCase()) {
            case 'r':
                e.preventDefault();
                this.cycleRotation();
                break;
            case 's':
                e.preventDefault();
                this.cycleShape();
                break;
            case 'c':
                e.preventDefault();
                this.cycleColor();
                break;
        }
    }

    cycleRotation() {
        const rotations = [0, 90, 180, 270];
        const currentIndex = rotations.indexOf(this.currentRotation);
        const nextIndex = (currentIndex + 1) % rotations.length;
        this.currentRotation = rotations[nextIndex];
        
        // Update the UI to reflect the new rotation
        this.updateRotationButtons();
        // Redraw to update the mouseover preview
        this.drawGrid();
        console.log('Rotation cycled to:', this.currentRotation + '°');
    }

    cycleShape() {
        const shapes = [
            'whole-square',
            'half-square',
            'third-square',
            'whole-triangle',
            'half-triangle',
            'third-triangle',
            'clear-cell'
        ];
        const currentIndex = shapes.indexOf(this.currentTool);
        const nextIndex = (currentIndex + 1) % shapes.length;
        this.currentTool = shapes[nextIndex];
        
        // Update lastTool when cycling through shapes
        this.lastTool = this.currentTool;
        
        // Update the UI to reflect the new shape
        this.updateShapeButtons();
        // Redraw to update the mouseover preview
        this.drawGrid();
        console.log('Shape cycled to:', this.currentTool);
    }

    cycleColor() {
        this.currentColorIndex = (this.currentColorIndex + 1) % this.colorPalette.length;
        this.currentColor = this.colorPalette[this.currentColorIndex];
        
        // Update the color picker input to reflect the new color
        const colorInput = document.getElementById('color-input');
        if (colorInput) {
            colorInput.value = this.currentColor;
        }
        
        // Redraw to update the mouseover preview
        this.drawGrid();
        console.log('Color cycled to:', this.currentColor);
    }

    setTool(tool) {
        this.currentTool = tool;
        // Update lastTool when switching to non-selection tools
        if (tool !== 'select') {
            this.lastTool = tool;
        }
        this.updateShapeButtons();
        this.drawGrid();
        console.log('Tool set to:', tool);
    }

    saveState() {
        const state = {
            grid: this.grid,
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            currentTool: this.currentTool,
            currentColor: this.currentColor,
            currentRotation: this.currentRotation,
            currentPosition: this.currentPosition,
            lastTool: this.lastTool,
            currentColorIndex: this.currentColorIndex,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('quiltingGridPlanner', JSON.stringify(state));
            console.log('State saved to localStorage');
        } catch (error) {
            console.warn('Failed to save state to localStorage:', error);
        }
    }

    loadState() {
        try {
            const savedState = localStorage.getItem('quiltingGridPlanner');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Restore grid dimensions
                if (state.gridWidth && state.gridHeight) {
                    this.gridWidth = state.gridWidth;
                    this.gridHeight = state.gridHeight;
                    document.getElementById('grid-width').value = this.gridWidth;
                    document.getElementById('grid-height').value = this.gridHeight;
                    this.updateCanvasSize();
                }
                
                // Restore grid data
                if (state.grid) {
                    this.grid = state.grid;
                }
                
                // Restore tool settings
                if (state.currentTool) {
                    this.currentTool = state.currentTool;
                }
                if (state.currentColor) {
                    this.currentColor = state.currentColor;
                    document.getElementById('color-input').value = this.currentColor;
                }
                if (state.currentRotation !== undefined) {
                    this.currentRotation = state.currentRotation;
                }
                if (state.currentPosition) {
                    this.currentPosition = state.currentPosition;
                }
                if (state.lastTool) {
                    this.lastTool = state.lastTool;
                }
                if (state.currentColorIndex !== undefined) {
                    this.currentColorIndex = state.currentColorIndex;
                }
                
                // Update UI to reflect restored state
                this.updateShapeButtons();
                this.updateRotationButtons();
                this.updatePositionButtons();
                
                const timeAgo = Math.floor((Date.now() - state.timestamp) / 1000 / 60);
                console.log(`State loaded from localStorage (saved ${timeAgo} minutes ago)`);
            }
        } catch (error) {
            console.warn('Failed to load state from localStorage:', error);
        }
    }

    saveDesignToFile() {
        const state = {
            grid: this.grid,
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            currentTool: this.currentTool,
            currentColor: this.currentColor,
            currentRotation: this.currentRotation,
            currentPosition: this.currentPosition,
            lastTool: this.lastTool,
            currentColorIndex: this.currentColorIndex,
            timestamp: Date.now(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `quilting-design-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        console.log('Design saved to file');
    }

    loadDesignFromFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const state = JSON.parse(e.target.result);
                
                // Validate the file format
                if (!state.grid || !state.gridWidth || !state.gridHeight) {
                    alert('Invalid design file format');
                    return;
                }

                // Restore grid dimensions
                this.gridWidth = state.gridWidth;
                this.gridHeight = state.gridHeight;
                document.getElementById('grid-width').value = this.gridWidth;
                document.getElementById('grid-height').value = this.gridHeight;
                this.updateCanvasSize();

                // Restore grid data
                this.grid = state.grid;

                // Restore tool settings if available
                if (state.currentTool) this.currentTool = state.currentTool;
                if (state.currentColor) {
                    this.currentColor = state.currentColor;
                    document.getElementById('color-input').value = this.currentColor;
                }
                if (state.currentRotation !== undefined) this.currentRotation = state.currentRotation;
                if (state.currentPosition) this.currentPosition = state.currentPosition;
                if (state.lastTool) this.lastTool = state.lastTool;
                if (state.currentColorIndex !== undefined) this.currentColorIndex = state.currentColorIndex;

                // Update UI
                this.updateShapeButtons();
                this.updateRotationButtons();
                this.updatePositionButtons();
                this.clearSelection();
                this.drawGrid();

                // Save to localStorage as well
                this.saveState();

                console.log('Design loaded from file');
                alert('Design loaded successfully!');
            } catch (error) {
                console.error('Failed to load design file:', error);
                alert('Failed to load design file. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    updateRotationButtons() {
        // Remove active class from all rotation buttons
        document.querySelectorAll('.rotation-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to current rotation button
        const rotationBtn = document.querySelector(`[data-rotation="${this.currentRotation}"]`);
        if (rotationBtn) {
            rotationBtn.classList.add('active');
        }
    }

    updateShapeButtons() {
        // Remove active class from all shape buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to current shape button
        const shapeBtn = document.querySelector(`[data-tool="${this.currentTool}"]`);
        if (shapeBtn) {
            shapeBtn.classList.add('active');
        }
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
        this.saveState(); // Auto-save after filling cell
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
        // Only clear selection start/end if we're not currently selecting
        if (!this.isSelecting) {
            this.selectionStart = null;
            this.selectionEnd = null;
        }
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
                data: {
                    elements: [...this.grid[y][x].elements], // Deep copy elements array
                    selected: false
                }
            });
            selectionData.bounds.minX = Math.min(selectionData.bounds.minX, x);
            selectionData.bounds.maxX = Math.max(selectionData.bounds.maxX, x);
            selectionData.bounds.minY = Math.min(selectionData.bounds.minY, y);
            selectionData.bounds.maxY = Math.max(selectionData.bounds.maxY, y);
        });

        this.copiedSelection = selectionData;
        this.updateSelectionButtons();
        console.log('Copied selection:', selectionData);
    }

    rotateSelection() {
        if (this.selectedCells.size === 0) return;

        const selectionData = {
            cells: [],
            bounds: { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        };

        // Collect the current selection data
        this.selectedCells.forEach(cellKey => {
            const [x, y] = cellKey.split(',').map(Number);
            selectionData.cells.push({
                x, y,
                data: {
                    elements: [...this.grid[y][x].elements], // Deep copy elements array
                    selected: false
                }
            });
            selectionData.bounds.minX = Math.min(selectionData.bounds.minX, x);
            selectionData.bounds.maxX = Math.max(selectionData.bounds.maxX, x);
            selectionData.bounds.minY = Math.min(selectionData.bounds.minY, y);
            selectionData.bounds.maxY = Math.max(selectionData.bounds.maxY, y);
        });

        // Calculate rotation center
        const centerX = (selectionData.bounds.minX + selectionData.bounds.maxX) / 2;
        const centerY = (selectionData.bounds.minY + selectionData.bounds.maxY) / 2;

        // Clear the original cells
        selectionData.cells.forEach(cell => {
            this.grid[cell.y][cell.x].elements = [];
        });

        // Clear current selection
        this.clearSelection();

        // Rotate each cell 90 degrees clockwise and place in new location
        const newSelectedCells = new Set();
        selectionData.cells.forEach(cell => {
            const relativeX = cell.x - centerX;
            const relativeY = cell.y - centerY;
            const newX = Math.round(centerX - relativeY);
            const newY = Math.round(centerY + relativeX);

            if (newX >= 0 && newX < this.gridWidth && newY >= 0 && newY < this.gridHeight) {
                // Rotate each element within the cell by 90 degrees
                const rotatedElements = cell.data.elements.map(element => ({
                    ...element,
                    rotation: (element.rotation + 90) % 360
                }));
                
                // Add the rotated elements to the new cell
                this.grid[newY][newX].elements.push(...rotatedElements);
                newSelectedCells.add(`${newX},${newY}`);
            }
        });

        // Update selection to the new rotated area
        this.selectedCells = newSelectedCells;
        this.updateSelectionButtons();
        this.drawGrid();
        this.saveState(); // Auto-save after rotating
        console.log('Rotated selection');
    }

    startPasting() {
        if (!this.copiedSelection) {
            console.log('No copied selection to paste');
            return;
        }
        this.isPasting = true;
        this.canvas.style.cursor = 'copy';
        console.log('Started pasting mode. Click on the grid to paste the selection.');
    }

    pasteSelection(targetCell) {
        if (!this.copiedSelection) return;

        const offsetX = targetCell.x - this.copiedSelection.bounds.minX;
        const offsetY = targetCell.y - this.copiedSelection.bounds.minY;

        console.log('Pasting selection:', {
            targetCell,
            offsetX,
            offsetY,
            copiedSelection: this.copiedSelection
        });

        this.copiedSelection.cells.forEach(cell => {
            const newX = cell.x + offsetX;
            const newY = cell.y + offsetY;

            if (newX >= 0 && newX < this.gridWidth && newY >= 0 && newY < this.gridHeight) {
                // Add the copied elements to the target cell
                this.grid[newY][newX].elements.push(...cell.data.elements);
                console.log(`Pasted cell at (${newX}, ${newY}) with ${cell.data.elements.length} elements`);
            }
        });

        this.isPasting = false;
        this.canvas.style.cursor = 'crosshair';
        this.drawGrid();
        this.saveState(); // Auto-save after pasting
        console.log('Pasted selection at:', targetCell);
    }

    clearGrid() {
        this.grid = this.initializeGrid();
        this.clearSelection();
        this.drawGrid();
        this.saveState(); // Auto-save after clearing grid
    }

    clearCell(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return;
        this.grid[y][x].elements = [];
        this.drawGrid();
        this.saveState(); // Auto-save after clearing cell
    }

    selectSingleCell(x, y) {
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) return;
        
        // Clear previous selection
        this.clearSelection();
        
        // Select single cell
        this.selectedCells.add(`${x},${y}`);
        this.grid[y][x].selected = true;
        
        this.updateSelectionButtons();
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

        // Draw selection rectangle while dragging OR when we have a finalized selection
        const shouldDrawSelection = (this.isSelecting && this.selectionStart && this.selectionEnd) || 
            (this.selectedCells.size > 0 && this.selectionStart && this.selectionEnd);
        
        
        if (shouldDrawSelection) {
            const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
            const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
            const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
            const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);
            
            const rectX = startX * this.cellSize;
            const rectY = startY * this.cellSize;
            const rectWidth = (endX - startX + 1) * this.cellSize;
            const rectHeight = (endY - startY + 1) * this.cellSize;
            
            // Fill with semi-transparent color first
            this.ctx.fillStyle = 'rgba(102, 126, 234, 0.4)';
            this.ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
            
            // Draw selection rectangle border
            this.ctx.strokeStyle = '#ff0000'; // Make it red for visibility
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([8, 4]);
            this.ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
            this.ctx.setLineDash([]);
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
            return; // Selection rectangle is drawn in drawGrid
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
