/**
 *  Copyright 2017 Unify Software and Solutions GmbH & Co.KG.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/*jshint node:true */
/*global require, Promise */

'use strict';

// load configuration
var config = require('./config.json');

console.log(config);

// logger
var bunyan = require('bunyan');

// SDK logger
var sdkLogger = bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: config.sdkLogLevel
});

// Application logger
var logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'debug'
});

// node utils
var util = require('util');

var htmlToText = require('html-to-text');
var googleTranslate = require('google-translate')(config.apiKey);

// Circuit SDK
logger.info('[APP]: get Circuit instance');
var Circuit = require('circuit-node-sdk');

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
            client = new Circuit.Client({
                client_id: config.client_id,
                client_secret: config.client_secret,
                domain: config.domain,
                autoRenewToken: true
            });
            self.addEventListeners(client);  //register evt listeners
            client.logon()
            .then(function loggedOn(user) {
                logger.info('[APP]: loggedOn', user);
                return client.setPresence({state: Circuit.Enums.PresenceState.AVAILABLE});
            })
            .then(() => {
                console.log('Presence updated');
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


