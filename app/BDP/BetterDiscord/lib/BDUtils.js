/* BetterDiscordApp Utils and Helper functions
 * Version: 0.4.1
 * Author: Jiiks | http://jiiks.net
 * Date: 25/08/2015 - 09:19
 * Last Updated: 30/03/2016
 * https://github.com/Jiiks/BetterDiscordApp
 */

var http = require('http');
var https = require('https');
var _fs = require('fs');

var eol = require('os').EOL;
var logs = "";

var _instance;
var _mainWindow;
var Utils = function(mainWindow) {
    _mainWindow = mainWindow;
    _instance = this;
};

Utils.prototype.GetWebWindow = function() {
    return _mainWindow;
};

String.prototype.replaceAll = function(search, replacement) {
    return this.replace(new RegExp(search, 'g'), replacement);
};

Utils.prototype.MyDump = function(arr, level) {
    var dumped_text = "";
    if(!level) level = 0;
    if(level > 3) return dumped_text;

    var level_padding = "";
    for(var j=0;j<level+1;j++) level_padding += "    ";

    if(typeof(arr) == 'object') {  
        for(var item in arr) {
            var value = arr[item];

            if(typeof(value) == 'object') { 
                dumped_text += level_padding + "'" + item + "' ...\n";
                dumped_text += _instance.MyDump(value,level+1);
            } else {
                dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
            }
        }
    } 

    return dumped_text.replaceAll('"', '`');
};

/*  BOOLEAN RESULT MOTHER FUCKERS CAUSE FUCK YEAH ! */ 
Utils.prototype.SecureTryCatch = function(message, callback, silent) {
    try {
        return callback() || false;
    }catch(ex) {
        if(!silent) {
            this.jsLog('SecureTryCatch: ' + message);
            this.jsLog('SecureTryCatch: ' + ex, 'error');
        }
    }
    return false;
};

Utils.prototype.GetModifyTime = function(filePath) {
    var modifyTime = new Date;
    this.SecureTryCatch('Utils->GetModifyTime(Get file stat)', function() {
        var stat = _fs.statSync(filePath);
        modifyTime = stat.mtime;
    }, true);
    return modifyTime;
}

Utils.prototype.CreateDirPath = function(dirPath) {
    if(!this.DirExists(dirPath)) 
        _fs.mkdirSync(dirPath);
};

Utils.prototype.DirExists = function(dirPath) {
    return this.SecureTryCatch('folder "'+dirPath+'" doesn\'t exists', function() {
        var stat = _fs.statSync(dirPath);
        return stat.isDirectory();
    }, true);
};

Utils.prototype.FileExists = function(filePath) {
    return this.SecureTryCatch('file "'+filePath+'" doesn\'t exists', function() {
        var stat = _fs.statSync(filePath);
        return stat.isFile();
    }, true);
};

Utils.prototype.LoadDir = function(path, callback) {
    var files = _fs.readdirSync(path);
    if(files) files.forEach(callback);
};

Utils.prototype.LoadFile = function(filePath, encoding) {
    return _fs.readFileSync(filePath, encoding);   
};

Utils.prototype.LoadFileBase64 = function(filePath) {
    return new Buffer(_fs.readFileSync(filePath)).toString('base64');   
};

Utils.prototype.WriteFile = function(filePath, data, encoding) {
    _fs.writeFileSync(filePath, data, encoding);
};

Utils.prototype.CheckCacheFile = function(path, timeHours) {
    var cacheObj = {'cache' : null};
    var isCacheExpired = false;
    this.SecureTryCatch('BetterDiscordLoader->CheckCacheFile(JSON.Parse)', function() {
        if(_fs.existsSync(path))
            cacheObj = JSON.parse(_fs.readFileSync(path));
    });

    //Userfile doesn't exist
    if(cacheObj.cache == null) {
        cacheObj.cache = new Date();
        isCacheExpired = true;
    } else {
        var currentDate = new Date();
        var cacheDate = new Date(cacheObj.cache);
        //Check if cache is expired
        var timeMs = timeHours * 3600 * 1000;
        if(Math.abs(currentDate.getTime() - cacheDate.getTime()) > timeMs) {
            cacheObj.cache = currentDate;
            isCacheExpired = true;
        }
    }

    //Write new cache date if expired
    if(isCacheExpired) {
        _fs.writeFileSync(path, JSON.stringify(cacheObj));
    }

    return isCacheExpired;
};

Utils.prototype.DownloadHTTPS = function(host, path, callback) {

    var options = {
        host: host,
        path: path,
        headers: {'user-agent': 'Mozilla/5.0'},
    }

    https.get(options, function(res) {
        var data = "";
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on("end", function() {
            callback(data);
        });
    }).on("error", function() {
        callback(null);
    });
}

Utils.prototype.DownloadHTTP = function(url, callback) {
    http.get(url, function(result) {
        var data = '';
        result.on('data', function(chunk) {
            data += chunk;
        });

        result.on('end', function() {
            callback(data);
        });
    }).on('error', function() {
        callback(null);
    });
}

Utils.prototype.CreateTask = function(action, source, dest) {
    this.action = action;
    this.source = source;
    this.dest = dest;
    this.finished = false;
    this.answer = '';

    var _selfTask = this;

    this.SetAnswer = function(answer) {
        _selfTask.answer = answer;
        _selfTask.ResolveTask();
        _selfTask.finished = true;
    };

    this.ResolveTask = function() {
        switch(this.action) {
            case 'ReplaceFile': {
                if(source === '__answer__') {
                    _instance.WriteFile(dest, this.answer, 'utf8');
                }else {
                    if(_instance.FileExists(source)) {
                        _instance.WritFile(dest, _instance.LoadFile(source))
                    }
                }
            } 
        }
    };
};

Utils.prototype.TaskManager = function() {
    this.tasks = [];

    this.AddTask = function(task) {
        this.tasks.push(task);
    };

    var _selfManager = this;
    this.RunTasks = function (callback) {
        if(_selfManager.tasks.length > 0) {
            _instance.jsLog('Checking Task');
            var task = _selfManager.tasks[0];

            if(task.finished)
                _selfManager.tasks.splice(0, 1);

            setTimeout(_selfManager.RunTasks, 5000, callback);
        }else
            callback();
    }
};

Utils.prototype.sendIcpAsync = function(message) {
    this.execJs('betterDiscordIPC.send("async-message-boot", "'+message+'");');
}

//Js logger
Utils.prototype.jsLog = function(message, type) {
    type = type || 'log';

    message = String(message).replaceAll('"', '`');
    message = String(message).replaceAll('\\\\', '|');

    switch(type) {
        case "log":
            this.execJs('console.log("BetterDiscord: ' + message + '");');
            break;
        case "warn":
            this.execJs('console.warn("BetterDiscord: ' + message + '");');
            break;
        case "error":
            this.execJs('console.error("BetterDiscord: ' + message + '");');
            break;
    }
};

Utils.prototype.updateLoading = function(message, cur, max) {
    this.execJs('document.getElementById("bd-status").innerHTML = "BetterDiscord - '+message+' : ";');
    this.execJs('document.getElementById("bd-pbar").value = '+cur+';');
    this.execJs('document.getElementById("bd-pbar").max = '+max+';');
}

//Logger
Utils.prototype.log = function(message) {
    console.log("BetterDiscord: " + message);
    logs += message + eol;
}

Utils.prototype.saveLogs = function(path) {
    _fs.writeFileSync(path + "/logs.log", logs);
}

//Execute javascript
Utils.prototype.execJs = function(js) {
    _mainWindow.webContents.executeJavaScript(js);
}

Utils.prototype.injectStylesheetSync = function(loadMe) {
    this.execJs('(function() {\
        var e = document.getElementById("'+loadMe.elemId+'");\
        if(e) e.parentNode.removeChild(e); \
        var stylesheet = document.createElement("link"); \
        stylesheet.id="'+loadMe.elemId+'"; \
        stylesheet.rel="stylesheet"; \
        stylesheet.type = "text/css"; \
        document.getElementsByTagName("head")[0].appendChild(stylesheet); \
        stylesheet.href = "'+loadMe.url+'"; \
    })();');

    this.sendIcpAsync(loadMe.message);
};

Utils.prototype.injectJavaScriptSync = function(loadMe) {
    this.execJs(' (function() {\
        var e = document.getElementById("'+loadMe.elemId+'"); \
        if(e) e.parentNode.removeChild(e); \
        var script = document.createElement("script"); \
        script.id="'+loadMe.elemId+'"; \
        script.type = "text/javascript"; \
        script.onload = function() { \
            betterDiscordIPC.send("async-message-boot", "'+loadMe.message+'"); \
        }; \
        document.getElementsByTagName("body")[0].appendChild(script); \
        script.src = "'+loadMe.url+'"; \
    })(); ');
}

exports.Utils = Utils;