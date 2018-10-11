var appSettings		= require("./../../settings")
var User 			= require('./../models/user');
var Notify			= require('./../models/notify');
var CampaignItem	= require('./../models/campaignItem');
var Campaign		= require('./../models/campaign');
var log				= require('./log');
var _ 				= require('underscore');
var moment			= require('moment');
var mongo 			= require('mongodb');
var ObjectId 		= mongo.ObjectID;
var events 			= require('./events');


var checkInverval 		= 60000; 	// Tarkistetaan minuutin välein
var notifyWarningTime 	= 15; 		// 15minuutin varoitusaika

function checkItems() {

	var notifyCount = 0;
	
	var results = {};
	var campIDS = [];
	var _res 	= {};
	CampaignItem.find({status:{$in:["SU", "OK"]}, soitaUudestaanMuistutus: true}, function(err, campaignItems){
				
		campaignItems.forEach(function(ci){
			
			if(ci.soitaUudestaan){
				
				if(!results[ci._id.toString()])
					results[ci._id.toString()] = {}
				results[ci._id.toString()] = ci;
				campIDS.push(ci.kampanjaID.toString());
			}
		});		
		
		campIDS = _.map(_.uniq(campIDS), function(id){
			return ObjectId(id);
		});
	
		Campaign.find({_id: {$in:campIDS}}, function(err, campaigns){
			
			Object.keys(results).forEach(function(__ci){
				var _ci = results[__ci];
				
				campaigns.forEach(function(_c){
					
					if(_c._id.toString() == _ci.kampanjaID.toString()){
						_res[_ci._id] = {ci:_ci, camp:_c};
					}
				});
				
			});
		
			Object.keys(_res).forEach(function(_ci){
				var ci 			= _res[_ci].ci;
				var camp		= _res[_ci].camp;
				var minutes 	= moment.duration(moment().diff(ci.soitaUudestaan)).asMinutes();
			
				if(Math.abs(minutes) <= notifyWarningTime){ 	// Onko aikaa soittoon alle notifyWarningTimen
					ci.soitaUudestaanMuistutus = false;			// aseta muistutus pois
					ci.save();
					notifyCount++;
					log.log("info", ci.users.nimi + ": Uudelleen soitto asiakkaalle "+ci.payload[0].value)
					Notify.addNotify(							// Lähetä notify
						ci.users.id, 
						"warning", 
						"Uudelleen soitto", 
						"Sinulla on uudelleen soitto asiakkaalle <strong><a href='/campaign/view/"+camp._id+"/focus/"+ci._id+"'>"+ci.payload[0].value+"</a></strong> kampanjassa <strong><a href='/campaign/view/"+camp._id+"/focus/"+ci._id+"'>"+camp.nimi+"</a></strong> kello "+moment(ci.soitaUudestaan).format("HH:mm") + "<br/><br/><small>Asetettu "+moment(ci.soitaUudestaanSetTime).format("DD.MM.YY HH:mm:ss")+ "</small>"
					);
				}
			
			});
			
			
		});
	})
}

checkItems();
var interval = setInterval(function(){
	checkItems();
}, checkInverval);

module.exports = interval;