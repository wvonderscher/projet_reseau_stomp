//node ./dist/server/server.js lancer le serveur
// ./node_modules/.bin/tsc compile
import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const app = express();
const host = "ws://localhost:8999/";
//liste des clients connectés au serveur
var lclients = new Map<String, ExtWebSocket>();

//création des différentes map qui vont accueillir les clients et l'id de leur subscribe.
var topicSport = new Map<String, number>();
var topicJeux = new Map<String, number>();
var topicGeneral = new Map<String, number>();

var messageID: number = 0;
//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: ExtWebSocket) => {
    ws.id = idUnique();
    ws.on('message', (message: string) => {
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
function typeRequete(requete: String[], ws: ExtWebSocket) {
    switch (requete[0]) {
        case "CONNECT":
            //required: accept-version ,host
            if (!lclients.has(ws.id)) {
                seConnecter(requete, ws);
            } else {
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
            console.log(topicJeux);
            console.log(topicGeneral);
            console.log(topicSport);

        //ws.send(envoyerErreur("Frame non reconnue", "Le serveur n a pas reconnue la Frame envoyée", requete));
        //si aucune des Frames est connue, on renvoie ERROR pour prévenir le client
    }
}

//fonction qui permet de split une requete dans le but de traiter les différentes parties.
function splitRequete(msg: string): String[] {
    return String(msg).split(/\r?\n/);
}


//"RECEIPT":
//required: receipt-is


//fonction qui permet l'envoie à un client une frame ERROR
function envoyerErreur(msgHeader: String, msgBody: String, requete: String[]) {
    let requeteComplete = requete.join("\n");
    // console.log("ERROR\ncontent-type:text/plain\ncontent-length:"+(requeteComplete.length+msgBody.length)+"\nmessage:"+msgHeader+"\n\nThe message:\n-----"+requeteComplete+"\n-----\n"+msgBody+"\n^@");

    return "ERROR\ncontent-type:text/plain\ncontent-length:" + (requeteComplete.length + msgBody.length) + "\nmessage:" + msgHeader + "\n\nThe message:\n-----\n" + requeteComplete + "\n-----\n" + msgBody + "\n^@";
}

//Fonction pour valider la connexion d'un client avec la frame CONNECT
function seConnecter(requete: String[], ws: ExtWebSocket) {
    //verification des headers
    //si un header mal formé : return ERROR
    //si tout bon : on ajoute le client dans la liste des clients connectes
    let arg1 = requete[1].split(':');
    let arg2 = requete[2].split(':');
    if (arg1[0] === 'accept-version') {
        if (arg1[1] === "1.2" || arg1[1] === "1.1" || arg1[1] === "1.0") {
            if (arg2[0] === "host" && arg2[1] === "localhost") {
                lclients.set(ws.id, ws);
                ws.send("CONNECTED\nversion:" + arg2[1] + "\n^@");
            }
            else {
                ws.send(envoyerErreur("la frame CONNECT est mal formée", "il manque le header host qui est nécessaire", requete));
            }
        } else {
            ws.send(envoyerErreur("la frame CONNECT est mal formée", "La version n est pas la bonne", requete));
        }
    } else {
        ws.send(envoyerErreur("la frame CONNECT est mal formée", "Il manque le header accept-version qui est nécessaire", requete));
    }

}

//fonciton qui permet de deconnecter un client du serveur
function seDeconnecter(requete: String[], ws: ExtWebSocket) {
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
        ws.send("RECEIPT\nreceipt-id:" + requete.find(element => element.startsWith("receipt:"))?.split(':')[1] + "\n^@");
    } else {
        ws.send("a+ dans le bus");
    }
    ws.CLOSED;
}

function abonnement(requete: String[], ws: ExtWebSocket) {
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
        } else {
            ws.send(envoyerErreur("le header id est mal formé", "le header id est nécessaire, il faut aussi que l id soit unique", requete));
        }
    } else {
        ws.send(envoyerErreur("le header destination est mal formé", "le header destination est necessaire.", requete));
    }
}

function desabonner(requete: String[], ws: ExtWebSocket) {
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
    } else {
        ws.send(envoyerErreur("le header id est mal formé", "le header id est nécessaire, il faut que l id soit un subscribe existant", requete));
    }
}

function idAbonnementExistant(ws: ExtWebSocket, idAbo: number): boolean {
    if ((topicGeneral.has(ws.id) && topicGeneral.get(ws.id) === idAbo) || (topicJeux.has(ws.id) && topicJeux.get(ws.id) === idAbo) || (topicSport.has(ws.id) && topicSport.get(ws.id) === idAbo)) {
        return true;
    }
    return false;
}

//fonction qui est appelé lorsqu'un client envoie une frame SEND au serveur
function messageClient(requete: String[], ws: ExtWebSocket) {
    //pn regarde la destination
    let arg1 = requete[1].split(':');
    if (arg1[0] === "destination") {
        let i = requete.findIndex((element) => element === "");
        let body: String = requete.slice(i, requete.length).join(" ");
        if (body.slice(-2) === "^@") {
            body.slice(-2);
            switch (arg1[1]) {
                case "topic/sport":
                    for (let clientID of topicSport.keys()) {
                        lclients.get(clientID)?.send(envoyerMessage(ws, arg1[1], body, topicSport.get(clientID)));
                        messageID++;
                    }
                    break;
                case "topic/jeux":
                    for (let clientID of topicJeux.keys()) {
                        lclients.get(clientID)?.send(envoyerMessage(ws, arg1[1], body, topicJeux.get(clientID)));
                        messageID++;
                    }
                    break;
                case "topic/general":
                    for (let clientID of topicGeneral.keys()) {
                        lclients.get(clientID)?.send(envoyerMessage(ws, arg1[1], body, topicGeneral.get(clientID)));
                        messageID++;
                    }
                    break;
                default:
                    ws.send(envoyerErreur("la destination est inconnue", "Impossible d envoyer le message a la destination car inconnue", requete));
                    break;
            }
        } else {
            ws.send(envoyerErreur("requete mal formée", "il manque ^@ a la fin", requete))
        }
    } else {
        ws.send(envoyerErreur("le header destination est mal formé", "le header destination est obligatoire et doit avoir en valeur un topic existant", requete));
    }

}

//"MESSAGE":
//required: destination, message-id, subscription

function envoyerMessage(ws: ExtWebSocket, dest: string, body: String, abonnementId: number | undefined) {
    if (abonnementId === undefined) {
        return envoyerErreur("le header subscription est mal formé", "l'id n'existe pas", [""]);
    } else {
        return "MESSAGE\nsubscription:" + abonnementId + "\nmessage-id:" + messageID + "\ndestination:" + dest + "\ncontent-type:text/plain\n\n" + body + "\n^@";
    }

}


//fonction qui permet la création d'un identifiant unique pour un client qui se connecte au serveur
function idUnique() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
}

//Modification de l'objet websocket pour ajouter un identifiant dans le but de faciliter la manipulation des clients.
interface ExtWebSocket extends WebSocket {
    id: string;
}