# projet_reseau_stomp
Code du projet de réseau avec NodeJs

Ce projet implémente le protocole STOMP qui permet en tant que client de s'abonner/désabonner a des topics (général, jeux et sport) et envoyer des messages à ces derniers, ceux abonné au topic dans lequel un message est envoyé le recevrons.

info : dans le client.html, le topic choisi dans la liste est celui pour lequel le message est destinataire

# Comment utiliser notre projet ?

Dans le répertoire du projet, vous trouverez 2 scripts nommés "demarrer.bat" & "demarrer.sh", il vous suffit d'exécuter si vous êtes sous Linux/MacOS : "demarrer.sh" et si vous êtes sous windows : "demarrer.bat".
Cela va démarrer le serveur Node.js et ouvrir un client sur navigateur. Pour faire du multiclient il suffit d'ouvrir d'autres clients (src/client.html)

Si les script ne fonctionnent pas, alors il suffit de lancer la commande depuis la racine : "node ./dist/server/server.js" dans une invite de commande, ce qui va démarrer le serveur, pour un avoir un client, il suffit d'ouvrir dans le répertoire src, le fichier client.html

## Rapport

le rapport se trouve dans la racine du projet "rapport_projet_reseau.pdf".

## Créateurs

- William VONDERSCHER
- Léo ZANZI
- Sofiane CHELH
