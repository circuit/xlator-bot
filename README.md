# xlator-bot
This sample application shows how to receive Circuit Conversation updates and how to send Circuit conversation items with the [circuit node SDK](https://circuitsandbox.net/sdk/)

## Recommended ##
* [node 6.x LTS](http://nodejs.org/download/)
* [circuit module](https://circuitsandbox.net/sdk/)

## Getting Started ##

```bash
    git clone https://github.com/circuit-sandbox/xlator-bot.git
    cd xlator-bot
    cp config.json.template config.json
```

Edit config.json
* Change "client_id" and "client_secret" to the circuit account you'll use for the Xlator Bot.
    you can request client credentials for bots here https://circuit.github.io/oauth.html.
* Change the apiKey to a google "Key for server applications" with access to the "Translate API".

```bash
    "client_id"          : "your circuit client id",
    "client_secret"      : "your circuit secret",
    "domain"             : "circuitsandbox.net",
    "apiKey"             : "google translation API key",

```

Run the sample application with
```bash
    npm install
    node index.js
```

Add the Xlator Bot user to one of your circuit conversations. The Xlator Bot will translate posts and reply with a comment. By default translation is done to English. The Xlator Bot will attempt to translate to another language if the first word of a post matches one of the languages in lang.json.
