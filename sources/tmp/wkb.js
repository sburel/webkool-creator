function addSlash(elm) {
    return (elm[elm.length - 1] != '/') ? (elm + '/') : (elm);
}

function isInArray(a, e) {
    if (a.indexOf(e) == -1)
        return (false);
    return (true);
}

var usage = function () {
    console.log('Usage:\twk <command>\n');
    console.log('where <command> is one of:');
    console.log('\tcreate, build, add, remove, list, available, start, stop, help');
    console.log('');
    console.log('wk action [options]\tquick help on <cmd>');
};

/************************\
** -- MODULE REQUIRE -- **
\************************/
var fs = require('fs');
var childProcess = require('child_process');

var Builder = (function () {
    function Builder(action, options) {
        this.action = action;
        this.options = options;

        this.config = {
            projectName: 'no-name',
            webkoolLibraryPath: './',
            version: '1.0',
            modules: []
        };

        this.folders = ['sources', 'www', 'www-server'];

        this.projectFile = '.project.json';
        this.moduleFile = 'module.json';
        this.webkoolFile = '.webkool.wk';

        if (this[this.action] !== undefined) {
            try  {
                this[this.action]();
            } catch (e) {
                console.log('[ERROR]:\t' + e);
            }
        } else
            console.log('[ERROR]:\tUnknow action ' + this.action + '.');
    }
    Builder.prototype.help = function () {
        usage();
    };

    /*****************\
    ** -- ACTIONS -- **
    \*****************/
    Builder.prototype.available = function () {
        console.log('[AVAILABLE]');
        this.loadConfigFile();
        var folders = fs.readdirSync(this.config.webkoolLibraryPath + "/modules/");
        for (var i = 0; i < folders.length; i++)
            console.log('\t- ' + folders[i]);
    };

    Builder.prototype.start = function () {
        console.log('[START]');
        this.loadConfigFile();
        var _this = this;

        this.getProcess(function (pid) {
            if (pid == '') {
                console.log('[INFO]:\tStarting node server (' + './www-server/' + _this.config.projectName + '.min.js' + ').');
                var child = childProcess.spawn('node', ['./www-server/' + _this.config.projectName + '.min.js'], { detached: true });
                child.stdout.on('data', function (data) {
                    console.log(data.toString());
                    //process.exit(1);
                });
                child.stderr.on('data', function (data) {
                    console.log(data.toString());
                    //process.exit(1);
                });
            } else
                console.log('[INFO]:\tServer already running.');
        });
    };

    Builder.prototype.stop = function () {
        console.log('[STOP]');
        this.loadConfigFile();
        this.getProcess(function (pid) {
            if (pid == '')
                console.log('[INFO]:\tServer isn\'t start.');
else {
                try  {
                    process.kill(pid, 'SIGINT');
                    console.log('[INFO]:\tServer stopped.');
                } catch (e) {
                    console.log('[ERROR]:\tProcess already killed.');
                }
            }
        });
    };

    Builder.prototype.list = function () {
        console.log('[LIST]');
        this.loadConfigFile();
        if (this.config.modules.length == 0)
            console.log('[INFO]:\t- No modules yet.');
        for (var i = 0; i < this.config.modules.length; i++)
            console.log('\t- ' + this.config.modules[i]);
    };

    Builder.prototype.create = function () {
        console.log('[CREATE]');
        if (this.options.str[0] !== undefined)
            this.config.projectName = this.options.str[0];
        if (this.options['-l'] !== undefined)
            this.config.webkoolLibraryPath = this.options['-l'];
        console.log('[INFO]:\t\t[1]-Generating folders.');
        this.generateFolders();
        console.log('[INFO]:\t\t[2]-Saving project in ' + this.projectFile + '.');
        this.writeProjectFile();
        console.log('[INFO]:\t\t[3]-Generating index.wk.');
        this.createIndexWkFile();
        console.log('[INFO]:\t\t[4]-Generate entry point: .webkool.wk.');
        this.createWebKoolWkFile();
    };

    Builder.prototype.remove = function () {
        console.log('[REMOVE]');
        if (this.options.str.length == 0)
            console.log('[ERROR]:\tYou must specify a module name.');
else {
            this.loadConfigFile();
            for (var i = 0; i < this.options.str.length; i++) {
                if (isInArray(this.config.modules, this.options.str[i]) == true) {
                    this.config.modules.splice(this.config.modules.indexOf(this.options.str[i]), 1);
                    console.log('[INFO]:\t-Removing ' + this.options.str[i] + '.');
                } else
                    console.log('[ERROR]:\t-' + this.options.str[i] + ' isn\'t added.');
            }
            this.writeProjectFile();
            this.createWebKoolWkFile();
        }
    };

    Builder.prototype.add = function () {
        console.log('[ADD]');
        if (this.options.str.length == 0)
            console.log('[ERROR]:\tYou must specify a module name.');
else {
            this.loadConfigFile();
            var modules = [];
            for (var i = 0; i < this.config.modules.length; i++) {
                if (isInArray(modules, this.config.modules[i]) == false)
                    modules.push(this.options.str[i]);
            }
            for (var i = 0; i < this.options.str.length; i++) {
                if (isInArray(modules, this.options.str[i]) == false)
                    modules.push(this.options.str[i]);
            }
            this.config.modules = modules;
            this.writeProjectFile();
            this.createWebKoolWkFile();
        }
    };

    Builder.prototype.build = function () {
        console.log('[BUILD]');
        var _this = this;
        this.loadConfigFile();
        this.compileFile('-server', function () {
            _this.compileFile('-client', function () {
                _this.cssMinification(function () {
                    _this.jsMinification('./www-server/', function () {
                        _this.jsMinification('./www/', function () {
                            console.log("[INFO]:\tBuild finished.");
                        });
                    });
                });
            });
        });
    };

    /*****************\
    ** -- GETTERS -- **
    \*****************/
    Builder.prototype.getProcess = function (callback) {
        var cmd = 'ps -xco,pid,command,args | grep "' + this.config.projectName + '.min.js" | grep -v grep | cut -d " " -f1';
        childProcess.exec(cmd, function (err, stdout) {
            var pid = stdout;
            callback(pid);
        });
    };

    Builder.prototype.getModule = function () {
        var modulesJSON = [];
        for (var i = 0; i < this.config.modules.length; i++) {
            var file = this.config.webkoolLibraryPath + '/modules/' + this.config.modules[i] + '/module.json';
            try  {
                var data = fs.readFileSync(file);
                modulesJSON.push(JSON.parse(data));
            } catch (e) {
                console.log('[ERROR]:\tUnknow module: ' + file + '.');
            }
        }
        return (modulesJSON);
    };

    /**************************\
    ** -- WRITING FUNCTIONS -- **
    \**************************/
    Builder.prototype.createIndexWkFile = function () {
        var data = '<?xml version="1.0" encoding="UTF-8"?>\n';
        data += '<application xmlns="http://www.webkool.net/1.0/">\n';
        data += '<include href=".webkool.wk" />\n';
        data += '<property id="name">test</property>\n';
        data += '<property id="port">4242</property>\n';
        data += '<client>\n';
        data += '</client>\n';
        data += '<server>\n';
        data += '<handler url="/" type="text/html">\n';
        data += '<template system="square"><![CDATA[\n';
        data += '<h1>Hello World!</h1>\n';
        data += ']]></template>\n';
        data += '</handler>';
        data += '</server>\n';
        data += '</application>\n';

        fs.writeFileSync('index.wk', data, 'utf-8');
    };

    Builder.prototype.createWebKoolWkFile = function () {
        var file = this.config.path + "/.webkool.wk";
        var modules = this.getModule();

        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<application xmlns="http://www.webkool.net/1.0/">\n';
        xml += '<client>\n';
        xml += "<include href='webkool.js' />\n";
        xml += "<include href='square_lib.js' />\n";
        xml += "<include href='hogan-2.0.0.js' />\n";

        for (var i = 0; i < modules.length; i++) {
            for (var j = 0; j < modules[i].clientInclude.length; j++)
                xml += '<include href="modules/' + modules[i].name + "/" + modules[i].clientInclude[j] + '"/>\n';
        }

        xml += '<script>\n';
        xml += 'var application = new Application();\n';

        for (var i = 0; i < modules.length; i++) {
            if (modules[i].clientInit != "")
                xml += modules[i].clientInit + '\n';
        }

        xml += '</script>\n';
        xml += '</client>\n';
        xml += '<server>\n';
        xml += "<include href='webkool.js' />\n";

        for (var i = 0; i < modules.length; i++) {
            for (var j = 0; j < modules[i].serverInclude.length; j++)
                xml += '	<include href="' + this.config.webkoolLibraryPath + '/modules/' + modules[i].name + "/" + modules[i].serverInclude[j] + '"/>\n';
        }

        xml += '<script>\n';
        xml += '	var application = new Server();\n';

        for (var i = 0; i < modules.length; i++) {
            if (modules[i].serverInit != "")
                xml += modules[i].serverInit + '\n';
        }
        xml += '</script>\n';
        xml += '</server>\n';
        xml += '</application>\n';

        fs.writeFile(this.webkoolFile, xml, function (err) {
            if (err)
                console.log("[ERROR]:\tCan't write in file " + this.webkoolFile);
        });
    };

    Builder.prototype.writeProjectFile = function () {
        var _this = this;
        fs.writeFile(this.projectFile, JSON.stringify(this.config, null, 4), function (e) {
            if (e) {
                console.log('[ERROR]:\tCan\'t write in ' + _this.projectFile + '.');
            }
        });
    };

    Builder.prototype.loadConfigFile = function () {
        try  {
            this.config = JSON.parse(fs.readFileSync(this.projectFile, 'utf-8'));
        } catch (e) {
            console.log('[ERROR]:\tCan\'t read in ' + this.projectFile);
        }
    };

    Builder.prototype.generateFolders = function () {
        var onError = function (e) {
            if (e && e.code != 'EEXIST') {
                console.log('[ERROR]:\t' + e);
            }
        };
        for (var i = 0; i < this.folders.length; i++) {
            fs.mkdir(this.folders[i], onError);

            console.log('[INFO]:\t\t\t-' + this.folders[i] + ' created.');
        }
    };

    Builder.prototype.compileFile = function (mode, callback) {
        var msg = '';
        var folder = (mode == '-server') ? './www-server/' : './www/';
        if (mode == '-server')
            console.log('[INFO]:\t- generating www-server files:');
else if (mode == '-client')
            console.log('[INFO]:\t- generating www files:');
else {
            console.log('[ERROR]:\tbad mode: please use -server or -client');
            return;
        }
        var child = childProcess.spawn(this.config.webkoolLibraryPath + '/wkc', [
            mode,
            '-i',
            './',
            '-i',
            this.config.webkoolLibraryPath,
            '-o',
            folder + this.config.projectName,
            'index.wk'
        ]);
        child.stdout.value = '';
        child.stdout.on('data', function (data) {
            this.value += data.toString();
        });
        child.stdout.on('end', function (data) {
            console.log(this.value);
            callback();
        });
    };

    Builder.prototype.cssMinification = function (callback) {
        console.log('[INFO]:\t- Css minification');
        var child = childProcess.spawn('less', [
            '-yui-compress',
            './www/' + this.config.projectName + '.css',
            './www/' + this.config.projectName + '.min.css'
        ]);
        child.stdout.value = '';
        child.stdout.on('data', function (data) {
            this.value += data.toString();
        });
        child.stdout.on('end', function (data) {
            console.log(this.value);
            callback();
        });
    };

    Builder.prototype.jsMinification = function (dest, callback) {
        console.log('[INFO]:\t- Js ' + dest + ' minification:');
        var child = childProcess.spawn('uglifyjs', [
            dest + this.config.projectName + '.js',
            '--source-map',
            dest + this.config.projectName + '.min.map',
            '-o',
            dest + this.config.projectName + '.min.js',
            '-m'
        ]);
        child.stdout.value = '';
        child.stdout.on('data', function (data) {
            this.value += data.toString();
        });
        child.stdout.on('end', function (data) {
            console.log(this.value);
            callback();
        });
    };
    return Builder;
})();

/* -- CMD LINE PARSE -- */
function parseCMD(argc, argv) {
    var cmd = [
        { name: 'create', argument: ['-p', '-l'] },
        { name: 'add', argument: [] },
        { name: 'remove', argument: [] },
        { name: 'list', argument: [] },
        { name: 'available', argument: [] },
        { name: 'build', argument: [] },
        { name: 'start', argument: [] },
        { name: 'stop', argument: [] },
        { name: 'help', argument: [] }
    ];

    var option = {
        str: []
    };

    var next = false;

    var currentCmd = getCMDName(argv[2], cmd);
    for (var i = 3; i < argc; i++) {
        next = false;
        if (argv[i][0] != '-') {
            option['str'].push(argv[i]);
            next = true;
        } else {
            for (var j = 0; j < currentCmd.argument.length; j++) {
                if (argv[i] == currentCmd.argument[j]) {
                    if (i < argc) {
                        option[currentCmd.argument[j]] = argv[i + 1];
                        i++;
                    }
                    next = true;
                }
            }
            if (next == false)
                throw Error("unknow argument " + argv[i]);
        }
    }

    return ({
        'action': currentCmd.name,
        'options': option
    });
}

function getCMDName(str, cmd) {
    for (var i = 0; i < cmd.length; i++) {
        if (str == cmd[i].name) {
            return (cmd[i]);
        }
    }
    throw Error('Unknow command ' + str);
}

/* -- ENTRY POINT == */
function main(argc, argv) {
    try  {
        var parsed = parseCMD(argc, argv);
        var builder = new Builder(parsed.action, parsed.options);
    } catch (e) {
        usage();
    }
}

main(process.argv.length, process.argv);
