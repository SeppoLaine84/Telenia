var express 	= require('express')
  , router 		= express.Router()
  , log			= require('winston')
  , auth 		= require('../helpers/auth')
  , User 		= require('../models/user')
  , Client 		= require('../models/client') 
  , Campaign 	= require('../models/campaign')
  , CampaignItem= require('../models/campaignItem')
  , Customer	= require('../models/customer')
  , _			= require('underscore')
var mongo 		= require('mongodb');
var ObjectId 	= mongo.ObjectID;
var uls 		= require("../helpers/userlevels");
var appSettings	= require("./../../settings")  


   
// Perus asiakas view   
router.get('/add', auth.masterUserCheck, function(req, res){
	res.render('uudet/asiakkaat/add', {url:"/customer/add", page:"customer/add", pageTitle:"Asiakkaan luonti", pageIcon:"user-plus", loadingText: "Ladataan sivua...", appSettings:appSettings, user:req.session.user,});		
});   
   
router.get("/edit/:id", auth.masterUserCheck, function(req,res){
	
		var cID = ObjectId(req.params.id);
		Customer.findById(cID).lean().exec(function(err, customer){
			if(customer.clientID == req.session.user.clientID){
				res.render('uudet/asiakkaat/edit', {url:"/customer/edit", page:"customer/edit", pageTitle:"Asiakkaan muokkaus", pageIcon:"user", loadingText: "Ladataan asiakasta...", appSettings:appSettings, user:req.session.user, customer:customer});		

			}
			else {
				res.render('error')
			}
		});
	

});
     
// Lisää asiakas yritykselle
router.post('/add', auth.loginCheck, function(req, res){
	var customerData = req.body;
	res.contentType('json');
	
	Client.findClientByID(req.session.user.clientID, function(err,client){
		Customer.createCustomer(customerData, function(customer){
			customer.clientID 	= req.session.user.clientID;
			customer.pwd 		= crypter.cryptPWD(req.body.pwd);
			customer.save(function(){
				//client.addCustomer(customer._id);
				res.status(200).send(customer);
			});
		})
	})
});   
   
// Poistaa asiakas yrityksestä
router.post('/del', auth.loginCheck, function(req, res){
	var customerID = req.body.id;
	res.contentType('json');
	Customer.removeCustomerByID(customerID, function(){
		res.status(200).send({status:true});
	});
	
});   
   
// Tallenna asiakas
router.post('/save', auth.loginCheck, function(req, res){
	var customerID 	= req.body._id;
	var data 		= req.body;
	
	res.contentType('json');
	Customer.findByIdAndUpdate(customerID, data, function(err, customer){
		if(err)console.log(err);
		if(customer)
			customer.save(function(){
				res.send(customer);
			
			});
		else 
			res.status(200).send({status:false});
		
	});
	
});   


router.post("/set", auth.loginCheck, function(req, res){
	res.contentType("json");
	Customer.update({_id:ObjectId(req.body.id)}, {[req.body.target.toString()]:req.body.value}, function(err, user) {
		if(err)log.error(err);
		res.send({status:user, origQuery:req.body});
	});
});


// Hakee asiakkaan
router.post('/get', auth.loginCheck, function(req, res){
	var clientID 	= req.session.user.clientID;
		
	res.contentType('json');
	Customer.find({clientID: clientID}, function(err, customer){
		if(err)console.log(err);
		if(customer)
			res.send(customer);
		else 
			res.status(200).send({status:false});
		
	});
	
});   
   
   // Hakee asiakkaan kampanjat
router.post('/campaign/get', auth.loginCheck, function(req, res){
	
	var customerID 	= (req.body.customerID);
	
	res.contentType('json');
	console.log(customerID);
	Campaign.findCampaignsByCustomerID(customerID, function(err, campaigns){
		if(err)log.log("error", err);
		console.log(err,campaigns);
		if(campaigns)
			res.send(campaigns);
		else 
			res.status(200).send({status:false});
		
	});
	
});   
   
   
module.exports = router 