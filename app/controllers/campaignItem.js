var express 		= require('express')
  , router 			= express.Router()
	, log			= require('../helpers/log')
  , auth 			= require('../helpers/auth')
  , sendgrid		= require('../helpers/sendgrid')
  , Client 			= require('../models/client')
  , User 			= require('../models/user')
  , CampaignItem	= require('../models/campaignItem')
  , SalesGrid		= require('../models/salesGrid')
  , Campaign		= require('../models/campaign')
  , Customer		= require('../models/customer')
  , Kuittaus		= require('../models/kuittaus')
  , moment			= require('moment')
  , _				= require('underscore')
var mongo 		= require('mongodb');
var ObjectId 	= mongo.ObjectID;

var pmx = require('pmx');



router.post("/get", auth.loginCheck, function(req, res){
	
	CampaignItem.findItemByID(ObjectId(req.body.id), function(err, item){
		//console.log(err,item);
		res.send(item);
		
	})
});

router.post("/add", auth.loginCheck, function(req, res) {
	var data = req.body;
	var campData 	= {};
	Campaign.findById(ObjectId(data.kampanjaID)).lean().exec(function(err, camp){
	
		Customer.findById(camp['customerID']).lean().exec(function(err, customer){
			campData['clientID'] 		= req.session.user.clientID;
			campData['customerID'] 		= customer._id;
			campData['customerName'] 	= customer.nimi;
			campData['saved']			= 1;
			
		
			var pl 		= JSON.parse(data.payload);
			var itm 	= {};
			var pla 	= [];
			var keys 	= [];
			
			pl.forEach(function(key){
				
				pla.push({name:key.name, value:key.value});	
				keys.push(key.name);
			})
			
			itm['clientID']		= req.session.user.clientID;
			itm['customerID']	= campData.customerID;
			itm['keys'] 		= keys;
			itm['payload'] 		= pla;
			itm['kampanjaID'] 	= camp._id;
			itm['status'] 		= "ES";
			itm['users']		= {nimi:req.session.user.yhteystiedot.nimi.etu + " " + req.session.user.yhteystiedot.nimi.suku, id:req.session.user._id};
			
			var item = new CampaignItem(itm)
			item.save(function(){
				
				res.send({status:true,item:item});
			
				
			});
		});	
	});	
});

router.post("/del", auth.loginCheck, function(req, res){
	res.contentType("json")
	CampaignItem.findById(ObjectId(req.body._id)).remove().exec(function(err, r){
		res.send({status:true})
	});
});

router.post("/update", auth.loginCheck, function(req, res){
	res.contentType("json");
	
	var details = req.body;
	var id 		= ObjectId(req.body.id);
	
	details.payload = JSON.parse(details.payload);
		
	delete details.id;

	
	CampaignItem.findByIdAndUpdate(id, details, function(err, ci){
		if(err)log.error(err);
	
		log.log("kuittaus", "Käyttäjä (%s), status (%s), item (%s)", req.session.user.email, details.status, ci._id.toString());	
		
		var eiVastatut = 0;
		var lastStatus = details.status;
		ci.soitettu.forEach(function(call){
			
			if(call.status == "EV" && lastStatus == "EV")
				eiVastatut++;
			lastStatus = call.status;
		});
		if(eiVastatut >= 3) {
			ci.status = "EI";
			
		}
		
		ci.soitettu.push({aika: new Date(), status: details.status, soittaja: req.session.user.email});
		ci.soitaUudestaan = null;
		ci.save(function(err, dat){
			
			User.findById(req.session.user._id, function(err, user){
				if(err)log.error(err);
				var time = new Date();
			
				// Tämä on hirvee. miksi tämä on pitäny laittaa usereihin.?? (!)
				user.raportti.kuittaukset.push({ // Luo kuittaus itemi
					data:		details.status,
					kampanjaID: ci.kampanjaID,
					ciID:		ci._id,
					payloadName:details.payload[0].value,
					aika:		time,
					
					aikaShort: 	moment(time).locale("fi").format("DD.MM.YYYY"),
					aikaUnix:	moment(time).locale("fi").format("X"),
				});
				
				user.save(function(){
					Campaign.findById(ci.kampanjaID, "nimi customerName customerID").lean().exec(function(err, camp) {
						
						
						var kuittaus = new Kuittaus({
							status:			details.status,
							userName: 		req.session.user.yhteystiedot.nimi.etu + " " +req.session.user.yhteystiedot.nimi.suku,
							customerName: 	camp.customerName,
							campaingName:	camp.nimi,
							payloadName:	details.payload[0].value ||"Nimetön",
							userID:			req.session.user._id,	
							customerID:		camp.customerID,	
							clientID:		req.session.user.clientID,
							campaignID:		camp._id,
							payloadID:		ci._id,
							aika:			moment().toDate(),
						});
						kuittaus.save();
					
						if(details.status == "OK"){
							
							User.find({clientID: req.session.user.clientID, notifySales: 1, userlevel: {$gte:2}}, "-raportti").lean().exec(function(err, _receivers){
								var receivers = [];
								_receivers.forEach(function(r){
									receivers.push(r.email)
								});
								
								if(req.session.user.notifySales == 1)
									receivers.push(req.session.user.email)
								
								receivers = _.uniq(receivers);
								
								var sales = new SalesGrid({
									receivers: 		receivers,
									user : 			req.session.user.email,
									status : 		details.status,
									asiakas: 		camp.customerName,
									kampanjanNimi: 	camp.nimi,
									payloadID: 		ci._id,
									data:			details,
								})
								console.log("haloo?", sales);
								sales.save()
								
							});
						}
					});	
					res.send({status:true});	
				})
				
				
			});
		});
	});
	

});


router.post("/callAgain", auth.loginCheck, function(req, res){
	res.contentType("json");
	
	var details = req.body;
	var id 		= ObjectId(req.body.id);
	CampaignItem.findById(id, function(err, ci){
		if(err)log.error(err);
		log.log("kuittaus", "Uudelleensoitto asetettu kohteeseen (%s) kampanjassa (%s) käyttäjälle (%s)", ci._id.toString(), ci.kampanjaID.toString(), req.session.user.email);
		ci.setCallAgain(details.aika, function(cb){
			res.send({status: true, result:cb});
		});
		
	});
	
	
});


module.exports = router