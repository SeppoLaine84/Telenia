/* PROSESSI MANAGERI */
var pman = require('./app/helpers/pm2');
pman.init();
var schedule = require('node-schedule');

// Ohjelman asetukset
var appSettings = require("./settings");
var env = process.env.NODE_ENV || "development";
var winston = require('winston');
var log = require('./app/helpers/log');

log.log("info", "Starting Telenia " + appSettings.version + " with " + env + " mode in port:" + appSettings.port)

var express = require('express');
var app = express();
var jade = require('jade');
var fs = require('fs');
var http = require('http');
var io = require('socket.io');
var path = require('path');
var url = require('url');
var util = require('util');
var moment = require('moment');
var mongo = require('mongodb');
var crypter = require("./app/helpers/crypter");

// Filen uploadimiseen
var multiparty = require('multiparty');
var bodyParser = require('body-parser');

// Käytetään gzip pakkausta
var compression = require('compression');
app.use(compression());


// Eventin hallinta
var _events = require("events");
var events = new _events.EventEmitter;

 // Tiedoston mimen lukia
 var mime = require('mime');

// Excel parseri
var excelParser = require('node-xlsx');

var async = require('async');

// Ohjelman säädöt

//app.use(express.static(__dirname + '/public', { maxAge: 31557600 }));

app.use(bodyParser.json({
    limit : '150mb',
    parameterLimit : 1000000,
}));
app.use(bodyParser.urlencoded({ limit : '150mb', parameterLimit : 1000000, extended : true }));
;

// Jaden asetukset
app.set('views', __dirname + '/app/views');
app.engine('jade', require('jade').__express);
app.set('view engine', 'jade');

if(env == "production") {
    app.set('view cache', true);
}

var responseTime = require('response-time')
 app.use(responseTime(function(req, res, time) {
    var _time = Math.ceil(time), url = req.originalUrl;
    var email = "no-session";
    if(req.session)
	if(req.session.user)
	    if(req.session.user.email)
		email = req.session.user.email;
    var method = req.method.toUpperCase();
    log.log("pageLoad", method + " " + url + " " + _time + "ms", { url : url, time : _time, user : email, method : method }) 
	if(env == "production" && _time >= 2000){
		log.log("slowPage", url + " " + _time + "ms", { url : url, time : _time })
    }

}))

/*****************************************************/
/*						Mongoose					 */
/*****************************************************/
var mongoose = require('mongoose');
mongoose.set('debug', false);
var CampaignItem	= require('./app/models/campaignItem')
var Campaign		= require('./app/models/campaign')
var User			= require('./app/models/user')
var Kuittaus	 	= require('./app/models/kuittaus')
var Sales		 = require('./app/models/salesGrid')
var CP		 	= require('./app/models/customerPage')
var SiteBuilder		 	= require('./app/models/siteBuilder')

var mongo 		= require('mongodb');
var ObjectId 	= mongo.ObjectID;
var appDir 		= require('path').dirname(require.main.filename);




function createPayloadMetas(){
	
	var camps 		= {};
	var payloads 	= {};
	
	Campaign.find({}, function(err, campaigns){
		
		campaigns.forEach(function(r){
			camps[r._id.toString()] = r;
		});
		
		campaigns.forEach(function(r){
		
			CampaignItem.findOne({kampanjaID: r._id}, function(err, ci){
				if(ci){
					console.log(ci.kampanjaID);
					
					if(ci.kampanjaID){
						cid = ci.kampanjaID.toString();
					
						var r = camps[cid];
						r.payloadKeys = ci.keys;
						r.save(function(){
							console.log("saved. ")
						});
					}
				}
				
			});
		});
	});
}

function createSiteBuilderDB(){
	var builder = new SiteBuilder({
		name: "Codalia",
	});
	builder.templates.push({
		name: 			"Oletus pohja",
		description: 	"Perus pohja, ei mitään hianoja ominaisuuksia.",
		jadefile:		"default",
	})
	builder.save();
}

function removeCustomerPages(){
	CP.remove({}, function(err, res){
		console.log(err, res);
	});
	
	Campaign.find({}, function(err, res){
		res.forEach(function(r){
			r.offSiteEnabled =  false;
			r.save();
		});
		
	});
}

mongoose.connect("mongodb://" + appSettings.db.username + ":" + appSettings.db.pwd + "@" + appSettings.db.host +  appSettings.db.dbName, function(){

});

mongoose.connection.on('error', function(err) {
    log.error("Mongoose connection error", err);
});

/* SESSIONI */
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);

var sess = session({
    resave : true,
    saveUninitialized : true,
    secret : 'rgf88dF!9gdt43ANngE4!#E#$£464',
    store : new mongoStore({
		mongooseConnection : mongoose.connection,
		collection : 'sessions' // default
    }),
});
app.use(sess);

var sendGrid = require('./app/helpers/sendgrid')

mongoose.connection.once('open', function(callback) {
	log.info("Connected to mongoDB.");

	if(process.env.NODE_ENV == "production")
		pman.startLogger();
});


////////////////////////////
// BASIC WEBSERVER
var server = http.createServer(app).listen(appSettings.port, function() {
    // Ohjelman routet/näkymät
    app.use(require('./app/controllers'));
});

///////////////////////////
// 	SENDGRID BACKEND
if(env == "production")
    var sendGridServer = http.createServer(app).listen(8081, function() {});

//////////////////////////
// Socketin inittaus
var socket = require('./app/helpers/socket')(server);
var sharedsession = require("express-socket.io-session");

// Clientin sessioni linkitetään sockettiin
socket.use(sharedsession(sess, { autoSave : true }));

// Lataa Pluginit ja "botit"
var reminderApp = require('./app/helpers/call-again-reminder');

// Lähetetään myyntiraportit maanantaista perjantaihin klo 16
if(env == "production") {
    schedule.scheduleJob({ hour : 16, minute : 0, dayOfWeek : new schedule.Range(1, 5) }, function() {
		sendGrid.sendDailySalesReports();
    });

    var backupBot = require('./app/bots/backup');

    // Aloitetaan huoltotoimenpiteet 4.20 aamulla
    schedule.scheduleJob({ hour : 4, minute : 20 }, function() {

		backupBot.backup(function() {
			// pman.restart();
		});

    });
}
