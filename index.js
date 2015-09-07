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

/*jshint node:true */
/*global require, Promise */

'use strict';

// load configuration
var config = require('./config.json');

// logger
var bunyan = require('bunyan');

// SDK logger
var sdkLogger = bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: 'config.sdkLogLevel'
});

// Application logger
var logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'debug'
});

// node utils
var util = require('util');
//var assert = require('assert');

var htmlToText = require('html-to-text');
var googleTranslate = require('google-translate')(config.apiKey);

// Circuit SDK    
logger.info('[APP]: get Circuit instance');
var Circuit = require('circuit');

logger.info('[APP]: Circuit set bunyan logger');
Circuit.setLogger(sdkLogger);

//*********************************************************************
//* XlatorBot
//*********************************************************************
var XlatorBot = function(){

    var self = this;
    var client = null;
    var langMap = new Map(require('./lang.json'));

    //*********************************************************************
    //* logon
    //*********************************************************************
    this.logon = function logon(){
        logger.info('[APP]: logon');
        return new Promise( function (resolve, reject) {
            logger.info('[APP]: createClient');
            client = new Circuit.Client({domain: config.domain});
            self.addEventListeners(client);  //register evt listeners
            client.logon(config.user, config.password)
            .then(function loggedOn(user) {
                logger.info('[APP]: loggedOn', user);
                resolve();
            })
            .catch(reject);
        });
    };

    //*********************************************************************
    //* addEventListeners
    //*********************************************************************
    this.addEventListeners = function addEventListeners(client){
        logger.info('[APP]: addEventListeners');
        //set event callbacks for this client
        client.addEventListener('connectionStateChanged', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('registrationStateChanged', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('reconnectFailed', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('itemAdded', function (evt) {
            self.logEvent(evt);
            self.xlateItem(evt.item);            
        });
        client.addEventListener('itemUpdated', function (evt) {
            self.logEvent(evt);
            self.xlateItem(evt.item);

        });
    };

    //*********************************************************************
    //* logEvent -- helper
    //*********************************************************************
    this.logEvent = function logEvent(evt){
        logger.info('[APP]:', evt.type, 'event received');
        logger.debug('[APP]:', util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* sentByMe -- helper
    //*********************************************************************
    this.sentByMe = function sentByMe (item){
        return (client.loggedOnUser.userId === item.creatorId);
    };  

    //*********************************************************************
    //* getLanguage -- helper
    //*********************************************************************
    this.getLanguage = function getLanguage (text){
        logger.info('[APP]: getLanguage');
        var lang = 'en';
        // check if the first word in text 
        // matches one of the languages 
        // in the language map loaded from lang.json
        var pattern = /^\s*([\u00BF-\u1FFF\u2C00-\uD7FF\w]{2,})\s*(:|-|>|\.|,|;)*/;
        var matches = text.match(pattern);
        if (matches){
            var match = matches[1].toLowerCase();
            if (langMap.get(match)) {
                lang = langMap.get(match);
                text = text.replace(matches[0], '');
            }
        }
        return {lang: lang, text: text};
    };

    //*********************************************************************
    //* xlateText -- helper
    //*********************************************************************
    this.xlateText = function xlateText(text){
        logger.info('[APP]: xlateText', text);
        return new Promise( function (resolve, reject) {
            var res = self.getLanguage(text);
            googleTranslate.translate(res.text, res.lang, function (err, result) {
                if (err){
                    reject(err);
                }
                logger.info('[APP]: xlated text', result);
                resolve(result.translatedText);
            });
        });
    };
  
    //*********************************************************************
    //* xlateItem
    //*********************************************************************
    this.xlateItem = function xlateItem(item) {
        logger.info('[APP]: xlateItem');

        if (item.type !== 'TEXT' || self.sentByMe(item)) {
            logger.debug('[APP]: skip it is not text or I sent it');
            return;
        }

        if (!item.text || !item.text.content) {
            logger.info('[APP]: skip it does not have text');
            return;
        }

        self.xlateText(htmlToText.fromString(item.text.content))
        .then (function addXlatedItem(xlatedText){
            logger.info('[APP]: addXlatedItem');
            var comment = { 
                convId: item.convId, 
                parentId: (item.parentItemId) ? item.parentItemId : item.itemId, 
                content: xlatedText
            };
            return client.addTextItem(item.convId, comment);
        })
        .catch(function(e){
            logger.error('[APP]:', e);
        });
    };
};

//*********************************************************************
//* run
//*********************************************************************
function run() {

    var xlatorBot = new XlatorBot();
      
     xlatorBot.logon()
        .catch (function(e){
            logger.error('[APP]:', e);
        });
}

//*********************************************************************
//* main
//*********************************************************************
run();


