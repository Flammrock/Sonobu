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
    constructor(name,action) {
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
     * @param {Command} command 
     */
    register(command) {
        this.commands[command.getName()] = command;
        command.bindAction(this);
    }

    /**
     * Permet d'observer un event
     * @param {string} eventName - nom de l'event
     * @param {function} eventFn - fonction associé
     * @return {boolean} retourne true si l'event a été ajouté, false sinon
     */
    on(eventName,eventFn) {
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
    execute(name,message) {
        if (typeof this.commands[name] !== 'undefined' && this.commands[name] instanceof Command) {
            this.commands[name].getAction()(message);
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
            return this.execute(tokens[0],message);

        }

        // aucune commande n'a été appelé, on renvoie false
        return false;
    }

    /**
     * Permet de récuoérer des données de la base
     * @param {Object} settings - paramètres
     * @param {string} settings.table - nom de la table
     * @param {Array.<string>} settings.columns - les colonnes
     * @param {Class} settings.class - classe qui va permettre de constuire les objets
     * @param {string} settings.condition - condition avec WHERE
     * @param {string} settings.additional - à ajouter en plus de la requête (e.g. ORDER BY, etc...)
     * @return {Class[]} retourne les éléments construit avec la classe
     */
    async get_data(settings) {

        // on définit les paramètres par défaut
        settings = settings || {};


        // s'il n'y a pas de base de données connecté, on quitte directe
        if (this.pool == null) return null;

        // on récupère un client
        const client = this.pool.connect();

        // on essai d'exécuter la requête sql
        try {
            const res = await client.query('SELECT * FROM $1 WHERE id = $1', [1])
            return res;
        } finally {

            // on a plus besoin du client
            client.release();

        }
    }

    /**
     * Permet de propager un event
     * @param {string} eventName - le nom de l'event à propager
     * @param {*} eventData - les données qu'on envoie
     */
    fire(eventName,eventData) {
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
    async connect(database,callback) {
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