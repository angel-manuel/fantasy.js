//aabb

var aabb = Class.extend({
    init: function(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
        this.x2 = this.x + this.width;
        this.y2 = this.y + this.height;
    }
});

return aabb;
