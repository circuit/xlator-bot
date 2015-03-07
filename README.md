# xlator-bot
This sample application shows how to receive Circuit Conversation updates and how to send Circuit conversation items with the [circuit SDK](https://circuitsandbox.net/sdk/index.html)

## Beta ##
The circuit SDK and related examples are in Beta. While we are in Beta, we may still make incompatible changes. 

## Requirements ##
* [node 0.12.x or higher](http://nodejs.org/download/)

## Getting Started ##

```bash
    git clone git+https://github.com/circuit-sandbox/xlator-bot.git
    cd circuit-translator-bot
    cp config.json.template config.json
```

Edit config.json
* Change "user" and "password" to the circuit account you'll use for the Xlator Bot.
    you can request a circuit account at the [Circuit Developer Community Portal](https://www.yourcircuit.com/web/developers).
* Change the apiKey to a google "Key for server applications" with access to the "Translate API".

```bash
    "user"          : "circuit user ID",
    "password"      : "circuit pwd",
    "apiKey"        : "API Key for server applications",

``` 

Run the sample application with 
```bash
    npm install
    npm install circuit-0.0.1.tgz
    node index.js
``` 

Add the Xlator Bot user to one of your circuit conversations. The Xlator Bot will translate posts and reply with a comment. By default translation is done to English. The Xlator Bot will attempt to translate to another language if the first word of a post matches one of the languages in lang.json.
