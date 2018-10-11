var express 	= require('express')
  , router 		= express.Router()
  , log			= require('winston')
  , auth 		= require('../helpers/auth')
  , User 		= require('../models/user')
  , Client 		= require('../models/client') 
  , Campaign 	= require('../models/campaign')
  , CampaignItem= require('../models/campaignItem')
  , Notify		= require('../models/notify')
  , _			= require('underscore')
  , moment		= require("moment")
  
    
var mongo 		= require('mongodb');
var ObjectId	= mongo.ObjectID;


var uls = require("../helpers/userlevels");
   
   
router.post("/setSeen", auth.loginCheck, function(req,res){
	
	var status 	= req.body.status;
	var ids 	= JSON.parse(req.body.ids);
	var left 	= ids.length;
	
	if(left > 0)
	ids.forEach(function(id){
		Notify.findById(ObjectId(id), function(err, notify){
		
			left--;
			if(left > 0)
				notify.setSeen(status)
			else 
				notify.setSeen(status, function(){
					res.send({status:true});
				})
		})
	})
	
});

   
router.post("/setRead", auth.loginCheck, function(req,res){
	
	var status 	= req.body.status;
	var id 		= req.body.id;
	
	
	Notify.findById(ObjectId(id), function(err, notify){
		if(notify)
		notify.setRead(status, function(){
			res.send({status:true});
		})
	})
	
	
});


module.exports = router;