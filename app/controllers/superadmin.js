var express = require('express')
  , router 	= express.Router()
  , log		= require('winston')
  , auth 	= require('../helpers/auth')
  , jade	= require('jade')
  , User 	= require('../models/user')
  , Client 	= require('../models/client')
  , Logs 	= require('../models/log')
  , _moment = require('moment')
  , appSettings = require('./../../settings')
  
var uls = require('../helpers/userlevels');
var monitor 	= require('monitor').start();

// Socket jutut  
var io 				= require('socket.io')(appSettings.socketPort+1);
var adminSocket = io.of("/superadmin");


// System statsit 
var options = {
  hostName: 'localhost',
  probeClass: 'Process',
  initParams: {
    pollInterval: 10000
  }
}

var processMonitor = new Monitor(options);
var lastMonitorData;

processMonitor.on("change", function(){
	lastMonitorData =  processMonitor.toJSON();
	adminSocket.emit("monitor", lastMonitorData);
})
	
adminSocket.on("connection", function(adminClient){
	
	console.log("Admin connected");
	
	adminClient.emit("monitor", lastMonitorData);
	
	adminClient.on("requestLogs", function(data){
		log.stream({ start: data.offset }).on('log', function(log) {
			adminClient.emit("logEntry", log);
		});
		
	})
  
});






processMonitor.connect(function(error) {
  if (error) {
    console.error('Error connecting with the process probe: ', error);
    process.exit(1);
  }
});

router.get('/users', auth.authAdmin, function(req, res) {
	User.getUsers(function(err, users){
		res.render('blocks/superadmin/users', {userlevelStrings:uls, users: users})
	});
});

router.get('/logs', auth.authAdmin, function(req, res) {
	/*
	Logs.getLogs(function(err, logs){
		logs.reverse();
		
	});
	*/
	res.render('blocks/superadmin/log', {_moment:_moment, appSettings:appSettings, userlevelStrings:uls})

});


//app.get('/log', auth.authAdmin, serveIndex('../logs', {'icons': true}))



router.get('/admn', auth.authAdmin, function(req, res) {
	
	Client.getClients(function(err,clients){
		//log.add("SuperAdmin access", "", req.session.user.email)
		var cArr = [];
		var clientsTotal = clients.length;
		if(clientsTotal > 0){
			clients.forEach(function(c){
				c.getUsers(function(err, cUsers){
					c.currentUsers = cUsers;
					cArr.push(c);
					clientsTotal--;
					if(clientsTotal == 0){
						res.render('blocks/superadmin/admn', {clients:cArr, userlevelStrings:uls})
					}
				});
			
			});
		}
		else {
			res.render('blocks/superadmin/admn', {clients:cArr, userlevelStrings:uls})
		}
		/*
		User.getUsers(function(err, users){
			console.log(users);
		
		});
		*/
	})
});

router.get('/', auth.authAdmin, function(req,res){
	res.render('blocks/superadmin/view', {userlevelStrings:uls, appSettings:appSettings})
	
});

module.exports = router