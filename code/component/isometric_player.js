//isometric_player
var PlayerState = {
    Idle: 1,
    Walking: 2
};

var isometric_player = enviroment.Component.extend({
    init: function (args) {
        this.walking_speed = args.walking_speed || 1;

        this.state = PlayerState.Idle;
        
        this.walking_path = [];
        this.walking_time = 0;
        this.walking_initial_time = 0;
        this.walking_orientation = 1;

        this.idle_time = 0;

        this.animations_collection = enviroment.content[args.animations_collection];

        this._super(args);
    },
    prepare: function (gameobject) {
        gameobject.attach('click', this.onclick.bind(this));
        this._super(gameobject);
    },
    load: function () {
        this.collider = this.gameobject.getService('isometric_collider');
    },
    onclick: function (at) {
        var start = this.collider.transformToMap(this.gameobject.transform.x, this.gameobject.transform.y);
        var x = at.x;
        var y = at.y;
        var target = this.collider.transformToMap(x, y);
        
        var path = this.collider.pathOverMap(start.x, start.y, target.x, target.y);
        if(path && path.length > 0) {
            this.walking_initial_time = this.walking_time;
            this.walking_time = 0;
            this.walking_path = path;
            this.state = PlayerState.Walking;
        }
    },
    update: function (dt) {
        switch (this.state) {
            case PlayerState.Walking:
                var step = Math.floor(this.walking_time * this.walking_speed) + 1;
                if(step >= this.walking_path.length) {
                    var last_token = this.walking_path.pop();
                    var last_pos = this.collider.transformToWorld(last_token.x, last_token.y);

                    //this.gameobject.moveTo(last_pos.x, last_pos.y);

                    this.state = PlayerState.Idle;
                    break;
                } else {
                    var path_token = this.walking_path[step];

                    var orientation = path_token.dir;
                    this.walking_orientation = orientation;

                    var dir = this.collider.getWorldDirection(orientation);

                    this.gameobject.translate(dir.x*dt*this.walking_speed, dir.y*dt*this.walking_speed);
                }
                this.walking_time += dt;
                break;
            case PlayerState.Idle:
                this.idle_time += dt;
                break;
        }
        this._super(dt);
    },
    draw: function () {
        enviroment.context.save();
        enviroment.context.translate(this.collider.tile_width/4, this.collider.tile_height/4);
        enviroment.context.translate(-this.animations_collection.tile_width/2, -this.animations_collection.tile_height/2);
        
        var anim_draw;
        switch (this.state) {
            case PlayerState.Walking:
                var animation_time = (this.walking_time + this.walking_initial_time) % this.walking_speed;
                anim_draw = this.animations_collection.get(this.walking_orientation);
                anim_draw(animation_time);
                break;
            case PlayerState.Idle:
                anim_draw = this.animations_collection.get('idle');
                anim_draw(this.idle_time);
                break;
        }
        this._super();
        enviroment.context.restore();
    }
});

return isometric_player;
