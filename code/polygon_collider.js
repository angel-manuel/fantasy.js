//polygon_collider
var Component = enviroment.moduleManager.get('component');
var vector2 = enviroment.moduleManager.get('vector2');
var bounding_sphere = enviroment.moduleManager.get('bounding_sphere');

var polygon_collider = Component.extend({
    init: function (args) {
        var edges = args.edges;
        var edge_number = edges.length/2;
        this.edges = new Array(edge_number);
        this.radius = 0;
        for(var i=0; i<edge_number; ++i) {
            var edge = new vector2(edges[2*i], edges[2*i + 1]);
            this.radius = Math.max(this.radius, edge.length());
            this.edges[i] = edge;
        }
        this.normals = new Array(edge_number);
        for(i=0; i<edge_number; ++i) {
            var side = vector2.Sub(this.edges[(i+1) % edge_number], this.edges[i]);
            this.normals[i] = vector2.Normalize(side.getNormal());
        }
        this.edge_number = edge_number;

        this._super(args);
    },
    prepare: function (gameobject) {
        gameobject.addService('collider', this);
        this._super(gameobject);
    },
    load: function () {
        this.collision_system = this.gameobject.getService('collision_system_2d');
        this.collision_ref = this.collision_system.addCollider(this);
        this._super();
    },
    getEdge: function (edge) {
        return this.edges[edge];
    },
    getBoundingSphere: function () {
        return new bounding_sphere(vector2.FromObject(this.gameobject.transform), this.radius);
    },
    getNormals: function () {
        var rotation = this.gameobject.transform.rotation;
        return _.map(this.normals, function (normal) {
            var ret = vector2.Rotate(normal, rotation);
            ret.normalize();
            return ret;
        }, this);
    },
    project: function (axis) {
        var rotation = this.gameobject.transform.rotation;
        var rot_edges = _.map(this.edges, function (normal) {
            return vector2.Rotate(normal, rotation);
        });

        var scale_x = this.gameobject.transform.scale_x;
        var scale_y = this.gameobject.transform.scale_y;
        var proj = _.map(rot_edges, function (edge) {
            edge.x *= scale_x;
            edge.y *= scale_y;
            return vector2.ProjectionLength(edge, axis);
        });

        var position = new vector2(this.gameobject.transform.x, this.gameobject.transform.y);
        var desviation = vector2.ProjectionLength(position, axis);

        var corr_proj = _.map(proj, function (vertex_projection) {
            return vertex_projection + desviation;
        });

        return corr_proj;
    }
});

return polygon_collider;