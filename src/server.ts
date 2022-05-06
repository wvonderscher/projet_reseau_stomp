//node ./dist/server/server.js lancer le serveur
// ./node_modules/.bin/tsc compile



import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const app = express();
const connectionRegex = /^CONNECT/;
const host = "ws://localhost:8999/";

var lclients: ListClients = {};
//créer liste des subscribe

//initialize a simple http server
const server = http.createServer(app);


//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });


wss.on('connection', (ws: ExtWebSocket) => {
    ws.id = idUnique();
    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {
        //log the received message and send it back to the client
       // console.log('received: %s', message);
        
       
        //On regarde la requete envoyé par le client
        typeRequete(splitRequete(message), ws);
        
    });


    //send immediatly a feedback to the incoming connection    
    ws.send('You are connected');

    
    //quand l'utilisateur ferme sa connexion (ne fonctionne pas)
//     ws.on('close', event =>{
//         let i =0;
//             clientConnected.forEach(element => {
//                 if(element === ws){
//                     delete clientConnected[i];
//                 }
//                 i++;
//             });
//     });
 });



//start our server
server.listen(process.env.PORT || 8999, () => {
    //console.log(`Server started on port ${server.address().port} :)`);
});

//fonction qui va vérifier si la frame de la requete existe et traiter cette dernière.
function typeRequete(requete: String[], ws: ExtWebSocket){
    
    switch(requete[0]){
        case "CONNECT":
            //required: accept-version ,host
            if(!inclusClient(lclients, ws)){
                connecting(requete,ws);
            }else{
                ws.send(envoyerErreur("deja connecté","Vous etes deja connecte au serveur",requete));
            }
            
            console.log(lclients);
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
        case "DISCONNECT":
            //required:
            seDeconnecter(requete,ws);
        break;
        default:
            console.log(lclients);
            ws.send(envoyerErreur("Frame non reconnue","Le serveur n a pas reconnue la Frame envoyée",requete));
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
function envoyerErreur(msgHeader: String, msgBody: String, requete: String[]){
    let requeteComplete: String = "";
    requete.forEach(element => {requete.concat(element+"\n")});
    console.log("ERROR\ncontent-type:text/plain\ncontent-length:"+(requeteComplete.length+msgBody.length)+"\nmessage:"+msgHeader+"\n\nThe message:\n-----"+requeteComplete+"\n-----\n"+msgBody+"\n^@");
    
    return "ERROR\ncontent-type:text/plain\ncontent-length:"+(requeteComplete.length+msgBody.length)+"\nmessage:"+msgHeader+"\n\nThe message:\n-----"+requeteComplete+"\n-----\n"+msgBody+"\n^@";
}

//Fonction pour valider la connexion d'un client avec la frame CONNECT
function connecting(requete: String[], ws:ExtWebSocket){
    //verification des headers
    //si un header mal formé : return ERROR
    //si tout bon : on ajoute le client dans la liste des clients connectes
    let arg1= requete[1].split(':');
    let arg2= requete[2].split(':');
    if((arg1[0] === "accept-version") && (arg1[1] === "1.2" || arg1[1] === "1.1" || arg1[1] === "1.0") ){
        if(arg2[0] === "host" && (arg2[1] === "localhost")){
            //connexion bonne
               // clientConnected.push(ws);
                lclients[ws.id] = ws;
                ws.send("CONNECTED\nversion:"+arg1[1]+"\n^@"); 
        }
        else{
            ws.send(envoyerErreur("la frame CONNECT est mal formée","il manque le header host qui est nécessaire",requete));
        }
    } else{
        ws.send(envoyerErreur("la frame CONNECT est mal formée","Il manque le header accept-version qui est nécessaire",requete));
    }
}

//fonciton qui permet de deconnecter un client du serveur
function seDeconnecter(requete: String[], ws:ExtWebSocket){
    //si requete est bonne, on supprimer le client de la liste des clients connectes
    let arg1= requete[1].split(':');
    if(arg1[0]==='receipt' && arg1[1] !== ""){
        //revoir comment supprimer 
                delete lclients[ws.id];
                ws.send("RECEIPT\nreceipt-id:"+arg1[1]+"\n^@");
    }
    else{
        ws.send(envoyerErreur("la Frame DISCONNECT est mal formée", "il manque le header receipt qui est necessaire", requete));
    }
}

function idUnique () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
}

function inclusClient(l: ListClients, ws:ExtWebSocket ){
    if(l != null || l != undefined){
        let clefs = Object.keys(l);
        clefs.forEach((clef, element)=>{
            if(l[clef].id === ws.id){
                return true;
            }
        });
    }
    return false;
}

interface ExtWebSocket extends WebSocket {
    id: string; // your custom property
  }
interface ListClients {
    [key: string]: ExtWebSocket;
}