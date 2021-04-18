// On récupère toutes les classes pour pouvoir manipuler notre bot plus facilement
const Bot = require('../bot');



// quelques constantes pour définir les erreurs
const PERSO_ENUM_CODE = {

  SUCCESS        : 0x0,  // tout s'est bien passé

  ERROR_NOT_FOUND: 0x1,  // le perso n'existe pas
  ERROR_NO_DATA  : 0x2,  // l'utilisateur n'a pas encore de données
  ERROR_DATABASE : 0x3,  // des erreurs concernant la base de données
  ERROR_PARSING  : 0x4,  // des erreurs lors du parsage de données (JSON.parse())


  ERROR_ALREADY_EXIST_NAME: 0x5,
  ERROR_ALREADY_EXIST_PREFIX: 0x6

};


String.prototype.rim = function(v) {
  return this.replace(/[^\\$]\$\d/g,function(m){
    try {
      return m[0] + v[parseInt(m.substring(2))-1];
    } catch (e) {
      return m[0] + 'null';
    }
  });
};


class PersoError extends Error {

  /**
   * @param {PERSO_ENUM_CODE} code
   * @param {Array.<String>} values
   */
  constructor(code,values) {
    super(PersoError.getMessage(code,values));
    this.errcode = code;
    this.name = 'PersoError';
  }

  /**
   * permet de récupérer le texte du code
   * @param {PERSO_ENUM_CODE} code
   * @param {Array.<String>} values
   */
  static getMessage(code,values) {
    switch (code) {
      case PERSO_ENUM_CODE.ERROR_NOT_FOUND:
        return 'le perso \`$1\` est introuvable.'.rim(values);
        break;
      case PERSO_ENUM_CODE.ERROR_NO_DATA:
        return 'aucune donnée.';
        break;
      case PERSO_ENUM_CODE.ERROR_DATABASE:
        return 'problème avec la base de données.';
        break;
      case PERSO_ENUM_CODE.ERROR_PARSING:
        return 'impossible de parser les données ! Veuillez réparer les données manuellement puis veuillez ensuite mettre à jour manuellement la base de données !! (je ne peux rien faire, je ne suis qu\'un simple bot)\n```$1```'.rim(values);
        break;
      case PERSO_ENUM_CODE.ERROR_ALREADY_EXIST_NAME:
        return 'le perso \`$1\` existe déjà.'.rim(values);
        break;
      case PERSO_ENUM_CODE.ERROR_ALREADY_EXIST_PREFIX:
        return 'le préfix \`$1\` existe déjà.'.rim(values);
        break;
      default:
        return 'undefined error';
    }
  }

}


// une classe pour contrôler les persos et pour factoriser du code
// @private
class Perso {

  constructor(settings) {
    settings = settings || {};
    var opts = this.getProperties();
    for (var p in opts) {
      if (opts.hasOwnProperty(p)) {
        this[p] = typeof settings[p] !== 'undefined' ? settings[p] : opts[p];
      }
    }
  }

  /**
   * permet de sérializer un objet Perso
   */
  serialize() {
    var opts = this.getProperties();
    var obj = {};
    for (var p in opts) {
      if (opts.hasOwnProperty(p)) {
        obj[p] = typeof this[p] !== 'undefined' ? this[p] : opts[p];
      }
    }
    return obj;
  }

  /**
   * renvoie les propriétés d'un perso avec les valeurs par défaut
   * @return {Object} retourne les propriétés
   */
  getProperties() {
    return {
      name: 'no name',
      prefix: '>>',
      avatar: 'https://pbs.twimg.com/media/EV1HX5-XQAEIPtW.png',
      inventory: [],
      money_pocket: 100,
      money_bank_list: [],
      job: 0, // 0 => pour aucun job
      health: 100,
      food: 100
    }
  }

  /**
   * permet de récupérer un perso facilement en un appel
   * 
   * @param {Manager} manager - un manager (@see bot.js) (pour les requêtes SQL)
   * @param {Discord.Message} message
   * @param {String} name - nom du perso
   * 
   * @return {Perso} renvoie le perso créé
   */
  static async get_perso(manager,message,name) {

    // on récupère les données de l'utilisateur
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

      // on regarde si l'utilisateur possède des données
      if (res.rows.length > 0) {

        var user = res.rows[0];

        var data = {};

        // on essai de parse des données
        try {
          data = JSON.parse(user.user_data);
        } catch (e) {
          throw new PersoError(PERSO_ENUM_CODE.ERROR_PARSING,[user.user_data]);
        }

        // on ajoute la propriété "perso" si elle n'existe pas
        if (typeof data.perso === 'undefiend') {
          data.perso = [];
        }

        // on itère sur les perso
        for (var i = 0; i < data.perso.length; i++) {
          if (data.perso[i].name == name) {
            return new Perso(data.perso[i]); // en renvoie un perso
          }
        }

      }

    }
    
    // on n'a pas réussi à récup le perso
    throw new PersoError(PERSO_ENUM_CODE.ERROR_NOT_FOUND,[name]);

  }


  /**
   * permet de set un perso facilement en un appel
   * 
   * @param {Manager} manager - un manager (@see bot.js) (pour les requêtes SQL)
   * @param {Discord.Message} message
   * @param {Perso} perso - le perso à set
   */
  static async set_perso(manager,message,perso) {

    // on récupère les données de l'utilisateur
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

      var user = {
        guild_id: message.guild.id,
        user_id: message.author.id,
        user_nickname: '',
        user_data: '{}'
      };
      var data = {};

      // on regarde si l'utilisateur possède des données
      if (res.rows.length > 0) {
        user = res.rows[0];
      }

      // on essai de parse des données
      try {
        data = JSON.parse(user.user_data);
      } catch (e) {
        throw new PersoError(PERSO_ENUM_CODE.ERROR_PARSING,[user.user_data]);
      }

      // on ajoute la propriété "perso" si elle n'existe pas
      if (typeof data.perso === 'undefiend') {
        data.perso = [];
      }

      var is_set = false; // si on a réussi à mettre à jour

      // on itère sur les perso pour vérifier qu'il n'existe pas déjà
      for (var i = 0; i < data.perso.length; i++) {
        if (data.perso[i].name == perso.name && !is_set) {
          data.perso[i] = perso.serialize();
          is_set = true;
        }
        if (data.perso[i].prefix == perso.prefix) {
          throw new PersoError(PERSO_ENUM_CODE.ERROR_ALREADY_EXIST_PREFIX,[perso.prefix]);
        }
      }

      // sinon on ajoute :
      if (!is_set) {
        data.perso.push(perso.serialize());
      }
        

      // on met à jour la base de données
      var res = await manager.set_data({
        table: "public.users_test",
        identifiers: ['guild_id','user_id'],
        columns: ['guild_id','user_id','user_nickname','user_data'],
        values: [
          user.guild_id,
          user.user_id,
          user.user_nickname,
          JSON.stringify(data)
        ]
      });

      // si tout c'est bien passé
      if (res) {
        return true;
      }

      // s'il y a eu un problème
      else {
        throw new PersoError(PERSO_ENUM_CODE.ERROR_DATABASE);
      }

    }
    
    // on n'a pas réussi à récup le perso
    throw new PersoError(PERSO_ENUM_CODE.ERROR_NOT_FOUND,[name]);

  }

}


// On stock les commandes dans un tableaux
var perso_commands = [];

perso_commands.push(new Bot.Command('perso-create',async (manager,message) => {
    
    // syntax command : "nom du perso" "prefix"
    var args_raw = message.content.substring(message.content.indexOf(' ')+1).trim();
    var args = args_raw.split(' ');

    // On regarde s'il y a assez d'arguments:
    if (args.length < 2) {
      message.reply("pas assez d'arguments.\nUsage : perso-create <name> <prefix>\nExemple : perso-create Flammrock >>");
      return;
    }

    var name = args[0].trim();
    var prefix = args[1].trim();

    try {

      // on récupère le perso
      var perso = await Perso.get_perso(manager,message,name);

      // on veut justement que le perso n'existe pas (pour pouvoir le créer)
      message.reply(PersoError.getMessage(PERSO_ENUM_CODE.ERROR_ALREADY_EXIST_NAME,[name]));

    } catch (e) {
      
      try {
        await Perso.set_perso(manager,message,new Perso({
          name: name,
          prefix: prefix
        }));
      } catch (e) {
        message.reply(e.message);
      }

    }





}));

perso_commands.push(new Bot.Command('perso-edit',async (manager,message) => {
    message.reply('perso-edit');
}));

perso_commands.push(new Bot.Command('perso-delete',async (manager,message) => {
    message.reply('perso-delete');
}));


// On export tout ça ;)
module.exports = perso_commands;