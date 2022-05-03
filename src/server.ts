import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const app = express();
const connectionRegex = /^CONNECT/;
const host = "ws://localhost:8999/";
const clientConnected = [];
//créer liste des subscribe

//initialize a simple http server
const server = http.createServer(app);


//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: WebSocket) => {

    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {


        //log the received message and send it back to the client
        console.log('received: %s', message);

        //On regarde la requete envoyé par le 
        typeRequete(splitRequete(message), ws);
    });

    //send immediatly a feedback to the incoming connection    
    ws.send('connecté');
});

//start our server
server.listen(process.env.PORT || 8999, () => {
    //console.log(`Server started on port ${server.address().port} :)`);
});

//fonction qui va vérifier si la frame de la requete existe et traiter cette dernière.
function typeRequete(requete: String[], ws: WebSocket){
    
    switch(requete[0]){
        case "CONNECT":
            //required: accept-version ,host


        break;
        case "SEND":
            //required: destination
        break;
        case "SUBSCRIBE":
            //required: destination, id
        break;
        case "UNSUBSCRIBE":
            //required: id
        break;
        case "ACK":
            //required: id
        break;
        case "DISCONNECT":
            //required:
        break;
        default:
            //si aucune des Frames est connue, on renvoie ERROR pour prévenir le client
    }
}


//fonction qui permet de split une requete dans le but de traiter le différentes parties.
function splitRequete(msg: string): String[]{
    return String(msg).split(/\r?\n/);
}

//CE QUE LE SERVEUR RECOIT
//"MESSAGE":
    //required: destination, message-id, subscription

    function envoyerMessage(){

    }
//"RECEIPT":
    //required: receipt-is


    //fonction qui permet l'envoie à un client une frame ERROR
function envoyerErreur(msgHeader: String, msgBody: String){
    return "ERROR\nmessage:"+msgHeader+"\n"
}

function connecting(rqt: String[]){
    //verification des headers
    //si un header mal formé : return ERROR
    //si tout bon : on ajoute le client dans la liste des clients connectes
    let arg1= rqt[1].split(':');
    if((arg1[0] === "accept-version") && (arg1[1] === "1.2" || arg1[1] === "1.1" || arg1[1] === "1.0") ){
        
    }
}