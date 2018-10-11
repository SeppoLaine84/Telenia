var spawn  		= require('child_process').spawn;
var log 		= require('./../helpers/log')
var appSettings = require('./../../settings');


// Botin asetukset
var settings = {
	mongoDumpPath: 	"/usr/bin/mongodump",	// mongodump filen sijainti
	backupPath: 	"",
	
	backupOnStart:  false,					// backupataanko kun ohjelma käynnistetään?
	
}

function mongoDump(ready){
	var args 		= ['--db', appSettings.db.dbName];
	var mongodump 	= spawn(settings.mongoDumpPath, args);
	
	log.log('info', "Aloitetaan MongoDB Backup");
	mongodump.stdout.on('data', function (data) {
		
	});
	mongodump.stderr.on('data', function (data) {
		//log.log('info', data);
	});
	mongodump.on('exit', function (code) {
		log.log('info', 'MongoDB backup valmis');
		if(ready)ready();
	});
	
}

if(settings.backupOnStart == true)
	mongoDump();


module.exports = {
	
	backup: function(cb){
		mongoDump(cb);
	}
}	
