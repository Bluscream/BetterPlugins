/* BetterDiscordApp Utils and Helper functions
 * Version: 0.4.1
 * Author: Jiiks | http://jiiks.net
 * Date: 25/08/2015 - 09:19
 * Last Updated: 30/03/2016
 * https://github.com/Jiiks/BetterDiscordApp
 */

var _fs = require('fs');
var _http = require('http');
var _https = require('https');

var _self, _this;
var Utils = function(self) {
    _self = self;
    _this = this;
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
                dumped_text += _this.MyDump(value,level+1);
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
            _self.JsLog('SecureTryCatch: ' + message);
            _self.JsLog('SecureTryCatch: ' + ex, 'error');
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

    _https.get(options, function(res) {
        var data = "";
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on("end", function() {
            callback(data);
        });
    }).on("error", function(e) {
        callback(null, e);
    });
}

Utils.prototype.DownloadHTTP = function(url, callback) {
    _http.get(url, function(result) {
        var data = '';
        result.on('data', function(chunk) {
            data += chunk;
        });

        result.on('end', function() {
            callback(data);
        });
    }).on('error', function(e) {
        callback(null, e);
    });
}

Utils.prototype.CreateTask = function(action, source, dest) {
    this.action = action;
    this.source = source;
    this.dest = dest;
    this.finished = false;
    this.answer = '';
    this.error = null;

    var _selfTask = this;

    this.SetAnswer = function(answer, error) {
        _selfTask.answer = answer;
        _selfTask.error = error;
        _selfTask.ResolveTask();
        _selfTask.finished = true;
    };

    this.ResolveTask = function() {
        switch(this.action) {
            case 'ReplaceFile': {
                if(source === '__answer__') {
                    if(this.answer)
                        _this.WriteFile(dest, this.answer, 'utf8');
                }else {
                    if(_this.FileExists(source)) {
                        _this.WritFile(dest, _this.LoadFile(source))
                    }
                }
            } 
        }
    };
};

Utils.prototype.TaskManager = function() {
    this.tasks = [];
    this.abort = false;

    this.AddTask = function(task) {
        this.tasks.push(task);
    };

    var _selfManager = this;
    this.RunTasks = function (callback) {
        if(_selfManager.tasks.length > 0 && !_selfManager.abort) {
            _self.JsLog('Checking Task');
            var task = _selfManager.tasks[0];

            if(task.finished) {
                _selfManager.tasks.splice(0, 1);
                if(!task.answer) {
                    _selfManager.abort = true;
                    _self.JsLog(_selfManager.error);
                }
            }

            setTimeout(_selfManager.RunTasks, 3000, callback);
        }else
            callback(!_selfManager.abort);
    }
};

Utils.prototype.sendIcpAsync = function(message) {
    _self.ExecJS('betterDiscordIPC.send("async-message-boot", "'+message+'");');
}

Utils.prototype.updateLoading = function(message, cur, max) {
    _self.ExecJS('document.getElementById("bd-status").innerHTML = "BetterDiscord - '+message+' : ";');
    _self.ExecJS('document.getElementById("bd-pbar").value = '+cur+';');
    _self.ExecJS('document.getElementById("bd-pbar").max = '+max+';');
}

Utils.prototype.injectStylesheetSync = function(loadMe) {
    _self.ExecJS('(function() {\
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
    _self.ExecJS(' (function() {\
        var e = document.getElementById("'+loadMe.elemId+'"); \
        if(e) e.parentNode.removeChild(e); \
        var script = document.createElement("script"); \
        script.id="'+loadMe.elemId+'"; \
        script.type = "text/javascript"; \
        script.onload = function() { \
            /* As it might take a while to load, if you refresh the page\
            at the same time, it would become invalid */ \
            if(betterDiscordIPC) \
                betterDiscordIPC.send("async-message-boot", "'+loadMe.message+'"); \
        }; \
        document.getElementsByTagName("body")[0].appendChild(script); \
        script.src = "'+loadMe.url+'"; \
    })(); ');
}

exports.Utils = Utils;