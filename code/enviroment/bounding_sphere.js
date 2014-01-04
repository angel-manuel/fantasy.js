//bounding_sphere
var vector2 = enviroment.vector2;

var bounding_sphere = Class.extend({
    init: function (center, radius) {
        this.center = center;
        this.radius = radius;
    },
    intersects: function(B) {
        var distance = vector2.Sub(B.center, this.center);
        return (distance.length() < (this.radius + B.radius));
    }
});

bounding_sphere.Intersects = function (A, B) {
    var distance = vector2.Sub(B.center, A.center);
    return (distance.length() < (A.radius + B.radius));
};

return bounding_sphere;
