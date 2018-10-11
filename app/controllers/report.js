var express 	= require('express')
  , router 		= express.Router()
  , log			= require('winston')
  , auth 		= require('../helpers/auth')
  , User 		= require('../models/user')
  , Client 		= require('../models/client') 
  , Campaign 	= require('../models/campaign')
  , CampaignItem= require('../models/campaignItem')
  , Customer 	= require('../models/customer')
  , Report		= require('../models/report')
  , _			= require('underscore')
  , moment		= require("moment")
  
  
var mongo 		= require('mongodb');
var ObjectId	= mongo.ObjectID;
var crypter 	= require("./../helpers/crypter");
var appSettings		= require("./../../settings")  
var uls = require("../helpers/userlevels");
   
/* KAMPANJA KOHTAINEN RAPORTTI */   
router.get('/campaign', auth.loginCheck, function(req, res){

	if(req.session.user.userlevel == 1){
		res.render('report-new', {url:"/report/", page:"report-new", pageTitle:"Kampanjaraportti", pageIcon:"book", loadingText: "Ladataan raporttia...", appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls,moment:moment, type:"campaign"});
	}
	else if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){
		res.render('report-new', {url:"/report/", page:"report-new", pageTitle:"Kampanjaraportti", pageIcon:"book", loadingText: "Ladataan raporttia...",  appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"campaign"});
		
	}
	else if(req.session.user.userlevel == 4) {
		res.render('report-new', {url:"/report/", page:"report-new", pageTitle:"Kampanjaraportti", pageIcon:"book", loadingText: "Ladataan raporttia...",appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"campaign"});
	}
	
	
}); 

/* JAKSOKATSAUS */
router.get('/interval', auth.loginCheck, function(req, res){

	if(req.session.user.userlevel == 1){
		res.render('report-new', {url:"/report/", page:"report-new", pageTitle:"Jaksoraportti", pageIcon:"book", loadingText: "Ladataan raporttia...",  appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"general"});
		
	}
	else if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){
		res.render('report-new', {url:"/report/", page:"report-new", pageTitle:"Jaksoraportti", pageIcon:"book", loadingText: "Ladataan raporttia...",appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"general"});
	}
	
	else if(req.session.user.userlevel == 4) {
		res.render('report-new', {url:"/report/", page:"report-new", pageTitle:"Jaksoraportti", pageIcon:"book", loadingText: "Ladataan raporttia...", appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"general"});
	}		
		
	
}); 

/*
	Uusi raportointi
*/

router.get('/beta', auth.loginCheck, function(req, res){
	if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){
		res.render('report-newest', {url:"/report/", page:"report-newest", pageTitle:"Raportointi", pageIcon:"book", loadingText: "Ladataan raportointia...",appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"campaign"});
	}
	else res.render('error')
});



router.get('/customer', auth.loginCheck, function(req, res){
	if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){
		res.render('report/customer', {url:"/report/customer", page:"report/customer", pageTitle:"Asiakas raportointi", pageIcon:"book", loadingText: "Ladataan raportointia...",appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"customer"});
	}
	else res.render('error')
});

router.post('/campaign/stats', auth.loginCheck, function(req, res){

	var campaignID 	= ObjectId(req.body.campaignID);
	var response 	= {
		campaignID: campaignID,
	
		totalStatusOK:	0,
		totalStatusEI:	0,
		totalStatusSU:	0,
		totalStatusTJ:	0,
		totalStatusV:0,
		ordersValue:	0,
		orderCount:		0,
		
		totalContacts:	0,
		contactsLeft:	0,
		//totalProgress:	0,
		totalHours:		0,
		contactsPerHour:0,
		totalPrice:		0,
		totalCalls:		0,
	};
	
	CampaignItem.find({kampanjaID:campaignID},"status", function(err, items){
		
		var statuses = _.groupBy(items, "status");
	
		response.totalContacts = items.length;
		if(statuses.ES){ 
			response.contactsLeft = statuses.ES.length;
		
		}
				
		if(statuses.OK) response.totalStatusOK	= statuses.OK.length;
		if(statuses.EI) response.totalStatusEI 	= statuses.EI.length;
		if(statuses.SU) response.totalStatusSU 	= statuses.SU.length;
		if(statuses.TJ) response.totalStatusTJ 	= statuses.TJ.length;
		if(statuses.V) response.totalStatusV 	= statuses.V.length;
		
		response.totalCalls = response.totalStatusOK + response.totalStatusEI + response.totalStatusTJ + response.totalStatusV + response.totalStatusSU;
		
		res.send(response);
	})
	
	
});



router.get('/user', auth.loginCheck, function(req, res){
	if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){
		res.render('report/user', {url:"/report/customer", page:"report/user", pageTitle:"Myyjä raportointi", pageIcon:"book", loadingText: "Ladataan raportointia...",appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"customer"});
	}
	else res.render('error')
});


router.get('/orders', auth.loginCheck, function(req, res){
	if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){
		res.render('report/sales', {url:"/report/sales", page:"report/sales", pageTitle:"Tilaukset", pageIcon:"shopping-cart", loadingText: "Ladataan raportointia...",appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"campaign"});
	}
	else res.render('error')
});


/* MYYJIEN SALDOT */

router.get('/saldo', auth.loginCheck, function(req, res){
	if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){	
		res.render('report/saldo', {url:'/report/saldo',  page:"report/saldo", pageTitle:"Käyttäjien saldot", pageIcon:"book", loadingText: "Ladataan saldoja...", appSettings:appSettings, fullDomain: req.headers.host, user:req.session.user, userlevelStrings:uls, moment:moment, type:"saldo"})
	}	
	else {
		
	}
});


router.get("/charts", auth.loginCheck, function(req,res){
	if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){	
		User.findById(req.session.user._id).lean().exec(function(err, user){
			res.render('report/charts', {url:"/report/charts", page:"report/charts", pageTitle:"Statistiikkaa", pageIcon:"bar-chart", loadingText: "Ladataan raportteja...", appSettings:appSettings, fullDomain: req.headers.host, user:user, userlevelStrings:uls, moment:moment, type:"general"});
		});
	}	
});


router.post('/get/kuittaukset/:timespan', auth.loginCheck, function(req, res) {
	if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){
		res.contentType("JSON");
		var span 		= req.params.timespan;
		var startDate 	= moment().startOf('week').toDate();
		var endDate 	= moment().endOf('week').toDate();
		
		var lastWeekStart	= moment().subtract(7, "days").startOf('week').toDate();
		var lastWeekEnd		= moment().subtract(7, "days").endOf('week').toDate();
		var results			= {current:[], previous: [], users:[]};
		User.find({clientID: req.session.user.clientID,}).lean().exec(function(err, users){
			
			
			users.forEach(function(_user){
				results.users.push({id:_user._id, name: _user.yhteystiedot.nimi});
				_user.raportti.kuittaukset.forEach(function(_kuittaus){
						var k = _kuittaus;
						
						var d = moment(_kuittaus.aika)
						if(span == "week"){
							if(d.isAfter(startDate) && d.isBefore(endDate)) {
								k['userName'] 	= _user.yhteystiedot.nimi.etu + " " + _user.yhteystiedot.nimi.suku;
								k['userID'] 	= _user._id;
								results.current.push(k)
								
							}
							else if (d.isAfter(lastWeekStart) && d.isBefore(lastWeekEnd)){
								k['userName'] 	= _user.yhteystiedot.nimi.etu + " " + _user.yhteystiedot.nimi.suku;
								k['userID'] 	= _user._id;
								results.previous.push(k)
							}
						} else if(span == "all") {
								k['userName'] 	= _user.yhteystiedot.nimi.etu + " " + _user.yhteystiedot.nimi.suku;
								k['userID'] 	= _user._id;
								results.current.push(k)
							
						}
						
								
				});

			});
			
			res.send(results)
		});
	}
});



router.post("/get", auth.loginCheck, function(req, res){
	if(req.session.user.userlevel > 1 && req.session.user.userlevel < 4){
		res.contentType("JSON");
		var options 	= req.body;
		var clientID 	= req.session.user.clientID;
		
		var reps = {};
		
		if(options.type){
			if(options.type.toLowerCase() == "range") {
				
				Campaign.find({ saved: 1, clientID: clientID}).lean().exec(function(err, campaigns){
					if(err)log.log("error", err);
					if(campaigns){
						var cLeft = campaigns.length;
											
						campaigns.forEach(function(campaign){
							if(options.reportType == "campaign"){
								reps[campaign.nimi] = {reports:[]};
							}
							else if(options.reportType == "general"){
								reps['all'] = {reports:[]};
							}
							Report.find({kampanjaID: campaign._id, date: {"$gte": options.start, "$lte": options.end}}).lean().exec(function(err, reports){
								
								if(reports.length > 0){
									if(options.reportType == "campaign"){
										reps[campaign.nimi].reports.push(reports);
									}
									else if(options.reportType == "general"){
										reps['all'].reports.push(reports);

									}
								}
									
								
								cLeft--;
								if(cLeft == 0) {
									
									res.send(reps);
								}
							});
							
						});
					}
				})
			
			}
		}
	} else if(req.session.user.userlevel  == 1){
		res.contentType("JSON");
		var options = req.body;
		var userID 	= req.session.user._id;

		var reps = {};
		
		if(options.type){
			if(options.type.toLowerCase() == "range") {
				
				Campaign.find({saved: 1, "users.id": userID}).lean().exec(function(err, campaigns){
					if(err)log.log("error", err);
					if(campaigns){
						var cLeft = campaigns.length;
											
						campaigns.forEach(function(campaign){
							if(options.reportType == "campaign"){
								reps[campaign.nimi] = {reports:[]};
							}
							else if(options.reportType == "general"){
								reps['all'] = {reports:[]};
							}
							
							Report.find({userID:userID, kampanjaID: campaign._id, aikaUnix: {"$gte": options.start, "$lte": options.end}}).lean().exec(function(err, reports){
								if(reports.length > 0){
									if(options.reportType == "campaign"){
										reps[campaign.nimi].reports.push(reports);
									}
									else if(options.reportType == "general"){
										reps['all'].reports.push(reports);

									}
								}
								
								cLeft--;
								if(cLeft == 0) {
									
									res.send(reps);
								}
									
							});
							
						});
					}
				})
			
			}
		}
	}
});
   
router.post("/save", auth.loginCheck, function(req, res){
	
	res.contentType("json");
	
	var data = JSON.parse(req.body.data);

	User.findById(req.session.user._id, function(err, user){
	
	
		user.raportti.kuittaukset.forEach(function(kuittaus){
			kuittaus.kuitattu = true;
			
		});
	
	
		Client.findById(user.clientID, function(err,client){
			
			var left 		= data.length;
			/*var dataGroup 	= _.groupBy(data, "aika")
			Object.keys(dataGroup).forEach(function(key){
				console.log(key)
				console.log(dataGroup[key])
			});
			*/
			
			data.forEach(function(_data){
				
				var d = new Date(_data.aika)
							
				var report 			= new Report(_data);
				report.kuittausAika = d;
				report.date			= moment(d).format("X");
				report.aikaShort	=_data.date;
				report.userID 		= user._id;
				report.userName 	= user.email;
				report.realUserName	= user.yhteystiedot.nimi.etu + " " + user.yhteystiedot.nimi.suku;
				report.clientID 	= client._id;
				report.clientName 	= client.nimi;
				
				report.save(function(err,rep){
					left--;
					
					if(left == 0){
						user.save(function(){
							res.send({status:true});
						});
					}
				
				});
				
			});
			
		});
		
	});
	
});
  
   
module.exports = router 