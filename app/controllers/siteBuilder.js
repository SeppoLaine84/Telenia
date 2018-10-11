var express 	= require('express')
  , router 		= express.Router()
  , log			= require('winston')
  , auth 		= require('../helpers/auth')
  , User 		= require('../models/user')
  , Client 		= require('../models/client') 
  , Campaign 	= require('../models/campaign')
  , CampaignItem= require('../models/campaignItem')
  , SiteBuilder	= require('../models/siteBuilder')
  , _			= require('underscore')
  , moment		= require("moment")
var path 		= require('path');
var appDir 		= path.dirname(require.main.filename); 
var jade		= require('jade'); 

router.post("/template/get", function(req, res){
	var filename 	= req.body.filename;
	var data		= req.body.data;		
	var html 		= jade.renderFile(appDir + '/app/views/customerPage/templates/'+filename+".jade", data);
	res.send({html:html});
});

router.post("/templates/list", function(req, res){
	SiteBuilder({}, function(err, builder){
		console.log(err, builder);
		res.send({templates:builder.templates});
	});
});
 
module.exports = router;
