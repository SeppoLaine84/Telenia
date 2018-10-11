var logger 		= require('winston');
var moment 		= require('moment');
var Log 		= require('./../models/log.js');
var Client		= require('./../models/client');
var ErrorGrid	= require('./../models/errorGrid')
var settings	= require("./../../settings");
//var sendGrid	= require('./sendgrid');

var levels = {
	levels:{debug: 0,info: 1,silly:2,warning: 3,warn:3, kampanja:4,client:5,kuittaus:6,mongo:7,pageLoad:1,sendgrid:1,sentEmail:1, slowPage:8, error:9,},
	colors:{debug:'green', info:'cyan', silly:'magenta', kampanja:"magenta", client:"magenta", kuittaus:"green",warn:'yellow', warning:'yellow', mongo:'magenta', error:'red',slowPage:'red', pageLoad:'cyan',sendgrid:'blue', sentEmail:"red"},
}

var l;
var env =  process.env.NODE_ENV || "development";
if(env == "development"){
	l = new logger.Logger({
		level:"error",
		levels:levels.levels,
		transports: [
			new (logger.transports.Console)({'timestamp':true, colorize:true, handleExceptions: true, humanReadableUnhandledException: true }),
			new (logger.transports.File)({'timestamp':true, filename: settings.logs.defaultDir+settings.logs.defaultFile,  handleExceptions: true, humanReadableUnhandledException: true })
		]
	})
}
else {
	l = new logger.Logger({
		level:"error",
		levels:levels.levels,
		transports: [
			new (logger.transports.File)({ 'timestamp':true, filename: settings.logs.defaultDir+settings.logs.defaultFile,  handleExceptions: true, humanReadableUnhandledException: true })
		]
	})
}
logger.addColors(levels.colors);

/*
logger.add(require('winston-irc'), {
	handleExceptions: true, 
	humanReadableUnhandledException: true, 
	host: 		'irc.stealth.net',
	nick: 		'teleniumBOT',
	realName:	'teleniumBOT',
	level:		"error",
	channels: {
		'#telenium-log': true,
		'#telenium.fi': ["error"],
	}
	
});
*/

l.on('logging', function (transport, level, msg, meta) {
	if(transport.name == "file")
	{
		
		
		if(level == "error"  && env == "production" ) {
			ErrorGrid.findOne({msg:msg, checked:false}).exec(function(err, errors){
				if(errors){
					errors.count += 1;
					errors.timestamps.push(new Date())
					errors.save();
					
				}
				else {
					var errorEntry = new ErrorGrid({
						msg:		msg,
						created: 	new Date(),
						meta:		meta,
						count: 		1,
						checked:	false,
						appVersion:	settings.version
					});
					errorEntry.timestamps.push(new Date())
					errorEntry.save();
					
				}
			})
			
			//sendGrid.sendError({msg:msg})
		}
		var LogEntry = new Log({level:level, msg:msg, meta:meta, timestamp: new Date(), appVersion: settings.version})
		LogEntry.save();
	}
	
});

process.on('uncaughtException', function(err) {
	//console.log(err);
    l.log('error', err, err, function(err, level, msg, meta) {
		//console.log(err,level,msg,meta)
     //   process.exit(1);
    });
});

logger.exitOnError 	= false;
module.exports 		= l;