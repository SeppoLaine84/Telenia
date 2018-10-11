var _pmx 	= require('pmx');
var pm2 	= require('pm2');
var events 	= require('./events')
var sysLog 	= require('./../models/system')

var require = {
	
	init: function(){
		_pmx.init({
		  http          : true, // HTTP routes logging (default: true)
		  ignore_routes : [/notFound/], // Ignore http routes with this pattern (Default: [])
		  errors        : true, // Exceptions loggin (default: true)
		  custom_probes : true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics
		  network       : true, // Network monitoring at the application level
		  ports         : true  // Shows which ports your app is listening on (default: false)
		}); 
		_pmx.http();
		
		
		
		
		pm2.connect(function(err){
			if (err) {
				console.error(err);
				process.exit(2);
			}
		});
		
		events.on("pm2.get.info", function(ids){
		
				pm2.list(function(err, processes){
					var processIDS = [];
					var left = processes.length;
					processes.forEach(function(_proc){
						
						pm2.describe(_proc.pm_id, function(err, processDesc){
							
							processIDS.push(processDesc)
							left--;
							if(left == 0)
								events.emit("pm2.send.info", {descs:processIDS, socketID:ids.socketID})
							
						});
					});
				
					
					
				});
			
	
		});
	
		return true;
	},
	pmx:_pmx,
	probe:_pmx.probe(),
	startLogger: function(){
		setInterval(function(){
			
				pm2.list(function(err, processes){
						
					processes.forEach(function(_proc){
						
						pm2.describe(_proc.pm_id, function(err, processDesc){
						
							if(processDesc[0].name == "telenia"){
								var _syslog = new sysLog({
									timestamp: new Date(),
									cpu: processDesc[0].monit.cpu ,
									mem:processDesc[0].monit.memory,
								})
						
								_syslog.save();
							}
							
							
						});
					});
				
					
					
				});
		
			
		},1000);
		
	},
	restart: function(){
		
		console.log('Restart Time!');
		setTimeout(function(){
			
			pm2.gracefulReload("telenia", function(){
			
			})
		},2000);
	}

}
 module.exports = require;