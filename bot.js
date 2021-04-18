const Discord = require('discord.js');
const client = new Discord.Client();
const pg = require('pg');
//const { createCanvas, loadImage } = require('canvas');

/**
 * Permet de stocker les info de connections
 * @class
 * @public
 */
class DatabaseToken {

    /**
     * @param {Object} settings - les info de connections
     * @param {string} settings.user - nom d'utilisateur
     * @param {string} settings.password - mot de passe
     * @param {string} settings.database - le nom de la base de données
     * @param {string} settings.host - nom de domaine / ip
     * @param {number} settings.port - port
     */
    constructor(settings) {
        settings = settings || {};

        /**
         * Le nom d'utilisateur pour la connection à un serveur PostgreSQL
         * @example "root"
         * @type {string}
         * @public
         */
        this.user = settings.user || "";

        /**
         * Le nom de la base de données pour la connection à un serveur PostgreSQL
         * @example "mydatabase"
         * @type {string}
         * @public
         */
        this.database = settings.database || "";

        /**
         * Le mot de passe pour la connection à un serveur PostgreSQL
         * @example "admin123"
         * @type {string}
         * @public
         */
        this.password = settings.password || "";

        /**
         * Le nom de domaine pour la connection à un serveur PostgreSQL
         * @example "127.0.0.1"
         * @type {string}
         * @public
         */
        this.host = settings.host || "";

        /**
         * Le port pour la connection à un serveur PostgreSQL
         * @example 5432
         * @type {number}
         * @public
         */
        this.port = settings.port || 5432;
    }

}




/**
 * Permet de gérer les différentes commandes plus facilement
 * @class
 * @public
 */
class Command {

    /**
     * @constructor
     * @param {string} name
     * @param {function} action
     */
    constructor(name, action) {
        this._name = name;
        this._action = action;
    }

    /**
     * @return {string} retourne le nom de la commande
     */
    getName() {
        return this._name;
    }

    /**
     * @return {function} retourne l'action
     */
    getAction() {
        return this._action;
    }

    /**
     * Permet de relier l'action à un manager
     * @param {Manager} manager - nouvelle environnement de l'action
     */
    bindAction(manager) {
        if (typeof this.getAction() === 'function') this._action.bind(manager);
    }

}

/**
 * Permet de gérer le bot plus facilement
 * @class
 * @public
 */
class Manager {

    /**
     * @constructor
     * @param {Discord.Client} client - client discord
     */
    constructor(client) {

        /**
         * client discord
         * @type {Discord.Client}
         * @public
         */
        this.client = client;

        /**
         * listes des commandes
         * @type {Object.<string, Command>}
         * @private
         */
        this.commands = {};

        /**
         * le préfixe du bot (par défaut : "!")
         * @type {string}
         * @public
         */
        this.prefix = '!';

        /**
         * la pool
         * @type {pg.Pool}
         * @private
         */
        this.pool = null;

        /**
         * tout les events
         * @type {Object.<string, function[]>}
         * @private
         */
        this.events = {};

    }

    /**
     * @param {string} prefix - le nouveau préfixe
     */
    setPrefix(prefix) {
        this.prefix = prefix;
    }

    /**
     * @return {string} retourne le préfixe
     */
    getPrefix() {
        return this.prefix;
    }

    /**
     * Permet d'ajouter une commande
     * @param {Command|Array.<Command>} command 
     */
    register(command) {

        // On regarde si "command" est un tableau
        if (Array.isArray(command)) {
          for (var i = 0; i < command.length; i++) {
            this.commands[command[i].getName()] = command[i];
            command[i].bindAction(this);
          }
        }

        // Sinon il s'agit d'une commande
        else {
          this.commands[command.getName()] = command;
          command.bindAction(this);
        }
       
    }

    /**
     * Permet d'observer un event
     * @param {string} eventName - nom de l'event
     * @param {function} eventFn - fonction associé
     * @return {boolean} retourne true si l'event a été ajouté, false sinon
     */
    on(eventName, eventFn) {
        if (typeof eventFn !== 'function') return false;
        if (typeof this.events[eventName] === 'undefined') {
            this.events[eventName] = [eventFn.bind(this)];
        } else {
            this.events[eventName].push(eventFn.bind(this));
        }
        return true;
    }

    /**
     * Permet d'enlever tout les observateurs
     * @param {string} eventName 
     */
    off(eventName) {
        this.events[eventName] = null;
        delete this.events[eventName];
    }

    /**
     * Permet d'exécuter une commande (si elle existe)
     * @param {string} name - nom de la commande
     * @param {Discord.Message} message - objet message
     * @return {boolean} true si la commande a été appelé sinon false si la commande n'a pas été appelé
     */
    execute(name, message) {
        if (typeof this.commands[name] !== 'undefined' && this.commands[name] instanceof Command) {
            this.commands[name].getAction()(this, message).then(() => {}).catch(console.error);
            return true;
        }
        return false;
    }

    /**
     * Permet de gérer un message et d'exécuter la commande corresponde
     * si cela correspond à une commande existante
     * @param {Discord.Message} message
     * @return {boolean} true si une commande a été appelé sinon false
     */
    handle(message) {

        // si le message a été envoyé par un bot, on ignore le message
        if (message.author.bot) return;

        // on regarde si le message commence bien par le préfixe
        if (message.content.startsWith(this.getPrefix())) {

            // on récupère le corps du message sans le préfixe
            var body = message.content.substring(this.getPrefix().length);

            // on récupère la commande
            var tokens = body.split(' ');

            // on essaie d'exécuter la commande qui porte ce nom
            return this.execute(tokens[0], message);

        }

        // aucune commande n'a été appelé, on renvoie false
        return false;
    }

    /**
     * Permet de gérer un message et de faire parler le perso du membre
     * @param {Discord.Message} message
     * @return {boolean} true si un préfix existe avec ce perso, false sinon
     */
    async handle_perso(message) {
      // sinon, on regarde si l'utilisateur utilise son perso
      var res = await this.get_data({
        table: "public.users_test",
        identifiers: ['guild_id','user_id'],
        values: [
          message.guild.id,
          message.author.id
        ]
      });
      if (res) {
        if (res.rows.length > 0) {
          var user = res.rows[0];
          var data = {};
          var perso = null;
          try {
            data = JSON.parse(user.user_data);
          } catch (e) {return false;}
          for (var i = 0; i < data.perso.length; i++) {
            if (message.content.startsWith(data.perso[i].prefix)) {
              perso = data.perso[i];
              break;
            }
          }
          if (perso != null) {
            message.delete().then(()=>{}).catch(()=>{});
            try {
              var webhook = await message.channel.createWebhook(perso.name, {avatar: perso.avatar});
              await webhook.send(message.content.substring(perso.prefix.length));
              await webhook.delete();
              return true;
            } catch (e) {message.channel.send(e.name + ': ' + e.message);}
          }
        }
      }
      return false;
    }

    /**
     * Permet de savoir si un message est une commande
     * @param {Discord.Message} message
     * @return {boolean} true s'il s'agit d'une commande, fale sinon
     */
    is_command(message) {

      // si le message a été envoyé par un bot, on ignore le message
      if (message.author.bot) return;

      return message.content.startsWith(this.getPrefix());
    }

    /**
     * Permet de récuoérer des données de la base
     * @param {Object} settings - paramètres
     * @param {string} settings.table - nom de la table
     * @param {Array.<string>} settings.columns - les colonnes
     * @param {Array.<string>} settings.identifiers - where
     * @param {*} settings.values - les valeurs
     * @param {Class} settings.class - classe qui va permettre de constuire les objets
     * @param {string} settings.additional - à ajouter en plus de la requête (e.g. ORDER BY, etc...)
     * @return {Class[]} retourne les éléments construit avec la classe
     */
    async get_data(settings) {

        // on définit les paramètres par défaut
        settings = settings || {};


        // s'il n'y a pas de base de données connecté, on quitte directe
        if (this.pool == null) return null;

        // on récupère un client
        const client = await this.pool.connect();

        // les données
        var res = false;

        // on essai d'exécuter la requête sql
        try {
            var j = 1;
            res = await client.query({
                text: 'SELECT ' + (typeof settings.columns !== 'undefined' ? settings.columns.join(',') : '*') + ' FROM ' + settings.table + ' WHERE ' +settings.identifiers.map(x => x + ' = ' + '$' + (j++) + '::text').join(' AND '),
                values: settings.values
            });
        } finally {

            // on a plus besoin du client
            client.release();

        }

        return res;
    }

    /**
     * Permet d'ajouter/mettre à jour des données de la base
     * @param {Object} settings - paramètres
     * @param {string} settings.table - nom de la table
     * @param {Array.<string>} settings.columns - les colonnes
     * @param {Array.<string>} settings.identifiers - si une ligne avec ces noms de colonnes existent déjà alors la ligne est mis à jour
     * @param {Class} settings.class - classe qui va permettre de constuire les objets
     * @param {*} settings.values - les valeurs à insérer
     * @return {boolean} retourne true si l'élément a bien été ajouter, false sinon
     */
    async set_data(settings) {

        // on définit les paramètres par défaut
        settings = settings || {};


        // s'il n'y a pas de base de données connecté, on quitte directe
        if (this.pool == null) return null;

        // on récupère un client
        const client = await this.pool.connect();

        var res = false;

        // on essai d'exécuter la requête sql
        try {

            var j = 1;

            var already_exist = false;

            var values = [];

            // on construit le tableau des valeurs
            for (var i = 0; i < settings.identifiers.length; i++) {
              for (var k = 0; k < settings.columns.length; k++) {
                if (settings.identifiers[i] == settings.columns[k]) {
                  values.push(settings.values[k]);
                }
              }
            }

            // on regarde si les données existe déjà
            if (typeof settings.identifiers !== 'undefined') {

              // on regarde
              var data = await client.query({
                text: 'SELECT ' + settings.identifiers.join(',') + ' FROM ' + settings.table + ' WHERE ' + settings.identifiers.map(x => x + ' = ' + '$' + (j++) + '::text').join(' AND '),
                values: values
              });

              // si ça existe déjà
              if (data.rows.length > 0) already_exist = true;

            }
            
            if (!already_exist) {
              // on construit la requête INSERT INTO et on l'envoie
              j = 1;
              var d = await client.query({
                  text: 'INSERT INTO ' + settings.table + ' (' + settings.columns.join(',') + ') VALUES (' + settings.values.map(x => '$' + (j++) + '::text').join(',') + ')',
                  values: settings.values
              });
              if (d.rowCount > 0) {
                  res = true;
              }
            } else {
              // on construit la requête UPDATE et on l'envoie
              j = 1;
              var d = await client.query({
                  text: 'UPDATE ' + settings.table + ' SET ' + settings.columns.map(x => x + ' = ' + '$' + (j++) + '::text').join(',') + ' WHERE '+settings.identifiers.map(x => x + ' = ' + '$' + (j++) + '::text').join(' AND '),
                  values: settings.values.concat(values)
              });
              if (d.rowCount > 0) {
                  res = true;
              }
            }
        } catch (e) {
            console.log(e);
            res = false;
        } finally {

            // on a plus besoin du client
            client.release();

        }

        return res;
    }

    /**
     * Permet de supprimer des données de la base
     * @param {Object} settings - paramètres
     * @param {string} settings.table - nom de la table
     * @param {Array.<string>} settings.identifiers - si une ligne avec ces noms de colonnes existent alors cette ligne est supprimée
     * @param {*} settings.values - les valeurs
     * @param {Class} settings.class - classe qui va permettre de constuire les objets
     * @param {Array.<string>} settings.condition - condition avec WHERE
     * @param {string} settings.additional - à ajouter en plus de la requête (e.g. ORDER BY, etc...)
     * @return {Class[]} retourne les éléments construit avec la classe
     */
    async del_data(settings) {

        // on définit les paramètres par défaut
        settings = settings || {};


        // s'il n'y a pas de base de données connecté, on quitte directe
        if (this.pool == null) return null;

        // on récupère un client
        const client = await this.pool.connect();

        // les données
        var res = false;

        // on essai d'exécuter la requête sql
        try {
            var j = 1;
            res = await client.query({
                text: 'DELETE FROM ' + settings.table + ' WHERE '+settings.identifiers.map(x => x + ' = ' + '$' + (j++) + '::text').join(' AND '),
                values: settings.values
            });
        } finally {

            // on a plus besoin du client
            client.release();

        }

        return res;
    }

    /**
     * Permet de propager un event
     * @param {string} eventName - le nom de l'event à propager
     * @param {*} eventData - les données qu'on envoie
     */
    fire(eventName, eventData) {
        if (typeof this.events[eventName] !== 'undefined') {
            for (const fn of this.events[eventName]) {
                fn(eventData);
            }
        }
    }

    /**
     * Permet de connecter le manager à une base de données
     * @param {DatabaseToken} database - le nom du fichier (e.g. "database.db")
     * @param {function} [callback] - callback appelé une fois que la connection a réussi ou échoué
     */
    async connect(database, callback) {
        var _this = this;
        try {
            if (this.pool != null) {
                await pool.end();
            }
            this.database = database;
            this.pool = new pg.Pool(database);
            this.pool.on('error', (err, client) => {
                _this.fire('sql-error', err);
            });
            if (typeof callback === 'function') callback(false);
        } catch (e) {
            if (typeof callback === 'function') callback(e);
            else throw e;
        }
    }

}


module.exports = {
    DatabaseToken: DatabaseToken,
    Command: Command,
    Manager: Manager
};