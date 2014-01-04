var Matrix = Class.extend({
    init: function (args) {
        this.data = args.data;
        this.width = args.width || args.data.length;
        if(args.height) {
            this.height = args.height;
        } else {
            var h = args.data.length / this.width;
            if(h % 1) {
                this.width = args.data.length;
                this.height = 1;
            } else {
                this.height = Math.floor(h);
            }
        }
        this.length = args.data.length;
    },
    get: function (x, y) {
        return this.data[(x + y*this.width)%(this.length)];
    }
});

return function matrix_loader(args, onload) {
    if(args && args.src) {
        enviroment.async_download(args.src, function (err, res) {
            var obj = JSON.parse(res);

            var m = new Matrix(obj);
            enviroment.content[args.name] = m;
            onload(m);
        });
    } else if (args && args.data) {
        var m = new Matrix(args);
        enviroment.content[args.name] = m;
        onload(m);
    } else {
        throw 'matrix_loader: Not enough args';
    }
};
