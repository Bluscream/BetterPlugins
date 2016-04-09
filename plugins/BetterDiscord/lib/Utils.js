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

var _mainWindow;
var Utils = function(mainWindow) {
    _mainWindow = mainWindow;
};

String.prototype.replaceAll = function(search, replacement) {
    return this.replace(new RegExp(search, 'g'), replacement);
};

Utils.prototype.MyDump = function(arr, level) {
    var dumped_text = "";
    if(level > 3) return dumped_text;
    if(!level) level = 0;

    var level_padding = "";
    for(var j=0;j<level+1;j++) level_padding += "    ";

    if(typeof(arr) == 'object') {  
        for(var item in arr) {
            var value = arr[item];

            if(typeof(value) == 'object') { 
                dumped_text += level_padding + "'" + item + "' ...\n";
                dumped_text += mydump(value,level+1);
            } else {
                dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
            }
        }
    } else { 
        dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
    }
    return dumped_text.replaceAll('"', '`');
};

Utils.prototype.SecureTryCatch = function(message, callback) {
    try {
        callback();
    }catch(ex) {
        this.jsLog('SecureTryCatch: ' + message);
        this.jsLog('SecureTryCatch: ' + ex, 'error');
    }
};

Utils.prototype.GetModifyTime = function(filePath) {
    var modifyTime = new Date;
    this.SecureTryCatch('Utils->GetModifyTime(Get file stat)', function() {
        var stat = _fs.statSync(filePath);
        modifyTime = stat.mtime;
    });
    return modifyTime;
}

Utils.prototype.CreateDirPath = function(dirPath) {
    var stat = _fs.statSync(dirPath);
    if(!stat.isDirectory())
        _fs.mkdirSync(dirPath);
};

Utils.prototype.LoadDir = function(path, callback) {
    var files = _fs.readdirSync(path);
    if(files) files.forEach(callback);
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

//Download using https
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
//Download using http
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

Utils.prototype.getHash = function(beta, callback) {
    var branch = beta ? "beta" : "master";
    this.download("api.github.com", "/repos/Jiiks/BetterDiscordApp/commits/"+branch+"", function(data) {
        callback(JSON.parse(data).sha);
    });
}

Utils.prototype.sendIcpAsync = function(message) {
    this.execJs('betterDiscordIPC.send("asynchronous-message", "'+message+'");');
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

//Parse and execute javascript
Utils.prototype.execJsParse = function(js) {
    this.execJs(js); //TODO
}

//Css internal style injector
Utils.prototype.injectStylesheet = function(url) {
    var self = this;
    this.download(url, function(data) {
        var js = 'var style = document.createElement("style"); style.type = "text/css"; style.innerHTML = "'+data+'";';
        self.injectToElementByTag("head", js, "style");
    });
}

Utils.prototype.injectStylesheetSync = function(url, callbackMessage) {
    this.execJs('$("head").append(" <link rel=\'stylesheet\' href=\''+url+'\'> ");');
    this.sendIcpAsync(callbackMessage);
};

Utils.prototype.headStyleSheet = function(url) {
    this.execJs('(function() { var stylesheet = document.createElement("link"); stylesheet.type = "text/css"; document.getElementsByTagName("head")[0].appendChild(stylesheet); stylesheet.href = "'+url+'" })();')
}

Utils.prototype.injectJavaScriptSync = function(url, callbackMessage) {
    this.execJs(' (function() {var e = document.getElementById("'+callbackMessage+'"); if(e) e.parentNode.removeChild(e); var script = document.createElement("script"); script.id="'+callbackMessage+'"; script.type = "text/javascript"; script.onload = function() { betterDiscordIPC.send("asynchronous-message", "'+callbackMessage+'"); }; document.getElementsByTagName("body")[0].appendChild(script); script.src = "'+url+'"; })(); ');
}

Utils.prototype.injectJavaScript = function(url, jquery) {
    if(!jquery) {
        this.execJs('(function() { var script = document.createElement("script"); script.type = "text/javascript"; document.getElementsByTagName("body")[0].appendChild(script); script.src = "' + url + '"; })();');
    }else {
        this.execJs(' (function() { function injectJs() { var script = document.createElement("script"); script.type = "text/javascript"; document.getElementsByTagName("body")[0].appendChild(script); script.src = "' + url + '"; } function jqDefer() { if(window.jQuery) { injectJs(); }else{ setTimeout(function() { jqDefer(); }, 100) } } jqDefer(); })(); ');
    }

}

exports.Utils = Utils;