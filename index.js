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
    user: "",
    password: "",
    host: "",
    database: "",
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
manager.register(new Bot.Command('ping',async (manager,message) => {
    message.reply('yo!');
}));


// exemple de système de connection
manager.register(new Bot.Command('set-nickname',async (manager,message) => {

    // on ajoute/met à jour le nickname de l'utilisateur
    var res = await manager.set_data({
      table: "public.users_test",
      identifiers: ['guild_id','user_id'],
      columns: ['guild_id','user_id','user_nickname','user_data'],
      values: [
        message.guild.id,
        message.author.id,
        message.content.substring(message.content.indexOf(' ')+1),
        "what you want here :) (more interesant to put JSON object here)"
      ]
    });

    // si tout c'est bien passé
    if (res) {
      message.reply('bien reçu !');
    }

    // s'il y a eu un problème
    else {
      message.reply('oops, une erreur est survenue !');
    }
}));

manager.register(new Bot.Command('get-nickname',async (manager,message) => {

    // on récupère le nickname de l'utilisateur
    var res = await manager.get_data({
      table: "public.users_test",
      identifiers: ['guild_id','user_id'],
      values: [
        message.guild.id,
        message.author.id
      ]
    });

    // si tout c'est bien passé
    if (res) {

      // on regarde si l'utilisateur possède un nickname
      if (res.rows.length > 0) {
        message.reply(`votre nickname est "${res.rows[0].user_nickname}"`);
      } else {
        message.reply(`vous n'avez pas de nickname !`);
      }
      
    }

    // s'il y a eu un problème
    else {
      message.reply('oops, une erreur est survenue !');
    }
}));

manager.register(new Bot.Command('del-nickname',async (manager,message) => {

    // on supprime le nickname de l'utilisateur
    var res = await manager.del_data({
      table: "public.users_test",
      identifiers: ['guild_id','user_id'],
      values: [
        message.guild.id,
        message.author.id
      ]
    });

    // si tout c'est bien passé
    if (res) {
      message.reply('votre nickname a été supprimé');
    }

    // s'il y a eu un problème
    else {
      message.reply('oops, une erreur est survenue !');
    }
}));



client.on('ready', () => {
    console.log(`[bot] Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {

    // si l'utilisateur est un bot, on fait rien
    if (msg.author.bot) return;

    // si ce n'est pas une commande on quitte
    if (!manager.is_command(msg)) return;

    // on envoie le message dans le système de commande
    var r = manager.handle(msg);

    // si aucune commande n'a été exécuté
    if (!r) {
      msg.reply('désolé, cette commande n\'existe pas !');
    }

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

client.login('');