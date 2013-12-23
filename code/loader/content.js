var Content = Class.extend({
    init: function (args, callback) {
        this.loaded = false;
        this.args = args;
        this.callback = callback;
    },
    load: function () {
        this.loaded = true;
        if(this.callback) {
            this.callback();
        }
    }
});

var Abstractor = Content.extend({
    init: function(args, callback) {
        this._super(args, callback);
        this.load();
    }
});

enviroment.Content = Content;
enviroment.Abstractor = Abstractor;

return function content_loader(args, callback) {
    if(args && args.obj && args.name) {
        args.obj.name = args.obj.name || args.name;
        enviroment.moduleManager.use(args.obj.type, function(Content) {
            var tmp = new Content(args.obj.args, callback);
            enviroment.content[args.name] = tmp;
            callback(tmp);
        });
    } else {
        callback(undefined);
    }
};
