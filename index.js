/*
    Xlator Bot
    
    Copyright (c) 2015 Unify Inc.

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
    OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*jshint node:true*/
var config = require('./config.json');
var Circuit = require('circuit');

var VError = require('verror');
var htmlToText = require('html-to-text');
var StringMap = require('stringmap');
var googleTranslate = require('google-translate')(config.apiKey);

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'xlator_bot',
    stream: process.stderr,
    level: config.apiLogLevel
});

Circuit.setLogger(logger);

var XlatorBot = (function (my) {
    'use strict';

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // dtermine languages (posted text can be prefixed with a language e.g. Italian text to translate ....)
    ///////////////////////////////////////////////////////////////////////////////////////////////
    var _langDictionary = require('./lang.json');
    var _langMap = new StringMap(_langDictionary);

    function getLanguage(text) {
        var pattern = /^\s*([A-Za-zα-ωΑ-Ωϊίάύήόέöäüßèééïç]{2,})\s*(:|-|>|\.|,|;)*/;
        var plainText = htmlToText.fromString(text, { wordwrap: 130 });
        var matches = plainText.match(pattern);
        var result = {lang: 'en', text: plainText};

        if (matches) {
            var word = matches[1].toLowerCase();
            if (_langMap.has(word)) {
                result = {lang: _langMap.get(word), text: plainText.replace(matches[0], '')};
            }
        }
        console.info('regexp : ' + JSON.stringify(matches));
        console.info('result : ' + JSON.stringify(result));
        return result;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // xlate posts
    ///////////////////////////////////////////////////////////////////////////////////////////////
    var _xlationCounter = 0;

    function xlatePost(item) {
        if (item.type !== 'TEXT' || item.sentByMe) {
            console.info('skip   : its either not text or I sent it');
            return;
        }

        console.info('conv   : ' + item.convId);
        console.info('item   : ' + item.itemId);
        var threadId = (item.parent && item.parent.itemId) ? item.parent.itemId : item.itemId;
        console.info('thread : ' + threadId);
        console.info('type   : ' + item.type);
        console.info('creator: ' + item.creator.emailAddress);

        if (!item.text || item.text === undefined || item.text === '') {
            console.info('skip   :  it does not have text');
            return;
        }

        _user.getConversation(item.convId, function (err, conv) {
            if (err) {
                var verr = new VError('xlatePost: COULD NOT GET CONVERSATION "%s"', err);
                console.error(verr.message);
                return;
            }
            var res = getLanguage(item.text);
            googleTranslate.translate(res.text, res.lang, function (err, translation) {
                if (err) {
                    var verr = new VError('xlatePost: UNABLE TO XLATE "%s"', err);
                    console.error(verr.message);
                    return;
                }
                console.info('xlation: ' + translation.translatedText);
                _xlationCounter++;
                conv.sendComment(threadId, translation.translatedText, function (err, xlatedItem) {
                    if (err) {
                        var verr = new VError('xlatePost: UNABLE TO POST "%s"', err);
                        console.error(verr.message);
                        return;
                    }
                    console.info('posted : ' + xlatedItem.itemId);
                });
            });
        });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // inspect the app
    ///////////////////////////////////////////////////////////////////////////////////////////////
    my.inspect = function inspect() {
        console.log('inspect-------------------------------------');
        var report = {};
        report.time = new Date().toISOString();
        report.lastLogin = _lastLogin;
        report.lastStateChange = _lastStateChange;
        report.inspectInterval = config.inspectInterval;
        report.minLogonInterval = config.minLogonInterval;
        report.uptime = process.uptime();
        report.state = _state;
        report.xlationCounter = _xlationCounter;
        report.pid = process.pid;
        report.memory = process.memoryUsage();
        console.log(JSON.stringify(report, null, 2));
        return report;
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // registerEventListeners
    ///////////////////////////////////////////////////////////////////////////////////////////////
    function registerEventListeners() {
        console.info('registerEventListeners');

        _user.addEventListener('itemAdded', function (evt) {
            console.info('user.onitemAdded-----------------------------');
            xlatePost(evt.item);   
        });

        _user.addEventListener('itemUpdated', function (evt) {
            console.info('user.onItemUpdated---------------------------');
            xlatePost(evt.item);
        });

        _user.addEventListener('renewTokenError', function () {
            console.info('user.onRenewTokenError----------------------');
            my.reconnect();
        });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // connect
    ///////////////////////////////////////////////////////////////////////////////////////////////
    var _lastLogin = null;
    var _user = null;

    my.connect = function connect() {
        console.info('connect-------------------------------------');
        _lastLogin = new Date();
        Circuit.logon(config.user, config.password, config.domain).then(function(user) {
            _user=user;
            console.info('logonResponse-------------------------------');
            console.info('starting as ' + _user.emailAddress);
            registerEventListeners();
        }, function(err) {
            var verr = new VError('onLogonResponse: UNABLE TO LOGON "%s" "%s"', err, _state);
            console.error(verr.message);
            console.error('will retry to connect in ' + config.minLogonInterval + ' [ms]');
            global.setTimeout(my.connect, config.minLogonInterval);
        });
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // reconnect
    ///////////////////////////////////////////////////////////////////////////////////////////////
    my.reconnect = function reconnect() {
        console.info('reconnect-----------------------------------');
        //logout raises onRegistrationStateChange with state Disconnected
        _user.logout();
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // init
    ///////////////////////////////////////////////////////////////////////////////////////////////
    var _state = 'N/A';
    var _lastStateChange = new Date();

    my.init = function init() {
        console.info('init----------------------------------------');
        Circuit.addEventListener('registrationStateChange', function (evt) {
            console.info('Circuit.onRegistrationStateChange------------');
            var now = new Date();
            console.info('old state  : ' + _state + '  ' + _lastStateChange.toISOString());
            console.info('new state  : ' + evt.state + ' ' + now.toISOString());
            _state = evt.state;
            _lastStateChange = new Date();
            if ( _state === 'Disconnected') {
                var delay = (Number(now) - Number(_lastLogin) < config.minLogonInterval) ? 
                    config.minLogonInterval : 0;
                global.setTimeout(my.connect, delay);
            }
        });
    };    

    return my;

})({});

///////////////////////////////////////////////////////////////////////////////////////////////
// main
///////////////////////////////////////////////////////////////////////////////////////////////
XlatorBot.init();
XlatorBot.connect();

global.setInterval(XlatorBot.inspect, config.inspectInterval);