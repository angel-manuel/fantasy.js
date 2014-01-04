//orthografic_camera
var orthografic_camera = enviroment.Component.extend({
    init: function (args) {
        this.layer_mask = args.layer_mask || 65535;
        this.background = args.background || '#000000';

        this.width = args.width || '100%';
        this.height = args.height || '100%';

        var viewport = args.viewport || {};

        this.viewport = {
            x: viewport.x || 0,
            y: viewport.y || 0,
            width: viewport.width || '100%',
            height: viewport.height || '100%',
            depth: viewport.depth || 0
        };

        this.hiddencanvas = document.createElement('canvas');
        this.hiddencontext = this.hiddencanvas.getContext('2d');

        this._super(args);
    },
    resize: function (width, height) {
        this.hiddencanvas.setAttribute('width', width);
        this.hiddencanvas.setAttribute('height', height);

        if (typeof this.width === 'string') {
            this.pixel_width = this.width.substring(0, this.width.length - 1) * width / 100;
        } else {
            this.pixel_width = width;
        }

        if (typeof this.height === 'string') {
            this.pixel_height = this.height.substring(0, this.height.length - 1) * height / 100;
        } else {
            this.pixel_height = height;
        }

        this.hiddencontext.scale(width / this.pixel_width, height / this.pixel_height);
    },
    prepare: function (gameobject) {
        this.display = enviroment.addDisplay(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, this.viewport.depth, this);
        this._super(gameobject);
    },
    getFrameBuffer: function () {
        var x = this.gameobject.transform.x,
            y = this.gameobject.transform.y;

        var old_ctx = enviroment.context;

        this.hiddencontext.save();
        this.hiddencontext.fillStyle = this.background;
        this.hiddencontext.fillRect(0, 0, this.pixel_width, this.pixel_height);
        this.hiddencontext.translate(-x + this.pixel_width/2, -y + this.pixel_height/2);

        enviroment.context = this.hiddencontext;
        
        var draw_list = enviroment.root.draw(this.layer_mask);
        draw_list.sort(function z_order(a, b) {
            if(a.transform.z < b.transform.z) {
                return 1;
            } else if(a.transform.z > b.transform.z) {
                return -1;
            } else {
                return 0;
            }
        });

        _.each(draw_list, function (draw_order) {
            enviroment.context.save();
            draw_order.transform.apply();
            draw_order.draw();
            enviroment.context.restore();
        });
        
        enviroment.context = old_ctx;
        
        this.hiddencontext.restore();

        return this.hiddencanvas;
    },
    onclick: function (pos) {
        var at = {
            x: pos.x*(this.pixel_width/this.hiddencanvas.width) - this.pixel_width/2 + this.gameobject.transform.x,
            y: pos.y*(this.pixel_height/this.hiddencanvas.height) - this.pixel_height/2 + this.gameobject.transform.y
        };
        enviroment.root.shot('click', at, true);
        return true;
    }
});

return orthografic_camera;
