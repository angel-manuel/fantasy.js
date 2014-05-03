//level
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
Display.displays = [];
Display.Add = function display_add(x, y, width, height, depth, handler) {
    var disp = displays.push(new Display(x, y, width, height, depth, handler));
    Display.displays.sort(function depth_order(a, b) {
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
Display.DrawAll = function display_draw_all() {
    _.each(Display.displays, function draw_display(d){
        d.draw();
    });
};
Display.UpdateSizeAll = function display_update_size_all() {
    _.each(Display.displays, function update_display_size(d) {
        d.update_size();
    });
};
window.addEventListener('resize', Display.UpdateSizeAll);
Display.OnClick = function display_onclick(event) {
    var x = event.clientX,
        y = event.clientY;

    for(var i=Display.displays.length; i--;) {
        var display = Display.displays[i];
        if(display.pixel_x < x && x < (display.pixel_x + display.pixel_width) && display.pixel_y < y && y < (display.pixel_y + display.pixel_height)) {
            if(display.onclick(event))
                break;
        }
    }
};

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

        Level.current = this;
        Level.last_t = Date.now();
        requestAnimationFrame(Level.tick);
        loaded = true;
	},
	stop: function() {
        loaded = false;
        if(Level.current === this) {
            Level.current = false;
            Level.current.unload();
        }
	}
});
Level.last_t = Date.now();
Level.tick = function tick() {
    if(Level.current) {
        var t = Date.now();
        var dt = (t - last_t)/1000;
        last_t = t;

        Level.current.update(dt);
        enviroment.context.save();

        enviroment.context.fillStyle = "#000000";
        enviroment.context.fillRect(0, 0, canvas.width, canvas.height);

        Display.DrawAll();

        enviroment.context.restore();
        requestAnimationFrame(tick);
    }
};
Level.current = false;

function level_loader(args, callback) {
    var content = [];
    _.each(args.content, function prepare_asset(asset, assetname) {
        asset.args.name = assetname;
        content.push(asset);
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
}

set('loader/level', level_loader);
return level_loader;
