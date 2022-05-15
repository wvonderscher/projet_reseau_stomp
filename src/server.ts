//node ./dist/server/server.js lancer le serveur
// ./node_modules/.bin/tsc compile
import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const app = express();
const host = "ws://localhost:8999/";
//liste des clients connectés au serveur
var lclients = new Map<String, ExtWebSocket>();

//création des différentes map pour les topic qui vont accueillir les clients et l'id de leur subscribe.
var topicSport = new Map<String, number>();
var topicJeux = new Map<String, number>();
var topicGeneral = new Map<String, number>();
//messasge id unique pour les frame MESSAGE
var messageID: number = 0;
//http server
const server = http.createServer(app);

//creation de la websocket serveur
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: ExtWebSocket) => {
    //pour manipuler les websocket clients plus facilement on ajoute un ID unique
    ws.id = idUnique();
    ws.on('message', (message: string) => {
        //On regarde la requete envoyé par le client pour la traiter
        typeRequete(splitRequete(message), ws);
    });

    //event lorsque la connexion avec le client est coupée, on le supprime de la liste des clients du serveur
    ws.on('close', event => {
        if (lclients.has(ws.id)) {
            lclients.delete(ws.id);
        }
    });
});

server.listen(process.env.PORT || 8999, () => {
    console.log("serveur demarré");
});



/**
 * fonction dans laquelle on vérifie si la requête envoyée est reconnue pour ensuite la traiter avec les différentes fonctions créées.
 * @param requete frame envoyée par le client
 * @param ws client expediteur
 */
function typeRequete(requete: String[], ws: ExtWebSocket) {
    if (requete[requete.length - 1].includes("^@")) {
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
                ws.send(envoyerErreur("Frame non reconnue", "Le serveur n a pas reconnue la Frame envoyée", requete));
        }
    } else {
        ws.send(envoyerErreur("Requête mal formée", "il manque les caractères ^@ pour fermer la requête", requete));
    }
}

/**
 * fonction qui permet de split une requete dans le but de traiter les différentes parties
 * @param msg requete entière
 * @returns requete dans un array
 */
function splitRequete(msg: string): String[] {
    return String(msg).split(/\r?\n/);
}



/**
 * fonction qui permet la construction de le frame ERROR lorsqu'un problème est detecté dans une requete d'un client
 * @param msgHeader résumé de l'erreur
 * @param msgBody message d'erreur
 * @param requete requête du client qui a causé l'erreur
 * @returns la frame
 */
function envoyerErreur(msgHeader: String, msgBody: String, requete: String[]) {
    let requeteComplete = requete.join("\n");
    return "ERROR\ncontent-type:text/plain\ncontent-length:" + (requeteComplete.length + msgBody.length) + "\nmessage:" + msgHeader + "\n\nThe message:\n-----\n" + requeteComplete + "\n-----\n" + msgBody + "\n^@";
}


/**
 * fonction qui traite la requete CONNECT d'un client
 * @param requete requete du client
 * @param ws client
 */
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
                ws.send("CONNECTED\nversion:" + arg1[1] + "\n^@");
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


/**
 * fonction qui traite la requete DISCONNECT d'un client
 * @param requete requete du client
 * @param ws client
 */
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

/**
 * fonction qui traite la requete SUBSCRIBE d'un client
 * @param requete requete du client
 * @param ws client
 */
function abonnement(requete: String[], ws: ExtWebSocket) {
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

/**
 * Fonction qui traite la requete UNSUBSCRIBE d'un client
 * @param requete requete du client
 * @param ws client
 */
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

/**
 * fonction qui permet de vérifier si l'id d'abonnement d'un client donné n'existe pas deja
 * @param ws client
 * @param idAbo id  d'abonnement
 * @returns true si l'id existe deja sinon false
 */
function idAbonnementExistant(ws: ExtWebSocket, idAbo: number): boolean {
    if ((topicGeneral.has(ws.id) && topicGeneral.get(ws.id) === idAbo) || (topicJeux.has(ws.id) && topicJeux.get(ws.id) === idAbo) || (topicSport.has(ws.id) && topicSport.get(ws.id) === idAbo)) {
        return true;
    }
    return false;
}

/**
 * Fonction qui permet de traiter la frame SEND
 * @param requete requête reçue
 * @param ws client expediteur
 */
function messageClient(requete: String[], ws: ExtWebSocket) {
    //vérification des headers pour valider la bonne construction de la frame
    let arg1 = requete[1].split(':');
    if (arg1[0] === "destination") {
        //on cherche quand commence le body pour récuperer le contenu du message.
        let i = requete.findIndex((element) => element === "");
        let body: String = requete.slice(i, requete.length).join(" ");
        if (body.slice(-2) === "^@") {
            body = body.substring(0, body.length - 2);
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

/**
 * Fonction pour envoyer la Frame message aux clients inscrit à un topic
 * @param ws client
 * @param dest topic de destination
 * @param body le message
 * @param abonnementId id de l'abonnement du client inscrit au topic
 * @returns message à destination des clients sous la forme d'une frame MESSAGE
 */

function envoyerMessage(ws: ExtWebSocket, dest: string, body: String, abonnementId: number | undefined) {
    if (abonnementId === undefined) {
        return envoyerErreur("le header subscription est mal formé", "l'id n'existe pas", [""]);
    } else {
        return "MESSAGE\nsubscription:" + abonnementId + "\nmessage-id:" + messageID + "\ndestination:" + dest + "\ncontent-type:text/plain\n\n" + body + "\n^@";
    }

}



/**
 * fonction qui permet la création d'un identifiant unique pour un client qui se connecte au serveur
 * @returns identifiant
 */
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