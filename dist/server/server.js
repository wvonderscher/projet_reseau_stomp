"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//node ./dist/server/server.js lancer le serveur
// ./node_modules/.bin/tsc compile
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const app = express();
const host = "ws://localhost:8999/";
//liste des clients connectés au serveur
var lclients = new Map();
//création des différentes map qui vont accueillir les clients et l'id de leur subscribe.
var topicSport = new Map();
var topicJeux = new Map();
var topicGeneral = new Map();
var messageID = 0;
//initialize a simple http server
const server = http.createServer(app);
//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.id = idUnique();
    ws.on('message', (message) => {
        //On regarde la requete envoyé par le client pour la traiter
        typeRequete(splitRequete(message), ws);
    });
    //quand l'utilisateur ferme sa connexion (ne fonctionne pas)
    ws.on('close', event => {
        if (lclients.has(ws.id)) {
            lclients.delete(ws.id);
        }
    });
});
server.listen(process.env.PORT || 8999, () => {
    console.log("serveur demarré");
});
//fonction qui va vérifier si la frame de la requete existe et traiter cette dernière.
function typeRequete(requete, ws) {
    switch (requete[0]) {
        case "CONNECT":
            //required: accept-version ,host
            if (!lclients.has(ws.id)) {
                seConnecter(requete, ws);
            }
            else {
                ws.send(envoyerErreur("deja connecté", "Vous êtes deja connecté au serveur", requete));
            }
            break;
        case "SEND":
            //required: destination
            if (lclients.has(ws.id)) {
                messageClient(requete, ws);
            }
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
            ws.send(envoyerErreur("Frame non reconnue", "Le serveur n a pas reconnue la Frame envoyée", requete));
        //si aucune des Frames est connue, on renvoie ERROR pour prévenir le client
    }
}
//fonction qui permet de split une requete dans le but de traiter les différentes parties.
function splitRequete(msg) {
    return String(msg).split(/\r?\n/);
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
function seConnecter(requete, ws) {
    var _a, _b;
    //verification des headers
    //si un header mal formé : return ERROR
    //si tout bon : on ajoute le client dans la liste des clients connectes
    if (requete.find(element => element.startsWith("accept-version:")) !== undefined) {
        let version = (_a = requete.find(element => element.startsWith("accept-version"))) === null || _a === void 0 ? void 0 : _a.split(':')[1];
        if (version === "1.2" || version === "1.1" || version === "1.0") {
            if (requete.find(element => element.startsWith("host:")) !== undefined &&
                ((_b = requete.find(element => element.startsWith("host:"))) === null || _b === void 0 ? void 0 : _b.split(':')[1]) === "localhost") {
                //connexion bonne
                // clientConnected.push(ws);
                lclients.set(ws.id, ws);
                ws.send("CONNECTED\nversion:" + version + "\n^@");
            }
            else {
                ws.send(envoyerErreur("la frame CONNECT est mal formée", "il manque le header host qui est nécessaire", requete));
            }
        }
        else {
            ws.send(envoyerErreur("la frame CONNECT est mal formée", "La version n est pas la bonne", requete));
        }
    }
    else {
        ws.send(envoyerErreur("la frame CONNECT est mal formée", "Il manque le header accept-version qui est nécessaire", requete));
    }
}
//fonciton qui permet de deconnecter un client du serveur
function seDeconnecter(requete, ws) {
    var _a;
    //si requete est bonne, on supprimer le client de la liste des clients connectes
    lclients.delete(ws.id);
    if (topicGeneral.has(ws.id)) {
        topicGeneral.delete(ws.id);
    }
    if (topicJeux.has(ws.id)) {
        topicJeux.delete(ws.id);
    }
    if (topicSport.has(ws.id)) {
        topicSport.delete(ws.id);
    }
    if (requete.find(element => element.startsWith("receipt:")) !== undefined) {
        ws.send("RECEIPT\nreceipt-id:" + ((_a = requete.find(element => element.startsWith("receipt:"))) === null || _a === void 0 ? void 0 : _a.split(':')[1]) + "\n^@");
    }
    else {
        ws.send("a+ dans le bus");
    }
    ws.CLOSED;
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
        ws.send(envoyerErreur("le header id est mal formé", "le header id est nécessaire, il faut que l id soit un subscribe existant", requete));
    }
}
function idAbonnementExistant(ws, idAbo) {
    if ((topicGeneral.has(ws.id) && topicGeneral.get(ws.id) === idAbo) || (topicJeux.has(ws.id) && topicJeux.get(ws.id) === idAbo) || (topicSport.has(ws.id) && topicSport.get(ws.id) === idAbo)) {
        return true;
    }
    return false;
}
//fonction qui est appelé lorsqu'un client envoie une frame SEND au serveur
function messageClient(requete, ws) {
    var _a, _b, _c;
    let arg1 = requete[1].split(':');
    if (arg1[0] === "destination") {
        let i = requete.findIndex((element) => element === "");
        let body = requete[i + 1];
        switch (arg1[1]) {
            case "topic/sport":
                for (let clientID of topicSport.keys()) {
                    (_a = lclients.get(clientID)) === null || _a === void 0 ? void 0 : _a.send(envoyerMessage(ws, arg1[1], body));
                }
                messageID++;
                break;
            case "topic/jeux":
                for (let clientID of topicJeux.keys()) {
                    (_b = lclients.get(clientID)) === null || _b === void 0 ? void 0 : _b.send(envoyerMessage(ws, arg1[1], body));
                }
                messageID++;
                break;
            case "topic/general":
                for (let clientID of topicGeneral.keys()) {
                    (_c = lclients.get(clientID)) === null || _c === void 0 ? void 0 : _c.send(envoyerMessage(ws, arg1[1], body));
                }
                messageID++;
                break;
            default:
                ws.send(envoyerErreur("la destination est inconnue", "Impossible d envoyer le message a la destination car inconnue", requete));
                break;
        }
    }
    else {
        ws.send(envoyerErreur("le header destination est mal formé", "le header destination est obligatoire et doit avoir en valeur un topic existant", requete));
    }
}
//"MESSAGE":
//required: destination, message-id, subscription
function envoyerMessage(ws, dest, body) {
    return "MESSAGE\nsubscription:0\nmessage-id:" + messageID + "\ndestination:" + dest + "\ncontent-type:text/plain\n\n" + body + "\n^@";
}
//fonction qui permet la création d'un identifiant unique pour un client qui se connecte au serveur
function idUnique() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
}
//# sourceMappingURL=server.js.map