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
const INTERACTABLE_BACKGROUND = "#f5f5f5";
const SUBSECTION_BACKGROUND = "#f0f0f0";
const SCROLLBAR_BACKGROUND = "#e0e0e0";
const SCROLLBAR_COLOR = "#b5b5b5";
const SCROLLBAR_COLOR_ACTIVE = "#858585";
const INTERACTABLE_SELECT = "#4295f9";
const INTERACTABLE_SELECT_MORE = "#336cae";
const BUTTON_BACKGROUND = "#e0e0e0";
const DEFAULT_FONT = "14px sans-serif";

const TAB_HEIGHT = 20;
const GAP = 10;
const BUTTON_SIZE = 20;

const TRIG_OFFSET = 5;

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

function circ(x, y, radius, color) {
	var f = ctx.fillStyle;
	ctx.beginPath();
	ctx.fillStyle = color;
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.fill();
	ctx.fillStyle = f;
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
		this.title = "ImGui JS"
		
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
		this.minHeight = 150;

		this.elements = [];
		this.font = DEFAULT_FONT;

		this.c = canvas;
		c = canvas;
		this.ctx = this.c.getContext('2d');
		ctx = this.ctx;

		this.c.addEventListener("mousedown", (e) => {
			if ((e.buttons == 1 || e.buttons == 2) && !this.hidden) 
				this.checkClick(globalMouseX, globalMouseY, e);
			
			if (e.buttons == 1) {
				if ( this.checkHide(globalMouseX, globalMouseY) ) {
					this.hidden = !this.hidden;
				}
			}

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

	static Flags = {
		"Float" : true,
	}

    // Default text color changed to black
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
		var minX = this.x + TRIG_OFFSET * 4;
		var minY = this.y + 4;
		var maxX = this.x + this.width;
		var maxY = this.y + TAB_HEIGHT;

		if (between(x, minX, maxX) && between(y, minY, maxY)) {
			this.selected = true
		} else this.selected = false
		if (between(x, minX, maxX) && between(y, minY, maxY)) return true;
		return false;
	}

	checkHide(x, y) {
		if (
			between(x, this.x, this.x + TRIG_OFFSET + 15) &&
			between(y, this.y, this.y + TRIG_OFFSET + 15)
		) {
			return true;
		} else {
			return false;
		}
	}

	checkClick(x, y, e) {
		for (var i = 0; i < this.elements.length; i++) {
			this.elements[i].check(x, y, e);
		}
	}

	checkHover(x, y) {
		var minX = this.x - this.c.getBoundingClientRect().x;
		var minY = this.y - this.c.getBoundingClientRect().y;
		var maxX = this.x - this.c.getBoundingClientRect().x + this.width;
		var maxY = this.hidden ? this.y - this.c.getBoundingClientRect().y + TAB_HEIGHT : this.y - this.c.getBoundingClientRect().y + this.height;

		if (between(x, minX, maxX) && between(y, minY, maxY)) return true;
		return false;
	}

	checkBounding(x, y) {
		var minX = this.x - this.c.getBoundingClientRect().x;
		var minY = this.y - this.c.getBoundingClientRect().y;
		var maxX = this.x - this.c.getBoundingClientRect().x + this.width;
		var maxY = this.y + (this.hidden ? TAB_HEIGHT - this.c.getBoundingClientRect().y : this.height - this.c.getBoundingClientRect().y);

		if (between(x, minX, maxX) && between(y, minY, maxY)) return true;
		return false;
	}

	// Default color changed to black
	checkbox(text = "Placeholder", toggle = false, color = "black", font = DEFAULT_FONT) {
		var checkbox = new Checkbox(text, toggle, color, font);
		this.elements.push(checkbox);
		return checkbox;
	}
	
	button(text = "Placeholder", center = false, font = DEFAULT_FONT) {
		var button = new Button(text, center, font);
		this.elements.push(button);
		return button;
	}

    // Default color changed to black
	staticText(text = "Placeholder", color = "black", center = false, font = DEFAULT_FONT) {
		var staticText = new StaticText(text, color, center, font);
		this.elements.push(staticText);
		return staticText;
	}

	slider(min = 0, max = 100, width = this.width, init = min, options) {
		var slider = new Slider(min, max, width, init, {...options})
		this.elements.push(slider);
		return slider;
    }

	subsection(text = "Default Text", options) {
		var subsection = new SubSection(text, {...options})
		this.elements.push(subsection);
		return subsection;
    }

	number(min = 0, max = 100, init=min) {}

	update(x, y) {
		this.x = x;
		this.y = y;
	}

	init() {
		this.height = Math.max(this.init_height, TAB_HEIGHT + GAP + (this.elements.length * (BUTTON_SIZE + GAP)));
		for (var i = 0; i < this.elements.length; i++) {
			if (this.elements[i].text && this.elements[i].text.includes("\n")) {
				let lines = this.elements[i].text.split("\n");
				this.height += (lines.length - 1) * 14;
			}
			if(this.elements[i].constructor.name == "SubSection") this.height += GAP*2;
		}
		this.maxHeight = this.height;

		let longest_text = ""
		let farthest_text = GAP
		let longest_width = GAP
		for (var i = 0; i < this.elements.length; i++) {
			if (this.elements[i].text && this.elements[i].text.length >= longest_text.length) {
				longest_text = this.elements[i].text;
				farthest_text = this.elements[i].text_x > farthest_text ? this.elements[i].text_x : farthest_text;
			}
			if (this.elements[i].width >= this.width || this.elements[i].width > longest_width) {
				longest_width = this.elements[i].width
			}
		}
		const longest_text_width = ctx.measureText(longest_text).width
	}

	static closeTrig(x,y) {
		ctx.beginPath();
		const cornerX = x + TRIG_OFFSET;
		const cornerY = y + TRIG_OFFSET;
		ctx.moveTo(cornerX, cornerY);
		ctx.lineTo(cornerX + 5, cornerY + 9);
		ctx.lineTo(cornerX + 10, cornerY);
		ctx.fillStyle = "black"; // Changed to black for visibility
		ctx.fill();
	}

	static openTrig(x,y) {
		ctx.beginPath();
		const cornerX = x + TRIG_OFFSET * 1.25;
		const cornerY = y + 4;
		ctx.moveTo(cornerX, cornerY);
		ctx.lineTo(cornerX + 9, cornerY + 5);
		ctx.lineTo(cornerX, 		cornerY + 10);
		ctx.fillStyle = "black"; // Changed to black for visibility
		ctx.fill();
	}

	resizeTrigDraw() {
		const OFFSET = 2 * GAP
		const minX = this.x + this.width - OFFSET;
		const minY = this.y + this.height - OFFSET;

		let fill_color = 
		pointInTriangle(
			globalMouseX, globalMouseY, 
			minX, minY + OFFSET,
			minX + OFFSET, minY + OFFSET,
			minX + OFFSET, minY,
		) ?
		INTERACTABLE_SELECT_MORE :
		BUTTON_BACKGROUND;

		round_rect(minX, minY, OFFSET, OFFSET, fill_color, [0,0,5,0]);

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

		for (let i = 0; i < this.elements.length; i++) {
			const element = this.elements[i];
			if (element.constructor.name == "Slider") {
				element.setWidth = this.width - (this.height < this.maxHeight ? 2 : 0) * GAP;
				element.refresh()
			}
		}
	}	

	scrollbarDraw() {
		if (this.height < this.maxHeight) {
			const minX = this.x + this.width - 2 * GAP;
			
			const height = (( this.height ) / ( this.maxHeight )) * (this.height - (GAP * 2) - TAB_HEIGHT - GAP/2)

			rect(minX, this.y + TAB_HEIGHT, 2 * GAP, this.height, SCROLLBAR_BACKGROUND);

			this.isSlider = 
			(between(globalMouseX, minX + GAP/2, minX + GAP/2 + GAP) && between(globalMouseY, this.y + TAB_HEIGHT + GAP/2 + this.scroll_height, this.y + TAB_HEIGHT + GAP/2 + this.scroll_height + height));
			const color = this.isSlider ? SCROLLBAR_COLOR_ACTIVE : SCROLLBAR_COLOR

			round_rect(minX + GAP/2, this.y + TAB_HEIGHT + GAP/2 + this.scroll_height, GAP, height, color, 5);
		}
	}

	scrollbarFunc(e) {
		const offsetY = e.y - this.scrollbar_offsetY;
		const height = ( 1 - ( this.height / this.maxHeight ) ) 
								 * (this.height - (GAP * 2) - TAB_HEIGHT - GAP/2)

		this.scroll_height = clamp(offsetY, 0, height);
	}

	draw() {
		var color = this.selected ? TAB_COLOR_SEL : TAB_COLOR_UNSEL

		if (!this.hidden) {
			ctx.save();
			clip_rect(this.x, this.y, this.width, this.height)
			round_rect(this.x, this.y, this.width, TAB_HEIGHT, color, [5,5,0,0]);
			ImGui.closeTrig(this.x, this.y);
			round_rect(this.x, this.y + TAB_HEIGHT, this.width, this.height-TAB_HEIGHT, BACKGROUND, [0,0,5,5]);
			clip_rect(this.x, this.y+TAB_HEIGHT, this.width, this.height-TAB_HEIGHT)

			const height = ( 1 - ( this.height / this.maxHeight ) ) 
								 	 * (this.height - (GAP * 2) - TAB_HEIGHT - GAP/2)
			
			for (var i = 0; i < this.elements.length; i++) {
				var x = this.x + GAP;

				const content_scroll = (this.scroll_height / height) * (this.maxHeight - this.height) || 0; 

				var y = (this.y - content_scroll ) + TAB_HEIGHT + GAP;
				if (i > 0) {
					y += this.elements[i-1].y - this.y + content_scroll;
				}
				
				if (i > 0 && this.elements[i-1].text.includes("\n")) {
					y += 14 * (this.elements[i-1].text.split("\n").length - 1);
				}

				if (!this.elements[i].hidden) this.elements[i].draw(x, y, this.width);
			}

			this.scrollbarDraw();
			this.resizeTrigDraw();
			ctx.restore();
		} else {
			round_rect(this.x, this.y, this.width, TAB_HEIGHT, color, 5);
			ImGui.openTrig(this.x, this.y);
		}
		
		ImGui.text(this.title, this.x + TRIG_OFFSET * 5, this.y + TRIG_OFFSET * 3);

		if ( this.checkHide(globalMouseX, globalMouseY) ) {
			circ(this.x + TRIG_OFFSET * 2, this.y + 9, 8, `rgba(66, 149, 249, 0.5)`);
		}
	}

	refresh() {
		for (var i = 0; i < this.elements.length; i++) {
			this.elements[i].refresh();
		}
	}
}

class Slider {
  constructor(min, max, width, init, options) {
    this.x;
    this.y;
		this.init = init;
		this.setWidth = width;
		this.state = init;
		this.validClick = false;
		this.float = options.float ? options.float : false;
		this.editing = false;
		this.input = init;
		this.text = options.text ? options.text : "";
		this.text_x = this.setWidth + GAP * 2;
    this.min = min;
    this.max = max;

		this.font = options.font || DEFAULT_FONT;
		ctx.font = this.font;
		const text_width = this.text != "" ? (ctx.measureText(this.text).width+GAP) : 0
    this.width = this.setWidth - text_width - GAP*2;

		document.addEventListener("keydown", (e) => this.handleInput(e));
  }

  draw(x, y) {
    this.x = x;
    this.y = y;
		this.slideMin = this.x+16;
		this.slideMax = (this.width) + this.x;
		
		if ( !this.slidex && this.init != this.min ) {
			this.slidex = (
				(this.init-this.min)
				/
				(Math.abs(this.max) - Math.abs(this.min))
				*
				(this.width-BUTTON_SIZE)
			);
		} else if (!this.slidex) {
			this.slidex = BUTTON_SIZE/8;
		}

    if ( this.checkClr(globalMouseX, globalMouseY) ) {
			rect(x, y, this.width, BUTTON_SIZE, INTERACTABLE_SELECT_MORE);
		} else {
			rect(x, y, this.width, BUTTON_SIZE, BUTTON_BACKGROUND);			
		}

		rect(this.slidex + x, y+BUTTON_SIZE/8, 3*BUTTON_SIZE/5, 6*BUTTON_SIZE/8, INTERACTABLE_SELECT);	

		this.state = Math.max(Math.min(this.state,this.max),this.min);
		
		const float_round = this.float == true ? 3 : 0;
		const fixed_number = !this.editing ? parseFloat(this.state).toFixed(float_round) : this.input
		const fixed_number_width = ctx.measureText(fixed_number).width 

    ImGui.text(
			fixed_number,
    x + (this.width/2) - fixed_number_width / 2, this.y+3*BUTTON_SIZE/4);

		if (this.editing && Date.now() % 1000 <= 500) {
            // Blinking cursor changed to black
			rect(x + (this.width/2) + fixed_number_width / 2 + 2, this.y+BUTTON_SIZE/8, 2, 16, "black")
		}

		if (this.text != "") {
			ImGui.text(
				this.text,
				this.x+this.width+GAP,
				this.y+BUTTON_SIZE/4*3
			);
		}
  }

	checkClr(x, y) {
    if (between(x, this.x, this.slideMax ) && between(y, this.y, this.y + BUTTON_SIZE)) {
			return true;
    }
		return false;
  }

	handleInput(e) {
		if (this.editing && e.type == "keydown") {
			if (e.key == "Enter") {
				this.editing = false;
				this.state = parseFloat(this.input || 0);
				this.refresh();
			} else if (e.key == "Escape") {
				this.editing = false;
				this.input = this.state;
				this.refresh();
			} else if (e.key == 'Backspace') {
				this.input = this.input.toString().slice(0, -1);
			} else if (e.key == '.' || parseInt(e.key) || e.key == '0' ) {
				this.input = this.input + e.key;
			}
		}
  }

  check(x, y, e) {
    if (between(x, this.x, this.slideMax ) && between(y, this.y, this.y + BUTTON_SIZE)) {
			if (e.buttons != 2 && e.type != "mouseup" && this.validClick) {
				this.slidex = Math.min(Math.max(x+BUTTON_SIZE/2, Math.floor(this.slideMin)), this.slideMax) - 3*BUTTON_SIZE/5-2-this.x;
			}

			if (e.type == "mousedown") {
				if (e.buttons == 2) {
                    this.editing = true; 
					this.input = parseFloat(this.state);
                } else {
					this.slidex = Math.min(Math.max(x+BUTTON_SIZE/2, Math.floor(this.slideMin)), this.slideMax) - 3*BUTTON_SIZE/5-2-this.x;
					const number_percent = (this.slidex-2.5)/(this.width-BUTTON_SIZE)
					this.state = ((number_percent) *(this.max-this.min)+this.min)
				}
				this.validClick = true;
			}
			if (e.type == "mouseup") {
				return this.validClick = false;
			}

			if (e.buttons == 2) return
			
			if (e.type == "mousemove" && !this.validClick) return;
			else if (e.type == "mousemove" && e.buttons !== 2) {
				const number_percent = (this.slidex-2.5)/(this.width-BUTTON_SIZE)
				this.state = ((number_percent) *(this.max-this.min)+this.min)
			}
			
			return true;
    }
		this.validClick = false;
		this.editing = false;
		return false;
  }

	refresh() {
		ctx.font = this.font;
		const text_width = this.text != "" ? (ctx.measureText(this.text).width+GAP) : 0
        this.width = this.setWidth - text_width - GAP*2;
		this.state = this.state > this.max ? this.max : this.state < this.min ? this.min : this.state;
		this.slidex = (this.state-this.min) / (Math.abs(this.max) - Math.abs(this.min)) * (this.width-BUTTON_SIZE)
	}
}

class Button {
	constructor(text, center, font = DEFAULT_FONT) {
		this.x = 0;
		this.y = 0;
		this.text = text;
		this.width = ctx.measureText(this.text).width;
		this.font = font;
		this.callbacks = [];
		this.center = center;
		this.color = BUTTON_BACKGROUND;
	}

	check(x, y, e) {
		if (between(x, this.x, this.x + ctx.measureText(this.text).width + GAP * 2 ) && between(y, this.y, this.y + BUTTON_SIZE)) {
			if (!e || ((e.movementX == 0 && e.movementY == 0) && e.type == "mousedown")){
				this.color = INTERACTABLE_SELECT;
				this.callbacks.forEach(callback => callback());
			}
			return true;
		}
		return false;
	}

	checkClr(x, y) {
    if (between(x, this.x, this.x + ctx.measureText(this.text).width + GAP * 2 ) && between(y, this.y, this.y + BUTTON_SIZE)) {
			if (this.color != INTERACTABLE_SELECT) this.color = INTERACTABLE_SELECT_MORE;
			else this.color = INTERACTABLE_SELECT_MORE
			return true;
    }
		return false;
  }

	onClick(callback) {
		if (typeof callback === 'function') {
			this.callbacks.push(callback);
		}
	}

	draw(x, y, width) {
		this.x = x;
		this.y = y;
		ctx.font = DEFAULT_FONT;
		this.width = ctx.measureText(this.text).width;
		
		if (this.center) {
			this.x -= GAP + this.width
			this.x += (this.width-GAP+width)/2
		}

		if ( this.checkClr(globalMouseX, globalMouseY) ) {
			rect(this.x, y, this.width + GAP * 2, BUTTON_SIZE, this.color);
		} else {
			rect(this.x, y, this.width + GAP * 2, BUTTON_SIZE, BUTTON_BACKGROUND);
		}
		
		ImGui.text(this.text, this.x + GAP, this.y+3*BUTTON_SIZE/4)
	}

	refresh() {}
}

class Checkbox {
	constructor(text, toggle, color = "black") { // Default color changed
		this.x = 0;
		this.y = 0;
		this.text = text;
		this.state = toggle;
		this.color = color;
	}

	checkmark(x, y) {
		ctx.beginPath();
		ctx.strokeStyle = INTERACTABLE_SELECT;
		ctx.lineWidth = 2;
		ctx.moveTo(x + BUTTON_SIZE / 4, y + BUTTON_SIZE / 2);
		ctx.lineTo(x + BUTTON_SIZE / 4 + 4, y + BUTTON_SIZE / 2 + 4);
		ctx.lineTo(x + (2 * BUTTON_SIZE) / 4 + 6, y + ((1 / 2) * BUTTON_SIZE) / 2);
		ctx.stroke();
	}

	check(x, y, e) {
		if (
			between(x, this.x, this.x + BUTTON_SIZE) &&
			between(y, this.y, this.y + BUTTON_SIZE) &&
      ((!e || (e.movementX == 0 && e.movementY == 0)) && e.type == "mousedown" && e.buttons == 1)
		) {
			this.state = !this.state;
			return true;
		}
		return false;
	}

	checkClr(x, y) {
    if (between(x, this.x, this.x + BUTTON_SIZE ) && between(y, this.y, this.y + BUTTON_SIZE)) {
			return true;
    }
		return false;
  }

	draw(x, y) {
		this.x = x;
		this.y = y;

		const color = this.checkClr(globalMouseX, globalMouseY) ? INTERACTABLE_SELECT_MORE : BUTTON_BACKGROUND;
		rect(x, y, BUTTON_SIZE, BUTTON_SIZE, color);
		
		var newX = x + BUTTON_SIZE + GAP;
		var newY = y + 5 + BUTTON_SIZE / 2;
		ImGui.text(this.text, newX, newY, this.color)
		
		if (this.state) this.checkmark(x, y);
	}

	refresh() {}
}

class StaticText {
	constructor(text, color = "black", center, font = DEFAULT_FONT) { // Default color changed
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
			ImGui.text(lines[i], this.x, this.y + 14 * (i + 1), this.color, this.font);
			this.x = x; 
		}
	}

	check(x, y, e) {
		return false;
	}

	refresh() {}
}

class SubSection {
	constructor(text, options) {
		this.x = 0;
		this.y = 0;
		this.text = text;
		this.color = options.color || 'black'; // Default color changed
		this.font = options.font || DEFAULT_FONT;
		this.collapsed = false;
		this.elements = [];
	}

	draw(x, y, width) {
		this.x = x;
		this.y = y;
		ctx.font = this.font;

		round_rect(this.x, this.y, width - GAP*2, GAP*2, BUTTON_BACKGROUND, 2);

		const y_height = GAP + this.elements[this.elements.length-1].y - this.y;

		if (!this.collapsed) {
			rect(this.x, this.y + GAP * 2, width - GAP*2, y_height, SUBSECTION_BACKGROUND);
		}

		if (this.checkHide(globalMouseX, globalMouseY)) {
			circ(this.x + TRIG_OFFSET * 2, this.y + 9, 8, `rgba(66, 149, 249, 0.5)`);
		}

		this.collapsed ? ImGui.openTrig(this.x, this.y) : ImGui.closeTrig(this.x, this.y);

		ImGui.text(this.text, this.x + GAP + TRIG_OFFSET * 2, this.y+3*BUTTON_SIZE/4)
	}

	checkHide(x, y) {
    if (between(x, this.x, this.x + GAP + TRIG_OFFSET * 2 ) && between(y, this.y, this.y + GAP + TRIG_OFFSET * 2 )) return true;
		return false;
  }

	check(x, y, e) {
		if (this.checkHide(x,y)) {
			if (!e || ((e.movementX == 0 && e.movementY == 0) && e.type == "mousedown")){
				this.collapsed = !this.collapsed;
				for (const element of this.elements) {
					element.hidden = !element.hidden;
				}
			}
			return true;
		}
		return false;
	}

	refresh() {}
}

window.ImGui = ImGui;

document.addEventListener("contextmenu", function (e) { 
  e.preventDefault(); 
});
