# xlator-bot
This sample application shows how to receive Circuit Conversation updates and how to send Circuit conversation items with the [circuit node SDK](https://circuitsandbox.net/sdk/index.html)

## Beta ##
The circuit SDK and related examples are in Beta. While we are in Beta, we may still make incompatible changes. 

## Requirements ##
* [node 0.12.x or higher](http://nodejs.org/download/)
* circuit module

## Getting Started ##

```bash
    git clone https://github.com/circuit-sandbox/xlator-bot.git
    cd xlator-bot
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
    wget https://circuitsandbox.net/circuit.tgz
    npm install circuit.tgz
    node index.js
``` 

If you do not have wget installed you can use curl to download circuit.tgz
```bash
curl "https://circuitsandbox.net/circuit.tgz" -o "circuit.tgz"
``` 

Add the Xlator Bot user to one of your circuit conversations. The Xlator Bot will translate posts and reply with a comment. By default translation is done to English. The Xlator Bot will attempt to translate to another language if the first word of a post matches one of the languages in lang.json.
