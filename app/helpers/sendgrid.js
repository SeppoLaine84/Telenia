var apikey 		= process.env.SENDGRID_KEY;

var sendgrid 	= require("sendgrid")(apikey);
var jade 		= require("jade");
var salesGrid	= require('./../models/salesGrid');
var path 		= require('path');
var appDir 		= path.dirname(require.main.filename);
var _ 			= require("underscore");
var User		= require('./../models/user')
var log 		= require('./log')
var events		= require('./events');
var moment		= require('moment');

var fromEmail = "from@email.com";

var grid =	{
		
		sendStatus: function(data){ 
			var html = jade.renderFile(appDir + '/app/views/emails/status-report.jade', data);
			
			sendgrid.send({
				to:	data.receivers,
				from: fromEmail,
				fromname: "Telenia.fi",
				subject: 'Telenia.fi - Myynti',
				html: html
			});
			
		},
		
		sendError: function(data){
			User.find({userlevel:4}, "email").lean().exec(function(err, admins){
				var receiv = [];
				admins.forEach(function(admin){
					receiv.push(admin.email)
				});
				var html = jade.renderFile(appDir + '/app/views/emails/error-report.jade', {msg:data.msg});
			
				sendgrid.send({
					to:	receiv,
					from: fromEmail,
					fromname: "Telenia.fi",
					subject: 'Telenia.fi - Virhe ohjelmassa',
					html: html
				});
			});
		},
		
		sendPwdReset: function(data){
			
			var html = jade.renderFile(appDir + '/app/views/emails/reset-pwd.jade', data);
			log.log("sentEmail", "Tallennetaan email", {html:html, cateogory:"Salasanan vaihto", receivers:data.email})
			sendgrid.send({
				to: data.email,
				from: fromEmail,
				fromname: "Telenia.fi",
				subject:"Telenia.fi - Salasanan vaihto",
				html: html,
				category:"Salasanan vaihto",
			})
			
		},
		
		sendDailySalesReports: function(){
			var receivers 	= {}
			var allRec 		= [];
			
		
			salesGrid.find({sent:false}).exec(function(err, _sales){
				
				_sales.forEach(function(sales){
					
					sales.receivers.forEach(function(rec){
						if(!receivers[rec])
							receivers[rec] = []
						receivers[rec].push(sales)
						allRec.push(sales);
					});
					sales.sent = true;
					sales.save();
					
				});

				Object.keys(receivers).forEach(function(receiv) {
				
					var html = jade.renderFile(appDir + '/app/views/emails/day-report.jade', {sales:receivers[receiv]});
					log.log("sentEmail", "Tallennetaan email", {html:html,category:"Päivän raportti", receivers:receiv})
					sendgrid.send({
						to: receiv,
						from: fromEmail,
						fromname: "Telenia.fi",
						subject:"Telenia.fi - Päivittäinen raportti",
						html: html,
						category:"Päivän raportti",
					})
							
				});
				
				log.log("info", "Lähetetään päivittäiset myyntiraportti sähköpostit", {receivers:allRec})
			});
		},
		
		sendContactRequest: function(contact){
			
			User.find({userlevel:4}, "email").lean().exec(function(err, admins){
				var receiv = [];
				
				admins.forEach(function(admin){
					receiv.push(admin.email)
				});
				
				var keys = Object.keys(contact);
				var values = [];
				var i  = 0;
				
				keys.forEach(function(key){
					values[i] = contact[key];
					i++;
				});
				
				var html = jade.renderFile(appDir + '/app/views/emails/contactRequest.jade', {data:contact, keys: keys, values:values, moment:moment});
				log.log("sentEmail", "Tallennetaan email", {html:html, category:"Yhteydenotto pyyntö", receivers:receiv})
				sendgrid.send({
					to: receiv,
					from: fromEmail,
					fromname: "Telenia.fi",
					subject:"Telenia.fi - Yhteydenottopyyntö",
					html: html,
					category:"Yhteydenottopyyntö",
				})
			});
		},
		
	};

module.exports = grid;