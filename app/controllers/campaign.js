var express 		= require('express')
  , router 			= express.Router()
  , fs				= require("fs")
  , path			= require('path')
  , log				= require('../helpers/log')
  , auth 			= require('../helpers/auth')
  , User 			= require('../models/user')
  , Client 			= require('../models/client') 
  , Campaign 		= require('../models/campaign')
  , CampaignItem	= require('../models/campaignItem')
  , Customer		= require('../models/customer')
  , CustomerPage	= require('../models/customerPage')
  , mime 			= require('mime')
  , moment			= require('moment')
  , multiparty 		= require('multiparty');
var events 			= require('./../helpers/events');
var appSettings		= require("./../../settings")  
var Notify			= require('../models/notify');
var excelParser		= require('node-xlsx');
var excelbuilder 	= require('msexcel-builder');
var mongo 			= require('mongodb');
var ObjectId 		= mongo.ObjectID;

var crypter 		= require("./../helpers/crypter");
var _				= require("underscore");
var uls 			= require("../helpers/userlevels");
var appDir 			= require('path').dirname(require.main.filename);  


router.get('/', auth.loginCheck, function(req, res){
	Client.findClientByID(req.session.user.clientID, function(err, client){
		if(err)log.error(err);
		Campaign.findCampaignsByClientID(req.session.user.clientID, function(err, campaigns){
			if(err)log.error(err);
			Customer.findCustomersByClientID(req.session.user.clientID, function(err, customers){
				if(err)log.error(err);
				client.getUsers(function(err,users){
					if(err)log.error(err);
					
					res.render('campaign', {userLevelStrings:uls, customers:customers, campaigns:campaigns, users:users});
				});
			});
		});
	});
});   

   
router.get('/view/:id', auth.loginCheck, function(req, res){
	var id = req.params.id;
	if(ObjectId.isValid(id))
	Campaign.findById(ObjectId(id),function(err, campaign){
		if(err)log.error(err);
		if(campaign){
			CampaignItem.find({kampanjaID:campaign._id, "users.id": req.session.user._id, status: {$in: ["ES", "SU", "EV", "OK"]}}).lean().exec(function(err,payloads){
				if(err)log.error(err);
				var pl = [];
				payloads.forEach(function(load){
						if(load.status == "SU"){
						
							var endOfDay 	= moment();
							var callAgT 	= moment(load.soitaUudestaan)
										
							if(callAgT.diff(endOfDay, "hours") < 12){
								pl.push(load)
							}
						}
						else if(load.status == "OK" ){
							if(load.soitaUudestaan ){
								
								var callAgT 	= moment(load.soitaUudestaan)
			
								if(callAgT.diff(endOfDay, "hours") < 12){
									pl.push(load)
								}
							}
						}

						else if(_.contains(["ES", "EV"], load.status))
							pl.push(load);
						
				});
				
				res.render('uudet/soittolista', {url:"/campaign/view/"+id, page:"uudet/soittolista", pageTitle:"Soittolista - " + campaign.nimi, pageIcon:"book", loadingText: "Ladataan kampanjaa...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, campaign:campaign, payloads:pl, moment:moment});		
			})
		}
		else {
			res.render('error', {url:"error", page:"error", pageTitle:"Virhe", pageIcon:"danger", loadingText: "", appSettings:appSettings,errorMsg:"Haettua kampanjaa ei löytynyt."});
		}
	});
	else
		res.render('error', {url:"error", page:"error", pageTitle:"Virhe", pageIcon:"danger", loadingText: "", appSettings:appSettings, errorMsg:"Kampanja ID on virheellinen."});
});
   
router.get('/view/:id/focus?/:payloadid?', auth.loginCheck, function(req, res){
	var id = req.params.id;
	var payloadToFocus = req.params.payloadid;
	
	Campaign.findById(ObjectId(id),function(err, campaign){
		if(err)log.error(err);
		CampaignItem.find({kampanjaID:campaign._id, "users.id": req.session.user._id, status: {$in: ["ES", "SU", "EV", "OK"]}}).lean().exec(function(err,payloads){
			if(err)log.error(err);
			var pl = [];
			payloads.forEach(function(load){
					if(load.status == "SU"){
					
						var endOfDay 	= moment();
						var callAgT 	= moment(load.soitaUudestaan)
									
						if(callAgT.diff(endOfDay, "hours") < 12){
							pl.push(load)
						}
					}
					else if(load.status == "OK" ){
						if(load.soitaUudestaan ){
							
							var callAgT 	= moment(load.soitaUudestaan)
		
							if(callAgT.diff(endOfDay, "hours") < 12){
								pl.push(load)
							}
						}
					}

					else if(_.contains(["ES", "EV"], load.status))
						pl.push(load);
					
			});
			
			res.render('uudet/soittolista', {url:"/campaign/view/"+id, page:"uudet/soittolista", pageTitle:"Soittolista - " + campaign.nimi, pageIcon:"book", loadingText: "Ladataan kampanjaa...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, campaign:campaign, payloads:pl, moment:moment, payloadToFocus: payloadToFocus});		
		})
	});
});

      
router.get('/new', auth.loginCheck, function(req, res){
	Customer.find({clientID:req.session.user.clientID},function(err, customers){
		res.render('uudet/kampanjat/luo', {url:"/campaign/new", page:"kampanjat/luo", pageTitle:"Kampanjan luonti", pageIcon:"plus", loadingText: "Ladataan sivua...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, customers:customers});		
	});
});


router.get('/edit/:id', auth.loginCheck, function(req, res){
	
	if(req.session.user.userlevel == 3){
		var campaignID = ObjectId(req.params.id);
		Campaign.findById(campaignID).lean().exec(function(err, campaign){
			if(campaign.clientID == req.session.user.clientID){
				Customer.find({clientID:req.session.user.clientID}).lean().exec(function(err, customers){
					User.find({clientID:req.session.user.clientID, aktiivinen:1}).exec(function(err, users){
						CampaignItem.find({kampanjaID:campaignID}).lean().exec(function(err, payloads){
							users = _.sortBy(users, function(user){
								return user.yhteystiedot.nimi.etu;
							})
							//console.log(users)
							
							res.render('uudet/kampanjat/edit', {url:"/campaign/edit/"+campaignID.toString(), page:"kampanjat/edit", pageTitle:"Kampanjan muokkaus", pageIcon:"edit", loadingText: "Ladataan kampanjaa...", _us:_, _moment:moment, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, customers:customers,campaign:campaign, payloads: payloads, users:users});
						});
					});
				});
			}
			else {
				res.render('error')
			}
		});
	}
	else {
		res.render('error')
	}
});


// Kampanjan tietojen tallennus
router.post("/updateInfo", auth.loginCheck, function(req, res){
	res.contentType("json");
	var details = req.body;
	var _id 	= ObjectId(details._id);
	var oldName = details.oldName;
	delete details._id;
	delete details.oldName;
	
	Campaign.update({_id:_id}, details, function(err, response){
		if(err)log.error(err);
		log.log('kampanja', "Kampanjan \"%s\" tiedot tallennettu käyttäjän %s toimesta", oldName, req.session.user.email);
		res.send(response);
	
	});
	
});
   
 router.post('/create', auth.loginCheck, function(req, res){
	
	var data = req.body;
	
	var campData 	= data.details;
	var payload		= [];
			
	/* Luo kampanjan data bodystä */
	Customer.findById(ObjectId(campData['customerID'])).lean().exec(function(err, customer){
		
		if(err)console.error(err);
				
		campData['clientID'] 		= req.session.user.clientID;
		campData['customerID'] 		= customer._id;
		campData['customerName'] 	= customer.nimi;
		campData['saved']			= 1;
		
		var camp = new Campaign(campData);
				
		camp.save(function(){
			
			/* Luo payloadit */
			data.payload.forEach(function(pl){
			
				var itm 	= {};
				var pla 	= [];
				var keys 	= [];
				
				data.fileData.keys.forEach(function(key){
					pla.push({name:key.v, value:pl[key.v]});	
					keys.push(key.v);
				});
				
				itm['clientID']		= req.session.user.clientID;
				itm['customerID']	= campData.customerID;
				itm['keys'] 		= keys;
				itm['payload'] 		= pla;
				itm['kampanjaID'] 	= camp._id;
				itm['status'] 		= "ES";
				payload.push(itm)
			});
			
			CampaignItem.collection.insert(payload, function(err, docs){
				if(err)console.error(err);
				
				res.send({status:true});
			
			})
			
			
		});
	
	});
	
});

router.post("/names", auth.loginCheck, function(req, res){
	res.contentType('json');
	var userID 	= ObjectId(req.body.userID);
	var results = [];
	Campaign.find({"users.id": userID, hidden:false,active:true }, "nimi _id").lean().exec(function(err, camps){
		var campsLeft = camps.length;
		if(campsLeft == 0)
			res.send(results);
		else 
			camps.forEach(function(camp){
				CampaignItem.count({"users.id":  userID, kampanjaID: camp._id, status:{$in:["ES", "EV", "SU"]}}, "status").lean().exec(function(err, statuses){
				
					if(statuses > 0)
						results.push({camp:camp, calls:statuses})
					
					campsLeft--;
					if(campsLeft == 0)
						res.send(results);
					
					
					
				});
		
			})
	});
});

router.post('/appendItems', auth.loginCheck, function(req, res){
	
	var data = req.body;
	
	var campData 	= {};
	var payload		= [];
	
			
	/* Luo kampanjan data bodystä */
	Campaign.findById(ObjectId(data.kampanjaID)).lean().exec(function(err, camp){
	
		Customer.findById(camp['customerID']).lean().exec(function(err, customer){
		
		if(err)console.error(err);
				
		campData['clientID'] 		= req.session.user.clientID;
		campData['customerID'] 		= customer._id;
		campData['customerName'] 	= customer.nimi;
		campData['saved']			= 1;
		
		//var camp = new Campaign(campData);		
			data.payload.forEach(function(pl){
			
				var itm 	= {};
				var pla 	= [];
				var keys 	= [];
				
				data.fileData.keys.forEach(function(key){
					pla.push({name:key.v, value:pl[key.v]});	
					keys.push(key.v);
				});
				
				itm['clientID']		= req.session.user.clientID;
				itm['customerID']	= campData.customerID;
				itm['keys'] 		= keys;
				itm['payload'] 		= pla;
				itm['kampanjaID'] 	= camp._id;
				itm['status'] 		= "ES";
				
				payload.push(itm)
			});
			
			CampaignItem.collection.insert(payload, function(err, docs){
				if(err)console.error(err);
				
				res.send({status:true});
			
			})
			
		});	
		
	});
	
});
   
// FileUpload
router.post("/upload", auth.loginCheck, function(req, res){
	res.contentType('json');
	var objs = [];
	
		
	var form = new multiparty.Form({
		uploadDir:"files/"
	});
	

	form.parse(req, function(err, fields, files) {
		if(err)log.error(err);
		if(files.customerDatabase.length > 0){
			var campaign = new Campaign({clientID:req.session.user.clientID});
			var fileCount = files.customerDatabase.length;
			files.customerDatabase.forEach(function(_f){
				
				var f = _f.path;
				log.log("kampanja", "Tiedosto (%s) lähetetty käyttäjältä (%s)", f, req.session.user.email);
				fileCount--;
				if(fileCount == 0)
					parseFilesToCampaign(campaign, f, function(){
						campaign.save(function(){
							res.send(campaign);
							files.customerDatabase = [];
						});
					});
				else 
					parseFilesToCampaign(campaign, f, function(){
					
					});
				fs.unlink(f);
			});
		}
		
	});
}); 


// Filen myöhempi lisäys kampanjaan
router.post("/append", auth.loginCheck, function(req, res){
	res.contentType('json');
	
	var form = new multiparty.Form({
		uploadDir:"files/"
	});
	
	form.parse(req, function(err, fields, files) {
		if(err)log.error(err);
		if(files.customerDatabase.length > 0){
			var cid 		= ObjectId(fields.campaignID[0]);
			var fileCount 	= files.customerDatabase.length;
			
			Campaign.findById(cid, function(err, campaign){
				if(err)log.error(err);
			
				if(campaign){
					files.customerDatabase.forEach(function(_f){
						
						var f = _f.path;
					
						log.log("kampanja", "Tiedosto (%s) lähetetty käyttäjältä %s, lisätään kampanjaan %s", f, req.session.user.email, campaign.nimi);
						
						fileCount--;
						if(fileCount == 0)
							parseFilesToCampaign(campaign, f, function(){
								campaign.save(function(){
									res.send(campaign);
									files.customerDatabase = [];
								});
							});
						else 
							parseFilesToCampaign(campaign, f, function(){
							
							});
						fs.unlink(f);
					});
				}
				else {
					log.log("error", "Haettua kampanjaa ei löytynyt (%s)", cid.toString());
					files.customerDatabase.forEach(function(_f){
						fs.unlink(_f.path);
					});
				}
			})		
		}
		
	});
}); 


// Kampanjan tietojen tallennus
router.post("/saveDetails", auth.loginCheck, function(req, res){
	res.contentType("json");
	var details = req.body;

	Campaign.findCampaignByID(ObjectId(req.body.campaignID), function(err, campaign) {
		var oldName 			= campaign.nimi;
		campaign.nimi 			= details.nimi;
		campaign.alkaa 			= details.alkaa;
		campaign.kuvaus			= details.kuvaus;
		campaign.customerID 	= details.customerID;
		campaign.customerName 	= details.customerName;
		campaign.provisio 		= details.provisio;
		campaign.saved 			= 1;
		
		campaign.save(function(err,c){
			if(err)log.error(err);
			log.log('kampanja', "Kampanjan \"%s\" tiedot tallennettu käyttäjän %s toimesta", oldName, req.session.user.email);
			res.send(c);
		})
	});
});
   
router.get("/list", auth.loginCheck, function(req, res){
	res.contentType("json");
	Campaign.find({"users.id": req.session.user._id, hidden: false, alkaa:{$lte:new Date()}}, function(err, ids){
	
		if(!ids) res.send([])
		var camps 	= [];
		var left 	= ids.length;
		if(left == 0){
			res.send(camps);
		}
		else
			ids.forEach(function(id){
				
				id.itemCountByUser( ObjectId(req.session.user._id), function(count){
				
					if(count > 0){
						camps.push(id);
					}
					left--;
				
					if(left == 0){
						res.send(camps);	
					}
				})
			});
		
	
	});
});

router.get("/all", auth.loginCheck, function(req, res){
	res.contentType("json");
	if(req.session.user.userlevel == 3){
		Campaign.find({clientID: req.session.user.clientID, hidden: false}, "_id nimi active").lean().exec( function(err, ids){
			res.send({status:true, camps: ids});
		});
	}
	else {
		res.send({status:false});
		
	}
});


router.post("/statuses/get", auth.loginCheck, function(req, res){
	res.contentType("json");
	
	if(req.body.type == "user"){
		var cid = ObjectId(req.body.campaignID);
	
		CampaignItem.find({"users.id":  ObjectId(req.session.user._id), kampanjaID: cid }, "status").lean().exec(function(err, statuses){
			
			var data = {};
			data.kampanjaID = cid;
			data.counts 	= _.countBy(statuses, "status");
			data.totalCount	= statuses.length;
			
			res.send(data);
		
		})
	
	}

	
});
   
   
router.post("/items/get", auth.loginCheck, function(req, res){
	res.contentType("json");
	if(req.body.type == "user"){
		Campaign.getUserItems(ObjectId(req.session.user._id), ObjectId(req.body.id), function(err, items) {
			if(err)log.error(err);
			res.send(items);
		});
	}
});

    
router.post("/getItemCount", auth.loginCheck, function(req, res){
	res.contentType("json");
	
	CampaignItem.find({kampanjaID:ObjectId(req.body.id),"users.id":req.session.user._id},"status", function(err,count){
		
		var cunts 	= _.groupBy(count, "status");

		var counts = {};
		for(var key in cunts){
			counts[key] = cunts[key].length;

		}
		res.send({kampanjaID:req.body.id, totalCount:count.length, counts:counts, active:req.body.active});
	});
	
});


// Hakee koko kampanjan tiedot 
router.post("/get", auth.loginCheck, function(req,res){
	res.contentType("json");
	var campaignArray = [];
	Campaign.findCampaignsByClientID(req.session.user.clientID, function(err, _campaigns){
		if(err)log.error(err);
		var campaigns = [];
		
		if(_campaigns){
			_campaigns.forEach(function(_c){
				var c = _c.toObject();
				delete c.campaignItems;
				campaigns.push(c);
			
			})
		}
		res.send(campaigns);
	});
});


router.post("/set", auth.loginCheck, function(req, res){
	res.contentType("json");
	
	Campaign.findCampaignByID(ObjectId(req.body.id), function(err, campaign) {
		if(err)log.error(err);
		campaign[req.body.target] = (req.body.value);
		campaign.save(function(err,resp){
			
			res.send(resp);
		})
	});
	
});


// Hakee kampanjan nimen
router.post("/name", auth.loginCheck, function(req,res){
	res.contentType("json");
	Campaign.findById(ObjectId(req.body.id), function(err, nimi){
	
		res.send(nimi);
	});
});

 
// Liittää luserin kampanjaItemiin 
router.post("/attachUser", auth.loginCheck, function(req,res){
	res.contentType("json");
	var data = req.body;

	data.ids = JSON.parse(data.ids);

	Campaign.findCampaignByID(ObjectId(data.kampanjaID), function(err, campaign){
		if(err)log.error(err);
		var totalCalls = 0;
		var left = data.ids.length;
	
		data.ids.forEach(function(_id){
			
			CampaignItem.findById(ObjectId(_id), function(err, itm){
				if(err)log.error(err);
				if(_.contains(["ES", "EV", "SU"], itm.status)){
					
					totalCalls += itm.addUser({nimi:data.nimi, id:ObjectId(data.userID)});
				}
				left--;
				if(left == 0){
					
					res.send({status:true, totalCalls:totalCalls});
					if(totalCalls > 0){
						events.emit("user.attach", {campaign:campaign, data:data, totalCalls:totalCalls})
						Notify.addNotify(ObjectId(data.userID), "info", "Uusia soittoja", "Sinulle on liitetty "+totalCalls+" uutta soittoa kampanjaan <strong>"+campaign.nimi+"</strong>.", function(note){
							note.campaignID = campaign._id;
							note.save();
							
						})	
					}
					
				}
					
			})
		})
		//log.log('user', "Käyttäjä %s lisätty kampanjaan %s", data.nimi,  campaign.nimi,);
		log.log('kampanja', "Käyttäjä \"%s\" lisätty kampanjaan \"%s\"", data.nimi, campaign.nimi);
		campaign.addUser({nimi:data.nimi, id:ObjectId(data.userID)});
	
	});
	
});

router.post("/attach", auth.loginCheck, function(req,res){
	res.contentType("json");
	var data = req.body;
	
	data.ids 	= JSON.parse(data.ids);
	var ids 	= [];
	data.ids.forEach(function(_id){
		ids.push(ObjectId(_id));
	});
	
	if(data.removeShare == 'true'){
		CampaignItem.find({_id: {$in:ids}, status:{$in:["ES", "EV", "SU"]}}, function(err, result){
			if(err)console.error(err);
		
			var left = result.length;
			result.forEach(function(ci){
				ci.users.nimi 	= "";
				ci.users.id 	= null;
				ci.save(function(){
									
					
					if(left-- == 1){
						
						res.send({status:true});
					}
				});
				
			});
		});
	}

});
 

// Kampanjan 'poisto' (asettaa hidetyksi) 
router.post("/remove", auth.loginCheck, function(req,res){
	res.contentType("json");
	
	Campaign.findCampaignByID(ObjectId(req.body.id), function(err, campaign){
		if(err)log.error(err);
		CampaignItem.update({kampanjaID: campaign._id},{notHidden:1},{multi:true}, function(err, cis){
			
		})	
		campaign.hidden = true;
		campaign.save();
		log.log('kampanja', "\"%s\" piilotettu (poistettu)", campaign.nimi);
		res.send({status:true});
	});
	
});


// KampanjaItemin poistaminen kampanjasta 
router.post("/removeItem", auth.loginCheck, function(req, res){
	res.contentType("json");
	
	Campaign.findCampaignByID(ObjectId(req.body.campaignID), function(err, campaign){
		if(err)log.error(err);
		log.log("kampanja", "Poistetaan kohde (%s) kampanjasta \"%s\"", req.body.id, campaign.nimi);
		
		//campaign.removeItem(ObjectId(req.body.id), function(){
			if(err)log.error(err);
			CampaignItem.removeItem(ObjectId(req.body.id), function() {
				res.send({status:true});
			});	
		//});
	});	
});


// Asiakkaan vaihto projektiin
router.post("/customer/set", auth.loginCheck, function(req, res){
	var customerID = ObjectId(req.body.customerID);
	var campaignID = ObjectId(req.body.campaignID);
	Customer.findById(customerID, function(err, customer){
		if(err)log.error(err);
		Campaign.findById(campaignID, function(err, campaign){
			if(err)log.error(err);
			campaign.customerID 	= customer._id;
			campaign.customerName 	= customer.nimi;
			campaign.getItems(function(err, items){
				if(err)log.error(err);
				var left = items.length;
				items.forEach(function(i){
					i.customerID = customer._id;
					left--;
					if(left > 0)
						i.save();
					else
						i.save(function(){
							campaign.save(function(){
								res.send({status:true});
								log.log("kampanja", "Vaihdetaan kampanjaan (%s) asiakkaaksi (%s)", campaign.nimi, customer.nimi);
							});
						})
				})
			});
			
		});
	})
});




/***************************************
			SIVUSTO EDITORI
***************************************/
 router.get("/offsite/creator/:cid", auth.salesManagerCheck, function(req, res){
	
	var campaignID 	= req.params.cid;
	var usr 		= req.session.user;
	
	Campaign.findById(campaignID).exec(function(err, campaign) {
		
		if(campaign){
			
			if(campaign.offSiteEnabled === false){
				Customer.findById(campaign.customerID, "nimi", function(err, customer){
					
					var cPage 			= new CustomerPage()
					
					cPage.created 		= new Date();
					
					// Asiakkaan meta tiedot
					cPage.meta.customer.name 	= campaign.customerName;
					cPage.meta.customer.id		= campaign.customerID;
						
					// Soittoyrityksen meta tiedot
					cPage.meta.customer.name 	= customer.nimi;
					cPage.meta.customer.id		= customer._id;
						
					// Kampanjan meta tiedot
					cPage.meta.campaign.name 	= campaign.nimi;
					cPage.meta.campaign.id 		= campaign._id;
					
					campaign.payloadKeys.forEach(function(key){
						cPage.meta.campaign.keys.push({name:key, enabled:true});
					});
					
					campaign.offSiteID 		= cPage._id;
					campaign.offSiteEnabled = true;
					
					campaign.save(function(){
						
						cPage.save(function(err, p){
							log.log("info", "Asiakassivu luotu kampanjaan: "+campaign.nimi,{campaign:campaign._id, creator:{id: req.session.user._id, name:req.session.user.yhteystiedot.nimi}});
							res.render("customerPage/customerPageEditor", {url:"/offsite/create/"+campaignID, pageTitle:"Asiakassivun luominen kampanjaan " + campaign.nimi, pageIcon:"book", loadingText: "Ladataan sivua...", _us:_, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, campaign:campaign, moment:moment, cPage:p});
						});
						
					});
					
				});
			}
			else {
				CustomerPage.findOne({"meta.campaign.id": campaignID}, function(err, cPage){
					
					res.render("customerPage/customerPageEditor", {url:"/offsite/edit/"+campaignID, pageTitle:"Asiakassivun muokkaus kampanjaan:" + campaign.nimi, pageIcon:"book", loadingText: "Ladataan sivua...", _us:_, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, campaign:campaign, moment:moment, cPage:cPage});	
				});
				
			}
		}
		else {

			res.render('error', {url:"error", page:"error", pageTitle:"Virhe", pageIcon:"danger", loadingText: "", appSettings:appSettings, errorMsg:"Kampanjaa ei löytynyt."});
			
		}
	});
});


/***************************************
		ASIAKASSIVUN JULKINEN URL
***************************************/
router.get("/offsite/view/:id", function(req, res){
	var cid = ObjectId(req.params.id);
	
	CustomerPage.findOne({"meta.campaign.id":cid}).exec(function(err, cp) {
		if(cp)
			res.render("customerPage/customerPage", {pageTitle:cp.title, pageIcon:"book", loadingText: "Ladataan sivua...", _us:_, appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, cPage:cp});	
		else
			res.render('error', {url:"error", page:"error", pageTitle:"Virhe", pageIcon:"danger", loadingText: "", appSettings:appSettings, errorMsg:"Kampanjaa ei löytynyt."});
	});
});


/*********************************************************************'***
	ASIAKASSIVUN TIETOJEN PÄIVITYS
	
	DataParser.UpdateCustomizations(req, cp, callback)
	DataParser.UpdateFormInputs(req, cp, callback, errorcallback)
	
**************************************************************************/

  
/***************************************
			PARSERIT DATAAN
***************************************/ 
var offsiteDataParser = function() {
	
	var _self = this;
	
	// Parsii customisaatio tekstit, värit jne.
	_self.UpdateCustomizations = function(req, cp, callback){
		var value 	= req.body.value;
		var k 		= req.body.dbKey;
		var sk 		= req.body.dbSubKey;
		var kid		= req.body.keyFromID;
		var d 		= cp.customizations;
			
		if(sk == "pwd")
			value = crypter.encryptPWD(value);
		
		if(kid)	{
			d[kid][k][sk] 	= value;
			var meta = {value:value, request: d};
		}
		else {
			d[k][sk] 	= value;
			var meta 	= {value:value, request: d};
		}
		
		cp.save(callback(meta))
		return value;
	};
	
	// Parsii mitkä inputit näytetään lomakkeessa.
	_self.UpdateFormInputs = function(req, cp, callback, errorcallback){
		var keyID 	= ObjectId(req.body.keyID);
		var enabled = req.body.enabled;
			return i._id == keyID;
			
		var key 	= findKey(cp.meta.campaign.keys, ""
		
		key.enabled = enabled;
		
		cp.save(callback);
		
		return enabled;
	};
}

global.DataParser = new offsiteDataParser();

/**************************************
			CALLBACKS
**************************************/

function updateSuccessCB(){
	console.log("success")
}

function updateFailCB(){
	 console.log("fail")	
}


function findKey(obj, key, value) {
  var key;

  _.each(obj, function (v, k) {
    
	if (v[key] === value) {
      return key;
    }
  });

  return key;
}

/**************************************
		TIETOJEN PÄIVITYS
**************************************/
router.post("/offsite/update", auth.salesManagerCheck, function(req,res) {
	var valid = ObjectId.isValid(req.body.cid);
		
	if(valid){
		var cid = ObjectId(req.body.cid);
		CustomerPage.findById(cid).exec(function(err, cp) {
			if(!err){
				
				var value = "undefined";
				
				switch(req.body.type){	
				
					case 'toggleKey':
						value = global.DataParser.UpdateFormInputs(req, cp, updateSuccessCB, updateFailCB);
					break;
					
					case 'customization':
						value = global.DataParser.UpdateCustomizations(req, cp,updateSuccessCB, updateFailCB);
					break;
					
					default:
						log.error("Asiakassivun tietojen päivittäminen ei onnistunut.", {request:req.body, meta:err})
						res.send({status:false, errorMsg: "Asiakassivun päivityksessä kävi jotain odottamatonta, ongelma raportoitu automaattisesti ylläpidolle."});
						return;
					break;
				}
				log.info("Asiakassivun tietojen päivittäminen onnistui "+cp.meta.campaign.name+" käyttäjän "+req.session.user.yhteystiedot.nimi.etu +" " + req.session.user.yhteystiedot.nimi.suku+ " toimesta.", {request:req.body, meta:err})
				res.send(value);
				return;
				
			}else {
				log.error("Asiakassivun tietojen hakeminen ei onnistunut.", {request:req.body, meta:err}) 
				res.send({status:false, errorMsg: "Asiakassivun tietojen hakeminen ei onnistunut, , ongelma raportoitu automaattisesti ylläpidolle."});
			}
		});
	}
	else {
		res.send({status:false, errorMsg: "Hakemasi sivun ID on virheellinen."});
	}
	
});
	

	
///////////////////////////////////////////////   
// Generoi XLS tiedoston kampanjasta
///////////////////////////////////////////////
router.get("/export/xls/:id", auth.loginCheck, function(req,res){
	var id = req.params.id.split(".")[0];
	Campaign.findById(ObjectId(id), function(err, campaign){
		if(err)log.log("error", err)
		generateXLS(campaign, function(xls){
			var filename = '/public/temp-xls/'+ campaign.nimi+'_'+campaign._id.toString()+'.xlsx'
			res.set( 'Set-Cookie', 'fileDownload=true; path=/')
			res.download(appDir + filename, campaign.nimi+".xlsx");
		})
		
	});
	
});
 
function generateXLS(campaign, cb){
	
	var workbook = excelbuilder.createWorkbook('./public/temp-xls', campaign.nimi+'_'+campaign._id.toString()+'.xlsx')
	
	CampaignItem.find({kampanjaID:campaign._id}, function(err, items){
		
		if(items.length > 0){
			
			var keysTotal 	= items[0].keys.length;
			var sheet1 		= workbook.createSheet(campaign.nimi, items[0].keys.length+2,items.length+1);
			
			// Luo titlet
			var x = 1;
			var y = 1;
			items[0].keys.forEach(function(key){
				sheet1.set(x,y,key);
				sheet1.font(x,y,  {name:'Arial',sz:'12',family:'3',scheme:'-',bold:'false',iter:false});
				sheet1.width(x, 20);
				//sheet1.wrap(x,y, 'true');
				
				x++;
			});
			sheet1.set(x,y, "Status");
			sheet1.font(x,y,  {name:'Arial',sz:'12',family:'3',scheme:'-',bold:'false',iter:false});
			sheet1.width(x, 20);
			//sheet1.wrap(x,y, 'true');
			
			y = 2;
			items.forEach(function(item){
				x = 1;
				
				item.payload.forEach(function(payload){
					var val = "";
					if(payload.value)
						val = payload.value;
					
					sheet1.set(x,y,val);
					sheet1.font(x,y,  {name:'Arial',sz:'10',family:'1',scheme:'-',bold:false,iter:false});
					sheet1.width(x, 20);
					//sheet1.wrap(x,y, 'true');
					x++;
				});
				
				if(x == keysTotal)
					x++;
				sheet1.set(x,y,item.status);
				sheet1.font(x,y,  {name:'Arial',sz:'10',family:'1',scheme:'-',bold:'false',iter:false});
				sheet1.width(x, 20);
				//sheet1.wrap(x,y, 'true');
				y++;
			});
			// Save it 
			workbook.save(function(ok){
				if(cb)cb(workbook);
			});
		}
		else {
			workbook.cancel();
			if(cb)cb(null);
			
		}
		
	});
	
	
	
}
   
function parseFilesToCampaign(campaign, f, cb) {
	var filemime 		= mime.lookup(f);
	var parsedObjects	= [];
	
	if(filemime == "application/vnd.ms-excel"){
		var excelObjects	= excelParser.parse(f, {sheetStubs:true}); // parses a file 
		if(excelObjects){
			campaign.addFromExcel(excelObjects, cb);
		}
	}
	else {
		log.log("kampanja", "Lähetetty tiedosto (%s) ei ole excel formaatissa (%s)", f, filemime)
		log.error("Lähetetty tiedosto ei ole excel formaatissa (%s) [%s]", f, filemime);
		if(cb)cb();
	}
	
}
   

module.exports = router 