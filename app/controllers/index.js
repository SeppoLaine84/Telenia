var express 		= require('express')
var router 			= express.Router();
var appSettings		= require("./../../settings")
  , auth 			= require('../helpers/auth')
  , domainParser 	= require('../helpers/subdomain-parser')
  , log			 	= require('../helpers/log')
  , _ 				= require('underscore')
  , moment			= require('moment')
  , uls 			= require('../helpers/userlevels')  
  , CampaignItem	= require('../models/campaignItem')
  , Campaign		= require('../models/campaign')
  , Kuittaus		= require('../models/kuittaus')
  , User			= require('../models/user')
  , ContactRequest	= require('../models/contactRequest')
var mongoose			= require('mongoose');
var mongo 		= require('mongodb');
var ObjectId 	= mongo.ObjectID;
var subDomain; 		// Nykyinen subdomain

var path = require('path');
var appDir = path.dirname(require.main.filename);

router.use('/superadmin', 	require('./superadmin'));
router.use('/user', 		require('./user'));
router.use('/client', 		require('./client'));
router.use('/campaign', 	require('./campaign'));
router.use('/campaignItem', require('./campaignItem'));
router.use('/customer', 	require('./customer'));
router.use('/report', 		require('./report'));
router.use('/template', 	require('./template'));
router.use('/notify', 		require('./notify'));
router.use('/admin', 		require('./admin'));
router.use('/sitebuilder', 	require('./siteBuilder'));


function pageMeta(data){
	this.jade			= data.jade;
	this.url			= data.url;
	this.title			= data.title;
	this.icon			= data.icon;
	this.loaded			= data.loaded || false;
	this.targetElement	= data.targetElement || "body";
	this.loadingText	= "Ladataan sivua...";	
};

/*

router.get('/', function(req, res) {
	if(req.session.user)
		res.redirect("/aloitus")	
})
*/

router.use(function(req,res,next){
	//console.log(req)
	if(req.session){
		if(req.session.user){
			if(req.query.pl){
			
				
				if(mongoose.Types.ObjectId.isValid(req.query.pl)){
					var id = ObjectId(req.query.pl);
					
					CampaignItem.findById(id).exec(function(err, item){
					
						if(item){
							
							Kuittaus.findOne({payloadID: id}).exec(function(err, ord){
								var order = {campaignName:"Tieto puuttuu", payloadName: item.payload[0].value};
								if(item.clientID){
								
									if(req.session.user.clientID.toString() == item.clientID.toString()){
										if(ord) order = ord;
										req.addQuery = {
											type: 	"payload",
											error: 	false,
											title: 	"Kontakti",
											data: 	{payload:item, ord:order},
										}
										
										next();
									}
									else {
										req.addQuery = {
											type:	"payload",
											error: 	true,
											title: 	"Kontakti",
											data:	"Ei oikeutta tietoihin!",
										}
										next();
									}
								}
								else {
									req.addQuery = {
										type:	"payload",
										error:	true,
										title: 	"Kontakti",
										data:	"Virheellinen tietokanta muoto. (Versio ongelma)",
									}
									next();
								}
								
							});
						}
						else {
							req.addQuery = {
								type:	"payload",
								error:	true,
								title: 	"Kontakti",
								data:	"ID ei palauttanut tietoa.",
							}
							next();
						}
					});
					
				}
				else {
					req.addQuery = {
						type:	"payload",
						error:	true,
						title: 	"Kontakti",
						data:	"ID ei kelpaa.",
					}
					next();
				}
				
			}
			else {
				next();
			}
		}else {
			next();
		}
	}else {
		next();
	}

});


router.get('/login', function(req, res){
	req.session.destroy(function(){
		if(req.session){
			if(req.session.authenticated)
				req.session.authenticated = false;
			delete req.session;
		}
		
		res.render('login', {appSettings:appSettings,  fullDomain: req.headers.host});
	});
	
});
/*
router.get('/contact', function(req, res){
	res.sendFile(appDir+"/static_html/contact.html")
});
*/
router.post('/contact/send', function(req, res){
	res.contentType("JSON");
	var contact = new ContactRequest(req.body);
	contact.save(function(){});
	res.send({status:true});
});

router.get('/aloitus/', function(req, res) {
	
	console.log(req.addQuery);
	if(req.session)
		if(req.session.user){
			User.findById(req.session.user._id).exec(function(err, user){
				res.render('index', {url:"aloitus", page:"etusivu", pageTitle:"Etusivu", pageIcon:"home", loadingText: "Ladataan etusivua...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:user, userlevelStrings:uls, addQuery: req.addQuery});	
			});
		}
		else
			res.redirect("/login")
	else
		res.redirect("/login")

	
})

router.get('/soittolista', function(req,res){
	
	if(req.session){
		if(req.session.user){
			Campaign.findCampaignsByUserID(req.session.user._id, function(err, userCampaigns){
				var grp = [];
				CampaignItem.getUserItems(req.session.user._id, function(err, userCampaignItems){
					grp = _.groupBy(userCampaignItems, "kampanjaID");
					res.render('uudet/soittolista', {url:"soittolista", page:"uudet/soittolista", pageTitle:"Soittolista", loadingText: "Ladataan soittolistaa...", pageIcon:"book", _us:_, _moment:moment, appSettings:appSettings,  fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, userCampaigns:userCampaigns, userCampaignItems:grp});	
				});
			})
		}else {
			res.redirect("/login")
		}
	}
	else {
		res.redirect("/login")
	}
	
});

router.get('/forgotpwd', function(req, res){
	res.render('forgotpwd', {appSettings:appSettings})
});

router.get('/register',auth.authAdmin, function(req,res){
	res.render('register', {appSettings:appSettings});
});

router.get('/register/success',auth.authAdmin, function(req,res){
	res.render('register/success', {appSettings:appSettings});
});

router.get('/logout', auth.loginCheck, function(req,res){
	
	User.findById(req.session.user, function(err, user){
		
		var kuittaukset = _.groupBy(user.raportti.kuittaukset, "aika");
		kuittaukset 	= _.filter(kuittaukset, function(status){return !status.kuitattu;});
		
		res.render('logout', {appSettings:appSettings, user:user, raportti:kuittaukset});
		
	});
});


router.post('/sendgrid/post', function(req, res){

	log.log('sendgrid', "sendGrid POST", {body:req.body})
	res.sendStatus(200);
});


module.exports = router