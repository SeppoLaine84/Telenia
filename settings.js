
// Ohjelman asetukset ja tiedot
var appSettings = {

	// Yleiset asetukset
	name: 		"Telenia",				// Ohjelman nimi
	version: 	"1.8",					// Versio
	port:		8095,					// Noden portti
	socketPort:	8990,					// Socket.io portti
	domain:		"",						// Ohjelman domain
	
	// Tietokanta
	db: {
		host: 		"localhost:27017/",
		dbName: 	"db_name",
		username: 	"username",
		pwd: 		"password",
	},
	
	// Logit
	logs: {
		level: 			"debug", 					// Perus logitus leveli
		defaultDir:		__dirname + "/logs/",		// Oletus hakemisto
		defaultFile:	"telenia.log",
		debug: 			"debug.log",
	},
	
};

module.exports = appSettings;
