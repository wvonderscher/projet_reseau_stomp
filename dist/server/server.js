"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const app = express();
const connectionRegex = /^CONNECT/;
//créer liste des subscribe
//initialize a simple http server
const server = http.createServer(app);
//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    //connection is up, let's add a simple simple event
    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        //on vérifie si le client est bien connecté
        typeRequete(splitRequete(message), ws);
        // if (connectionRegex.test(message)) {
        //     message = String(message).replace(connectionRegex, '');
        //     //send back the message to the other clients
        //     wss.clients
        //         .forEach(client => {
        //            //if (client != ws) {
        //                 client.send(`Hello, broadcast message -> ${message}`);
        //             //}    
        //         });
        // } else {
        //     ws.send(`Hello, you sent -> ${message}`);
        // }
    });
    //send immediatly a feedback to the incoming connection    
    ws.send('connecté');
});
//start our server
server.listen(process.env.PORT || 8999, () => {
    //console.log(`Server started on port ${server.address().port} :)`);
});
function typeRequete(requete, ws) {
    switch (requete[0]) {
        case "CONNECT":
            ws.send("CA MARCHE");
            break;
        default:
            ws.send("ERROR : " + requete[0]);
    }
}
function splitRequete(msg) {
    return String(msg).split(/\r?\n/);
}
//# sourceMappingURL=server.js.map