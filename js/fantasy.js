(function (){
    "use strict";
    
    var global_object = window || this;

    var fantasy;
    global_object.fantasy = fantasy = {};

    var debug = true;

    var loaded = false;

    var canvasname, canvas, context;
    //canvas - Canvas HTML5 element
    //context - canvas.getContext('2d')

    var enviroment;
    var root;
    var displays;
    var content;

    var tick_interval = false;

    //getXMLHttpRequestObject()
    //Metodo multiplataforma para obtener un xhr

    function getXMLHttpRequestObject() {
        var ref = null;
        if (window.XMLHttpRequest) {
            ref = new XMLHttpRequest();
        } else if (window.ActiveXObject) { // Older IE.
            ref = new ActiveXObject("MSXML2.XMLHTTP.3.0");
        }
        return ref;
    };

    //moduleManager
    //Descarga dinamicamente mediante xhr el codigo necesitado para cada modulo
    //y sus dependencias. Automáticamente evalua ese código

    var moduleManager = (function () {

        var modules, subscriptions, catalog;
        //modules - Array asociativo con cada clase evaluada
        //catalog - Objeto parseado de catalog.json que contiene una lista de clases y sus dependencias
        //subscriptions - Array asociativo que contiene arrays de funciones para ser llamadas cuando termine la carga de un modulo

        modules = {};
        catalog = {};
        subscriptions = {};

        var xhr = getXMLHttpRequestObject();
        xhr.open('GET', 'catalog.json', false);
        xhr.send(null);
        catalog = JSON.parse(xhr.responseText);

        //code_evaluator(src, callback)
        //Descarga asincronamente código desde src, lo evalue y pasa el resultado a callback

        function code_evaluator(src, callback, modulename) {
            var xhr = getXMLHttpRequestObject();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    var resp = xhr.responseText;
                    console.log('Loading ' + src);
                    
                    var pre_constructor;
                    if(debug) {
                        pre_constructor = eval('function ' + modulename + '(enviroment) {' + resp + '};' + modulename);
                    } else {
                        pre_constructor = Function('enviroment', resp);
                    }

                    callback(pre_constructor(enviroment));
                }
            }.bind(this);
            xhr.open('GET', src, false);
            xhr.send(null);
        };

        //load_into_modules(modulename)
        //Carga el modulo de nombre modulename y llama a las funciones de subscriptions

        function load_into_modules(modulename) {
            var module = catalog[modulename];
            code_evaluator(module.src, function (result) {
                modules[modulename] = result;
                _.each(subscriptions[modulename], function (subscription) {
                    subscription(result);
                });
            }, modulename);
        };

        //postload(modulename, callback)
        //Subscribe callback para ser llama tras la carga de modulename
        //y si callback es el primer subscriptor inicia la carga del modulo

        function postload(modulename, callback) {
            if (!subscriptions.hasOwnProperty(modulename)) {
                subscriptions[modulename] = [callback];
                load_into_modules(modulename);
            } else {
                subscriptions[modulename].push(callback);
            }
        }

        return {
            //use(modulename, callback)
            //Llama a callback pasandole como argumento el modulo de nombre modulename
            //Si ese modulo no estuviese cargado se iniciaria su carga antes

            use: function (modulename, callback) {
                if (modules.hasOwnProperty(modulename)) {
                    //Si el modulo está cargado simplemente se lo pasamos a callback
                    var module = modules[modulename];
                    callback(module);
                    return;
                }

                if (!catalog.hasOwnProperty(modulename)) {
                    //Si el modulo no se encuentra en el catalogo
                    throw modulename + ' no se encuentra en el catalogo';
                }

                var module = catalog[modulename];
                if (module.depends) {
                    var deps = module.depends;
                    var trigger = _.after(deps.length, postload.bind(this, modulename, callback));
                    _.each(deps, function (dep) {
                        this.use(dep, trigger);
                    }, this);
                } else {
                    postload(modulename, callback);
                }
            },
            //get(modulename)
            //Devuelve el modulo especificado o undefined si no esta cargado

            get: function (modulename) {
                if (!modules.hasOwnProperty(modulename)) {
                    throw modulename + ' no se ha cargado';
                }
                return modules[modulename];
            },
            //set(modulename, module)
            //Guarda module como el modulo especificado directamente

            set: function (modulename, module) {
                modules[modulename] = module;
            }
        };
    })();

    //Transform(x, y, rotation)
    //Representa una transformación en el espacio y cada Node tiene una instancia de esta clase
    //TODO: Representar transformaciones no espaciales: opacidad, filtros de color y cualquier caso que soporte canvas

    var Transform = Class.extend({
        init: function (x, y, z, rotation, scale_x, scale_y, scale_z) {
            this.x = x || 0;
            this.y = y || 0;
            this.z = z || 0;
            this.rotation = rotation || 0;
            this.scale_x = scale_x || 1;
            this.scale_y = scale_y || 1;
            this.scale_z = scale_z || 1;
        },
        apply: function () {
            enviroment.context.translate(this.x, this.y);
            enviroment.context.rotate(this.rotation);
            enviroment.context.scale(this.scale_x, this.scale_y);
        },
        applyPerspective: function (camera) {
            enviroment.context.translate(camera.x, camera.y);
            var rel_depth = this.z - camera.z;

            enviroment.context.translate((this.x - camera.x)/rel_depth, (this.y - camera.y)/rel_depth);
            enviroment.context.rotate(this.rotation);
            enviroment.context.scale(this.scale_x/rel_depth, this.scale_y/rel_depth);
        },
        combine: function (transform) {
            this.x += transform.x * this.scale_x;
            this.y += transform.y * this.scale_y;
            this.z += transform.z * this.scale_z;

            this.scale_x = this.scale_x * transform.scale_x;
            this.scale_y = this.scale_y * transform.scale_y;
            this.scale_z = this.scale_z * transform.scale_z;

            this.rotation = this.rotation + transform.rotation;
        },
        transformPoint: function(point) {
            var tpoint = point.clone();
            tpoint.x -= this.x;
            tpoint.y -= this.y;
            tpoint.z -= this.z;

            var s = Math.sin(this.rotation), c = Math.cos(this.rotation);
            var x = tpoint.x, y = tpoint.y;
            tpoint.x = x*c - y*s;
            tpoint.y = x*s + y*c;

            tpoint.x *= this.scale_x;
            tpoint.y *= this.scale_y;
            tpoint.z *= this.scale_z;

            return tpoint;
        },
        untransformPoint: function(point) {
            var tpoint = point.clone();
            var s = Math.sin(-this.rotation), c = Math.cos(-this.rotation);
            var x = point.x, y = point.y;
            tpoint.x = x*c - y*s;
            tpoint.y = x*s + y*c;

            tpoint.x += this.x;
            tpoint.y += this.y;
            tpoint.z += this.z;

            tpoint.x /= this.scale_x;
            tpoint.y /= this.scale_y;
            tpoint.z /= this.scale_z;

            return tpoint;
        },
        toString: function () {
            return JSON.stringify(this);
        },
        fix: function () {
            this.rotation %= 2*Math.PI;
        }
    });
    Transform.Combine = function (A, B) {
        var s = Math.sin(A.rotation),
            c = Math.cos(A.rotation);

        c = 1;
        s = 0;

        var x = B.x*c - B.y*s,
            y = B.x*s + B.y*c;

        x *= A.scale_x;
        y *= B.scale_y;

        x += A.x;
        y += A.y;

        return new Transform(
            x,
            y,
            B.z*A.scale_z + A.z,
            B.rotation + A.rotation,
            B.scale_x * A.scale_x,
            B.scale_y * A.scale_y,
            B.scale_z * A.scale_z
        );
    };

    //Content(src, onload)
    //Clase base para todo dlc

    var Content = Class.extend({
        init: function (src, onload) {
            this.loaded = false;
            this.src = src;
            this.onload = onload;
        },
        load: function () {
            this.loaded = true;
            if(this.onload) {
                this.onload();
            }
        }
    });
    moduleManager.set('content', Content);

    //Abstractor(args)
    //Clase base para todos los abstractores

    var Abstractor = Class.extend({
        init: function (args) {
            this.args = args;
        }
    });
    moduleManager.set('abstractor', Abstractor);

    //Component(enviroment, args)
    //Clase base para todos los componentes

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
    moduleManager.set('component', Component);

    //Node(node_name, components, transform, subnodes)
    //Basicamente un contenedor de componentes y otros nodos con un transform

    var Node = Class.extend({
        init: function (node_name, enabled, components, layer, transform, subnodes) {
            this.enabled = enabled || (typeof enabled === 'undefined');
            this.node_name = node_name;
            this.local_transform = transform || new Transform();
            this.up_transform = new Transform();
            this.transform = this.local_transform;
            this.layer = layer || 0;
            this.components = [];
            this.services = {};
            this.listeners = {};
            this.subnodes = {};

            _.each(components, function (component) {
                this.addComponent(component);
            }, this);
            
            var subnode_names = Object.keys(subnodes);
            _.each(subnode_names, function (subnode_name) {
                this.appendChild(subnodes[subnode_name]);;
            }, this);
        },
        //attach(eventname, callback)
        //Cuando el evento eventname, callback sera llamado
        attach: function (eventname, callback) {
            if(this.listeners.hasOwnProperty(eventname)) {
                this.listeners.push(callback);
            } else {
                this.listeners[eventname] = [callback];
            }
        },
        //shot(eventname, args, propagate)
        //Hace saltar el evento eventname, llamando a los callbacks pasandoles args
        //y propagando el evento a los subnodos si propagate es verdadero
        shot: function (eventname, args, propagate) {
            if(this.listeners.hasOwnProperty(eventname)) {
                _.each(this.listeners[eventname], function (callback) {
                    callback(args);
                });
            }

            if(propagate) {
                _.each(this.subnodes, function (subnode) {
                        subnode.shot(eventname, args, propagate);
                    }
                );
            }
        },
        //get(path)
        //path - Array contienendo una ruta en el arbol
        //Devuelve el nodo en path o undefined
        get: function (path) {
            if (!path || path.length == 0) {
                return this;
            }

            var next = path.shift();
            if (!this.subnodes.hasOwnProperty(next)) {
                return undefined;
            } else {
                return this.subnodes[next].get(path);
            }
        },
        //addComponent(component)
        //component - instancia de Component
        //Añade un componente
        addComponent: function (component) {
            if(!this.enabled)
                return false;

            if(component instanceof Component) {
                component.prepare(this);
                for(var i=0, len=this.components.length; i<len; ++i) {
                    if(!this.components[i]) {
                        this.components[i] = component;
                        return i + 1;
                    }
                }
                return this.components.push(component);
            } else {
                throw 'component no es una instancia de Component';
                return undefined;
            }
        },
        //deleteComponent(ref)
        //Borra el componente número ref
        deleteComponent: function (ref) {
            if(this.components[ref - 1]) {
                this.components[ref - 1].destroy();
                return delete this.components[ref - 1];
            }
            return false;
        },
        //appendChild(subnode)
        //subnode - Instancia de Node
        //Añade un subnodo
        appendChild: function (subnode) {
            subnode.setUpTransform(this.transform);
            subnode.parent = this;
            this.subnodes[subnode.node_name] = subnode;
        },
        //deleteChild(node_name)
        //Borra el subnode de nombre nodenmae
        deleteChild: function (node_name) {
            if(this.subnodes[node_name]) {
                var subnode = this.subnodes[node_name];
                delete this.subnodes[node_name];
                subnode.destroy();
                return true;
            }
            return false;
        },
        //destroy()
        //Destruye este nodo y sus subnodos
        destroy: function () {
            if(!this.parent || !this.parent.deleteChild(this.node_name)) {
                _.each(this.components, function (component) {
                    if(component.load) {
                        component.destroy();
                    }
                });

                _.each(this.subnodes, function (subnode, subnode_name) {
                    this.deleteChild(subnode_name);
                });

                this.parent = undefined;
                this.subnodes = undefined;
                this.components = undefined;
                this.services = undefined;
            }
        },
        //addService(servicename, service)
        //Añade service ofreciendo servicename
        addService: function (servicename, service) {
            this.services[servicename] = service;
        },
        //getService(servicename)
        //Devuelve el servicio servicename
        getService: function (servicename) {
            if(this.services.hasOwnProperty(servicename)) {
                return this.services[servicename];
            }

            if(this.parent) {
                return this.parent.getService(servicename);
            } else {
                return undefined;
            }
        },
        setUpTransform: function(transform) {
            this.up_transform = transform;
            this.transform = Transform.Combine(this.up_transform, this.local_transform);

            _.each(this.subnodes, function (subnode) {
                subnode.setUpTransform(this.transform);
            }, this);
        },
        rebuildTransform: function () {
            this.transform = Transform.Combine(this.up_transform, this.local_transform);

            _.each(this.subnodes, function (subnode) {
                subnode.setUpTransform(this.transform);
            }, this);
        },
        translate: function (x, y, z) {
            this.local_transform.x += x;
            this.local_transform.y += y;
            this.local_transform.z += z || 0;

            this.rebuildTransform();
        },
        rotate: function (angle) {
            this.local_transform.rotation += angle;

            this.rebuildTransform();
        },
        moveTo: function (x, y, z) {
            var rx = x - this.transform.x,
                ry = y - this.transform.y,
                rz = z - this.transform.z || 0;
            
            this.translate(rx, ry, rz);
        },
        setRotation: function (angle) {
            var rangle = angle - this.transform.rotation;

            this.rotate(rangle);
        },
        load: function () {
            _.each(this.subnodes, function (subnode){
                    subnode.load();
                }
            );

            _.each(this.components, function (component) {
                component.load();
            });
        },
        unload: function () {
            _.each(this.subnodes, function (subnode) {
                    subnode.unload();
                }
            );

            _.each(this.components, function (component) {
                component.unload();
            });
        },
        draw: function (layer_mask) {
            if(!this.enabled)
                return [];

            var draw_list = [];

            if((layer_mask>>this.layer) % 2) {
                _.each(this.components, function (component) {
                    if (component.draw) {
                        draw_list.push({
                            gameobject: this.node_name,
                            transform: this.transform,
                            draw: component.draw.bind(component)
                        });
                        //component.draw();
                    }
                }, this);
            }

            _.each(this.subnodes, function (subnode) {
                draw_list = draw_list.concat(subnode.draw(layer_mask));
            }, this);

            return draw_list;
        },
        update: function (dt) {
            if(!this.enabled)
                return;

            _.each(this.subnodes, function (subnode) {
                subnode.update(dt);
            }, this);

            _.each(this.components, function (component) {
                if (component.update) {
                    if(!component.loaded)
                        component.load();

                    component.update(dt);
                }
            });
            
            this.transform.fix();
        }
    });
    Node.FromLevel = function (name, level, callback) {
        var root;

        function find_explicit_deps_in_tree(tree) {
            var deps = [];

            var node_names = Object.keys(tree);

            _.each(tree, function(node) {
                if(node.components) {
                    _.each(node.components, function (component) {
                        deps.push(component.type);
                    });
                }
                if(node.subnodes) {
                    deps = deps.concat(find_explicit_deps_in_tree(node.subnodes));
                }
            });

            return deps;
        }

        function find_explicit_deps() {
            var deps = [];
            if(level.content) {
                if(level.content.download) {
                    _.each(level.content.download, function (dlc) {
                        deps.push(dlc.type);
                    });
                }
                if(level.content.abstraction) {
                    _.each(level.content.abstraction, function (abstraction) {
                        deps.push(abstraction.type);
                    });
                }
            }

            if(level.components) {
                _.each(level.components, function (component) {
                    deps.push(component.type);
                });
            }
            
            var sub = level.tree || level.subnodes;
            if(sub) {
                deps = deps.concat(find_explicit_deps_in_tree(sub));
            }

            return _.uniq(deps);
        }

        //load_step_1(callback)
        //Se encarga de cargar las dependencias explicitas e implicitas

        function load_step_1(callback) {
            var deps = [];

            if(level.depends) {
                deps = deps.concat(level.depends);
            }
            deps = deps.concat(find_explicit_deps());

            if(deps.length > 0) {
                var trigger = _.after(deps.length, load_step_2.bind(this, callback));
                _.each(deps, function (dep) {
                    moduleManager.use(dep, trigger);
                });
            } else {
                load_step_2(callback);
            }
        }

        //load_dlc(dlc, callback)
        //Carga y devuelve un contenido descargarble y llama a callback

        function load_dlc(dlc, callback) {
            console.log('Loading ' + dlc.type + ' from ' + dlc.src);
            var constructor = moduleManager.get(dlc.type);
            return new constructor(dlc.src, callback);
        }

        //load_step_2(callback)
        //Carga el contenido descargable

        function load_step_2(callback) {
            if (level.content && level.content.download) {
                var dlc_names = Object.keys(level.content.download);
                var trigger = _.after(dlc_names.length, load_step_3.bind(this, callback));
                _.each(level.content.download, function (dlc, dlc_name) {
                    if(!enviroment.content.hasOwnProperty(dlc_name)) {
                        enviroment.content[dlc_name] = load_dlc(dlc, trigger);
                    } else {
                        trigger();
                    }
                });
            } else {
                load_step_3(callback);
            }
        }

        //load_abstraction(abstraction)
        //Carga y devuelve una abstración

        function load_abstraction(abstraction) {
            console.log('Abstracting into ' + abstraction.type);
            var constructor = moduleManager.get(abstraction.type);
            return new constructor(abstraction.args);
        }

        //load_step_3(callback)
        //Carga las diversas abstraciones del contenido descargable

        function load_step_3(callback) {
            if (level.content && level.content.abstraction) {
                _.each(level.content.abstraction, function (abstraction, abstraction_name) {
                    if(!enviroment.content.hasOwnProperty(abstraction_name)) {
                        enviroment.content[abstraction_name] = load_abstraction(abstraction);
                    }
                });
            }
            load_step_4(callback);
        }

        //load_component(component)
        //Carga un componente

        function load_component(component) {
            console.log('Loading component of type ' + component.type);
            var constructor = moduleManager.get(component.type);
            return new constructor(component.args);
        }

        //load_node(node_name, node)
        //Carga un node, sus componentes y subnodos

        function load_node(node_name, node) {
            var subnodes = {}
            var components = [];
            
            if (node.components) {
                _.each(node.components, function (component) {
                    components.push(load_component(component));
                });
            }
            var sub = node.tree || node.subnodes;
            if (sub) {
                _.each(sub, function (subnode, subnode_name) {
                    subnodes[subnode_name] = load_node(subnode_name, subnode);
                });
            }
            var realnode = new Node(node_name, node.enabled, components, node.layer, new Transform(node.x, node.y, node.z, node.rotation, node.scale_x || node.scale, node.scale_y || node.scale, node.scale_z || node.scale), subnodes);
            return realnode;
        }

        //load_step_4(callback)
        //Carga el arbol de la escena y llama a callback

        function load_step_4(callback) {
            root = load_node(name, level);
            callback(root);
        }

        load_step_1(callback);
        return root;
    };
    moduleManager.set('node', Node);

    //resize_canvas()
    //Ajusta el tamaño del canvas al de la pantalla

    function resize_canvas() {
        document.body.style.scroll = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.margin= '0px';
        document.body.style.padding = '0px';
        canvas.style.margin = '0px';
        canvas.style.padding = '0px';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if(loaded) {
            _.each(displays, function (display) {
                display.update_size();
            });
        }
    }

    var Display = Class.extend({
        init: function (x, y, width, height, depth, handler) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.depth = depth;
            this.handler = handler;
            this.update_size();
        },
        update_size: function () {
            if(typeof this.x === 'string') {
                this.pixel_x = this.x.substring(0, this.x.length - 1) * canvas.width / 100;
            } else {
                this.pixel_x = this.x;
            }
            if(typeof this.y === 'string') {
                this.pixel_y = this.y.substring(0, this.y.length - 1) * canvas.height / 100;
            } else {
                this.pixel_y = this.y;
            }
            if(typeof this.width === 'string') {
                this.pixel_width = this.width.substring(0, this.width.length - 1) * canvas.width / 100;
            } else {
                this.pixel_width = this.width;
            }
            if(typeof this.height === 'string') {
                this.pixel_height = this.height.substring(0, this.height.length - 1) * canvas.height / 100;
            } else {
                this.pixel_height = this.height;
            }
            this.handler.resize(this.pixel_width, this.pixel_height);
        },
        draw: function () {
            var frame_buffer = this.handler.getFrameBuffer();
            context.drawImage(frame_buffer, this.pixel_x, this.pixel_y, this.pixel_width, this.pixel_height);
        },
        onclick: function (event) {
            var at = {
                x: event.clientX - this.pixel_x,
                y: event.clientY - this.pixel_y
            };
            return this.handler.onclick(at);
        }
    });

    function add_display(x, y, width, height, depth, handler) {
        var disp = displays.push(new Display(x, y, width, height, depth, handler));
        displays.sort(function depth_order(a, b) {
            if(a.depth < b.depth) {
                return 1;
            } else if(a.depth > b.depth) {
                return -1;
            } else {
                return 0;
            }
        });
        return disp;
    }

    //onclick(event)
    //Captura el evento de click y lo delega

    function onclick(event) {
        var x = event.clientX,
            y = event.clientY;

        for(var i=displays.length - 1; i--;) {
            var display = displays[i];
            if(display.pixel_x < x && x < (display.pixel_x + display.pixel_width) && display.pixel_y < y && y < (display.pixel_y + display.pixel_height)) {
                if(display.onclick(event))
                    break;
            }
        }
    }

    //tick(dt)
    //Loop principal del juego, actualiza y dibuja el arbol

    function tick(dt) {
        enviroment.root.update(dt);
        context.save();

        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvas.width, canvas.height);

        _.each(displays, function (display) {
            display.draw();
        });

        context.restore();
    }

    fantasy.init = function (cnvname) {
        console.log('Initializing...');
        if (cnvname) {
            canvasname = cnvname;
            canvas = document.getElementById(canvasname);
        } else {
            canvas = document.createElement('canvas');
            canvas.id = 'canvas';
            canvasname = 'canvas';
            document.appendchild(canvas);
        }
        var fullscreen = false;
        if (fullscreen) {
            //TODO: Creo que esperaremos hasta que la API fullscreen este estandarizada
        } else {
            resize_canvas();
            window.addEventListener('resize', resize_canvas);
        }

        context = canvas.getContext('2d');
        content = {};

        enviroment = {
            canvasname: cnvname,
            canvas: canvas,
            context: context,
            content: content,
            get_xhr: getXMLHttpRequestObject,
            moduleManager: moduleManager,
            addDisplay: add_display
        };
    };
    fantasy.load = function (levelfile, callback) {
        loaded = false;
        console.log('Loading level from ' + levelfile);
        var xhr = getXMLHttpRequestObject();
        xhr.open('GET', levelfile, false);
        xhr.send(null);
        var level = JSON.parse(xhr.responseText);

        displays = [];
        enviroment.content = content;
        enviroment.level = level;
        Node.FromLevel('root', level, callback);
    };
    fantasy.start = function (root) {
        fantasy.stop();

        enviroment.root = root;
        enviroment.root.load();

        window.addEventListener('click', onclick.bind(this));

        tick_interval = setInterval(tick.bind(this, 1 / 45), 1000 / 45);
        loaded = true;
    };
    fantasy.stop = function () {
        loaded = false;
        if(tick_interval) {
            clearInterval(tick_interval);
            tick_interval = false;
        }
        if(enviroment.root) {
            enviroment.root.unload();
            enviroment.root = root = false;
        }
    };
    fantasy.root = function () {
        return enviroment.root;
    };
})();