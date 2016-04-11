/*
 * BetterDiscordApp Installer v0.2.8
 */

var asar = require('asar');
var wrench = require('wrench');
var fs = require('fs');
var readline = require('readline');
var util = require('util');

var _appFolder = "/app";
var _appArchive = "/app.asar";
var _index = _appFolder + "/app/index.js";

var _discordPath = "/Applications/Discord PTB.app/Contents/Resources";
var _prefsPath = process.env.HOME + "/Library/Preferences/BetterDiscord/";
var _logFile = process.env.HOME + "/Downloads/betterdiscord_ptb_log.txt";

/* Functions */
function createLogFile() {
    if(fs.existsSync(_logFile)) {
        fs.unlinkSync(_logFile);
    }
    fs.writeFileSync(_logFile, "BetterDiscord installation log\n", 'utf8');
}

function appendToLogFile(message) {
    if(fs.existsSync(_logFile)) {
        fs.appendFileSync(_logFile, message + "\n");
    }
}

function install() {
    createLogFile();
    appendToLogFile("Looking for discord resources at: " + _discordPath);

    if(fs.existsSync(_discordPath)) {
        appendToLogFile("Discord resources found at: " + _discordPath + "\nLooking for app folder");

        if(fs.existsSync(_discordPath + _appFolder)) {
            appendToLogFile("Deleting " + _discordPath + _appFolder + " folder.");
            wrench.rmdirSyncRecursive(_discordPath + _appFolder);
            appendToLogFile("Deleted " + _discordPath + _appFolder + " folder.");
        }

        if(fs.existsSync(_discordPath + "/node_modules/BetterDiscord")) {
            appendToLogFile("Deleting " + _discordPath + "/node_modules/BetterDiscord" + " folder.");
            wrench.rmdirSyncRecursive(_discordPath + "/node_modules/BetterDiscord");
            appendToLogFile("Deleted " + _discordPath + "/node_modules/BetterDiscord" + " folder.");
        }

        appendToLogFile("Looking for app archive");

        if(fs.existsSync(_discordPath + _appArchive)) {
            appendToLogFile("Extracting app archive found at: " + _discordPath + _appArchive);
            asar.extractAll(_discordPath + _appArchive, _discordPath + _appFolder);

            appendToLogFile("Copying BetterDiscord");

            fs.mkdirSync(_discordPath + "/node_modules/BetterDiscord");

	    wrench.chmodSyncRecursive("BetterDiscord/", 0777);
            wrench.copyDirSyncRecursive("BetterDiscord/", _discordPath + _appFolder  +  "/node_modules/BetterDiscord/", {forceDelete: true});

            if(fs.existsSync("splice")) {
                if(fs.existsSync(_discordPath + _appFolder)) {
                    appendToLogFile("Extracted to: " + _discordPath + _appFolder);
                    appendToLogFile("Injecting index.js");

                    var data = fs.readFileSync(_discordPath + _index).toString().split("\n");

                    // Insert the 'require betterdiscord'
                    var indexR = 0;
                    var foundR = false;
                    while(!foundR && indexR < data.length) {
                        if(data[indexR].replace(/\s+/g, "").replace(/\t+/g, "")
                            .trim().startsWith("var_fs=")) {
                            appendToLogFile("Offset found: Insert required BD");
                            foundR = true;
                        }
                        indexR++;
                    }

                    if(!foundR) {
                        appendToLogFile("Offset _fs can't be found");
                        process.exit();
                    }

                    data.splice(indexR, 0, 'var _betterDiscordLib = require(\'betterdiscord\');\n');

                    // Insert the 'betterdiscord.init()'
                    var index = 0;
                    var found = false;
                    while(!found && index < data.length) {
                        if(data[index].replace(/\s+/g, "").replace(/\t+/g, "")
                            .trim().startsWith("mainWindow=new")) {
                            appendToLogFile("Offset found: Init BD with mainWindow");
                            found = true;
                        }
                        index++;
                    }

                    if(!found) {
                        appendToLogFile("Offset mainWindow can't be found");
                        process.exit();
                    }

                    var splice = fs.readFileSync("splice");
                    data.splice(index, 0, splice);

                    appendToLogFile("Injected index.js");

                    fs.writeFile(_discordPath + _index, data.join("\n"), function(err) {
                        if(err) { appendToLogFile("Error writing " + _discordPath + _index); }
                        else {
                            appendToLogFile("Deleting old cache files");

                            var emotes_twitch_global = 'emotes_twitch_global.json';
                            if(fs.existsSync(_prefsPath + emotes_twitch_global)) {
                                appendToLogFile("Deleting " + emotes_twitch_global);
                                fs.unlinkSync(_prefsPath + emotes_twitch_global);
                                appendToLogFile("Deleted " + emotes_twitch_global);
                            }

                            var emotes_twitch_subscriber = 'emotes_twitch_subscriber.json';
                            if(fs.existsSync(_prefsPath + emotes_twitch_subscriber)) {
                                appendToLogFile("Deleting " + emotes_twitch_subscriber);
                                fs.unlinkSync(_prefsPath + emotes_twitch_subscriber);
                                appendToLogFile("Deleted " + emotes_twitch_subscriber);
                            }
                           
                            var emotes_bttv = 'emotes_bttv.json';
                            if(fs.existsSync(_prefsPath + emotes_bttv)) {
                                 appendToLogFile("Deleting " + emotes_bttv);
                                    fs.unlinkSync(_prefsPath + emotes_bttv);
                                    appendToLogFile("Deleted " + emotes_bttv);
                            }
                           
                            var emotes_bttv_2 = "emotes_bttv_2.json";
                            if(fs.existsSync(_prefsPath + emotes_bttv_2)) {
                                appendToLogFile("Deleting " + emotes_bttv_2);
                                fs.unlinkSync(_prefsPath + emotes_bttv_2);
                                appendToLogFile("Deleted " + emotes_bttv_2);
                            }

                            var emotes_ffz = "emotes_ffz.json";
                            if(fs.existsSync(_prefsPath + emotes_ffz)) {
                                appendToLogFile("Deleting " + emotes_ffz);
                                fs.unlinkSync(_prefsPath + emotes_ffz);
                                appendToLogFile("Deleted " + emotes_ffz);
                            }
                           
                            var user_pref = "user.json";
                            if(fs.existsSync(_prefsPath + user_pref)) {
                                appendToLogFile("Deleting " + user_pref);
                                fs.unlinkSync(_prefsPath + user_pref);
                                appendToLogFile("Deleted " + user_pref);
                            }

                            appendToLogFile("Installation complete !");
                        }
                    });
                } else {
                    appendToLogFile("Something went wrong. Please try again.");
                }
            }else {
                appendToLogFile("Missing splice file");
            }
        } else {
            appendToLogFile("Failed to locate app archive at: " + _discordPath + _appArchive);
        }
    }else {
        appendToLogFile("Discord resources not found at: " + _discordPath);
    }
}

install();
