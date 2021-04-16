const Discord = require('discord.js');
const client = new Discord.Client();

// On récupère toutes les classes pour pouvoir manipuler notre bot plus facilement
const Bot = require('./bot');

// On récupère le manager associé (et on lui passe le client discord)
const manager = new Bot.Manager(client);

// On définit un préfix pour notre bot
manager.setPrefix('$');

manager.on('sql-error', err => {

    // on affiche l'erreur dans la console
    console.error(err);

    // dès qu'il y a une erreur, on quitte
    process.exit(1);

});

// On connecte le manager vers une base de données
manager.connect(new Bot.DatabaseToken({
    user: "postgres",
    password: "flamm147",
    host: "127.0.0.1",
    database: "mydatabase",
    port: 5432
}), err => {

    // on regarde s'il y a une erreur
    if (err) {

        // on affiche l'erreur sur la console
        console.error(err);

        // si oui, on arrête le bot
        process.exit(1);

    }

    // sinon on log comme quoi tout s'est bien passé ;)
    console.log('[Manager] connected to db!');

});

// On ajoute une nouvelle commande
manager.register(new Bot.Command('ping',function(message){
    message.reply('yo!');
}));

client.on('ready', () => {
    console.log(`[bot] Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {

    manager.handle(msg);

    /*
    if (msg.content === 'ping') {
        //msg.reply('Pong!');

        const canvas = createCanvas(700, 250);
        const ctx = canvas.getContext('2d');
        
        ctx.font = applyText(canvas, msg.author.username);
	    ctx.fillStyle = '#ffffff';
	    ctx.fillText(msg.author.username, canvas.width / 2.5, canvas.height / 1.8);

        const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'welcome-image.png');
        msg.channel.send(`Bienvenue sur le serveur, ${msg.author.username}!`, attachment);

    }*/
});

client.login('token');