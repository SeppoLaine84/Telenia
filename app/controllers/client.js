var express 		= require('express')
  , router 			= express.Router()
  , log				= require('../helpers/log')
  , auth 			= require('../helpers/auth')
  , Client 			= require('../models/client')
  , User 			= require('../models/user')
  , Kampanja		= require('../models/campaign')
  , KampanjaItem	= require('../models/campaignItem')
  , Notify			= require('../models/notify')
  , Raportti		= require('../models/report')
  , Customer		= require('../models/customer')

var mongo 		= require('mongodb');
var ObjectId 	= mongo.ObjectID;
var crypter 	= require("./../helpers/crypter");

var appSettings		= require("./../../settings")  


router.post('/register', function(req, res) {
	res.contentType('json');
	var clientData = req.body;
	var errors = [];
	log.log("info", "Yritetään luoda uusi yritys (%s)", clientData.nimi);
	
	var error = false;
	Client.findOne({nimi:clientData.nimi}, function(err,c){
		if(err)log.error(err);
		if(c){
			log.log("info", "Yrityksen nimi on jo käytössä (%s)", clientData.nimi);
			errors.push("Yrityksen nimi on jo käytössä ("+clientData.nimi+")")
			res.status(200).send({status:false, phase:"client", error:errors});
			error = true;
			
		}
		else {
			User.findOne({email:clientData.user_email}, function(err,c){
				if(err)log.error(err);
				
				//console.log(c);
				log.log("info", "Pääkäyttäjän sähköposti on jo käytössä (%s)", clientData.user_email);
				errors.push("Pääkäyttäjän sähköposti on jo käytössä ("+ clientData.user_email+")")
				if(c){
					res.status(200).send({status:false, phase:"user", error:"Pääkäyttäjän sähköposti on jo käytössä."});
					error = true;
				
				}
				//console.log(error);
				if(!error){
					
					Client.createClient(clientData, function(client){
						if(!client.errmsg){
							User.createUser(clientData.user_email, clientData.user_pwd, 3, function(user){
								
								if(!user.errmsg){
									client.addUser(user, function(){
									
										client.save(function(){
											user.save(function(){
												log.log("info", "Rekisteröinti onnistui (%s)", clientData.nimi);
												res.status(200).send({status:true});
											
											});
										})
									});
								}
								else {
									res.status(200).send({status:false, phase:"user", error:user.errmsg});
								}
							})
						}
						else {
							res.status(200).send({status:false, phase:"client",  error:client.errmsg});
						}
					});
				}
			});
		}
		
	});
	
});

router.post("/remove", auth.authAdmin, function(req, res) {
	log.log("info", "Poistetaan yritys (%s) käyttäjän (%s) toimesta", req.body.nimi, req.session.user.email)
	var clientID 	= ObjectId(req.body.id);
	var phases 		= 6;
	
	User.find({clientID:clientID}, function(err, users){
		if(err)log.error(err);
		users.forEach(function(user){
			Notify.find({userID:user._id}, function(err, notifys){
				if(err)log.error(err);
				notifys.forEach(function(n){
					n.remove();
				});
			});
			
			user.remove();
		});
		updatePhase(phases, res);
	});
	
	
	Kampanja.find({clientID:clientID}, function(err, kamps){
		if(err)log.error(err);
		kamps.forEach(function(k){
			k.remove();
		});
		updatePhase(phases, res);
	});
		
			
	KampanjaItem.find({clientID:clientID}, function(err, kamps){
		if(err)log.error(err);
		kamps.forEach(function(k){
			k.remove();
		});
		updatePhase(phases, res);
	});
		
			
	Raportti.find({clientID:clientID}, function(err, kamps){
		if(err)log.error(err);
		kamps.forEach(function(k){
			k.remove();
		});
		updatePhase(phases, res);
	});
	
	Customer.find({clientID:clientID}, function(err, kamps){
		if(err)log.error(err);
		kamps.forEach(function(k){
			k.remove();
		});
		updatePhase(phases, res);
	});
			
		
	Client.findById(clientID, function(err, client){
		if(err)log.error(err);
		client.remove();
		updatePhase(phases, res);
	});
});



function updatePhase(phase, res) {
	phase--;
	if(phase == 0)
		res.status(200).send({status:true});
}

module.exports = router