//level
var displays = [];
var Display = Class.extend({
    init: function (x, y, width, height, depth, handler) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.handler = handler;
        this.update_size();
    },
    update_size: function () {
        if(typeof this.x === 'string') {
            this.pixel_x = this.x.substring(0, this.x.length - 1) * canvas.width / 100;
        } else {
            this.pixel_x = this.x;
        }
        if(typeof this.y === 'string') {
            this.pixel_y = this.y.substring(0, this.y.length - 1) * canvas.height / 100;
        } else {
            this.pixel_y = this.y;
        }
        if(typeof this.width === 'string') {
            this.pixel_width = this.width.substring(0, this.width.length - 1) * canvas.width / 100;
        } else {
            this.pixel_width = this.width;
        }
        if(typeof this.height === 'string') {
            this.pixel_height = this.height.substring(0, this.height.length - 1) * canvas.height / 100;
        } else {
            this.pixel_height = this.height;
        }
        this.handler.resize(this.pixel_width, this.pixel_height);
    },
    draw: function () {
        var frame_buffer = this.handler.getFrameBuffer();
        enviroment.context.drawImage(frame_buffer, this.pixel_x, this.pixel_y, this.pixel_width, this.pixel_height);
    },
    onclick: function (event) {
        var at = {
            x: event.clientX - this.pixel_x,
            y: event.clientY - this.pixel_y
        };
        return this.handler.onclick(at);
    }
});

enviroment.addDisplay = function add_display(x, y, width, height, depth, handler) {
    var disp = displays.push(new Display(x, y, width, height, depth, handler));
    displays.sort(function depth_order(a, b) {
        if(a.depth < b.depth) {
            return 1;
        } else if(a.depth > b.depth) {
            return -1;
        } else {
            return 0;
        }
    });
    return disp;
};

//resize_canvas()
//Ajusta el tamaño del canvas al de la pantalla

function resize_canvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    _.each(displays, function (display) {
        display.update_size();
    });
}

var fullscreen = false;
if (fullscreen) {
    //TODO: Creo que esperaremos hasta que la API fullscreen este estandarizada
} else {
    document.body.style.scroll = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.margin= '0px';
    document.body.style.padding = '0px';
    canvas.style.margin = '0px';
    canvas.style.padding = '0px';
    resize_canvas();
    window.addEventListener('resize', resize_canvas);
}

//onclick(event)
//Captura el evento de click y lo delega

function onclick(event) {
    var x = event.clientX,
        y = event.clientY;

    for(var i=displays.length; i--;) {
        var display = displays[i];
        if(display.pixel_x < x && x < (display.pixel_x + display.pixel_width) && display.pixel_y < y && y < (display.pixel_y + display.pixel_height)) {
            if(display.onclick(event))
                break;
        }
    }
}

//tick(dt)
//Loop principal del juego, actualiza y dibuja el arbol

function tick(dt) {
    enviroment.root.update(dt);
    enviroment.context.save();

    enviroment.context.fillStyle = "#000000";
    enviroment.context.fillRect(0, 0, canvas.width, canvas.height);

    _.each(displays, function (display) {
        display.draw();
    });

    enviroment.context.restore();
}

var tick_interval;
var Level = Class.extend({
	init: function(tree) {
		this.tree = tree;
	},
	load: function() {
		this.tree.load();
	},
	draw: function(layer_mask) {
		return this.tree.draw(layer_mask);
	},
	update: function(dt) {
		this.tree.update(dt);
	},
	start: function() {
        this.stop();

        enviroment.root = this.tree;
        enviroment.root.load();

        window.addEventListener('click', onclick.bind(this));

        tick_interval = setInterval(tick.bind(this, 1 / 45), 1000 / 45);
        loaded = true;
	},
	stop: function() {
        loaded = false;
        if(tick_interval) {
            clearInterval(tick_interval);
            tick_interval = false;
        }

        if(enviroment.root) {
            enviroment.root.unload();
            enviroment.root = false;
        }
	}
});

return function level_loader(args, callback) {
	var content = [];
	_.each(_.keys(args.content), function prepare_asset(assetname) {
		var asset = args.content[assetname];
		content.push({
			type: 'content',
			args: {
				name: assetname,
				obj: asset
			}
		});
	});

	enviroment.moduleManager.use(content, function load_tree() {
		enviroment.moduleManager.use({
			type: 'fnode',
			args: {
				name: args.name || 'root',
				subnodes: args.tree
			}
		}, function return_tree(tree) {
			callback(new Level(tree));
		});
	});
};
