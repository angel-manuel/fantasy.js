//vector2
var vector2 = Class.extend({
    init: function (x, y) {
        this.x = x || 0;
        this.y = y || 0;
    },
    squaredLength: function () {
        return this.x*this.x + this.y*this.y;
    },
    length: function () {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    },
    add: function (B) {
        this.x += B.x;
        this.y += B.y;
    },
    sub: function (B) {
        this.x -= B.x;
        this.y -= B.y;
    },
    mul: function(b) {
        this.x *= b;
        this.y *= b;
    },
    div: function (b) {
        this.x /= b;
        this.y /= b;
    },
    getNormal: function () {
        return new vector2(this.y, this.x);
    },
    getInverse: function () {
        return new vector2(-this.x, -this.y);
    },
    getAbsolute: function () {
        return new vector2(Math.abs(this.x), Math.abs(this.y));
    },
    projectTo: function (B) {
        var proj = vector2.Mul(B, vector2.Dot(this, B)/B.squaredLength());
        this.x = proj.x;
        this.y = proj.y;
    },
    normalize: function () {
        var l = this.length();
        this.x /= l;
        this.y /= l;
    },
    rotate: function (angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        this.x = this.x*c - this.y*s;
        this.y = this.x*s + this.y*c;
    },
    toString: function () {
        return '[' + this.x + ', ' + this.y + ']';
    }
});
vector2.Add = function (A, B) {
    return new vector2(A.x + B.x, A.y + B.y);
};
vector2.Sub = function (A, B) {
    return new vector2(A.x - B.x, A.y - B.y);
};
vector2.Mul = function (A, b) {
    return new vector2(A.x*b, A.y*b);
};
vector2.Div = function (A, b) {
    return new vector2(A.x/b, A.y/b);
};
vector2.Dot = function (A, B) {
    return A.x*B.x+A.y*B.y;
};
vector2.Cross = function (A, B) {
    return A.x*B.y-A.y*B.x;
};
vector2.Project = function (A, B) {
    return vector2.Mul(B, vector2.Dot(A, B)/B.squaredLength());
};
vector2.ProjectionLength = function (A, B) {
    return vector2.Dot(A, B)/B.length();
};
vector2.Rotate = function (A, angle) {
    var c = Math.cos(angle), s = Math.sin(angle);
    return new vector2(A.x*c - A.y*s, A.x*s + A.y*c);
};
vector2.Normalize = function (A) {
    return vector2.Div(A, A.length());
};
vector2.Absolutize = function (A) {
    return new vector2(Math.abs(A.x), Math.abs(A.y));
};
vector2.FromObject = function (obj) {
    return new vector2(obj.x, obj.y);
};
vector2.FromTuple = function (tuple) {
    return new vector2(tuple[0], tuple[1]);
};

retrn(vector2);
