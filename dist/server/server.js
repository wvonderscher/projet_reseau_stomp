"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//node ./dist/server/server.js lancer le serveur
// ./node_modules/.bin/tsc compile
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const app = express();
const host = "ws://localhost:8999/";
var lclients = new Map();
//création des différentes map qui vont accueillir les clients et l'id de leur subscribe.
var topicSport = new Map();
var topicJeux = new Map();
var topicGeneral = new Map();
//la liste des clients de chaque fil de discussion (s'ils se sont subscribe)
//initialize a simple http server
const server = http.createServer(app);
//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.id = idUnique();
    //ABONNEMENT????
    //connection is up, let's add a simple simple event
    ws.on('message', (message) => {
        //log the received message and send it back to the client
        // console.log('received: %s', message);
        //On regarde la requete envoyé par le client
        typeRequete(splitRequete(message), ws);
    });
    //send immediatly a feedback to the incoming connection    
    ws.send('You are connected');
    //quand l'utilisateur ferme sa connexion (ne fonctionne pas)
    ws.on('close', event => {
        if (lclients.has(ws.id)) {
            lclients.delete(ws.id);
        }
    });
});
//start our server
server.listen(process.env.PORT || 8999, () => {
    //console.log(`Server started on port ${server.address().port} :)`);
});
//fonction qui va vérifier si la frame de la requete existe et traiter cette dernière.
function typeRequete(requete, ws) {
    switch (requete[0]) {
        case "CONNECT":
            //required: accept-version ,host
            if (!lclients.has(ws.id)) {
                connecting(requete, ws);
            }
            else {
                ws.send(envoyerErreur("deja connecté", "Vous etes deja connecte au serveur", requete));
            }
            break;
        case "SEND":
            //required: destination
            break;
        case "SUBSCRIBE":
            //required: destination, id
            if (lclients.has(ws.id)) {
                abonnement(requete, ws);
            }
            //verifier 
            break;
        case "UNSUBSCRIBE":
            //required: id
            if (lclients.has(ws.id)) {
                desabonner(requete, ws);
            }
            break;
        case "DISCONNECT":
            //required:
            if (lclients.has(ws.id)) {
                seDeconnecter(requete, ws);
            }
            break;
        default:
            console.log(topicSport);
            console.log(topicGeneral);
            console.log(topicJeux);
            ws.send(envoyerErreur("Frame non reconnue", "Le serveur n a pas reconnue la Frame envoyée", requete));
        //si aucune des Frames est connue, on renvoie ERROR pour prévenir le client
    }
}
//fonction qui permet de split une requete dans le but de traiter le différentes parties.
function splitRequete(msg) {
    return String(msg).split(/\r?\n/);
}
//CE QUE LE SERVEUR RECOIT
//"MESSAGE":
//required: destination, message-id, subscription
function envoyerMessage() {
}
//"RECEIPT":
//required: receipt-is
//fonction qui permet l'envoie à un client une frame ERROR
function envoyerErreur(msgHeader, msgBody, requete) {
    let requeteComplete = requete.join("\n");
    // console.log("ERROR\ncontent-type:text/plain\ncontent-length:"+(requeteComplete.length+msgBody.length)+"\nmessage:"+msgHeader+"\n\nThe message:\n-----"+requeteComplete+"\n-----\n"+msgBody+"\n^@");
    return "ERROR\ncontent-type:text/plain\ncontent-length:" + (requeteComplete.length + msgBody.length) + "\nmessage:" + msgHeader + "\n\nThe message:\n-----\n" + requeteComplete + "\n-----\n" + msgBody + "\n^@";
}
//Fonction pour valider la connexion d'un client avec la frame CONNECT
function connecting(requete, ws) {
    //verification des headers
    //si un header mal formé : return ERROR
    //si tout bon : on ajoute le client dans la liste des clients connectes
    let arg1 = requete[1].split(':');
    let arg2 = requete[2].split(':');
    if ((arg1[0] === "accept-version") && (arg1[1] === "1.2" || arg1[1] === "1.1" || arg1[1] === "1.0")) {
        if (arg2[0] === "host" && (arg2[1] === "localhost")) {
            //connexion bonne
            // clientConnected.push(ws);
            lclients.set(ws.id, ws);
            ws.send("CONNECTED\nversion:" + arg1[1] + "\n^@");
        }
        else {
            ws.send(envoyerErreur("la frame CONNECT est mal formée", "il manque le header host qui est nécessaire", requete));
        }
    }
    else {
        ws.send(envoyerErreur("la frame CONNECT est mal formée", "Il manque le header accept-version qui est nécessaire", requete));
    }
}
//fonciton qui permet de deconnecter un client du serveur
function seDeconnecter(requete, ws) {
    //si requete est bonne, on supprimer le client de la liste des clients connectes
    let arg1 = requete[1].split(':');
    if (arg1[0] === 'receipt' && arg1[1] !== "") {
        //revoir comment supprimer 
        lclients.delete(ws.id);
        ws.send("RECEIPT\nreceipt-id:" + arg1[1] + "\n^@");
    }
    else {
        ws.send(envoyerErreur("la Frame DISCONNECT est mal formée", "il manque le header receipt qui est necessaire", requete));
    }
}
function abonnement(requete, ws) {
    //verification si requete bien formee
    //On vérifie si l'id d'abonnement n'existe pas deja --> si existe erreur
    //on ajoute le client dans la liste de destination 
    // topic/sport
    let arg1 = requete[1].split(':');
    let arg2 = requete[2].split(':');
    if (arg2[0] === "destination") {
        if (arg1[0] === "id" && !idAbonnementExistant(ws, +arg1[1])) {
            switch (arg2[1]) {
                case "topic/sport":
                    topicSport.set(ws.id, +arg1[1]);
                    break;
                case "topic/jeux":
                    topicJeux.set(ws.id, +arg1[1]);
                    break;
                case "topic/general":
                    topicGeneral.set(ws.id, +arg1[1]);
                    break;
                default:
                    ws.send(envoyerErreur("la destination est inconnue", "Impossible de subscribe à la destination du header destination", requete));
                    break;
            }
        }
        else {
            ws.send(envoyerErreur("le header id est mal formé", "le header id est nécessaire, il faut aussi que l id soit unique", requete));
        }
    }
    else {
        ws.send(envoyerErreur("le header destination est mal formé", "le header destination est necessaire.", requete));
    }
}
function desabonner(requete, ws) {
    let arg1 = requete[1].split(':');
    if (arg1[0] === "id") {
        if (topicGeneral.has(ws.id) && topicGeneral.get(ws.id) === +arg1[1]) {
            topicGeneral.delete(ws.id);
        }
        if (topicJeux.has(ws.id) && topicJeux.get(ws.id) === +arg1[1]) {
            topicJeux.delete(ws.id);
        }
        if (topicSport.has(ws.id) && topicSport.get(ws.id) === +arg1[1]) {
            topicSport.delete(ws.id);
        }
    }
    else {
    }
}
function idAbonnementExistant(ws, idAbo) {
    if ((topicGeneral.has(ws.id) && topicGeneral.get(ws.id) === idAbo) || (topicJeux.has(ws.id) && topicJeux.get(ws.id) === idAbo) || (topicSport.has(ws.id) && topicSport.get(ws.id) === idAbo)) {
        return true;
    }
    return false;
}
//fonction qui permet la création d'un identifiant unique pour un client qui se connecte au serveur
function idUnique() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
}
//# sourceMappingURL=server.js.map