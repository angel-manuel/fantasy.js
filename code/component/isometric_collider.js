//isometric_collider
var Path = {
    North: 1,
    NorthEast: 2,
    East: 3,
    SouthEast: 4,
    South: 5,
    SouthWest: 6,
    West: 7,
    NorthWest: 8,
    all: function () {
        return [
            1, 2, 3, 4, 5, 6, 7, 8
        ];
    },
    getDirection: function (orientation) {
        switch (orientation) {
            case this.North:
                return {x: 0, y: -1};
            case this.NorthEast:
                return {x: 1, y: -1};
            case this.East:
                return {x: 1, y: 0};
            case this.SouthEast:
                return {x: 1, y: 1};
            case this.South:
                return {x: 0, y: 1};
            case this.SouthWest:
                return {x: -1, y: 1};
            case this.West:
                return {x: -1, y: 0};
            case this.NorthWest:
                return {x: -1, y: -1};
            default:
                return {};
        }
    }
};


var isometric_collider = enviroment.Component.extend({
    init: function (args) {
        this.matrix = get('content/' + args.matrix);
        this.width = this.matrix.width;
        this.height = this.matrix.height;
        
        this.tile_width = args.tile_width || (args.tile_height * 2) || 64;
        this.tile_height = args.tile_height || (args.tile_width / 2);

        this._super(args);
    },
    prepare: function (gameobject) {
        gameobject.addService('isometric_collider', this);
        this._super(gameobject);
    },
    collisionAtMap: function (x, y) {
        if(!(x >= 0 || x < this.matrix.width || y >= 0 || y < this.matrix.height)) {
            return true;
        }

        var mval = this.matrix.get(x, y);

        if(mval === null) {
            return true;
        } else {
            return false;
        }
    },
    collisionAtLocal: function (x, y) {
        var mx, my;
        mx = Math.floor((x/this.tile_width) + (y/this.tile_height));
        my = Math.floor((y/this.tile_height) - (x/this.tile_width));
        return this.collisionAtMap(mx, my);
    },
    collisionAtWorld: function (x, y) {
        return this.collisionAtLocal(x - this.gameobject.transform.x, y - this.gameobject.transform.y);
    },
    transformToMap: function (x, y) {
        var lx = (x - this.gameobject.transform.x)/this.gameobject.transform.scale_x,
            ly = (y - this.gameobject.transform.y)/this.gameobject.transform.scale_y;
        return {
            x: Math.floor((lx/this.tile_width) + (ly/this.tile_height)),
            y: Math.floor((ly/this.tile_height) - (lx/this.tile_width))
        };
    },
    transformToLocal: function (mx, my) {
        return {
            x: (mx - my)*this.tile_width/2,
            y: (mx + my)*this.tile_height/2
        };
    },
    transformToWorld: function (mx, my) {
        return {
            x: ((mx - my)*this.tile_width/2)*this.gameobject.transform.scale_x + this.gameobject.transform.x,
            y: ((mx + my)*this.tile_height/2)*this.gameobject.transform.scale_y + this.gameobject.transform.y
        };
    },
    pathOverMap: function (sx, sy, tx, ty) {
        if(this.collisionAtMap(tx, ty)) {
            return false;
        }
        return this.a_star(sx, sy, tx, ty);
    },
    a_star: function (sx, sy, tx, ty) {
        var l = this.matrix.length;
        var map = new Array(l);
        var openlist = [];
        var path = [];
        var w = this.width,
            h = this.height;
        
        openlist.push(sx + sy*w);
        map[sx + sy*w] = {G: 0, H: Math.sqrt((tx-sx)*(tx-sx)+(ty-sy)*(ty-sy))};
        

        var best_open_list, pos, node, x, y, npos, nx, ny, cost, G;
        while(openlist.length > 0) {
            var open_list_val = _.map(openlist, function (open) {
                var o = map[open];
                if(!o) {
                    return Number.POSITIVE_INFINITY;
                }
                return o.G + o.H;
            });

            var min = Number.POSITIVE_INFINITY;
            best_open_list = -1;
            _.each(open_list_val, function(val, index) {
                if(val < min) {
                    min = val;
                    best_open_list = index;
                }
            });

            if(best_open_list === -1) {
                return false;
            }

            pos = openlist[best_open_list];
            delete openlist[best_open_list];

            
            node = map[pos];
            node.closed = true;

            x = pos % w;
            y = Math.floor(pos/w);

            G = node.G;

            if(tx === x && ty === y) {
                break;
            }

            var sq_2 = 1.4142135623730951;

            _.each([
            [Path.NorthWest, x - 1, y - 1, sq_2],
            [Path.North, x, y - 1, 1],
            [Path.NorthEast, x + 1, y - 1, sq_2],
            [Path.West, x - 1, y, 1],
            [Path.East, x + 1, y, 1],
            [Path.SouthWest, x - 1, y + 1, sq_2],
            [Path.South, x, y + 1, 1],
            [Path.SouthEast, x + 1, y + 1, sq_2]
            ], function (n) {
                var dir = n[0];
                var nx = n[1];
                var ny = n[2];
                var cost = n[3];
                var npos = nx+ny*w;
                if(npos >= 0 && !(nx < 0 || nx > w || ny < 0 || ny > h) && !this.collisionAtMap(nx, ny)) {
                    if(map[npos]) {
                        if(!map[npos].closed) {
                            if(map[npos].G > G + cost) {
                                map[npos].G = G + cost;
                                map[npos].parent = pos;
                                map[npos].dir = dir;
                            }
                        }
                    } else {
                        map[npos] = {
                            G: G + cost,
                            H: Math.sqrt((tx-nx)*(tx-nx)+(ty-ny)*(ty-ny)),
                            parent: pos,
                            dir: dir
                        };
                        openlist.push(npos);
                    }
                }
            }, this);
        }

        var target_pos = tx+ty*w;
        if(!map[target_pos].parent) {
            return [];
        } else {
            path.push(target_pos);
            var parent = map[target_pos].parent;
            while(parent) {
                path.push(parent);
                parent = map[parent].parent;
            }

            path.reverse();
            var ret = _.map(path, function (pos) {
                return {
                    x: pos % w,
                    y: Math.floor(pos / w),
                    dir: map[pos].dir
                };
            });

            return ret;
        }
    },
    getDirection: function (orientation) {
        return Path.getDirection(orientation);
    },
    getWorldDirection: function (orientation) {
        var mapdir = Path.getDirection(orientation);
        return {
            x: (mapdir.x - mapdir.y)*this.tile_width/2*this.gameobject.transform.scale_x,
            y: (mapdir.x + mapdir.y)*this.tile_height/2*this.gameobject.transform.scale_y
        };
    }
});

retrn(isometric_collider);
