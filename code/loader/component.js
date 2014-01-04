var Component = Class.extend({
    //init(args)
    //Obtiene los argumentos del objeto args
    init: function (args) {
        this.loaded = false;
        this.args = args;
    },
    load: function () {
        this.loaded = true;
    },
    unload: function () {
        this.loaded = false;
    },
    draw: function () {},
    update: function (dt) {},
    //prepare()
    //Anuncia los servicios que el objeto ofrece
    prepare: function (gameobject) {
        this.gameobject = gameobject;
    },
    //destroy()
    //Libera los recursos
    destroy: function () {
        delete this.args;
        if(this.gameobject) {
            this.gameobject = undefined;
        }
    }
});

function async_download(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('readystatechange', function() {
        switch(xhr.readyState) {
            case 4:
                if(xhr.status == 200) {
                    callback(null, xhr.responseText);
                } else {
                    callback(xhr.status, xhr.responseText);
                }
                break;
        }
    });
    xhr.open('GET', url, true);
    xhr.send(null);
}

enviroment.Component = Component;
enviroment.components = {};

return function(args, callback) {
    if(args && args.src) {
        async_download(args.src, function(err, response) {
            if(err) {
                callback(undefined);
            }

            var pre_constructor = new Function('enviroment', response);
            var Constructor = pre_constructor(enviroment);

            enviroment.components[args.name] = Constructor;

            function callback_constructor(args, callback){
                callback(new Constructor(args));
            }

            callback(callback_constructor);
        });
    } else {
        callback(undefined);
    }
};
