var express 		= require('express')
var router 			= express.Router();
var appSettings		= require("./../../settings");
var _ 				= require('underscore')
  , moment			= require('moment')
  , auth 			= require('../helpers/auth')  
  , uls 			= require('../helpers/userlevels')  
  , Client 			= require('../models/client')  
var pm2				= require('pm2');
var mongo 		= require('mongodb');
var ObjectId 	= mongo.ObjectID;
function formatBytes(bytes,decimals) {
   if(bytes == 0) return '0 Byte';
   var 	k 		= 1000;
   var dm	 	= decimals + 1 || 3;
   var sizes 	= ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i		= Math.floor(Math.log(bytes) / Math.log(k));
   return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
}
	
 var pmx = require('pmx').init({
  http          : true, // HTTP routes logging (default: true)
  ignore_routes : [/notFound/], // Ignore http routes with this pattern (Default: [])
  errors        : true, // Exceptions loggin (default: true)
  custom_probes : true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics
  network       : true, // Network monitoring at the application level
  ports         : true  // Shows which ports your app is listening on (default: false)
}); 

 
router.get('/', auth.authAdmin,  function(req, res) {
	if(!req.session.user)
		res.render('login', {appSettings:appSettings,  fullDomain: req.headers.host});
	else {
		pm2.connect(function(err){
			if (err) {
				console.error(err);
				process.exit(2);
			}
			pm2.list(function(err, processes){
				var processIDS = [];
				var left = processes.length;
				processes.forEach(function(_proc){
					
					pm2.describe(_proc.pm_id, function(err, processDesc){
						
						processIDS.push(processDesc)
						left--;
						if(left == 0)
							res.render("admin/index", {formatBytes:formatBytes,url:"admin", page:"admin/index", pageTitle:"ADMIN", pageIcon:"home", loadingText: "Ladataan sivua...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, userlevel:4, proc:processIDS, nodeEnv:process.env.NODE_ENV ||"development"});
					});
				});
			
				
				
			});
		});
		
		
	}
	
});


router.get('/errorCenter', auth.authAdmin, function(req, res){
	res.render("admin/errorCenter", {url:"admin/errorCenter", page:"admin/errorCenter", pageTitle:"ADMIN - VirheKeskus", pageIcon:"bug", loadingText: "Ladataan sivua...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, userlevel:4,});	
})

router.get('/slowPages', auth.authAdmin, function(req, res){
	res.render("admin/slowPages", {url:"admin/slowPages", page:"admin/slowPages", pageTitle:"ADMIN - Hitaat sivut", pageIcon:"bug", loadingText: "Ladataan sivua...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, userlevel:4,});	
})

router.get('/email', auth.authAdmin, function(req, res){
	res.render("admin/email", {url:"admin/email", page:"admin/email", pageTitle:"ADMIN - Sähköpostit", pageIcon:"envelope-o", loadingText: "Ladataan sivua...",  _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, userlevel:4,});	
})


router.get('/client/:id', auth.authAdmin, function(req, res){
	var id = ObjectId(req.params.id);
	
	Client.findById(id).exec(function(err, client){
		
		res.render("admin/client-edit", {url:"admin/client-edit", page:"admin/client-edit", pageTitle:"ADMIN - Asiakkaan muokkaus", pageIcon:"user", loadingText: "Ladataan sivua...",  _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, userlevel:4,client:client, moment:moment});	
	});
	
})


	
module.exports = router