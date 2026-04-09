// let c = document.getElementById("myCanvas");
// let ctx = c.getContext("2d");
let c;
let ctx;

let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;

//---CONSTANTS (UPDATED FOR LIGHT THEME) ---//
const TAB_COLOR_SEL = "#c2c2c2"; 
const TAB_COLOR_UNSEL = "#e0e0e0";
const BACKGROUND = "#ffffff"; // White background
const SCROLLBAR_BACKGROUND = "#e0e0e0";
const SCROLLBAR_COLOR = "#b5b5b5";
const SCROLLBAR_COLOR_ACTIVE = "#858585";
const DEFAULT_FONT = "14px sans-serif";

const TAB_HEIGHT = 15; // Kept small for invisible drag zone
const GAP = 10;

//---------//
let globalMouseX = 0;
let globalMouseY = 0;

// Function to determine whether a point is inside the triangle or not
function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
	const denominator = ((y2 - y3)*(x1 - x3) + (x3 - x2)*(y1 - y3));
	const a = ((y2 - y3)*(px - x3) + (x3 - x2)*(py - y3)) / denominator;
	const b = ((y3 - y1)*(px - x3) + (x1 - x3)*(py - y3)) / denominator;
	const c = 1 - a - b;

	return (a >= 0) && (b >= 0) && (c >= 0);
}

function rect(x, y, width, height, color) {
	ctx.beginPath();
	ctx.fillStyle = color;
	ctx.rect(x, y, width, height);
	ctx.fill();
}

function round_rect(x, y, width, height, color, radius) {
	ctx.beginPath();
	ctx.fillStyle = color;
	ctx.roundRect(x, y, width, height, radius);
	ctx.fill();
}

function clip_rect(x, y, width, height) {
	ctx.beginPath();
	ctx.rect(x, y, width, height);
	ctx.clip();
}

function clamp(x, min, max) {
	return Math.min(Math.max(x, min), max)
}

const between = (x, min, max) => {
	return x >= min && x <= max;
};

class ImGui {
	constructor(x = 150, y = 200, width = 400, height = 500, canvas) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.init_height = height;
		this.height = height;		
		this.maxHeight;
		this.scrollbar_active = false;
		this.scroll_height = 0;
		this.scrollbar_offsetY;

		this.moving = false;
		this.hidden = false;
		this.selected = true;

		this.resizing = false;
		this.resizing_offsetX;
		this.resizing_offsetY;
		this.temp_width = width;
		this.temp_height = height;
		this.minWidth = 150; 
		this.minHeight = 100;

		this.elements = [];
		this.font = DEFAULT_FONT;
        
        // Paging variables
        this.page = 0;
        this.totalPages = 1;

		this.c = canvas;
		c = canvas;
		this.ctx = this.c.getContext('2d');
		ctx = this.ctx;

        // Page Navigation Listener
        document.addEventListener("keydown", (e) => {
            if (!this.hidden && this.totalPages > 1) {
                if (e.key === "ArrowRight") {
                    this.page = Math.min(this.page + 1, this.totalPages - 1);
                } else if (e.key === "ArrowLeft") {
                    this.page = Math.max(this.page - 1, 0);
                }
            }
        });

		this.c.addEventListener("mousedown", (e) => {
			if ((e.buttons == 1 || e.buttons == 2) && !this.hidden) 
				this.checkClick(globalMouseX, globalMouseY, e);
			
			const RESIZE_OFFSET = 2 * GAP;
			const resizeTriangleX = this.x + this.width - RESIZE_OFFSET;
			const resizeTriangleY = this.y + this.height - RESIZE_OFFSET;
			if (pointInTriangle(
				globalMouseX, globalMouseY, 
				resizeTriangleX, resizeTriangleY + RESIZE_OFFSET,
				resizeTriangleX + RESIZE_OFFSET, resizeTriangleY + RESIZE_OFFSET,
				resizeTriangleX + RESIZE_OFFSET, resizeTriangleY,
			)) {
				this.resizing = true;
				this.resizing_offsetX = e.x;
				this.resizing_offsetY = e.y;
				this.temp_width = this.width;
				this.temp_height = this.height;
			}
			else this.resizing = false;

			if (this.isSlider) {
				this.scrollbar_active = true;
				this.scrollbar_offsetY = e.y - this.scroll_height;
			} else {
				this.scrollbar_active = false;
			}
		
			if (this.checkMove(globalMouseX, globalMouseY)) {
				this.moving = true;
				this.offsetX = this.x - globalMouseX;
				this.offsetY = this.y - globalMouseY;
			} else {
				this.moving = false;
			}
		});
		
		this.c.addEventListener("mousemove", (e) => {
			globalMouseX = e.x - this.c.getBoundingClientRect().x;
			globalMouseY = e.y - this.c.getBoundingClientRect().y;
			if (e.buttons == 1 && this.moving) {
				this.update(globalMouseX + this.offsetX, globalMouseY + this.offsetY);
			} 
			else if (e.buttons == 1 && this.resizing) this.resizeTrigFunc(e)
			else if (e.buttons == 1 && this.scrollbar_active) this.scrollbarFunc(e)
			else if (e.buttons == 1) this.checkClick(globalMouseX, globalMouseY, e);
		});

		this.c.addEventListener("mouseup", (e) => {
			this.checkClick(globalMouseX, globalMouseY, e);
		});
	}

	static Flags = { "Float" : true }

	static text(text, x, y, color = "black", font = DEFAULT_FONT) {
		const fill_old = ctx.fillStyle;
		const font_old = ctx.font;
		ctx.fillStyle = color;
		ctx.font = font;
		ctx.fillText(text, x, y);
		ctx.fillStyle = fill_old;
		ctx.font = font_old;
	}

	checkMove(x, y) {
		var minX = this.x;
		var minY = this.y;
		var maxX = this.x + this.width;
		var maxY = this.y + TAB_HEIGHT; 

		if (between(x, minX, maxX) && between(y, minY, maxY)) {
			this.selected = true;
            return true;
		} 
        this.selected = false;
		return false;
	}

	checkClick(x, y, e) {
		for (var i = 0; i < this.elements.length; i++) this.elements[i].check(x, y, e);
	}

	checkHover(x, y) {
		var minX = this.x - this.c.getBoundingClientRect().x;
		var minY = this.y - this.c.getBoundingClientRect().y;
		var maxX = this.x - this.c.getBoundingClientRect().x + this.width;
		var maxY = this.hidden ? this.y - this.c.getBoundingClientRect().y + TAB_HEIGHT : this.y - this.c.getBoundingClientRect().y + this.height;

		return (between(x, minX, maxX) && between(y, minY, maxY));
	}

	staticText(text = "Placeholder", color = "black", center = false, font = DEFAULT_FONT) {
		var staticText = new StaticText(text, color, center, font);
		this.elements.push(staticText);
		return staticText;
	}

	update(x, y) {
		this.x = x;
		this.y = y;
	}

	init() {
        // Compute Height based on 10 rows maximum
        const ITEMS_PER_COL = 10;
        const visibleRows = Math.min(this.elements.length, ITEMS_PER_COL);
        
        // 20 pixels per row spacing
		this.maxHeight = TAB_HEIGHT + (GAP * 2) + (visibleRows * 20);
        
        // Calculate pagination
        this.totalPages = Math.ceil(this.elements.length / 40);
        if (this.totalPages > 1) {
            this.maxHeight += 25; // Add room for page indicator at bottom
        }

        // Apply height (allow it to be smaller if user resized, triggering scrollbar)
        this.height = Math.max(Math.min(this.height, this.maxHeight), this.minHeight);
	}

	resizeTrigDraw() {
		const OFFSET = 2 * GAP
		const minX = this.x + this.width - OFFSET;
		const minY = this.y + this.height - OFFSET;

		ctx.beginPath();
		ctx.fillStyle = (this.height < this.maxHeight ? SCROLLBAR_BACKGROUND : BACKGROUND);
		ctx.moveTo(minX, minY);
		ctx.lineTo(minX + OFFSET, minY);
		ctx.lineTo(minX, minY + OFFSET);
		ctx.fill();
	}

	resizeTrigFunc(e) {
		const offsetX = e.x - this.resizing_offsetX;
		const offsetY = e.y - this.resizing_offsetY;

		this.scroll_height += Math.max(0, offsetY);
		this.scroll_height = Math.min(this.scroll_height, 0);

		this.width = this.temp_width + offsetX;
		this.height = this.temp_height + offsetY;

		this.width = Math.max(this.width, this.minWidth);
		this.height = Math.max(this.height, this.minHeight);
	}	

	scrollbarDraw() {
		if (this.height < this.maxHeight) {
			const minX = this.x + this.width - 2 * GAP;
			const height = (( this.height ) / ( this.maxHeight )) * (this.height - (GAP * 2) - TAB_HEIGHT - GAP/2)
			rect(minX, this.y + TAB_HEIGHT, 2 * GAP, this.height, SCROLLBAR_BACKGROUND);
			this.isSlider = (between(globalMouseX, minX + GAP/2, minX + GAP/2 + GAP) && between(globalMouseY, this.y + TAB_HEIGHT + GAP/2 + this.scroll_height, this.y + TAB_HEIGHT + GAP/2 + this.scroll_height + height));
			const color = this.isSlider ? SCROLLBAR_COLOR_ACTIVE : SCROLLBAR_COLOR
			round_rect(minX + GAP/2, this.y + TAB_HEIGHT + GAP/2 + this.scroll_height, GAP, height, color, 5);
		}
	}

	scrollbarFunc(e) {
		const offsetY = e.y - this.scrollbar_offsetY;
		const height = ( 1 - ( this.height / this.maxHeight ) ) * (this.height - (GAP * 2) - TAB_HEIGHT - GAP/2)
		this.scroll_height = clamp(offsetY, 0, height);
	}

	draw() {
		if (!this.hidden) {
			ctx.save();
			clip_rect(this.x, this.y, this.width, this.height)
            
			round_rect(this.x, this.y, this.width, this.height, BACKGROUND, 5);
			clip_rect(this.x, this.y, this.width, this.height)

            // Scrollbar math (only active if height was manually resized smaller than maxHeight)
            const scrollRatio = this.height < this.maxHeight ? (this.height - (GAP * 2) - TAB_HEIGHT - GAP/2) : 1;
            const content_scroll = this.height < this.maxHeight ? (this.scroll_height / scrollRatio) * (this.maxHeight - this.height) || 0 : 0;
            
            // Grid Math
            const ITEMS_PER_COL = 10;
            const MAX_COLS = 4;
            const ITEMS_PER_PAGE = 40;
            const colWidth = (this.width - (GAP * 2)) / MAX_COLS;

            // Page Safety Check
            if (this.page >= this.totalPages) this.page = Math.max(0, this.totalPages - 1);
            
            const startIndex = this.page * ITEMS_PER_PAGE;
            const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, this.elements.length);
			
			for (var i = startIndex; i < endIndex; i++) {
                let relativeIndex = i - startIndex;
                let col = Math.floor(relativeIndex / ITEMS_PER_COL);
                let row = relativeIndex % ITEMS_PER_COL;

				var x = this.x + GAP + (col * colWidth);
                var y = this.y - content_scroll + TAB_HEIGHT + GAP + (row * 20); // 20px per row

				if (!this.elements[i].hidden) this.elements[i].draw(x, y, colWidth);
			}

            // Draw Page Indicator if needed
            if (this.totalPages > 1) {
                let textY = this.y - content_scroll + this.maxHeight - GAP;
                ctx.fillStyle = "#858585";
                ctx.font = "12px sans-serif";
                ctx.fillText(`Page ${this.page + 1}/${this.totalPages} (Use ◀ ▶)`, this.x + GAP, textY);
            }

			this.scrollbarDraw();
			this.resizeTrigDraw();
			ctx.restore();
		}
	}

	refresh() {
		for (var i = 0; i < this.elements.length; i++) this.elements[i].refresh();
	}
}

class StaticText {
	constructor(text, color = "black", center, font = DEFAULT_FONT) { 
		this.x = 0;
		this.y = 0;
		this.text = text;
		this.color = color;
		this.center = center;
		this.font = font;
	}

	draw(x, y, width) {
		this.x = x;
		this.y = y;

		let lines = this.text.split('\n');
		for(let i=0; i<lines.length; i++) {
			ctx.font = this.font;
			if (this.center) {
				const textWidth = ctx.measureText(lines[i]).width;
				this.x -= GAP + textWidth
				this.x += (textWidth+width)/2
			}
            // Start text rendering smoothly based on the passed Y anchor
			ImGui.text(lines[i], this.x, this.y + 14, this.color, this.font);
			this.x = x; 
		}
	}

	check(x, y, e) { return false; }
	refresh() {}
}

window.ImGui = ImGui;
document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
