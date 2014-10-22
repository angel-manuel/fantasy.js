//camera
var camera = enviroment.Component.extend({
    init: function (args) {
        this.layer_mask = args.layer_mask || 65535;
        this.background = args.background || '#000000';
        this.rotation = args.rotation || true;

        var viewport = args.viewport || {};

        this.viewport = {
            x: viewport.x || 0,
            y: viewport.y || 0,
            width: viewport.width || '100%',
            height: viewport.height || '100%',
            depth: viewport.depth || 0
        };

        this.target_canvas = document.createElement('canvas');
        this.target_context = this.target_canvas.getContext('2d');
        
        this.mode = args.mode || "orthographic";

        this.redraw = true;

        this._super(args);
    },
    resize: function (width, height) {
        this.target_canvas.setAttribute('width', width);
        this.target_canvas.setAttribute('height', height);
        
        this.pixel_width = width;
        this.pixel_height = height;

        this.redraw = true;
    },
    prepare: function (gameobject) {
        this.display = enviroment.addDisplay(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, this.viewport.depth, this);
        this.redraw = true;

        gameobject.attach('move', function(){
            this.redraw = true;
        });

        this._super(gameobject);
    },
    getFrameBuffer: function () {
        var camera = this.gameobject.transform,
            old_ctx = enviroment.context,
            tctx = this.target_context,
            mode = this.mode,
            ph = this.pixel_height,
            pw = this.pixel_width;
        
        var draw_list = enviroment.root.draw(this.layer_mask);

        var redraw = this.redraw || _.some(_.map(draw_list, function(draw_order) {return draw_order.needsDrawing(); }));

        if(redraw) {
            tctx.save();
            tctx.fillStyle = this.background;
            tctx.fillRect(0, 0, this.pixel_width, this.pixel_height);

            enviroment.context = tctx;

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
                tctx.save();

                var t = draw_order.transform;
                switch(mode) {
                    case "orthographic":
                        tctx.translate(pw/2, ph/2);
                        if(this.rotation) {
                            tctx.rotate(-camera.rotation);
                        }
                        tctx.scale(camera.scale_x, camera.scale_y);

                        tctx.translate(t.x - camera.x, t.y - camera.y);

                        tctx.rotate(t.rotation);
                        tctx.scale(t.scale_x, t.scale_y);
                        break;
                    case "perspective":
                        var rel_depth = t.z - camera.z;

                        tctx.translate(pw/2, ph/2);
                        if(this.rotation) {
                            tctx.rotate(-camera.rotation);
                        }
                        tctx.scale(camera.scale_x, camera.scale_y);

                        tctx.scale(1/rel_depth, 1/rel_depth);
                        tctx.translate(t.x - camera.x, t.y - camera.y);

                        tctx.rotate(t.rotation);
                        tctx.scale(t.scale_x, t.scale_y);
                        break;
                    case "isometric":
                        var icx = camera.x - camera.y,
                            icy = (camera.x + camera.y)/2 + camera.z,
                            ix = t.x - t.y,
                            iy = (t.x + t.y)/2 + t.z;

                        tctx.translate(pw/2, ph/2);
                        if(this.rotation) {
                            tctx.rotate(-camera.rotation);
                        }
                        tctx.scale(camera.scale_x, camera.scale_y);

                        tctx.translate(ix - icx, iy - icy);

                        tctx.rotate(t.rotation);
                        tctx.scale(t.scale_x, t.scale_y);
                        break;
                }

                draw_order.draw();
                tctx.restore();
            });

            enviroment.context = old_ctx;

            tctx.restore();

            this.redraw = false;

            return this.target_canvas;
        }

        return null;
    },
    onclick: function (pos) {
        var camera = this.gameobject.transform,
            at = {x: pos.x, y: pos.y},
            ph = this.pixel_height,
            pw = this.pixel_width;
        switch(this.mode) {
            case "orthographic":
                at.x /= camera.scale_x;
                at.y /= camera.scale_y;
                if(this.rotation) {
                    var rot_x = at.x*Math.cos(camera.rotation) + at.y*Math.sin(camera.rotation),
                        rot_y = -at.x*Math.sin(camera.rotation) + at.y*Math.cos(camera.rotation);
                    at.x = rot_x;
                    at.y = rot_y;
                }
                at.x += camera.x;
                at.y += camera.y;
                at.x -= this.pixel_width/2;
                at.y -= this.pixel_height/2;
                break;
            case "perspective":
                at.x /= camera.scale_x;
                at.y /= camera.scale_y;
                if(this.rotation) {
                    var rot_x = at.x*Math.cos(camera.rotation) + at.y*Math.sin(camera.rotation),
                        rot_y = -at.x*Math.sin(camera.rotation) + at.y*Math.cos(camera.rotation);
                    at.x = rot_x;
                    at.y = rot_y;
                }
                at.x += camera.x;
                at.y += camera.y;
                at.x -= this.pixel_width/2;
                at.y -= this.pixel_height/2;
                break;
            case "isometric":
                at.x -= pw/2;
                at.y -= ph/2;
                if(this.rotation) {
                    var rot_x = at.x*Math.cos(camera.rotation) + at.y*Math.sin(camera.rotation),
                        rot_y = -at.x*Math.sin(camera.rotation) + at.y*Math.cos(camera.rotation);
                    at.x = rot_x;
                    at.y = rot_y;
                }
                at.x /= camera.scale_x;
                at.y /= camera.scale_y;
                var ix = at.x/2 + at.y + camera.z,
                    iy = -at.x/2 + at.y + camera.z;
                at.x = ix;
                at.y = iy;
                at.x += camera.x;
                at.y += camera.y;
                break;
        }
        
        enviroment.root.shot('click', at, true);
        return true;
    }
});

retrn(camera);
